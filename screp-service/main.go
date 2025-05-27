
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/icza/screp/rep"
	"github.com/joho/godotenv"
)

type Player struct {
	Name string `json:"name"`
	Race string `json:"race"`
	APM  int    `json:"apm"`
	EAPM int    `json:"eapm"`
}

type Command struct {
	Frame int    `json:"frame"`
	Type  string `json:"type"`
	Data  string `json:"data"`
}

type Header struct {
	Frames  int    `json:"frames"`
	MapName string `json:"mapName"`
}

type ParseResponse struct {
	Players  []Player  `json:"players"`
	Commands []Command `json:"commands"`
	Header   Header    `json:"header"`
}

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func parseHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read the replay file data
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	log.Printf("Received replay file of size: %d bytes", len(body))

	// Parse the replay using icza/screp
	replay, err := rep.NewFromBytes(body)
	if err != nil {
		log.Printf("Error parsing replay: %v", err)
		http.Error(w, fmt.Sprintf("Failed to parse replay: %v", err), http.StatusBadRequest)
		return
	}

	// Convert to our response format
	var players []Player
	var commands []Command

	// Extract player data
	for _, player := range replay.Header.Players {
		if player.Name != "" {
			race := "Unknown"
			switch player.Race {
			case 0:
				race = "Zerg"
			case 1:
				race = "Terran"
			case 2:
				race = "Protoss"
			}

			players = append(players, Player{
				Name: player.Name,
				Race: race,
				APM:  int(player.APM),
				EAPM: int(player.APM), // Use APM as EAPM for now
			})
		}
	}

	// Extract commands (sample) - create some mock commands for now
	for i := 0; i < 50; i++ {
		commands = append(commands, Command{
			Frame: i * 24, // 24 frames per second
			Type:  "Build",
			Data:  fmt.Sprintf("Command %d", i),
		})
	}

	response := ParseResponse{
		Players:  players,
		Commands: commands,
		Header: Header{
			Frames:  int(replay.Header.Frames),
			MapName: replay.Header.Map,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully parsed replay with %d players", len(players))
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := mux.NewRouter()
	r.HandleFunc("/health", healthHandler).Methods("GET", "OPTIONS")
	r.HandleFunc("/parse", parseHandler).Methods("POST", "OPTIONS")

	log.Printf("Starting server on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
