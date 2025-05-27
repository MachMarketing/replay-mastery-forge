
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
	"github.com/icza/screp/repparser"
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

// CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func parseHandler(w http.ResponseWriter, r *http.Request) {
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

	// Create a temporary file
	tmpFile, err := os.CreateTemp("", "replay*.rep")
	if err != nil {
		log.Printf("Error creating temp file: %v", err)
		http.Error(w, "Failed to create temp file", http.StatusInternalServerError)
		return
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	// Write the body to temp file
	if _, err := tmpFile.Write(body); err != nil {
		log.Printf("Error writing to temp file: %v", err)
		http.Error(w, "Failed to write temp file", http.StatusInternalServerError)
		return
	}
	tmpFile.Close()

	// Parse the replay using screp
	replay, err := repparser.ParseFile(tmpFile.Name())
	if err != nil {
		log.Printf("Error parsing replay: %v", err)
		http.Error(w, fmt.Sprintf("Failed to parse replay: %v", err), http.StatusBadRequest)
		return
	}

	// Extract basic information
	var players []Player
	var commands []Command
	
	// Default values
	mapName := "Unknown Map"
	frames := 0

	// Extract header information
	if replay.Header != nil {
		frames = int(replay.Header.Frames)
		if replay.Header.Map != "" {
			mapName = replay.Header.Map
		}

		// Extract player information
		if replay.Header.Players != nil {
			for _, player := range replay.Header.Players {
				if player != nil && player.Name != "" {
					// Convert race to string
					raceStr := getRaceString(player.Race)
					
					// Calculate basic APM (simplified)
					apm := calculateAPM(replay, player.ID, frames)
					
					players = append(players, Player{
						Name: player.Name,
						Race: raceStr,
						APM:  apm,
						EAPM: apm, // Use same value for now
					})
				}
			}
		}
	}

	// Extract some basic commands (limit to avoid huge responses)
	if replay.Commands != nil && replay.Commands.Cmds != nil {
		maxCommands := 100
		for i, cmd := range replay.Commands.Cmds {
			if i >= maxCommands {
				break
			}
			
			if cmd != nil {
				commands = append(commands, Command{
					Frame: int(cmd.Frame),
					Type:  getCommandTypeString(cmd),
					Data:  fmt.Sprintf("Player: %d", cmd.UserID),
				})
			}
		}
	}

	// Create response
	response := ParseResponse{
		Players:  players,
		Commands: commands,
		Header: Header{
			Frames:  frames,
			MapName: mapName,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully parsed replay with %d players and %d commands", len(players), len(commands))
}

// Helper function to convert race to string
func getRaceString(race rep.Race) string {
	switch race {
	case rep.RaceZerg:
		return "Zerg"
	case rep.RaceTerran:
		return "Terran"
	case rep.RaceProtoss:
		return "Protoss"
	case rep.RaceRandom:
		return "Random"
	default:
		return "Unknown"
	}
}

// Helper function to calculate APM
func calculateAPM(replay *rep.Replay, playerID byte, totalFrames int) int {
	if replay.Commands == nil || replay.Commands.Cmds == nil || totalFrames <= 0 {
		return 0
	}
	
	playerCommands := 0
	for _, cmd := range replay.Commands.Cmds {
		if cmd != nil && cmd.UserID == playerID {
			playerCommands++
		}
	}
	
	// Convert frames to minutes (assuming ~24 FPS)
	gameDurationMinutes := float64(totalFrames) / (24.0 * 60.0)
	if gameDurationMinutes <= 0 {
		return 0
	}
	
	return int(float64(playerCommands) / gameDurationMinutes)
}

// Helper function to get command type as string
func getCommandTypeString(cmd interface{}) string {
	// For now, return a simple string representation
	// This can be extended based on the actual command structure
	return "Command"
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
	r.Use(corsMiddleware)
	
	r.HandleFunc("/health", healthHandler).Methods("GET", "OPTIONS")
	r.HandleFunc("/parse", parseHandler).Methods("POST", "OPTIONS")

	log.Printf("Starting server on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
