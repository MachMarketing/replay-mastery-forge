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

    // Router setup
    router := mux.NewRouter()
    router.HandleFunc("/health", healthHandler).Methods("GET")
    router.HandleFunc("/parse", parseHandler).Methods("POST")

    log.Printf("Server listening on :%s\n", port)
    log.Fatal(http.ListenAndServe(":"+port, router))
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

    // Replay parsen
    parsed, err := rep.ParseReplay(data)
    if err != nil {
        http.Error(w, "Parse error: "+err.Error(), http.StatusInternalServerError)
        return
    }

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
    json.NewEncoder(w).Encode(out)
}
