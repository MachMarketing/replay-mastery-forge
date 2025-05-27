
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/icza/screp"
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

// CORS middleware to handle all CORS headers properly
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers for all requests
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "86400")

		// Handle preflight OPTIONS requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call the next handler
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

	// Create a temporary file to parse the replay
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
	tmpFile.Close() // Close file so it can be read by ParseFile

	// Parse the replay using the correct icza/screp API
	replay, err := screp.ParseFile(tmpFile.Name())
	if err != nil {
		log.Printf("Error parsing replay: %v", err)
		http.Error(w, fmt.Sprintf("Failed to parse replay: %v", err), http.StatusBadRequest)
		return
	}

	// Convert to our response format
	var players []Player
	var commands []Command

	// Extract player data from the parsed replay using correct API
	if replay.Header != nil && replay.Header.Players != nil {
		for _, player := range replay.Header.Players {
			if player.Name != "" {
				// Get race as string - convert from race ID to string
				raceStr := getRaceString(player.Race)
				
				// Calculate APM from commands - get total commands for this player
				playerCommands := 0
				if replay.Commands != nil {
					for _, cmd := range replay.Commands {
						if cmd.PlayerID == player.ID {
							playerCommands++
						}
					}
				}
				
				// Calculate APM (Actions Per Minute)
				// Game duration in frames, convert to minutes (assuming ~24 FPS)
				gameDurationMinutes := 1.0
				if replay.Header.Duration > 0 {
					gameDurationMinutes = float64(replay.Header.Duration) / (24.0 * 60.0)
				}
				
				apm := 0
				if gameDurationMinutes > 0 {
					apm = int(float64(playerCommands) / gameDurationMinutes)
				}

				players = append(players, Player{
					Name: player.Name,
					Race: raceStr,
					APM:  apm,
					EAPM: apm, // Use APM as EAPM for now
				})
			}
		}
	}

	// Extract some basic commands - limit to avoid huge responses
	commandCount := 0
	maxCommands := 100
	
	if replay.Commands != nil {
		for _, cmd := range replay.Commands {
			if commandCount >= maxCommands {
				break
			}
			
			// Create a basic command representation
			commands = append(commands, Command{
				Frame: int(cmd.Frame),
				Type:  getCommandTypeString(cmd.Type),
				Data:  fmt.Sprintf("Player: %d", cmd.PlayerID),
			})
			commandCount++
		}
	}

	// Create response with proper header information
	mapName := "Unknown Map"
	frames := 0
	
	if replay.Header != nil {
		if replay.Header.Map != "" {
			mapName = replay.Header.Map
		}
		frames = int(replay.Header.Duration)
	}

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

// Helper function to convert race ID to string
func getRaceString(race byte) string {
	switch race {
	case 0:
		return "Zerg"
	case 1:
		return "Terran"
	case 2:
		return "Protoss"
	case 6:
		return "Random"
	default:
		return "Unknown"
	}
}

// Helper function to convert command type to string
func getCommandTypeString(cmdType byte) string {
	switch cmdType {
	case 0x09:
		return "Select"
	case 0x0A:
		return "Shift_Select"
	case 0x0B:
		return "Shift_Deselect"
	case 0x0C:
		return "Build"
	case 0x0D:
		return "Vision"
	case 0x0E:
		return "Ally"
	case 0x12:
		return "Hotkey"
	case 0x13:
		return "Move"
	case 0x14:
		return "Attack"
	case 0x15:
		return "Use_Tech"
	default:
		return "Command"
	}
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
	
	// Apply CORS middleware to all routes
	r.Use(corsMiddleware)
	
	r.HandleFunc("/health", healthHandler).Methods("GET", "OPTIONS")
	r.HandleFunc("/parse", parseHandler).Methods("POST", "OPTIONS")

	log.Printf("Starting server on port %s with CORS enabled", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
