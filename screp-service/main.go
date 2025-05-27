
package main

import (
    "encoding/json"
    "io"
    "log"
    "net/http"
    "os"

    "github.com/gorilla/mux"
    "github.com/joho/godotenv"
    "github.com/icza/screp/rep"
)

func main() {
    // .env laden (optional)
    _ = godotenv.Load()

    // Port aus Env oder Default 8080
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    // Router setup mit CORS
    router := mux.NewRouter()
    
    // CORS Middleware
    router.Use(corsMiddleware)
    
    router.HandleFunc("/health", healthHandler).Methods("GET")
    router.HandleFunc("/parse", parseHandler).Methods("POST", "OPTIONS")

    log.Printf("Server listening on :%s\n", port)
    log.Fatal(http.ListenAndServe(":"+port, router))
}

// CORS Middleware
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        w.Header().Set("Access-Control-Max-Age", "3600")
        
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}

// GET /health
func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

// POST /parse
func parseHandler(w http.ResponseWriter, r *http.Request) {
    // Max 10 MB Body
    r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024)
    data, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Invalid body: "+err.Error(), http.StatusBadRequest)
        return
    }

    log.Printf("Received replay data: %d bytes", len(data))

    // Replay parsen
    parsed, err := rep.ParseReplay(data)
    if err != nil {
        log.Printf("Parse error: %v", err)
        http.Error(w, "Parse error: "+err.Error(), http.StatusInternalServerError)
        return
    }

    log.Printf("Successfully parsed replay with %d players", len(parsed.Players))

    // Ergebnis normalisieren
    out := struct {
        Players  interface{} `json:"players"`
        Commands interface{} `json:"commands"`
        Header   struct {
            Frames  int    `json:"frames"`
            MapName string `json:"mapName"`
        } `json:"header"`
    }{
        Players:  parsed.Players,
        Commands: parsed.Commands,
    }
    out.Header.Frames = parsed.Header.Frames
    out.Header.MapName = parsed.Header.MapName

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(out); err != nil {
        log.Printf("JSON encoding error: %v", err)
        http.Error(w, "JSON encoding error", http.StatusInternalServerError)
        return
    }
    
    log.Printf("Successfully returned parsed data")
}
