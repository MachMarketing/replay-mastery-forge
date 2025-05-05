
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/icza/screp/rep"
	"github.com/icza/screp/repparser"
)

// Error response structure
type ErrorResponse struct {
	Error string `json:"error"`
}

// SimpleReplayResponse is a simplified response with just player data
type SimpleReplayResponse struct {
	PlayerName  string `json:"playerName"`
	OpponentName string `json:"opponentName"`
	PlayerRace  string `json:"playerRace"`
	OpponentRace string `json:"opponentRace"`
	MapName     string `json:"map"`
	Duration    string `json:"duration"`
	Date        string `json:"date"`
	MatchResult string `json:"result"`
}

// CORS middleware with improved handling
func enableCors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get allowed origin from environment or use wildcard
		allowedOrigin := os.Getenv("CORS_ORIGIN")
		if allowedOrigin == "" {
			allowedOrigin = "*"
		}

		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "86400") // 24 hours

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
		log.Printf("Error parsing form: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: fmt.Sprintf("Invalid form data: %v", err)})
		return
	}

	// Get the file from the form
	file, handler, err := r.FormFile("file")
	if err != nil {
		log.Printf("Error getting file: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "No file provided or invalid file"})
		return
	}
	defer file.Close()

	// Check file extension
	if !strings.HasSuffix(strings.ToLower(handler.Filename), ".rep") {
		log.Printf("Invalid file extension: %s", handler.Filename)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Only .rep files are allowed"})
		return
	}

	// Log the incoming request
	log.Printf("Received file: %s, size: %d bytes", handler.Filename, handler.Size)

	// Create a temporary file
	tempFile, err := os.CreateTemp("", "replay-*.rep")
	if err != nil {
		log.Printf("Error creating temp file: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to create temporary file"})
		return
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	// Copy the uploaded file to the temporary file
	_, err = io.Copy(tempFile, file)
	if err != nil {
		log.Printf("Error copying to temp file: %v", err)
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

	// Extract basic player data for simple response
	simpleResponse := extractBasicReplayData(r)

	// Set content type to JSON
	w.Header().Set("Content-Type", "application/json")
	
	// Encode the replay data to JSON and send it back
	log.Printf("Successfully parsed replay, returning data")
	err = json.NewEncoder(w).Encode(simpleResponse)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to encode response"})
	}
}

// Extract basic data from replay
func extractBasicReplayData(r *rep.Replay) SimpleReplayResponse {
	response := SimpleReplayResponse{
		MapName:  r.Header.MapName(),
		Date:     r.Header.StartTime().Format("2006-01-02"),
		Duration: formatDuration(r.Header.Frames()),
	}

	// Get player data if available
	if len(r.Players) >= 1 {
		response.PlayerName = r.Players[0].Name
		response.PlayerRace = getRaceName(r.Players[0].Race)
	}
	
	if len(r.Players) >= 2 {
		response.OpponentName = r.Players[1].Name
		response.OpponentRace = getRaceName(r.Players[1].Race)
	}

	// Default result
	response.MatchResult = "win"

	return response
}

// Format duration from frames
func formatDuration(frames int) string {
	seconds := frames / 24 // Approximate conversion
	minutes := seconds / 60
	remainingSeconds := seconds % 60
	return fmt.Sprintf("%d:%02d", minutes, remainingSeconds)
}

// Convert race code to full name
func getRaceName(race byte) string {
	switch race {
	case 'T', 't':
		return "Terran"
	case 'P', 'p':
		return "Protoss"
	case 'Z', 'z':
		return "Zerg"
	default:
		return "Terran" // Default to Terran
	}
}

func main() {
	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000" // Default port
	}
	
	// Get host from environment or use default
	host := os.Getenv("HOST")
	if host == "" {
		host = "localhost" // Default host
	}

	// Create router
	mux := http.NewServeMux()
	
	// Register route handlers with CORS
	mux.Handle("/parse", enableCors(http.HandlerFunc(handleParseReplay)))
	
	// Add health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Start server
	serverAddr := fmt.Sprintf("%s:%s", host, port)
	fmt.Printf("SCREP parsing service starting at http://%s...\n", serverAddr)
	log.Fatal(http.ListenAndServe(serverAddr, mux))
}
