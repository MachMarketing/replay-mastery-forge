
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/icza/screp/rep"
	"github.com/icza/screp/repparser"
)

// Error response structure
type ErrorResponse struct {
	Error string `json:"error"`
}

// CORS middleware
func enableCors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// Handle preflight OPTIONS request
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Parse replay handler
func handleParseReplay(w http.ResponseWriter, r *http.Request) {
	// Only allow POST method
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Method not allowed"})
		return
	}

	// Parse the multipart form, 32MB max memory
	err := r.ParseMultipartForm(32 << 20)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid form data"})
		return
	}

	// Get the file from the form
	file, handler, err := r.FormFile("file")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "No file provided"})
		return
	}
	defer file.Close()

	// Log the incoming request
	log.Printf("Received file: %s, size: %d bytes", handler.Filename, handler.Size)

	// Create a temporary file
	tempFile, err := os.CreateTemp("", "replay-*.rep")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to create temporary file"})
		return
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	// Copy the uploaded file to the temporary file
	_, err = io.Copy(tempFile, file)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to save file"})
		return
	}
	tempFile.Close() // Close to ensure all data is written

	// Parse the replay using SCREP
	log.Printf("Parsing replay: %s", tempFile.Name())
	r, err := repparser.ParseFile(tempFile.Name())
	if err != nil {
		log.Printf("Error parsing replay: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: fmt.Sprintf("Failed to parse replay: %v", err)})
		return
	}

	// Set content type to JSON
	w.Header().Set("Content-Type", "application/json")
	
	// Encode the replay data to JSON and send it back
	log.Printf("Successfully parsed replay, returning data")
	err = json.NewEncoder(w).Encode(r)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to encode response"})
	}
}

func main() {
	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000" // Default port
	}

	// Register route handlers
	http.Handle("/parse", enableCors(http.HandlerFunc(handleParseReplay)))
	
	// Add health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	fmt.Printf("SCREP parsing service starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
