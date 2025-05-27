
package main

import (
	"bytes"
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

	// Parse the replay using icza/screp repparser
	reader := bytes.NewReader(body)
	
	// Use the correct parsing method from the latest icza/screp
	replay, err := repparser.ParseReplay(reader)
	if err != nil {
		log.Printf("Error parsing replay: %v", err)
		http.Error(w, fmt.Sprintf("Failed to parse replay: %v", err), http.StatusBadRequest)
		return
	}

	// Convert to our response format
	var players []Player
	var commands []Command

	// Extract player data from the parsed replay
	if replay.Header != nil && replay.Header.Players != nil {
		for _, player := range replay.Header.Players {
			if player.Name != "" {
				race := "Unknown"
				switch player.Race {
				case rep.RaceZerg:
					race = "Zerg"
				case rep.RaceTerran:
					race = "Terran"
				case rep.RaceProtoss:
					race = "Protoss"
				default:
					race = "Unknown"
				}

				// Calculate APM if computed data is available
				apm := 0
				if replay.Computed != nil && len(replay.Computed.PlayerDescs) > len(players) {
					playerDesc := replay.Computed.PlayerDescs[len(players)]
					if playerDesc != nil {
						apm = int(playerDesc.APM)
					}
				}

				players = append(players, Player{
					Name: player.Name,
					Race: race,
					APM:  apm,
					EAPM: apm, // Use APM as EAPM for now
				})
			}
		}
	}

	// Extract commands from the replay
	if replay.Commands != nil {
		for i, cmd := range replay.Commands.Cmds {
			if i >= 100 { // Limit to first 100 commands to avoid huge responses
				break
			}
			
			cmdType := "Unknown"
			cmdData := ""
			
			// Determine command type based on the command structure
			if cmd != nil {
				switch cmd.BaseCmd().Type {
				case rep.CmdTypeRightClick:
					cmdType = "RightClick"
				case rep.CmdTypeTrain:
					cmdType = "Train"
				case rep.CmdTypeBuild:
					cmdType = "Build"
				case rep.CmdTypeStop:
					cmdType = "Stop"
				case rep.CmdTypeAttack:
					cmdType = "Attack"
				default:
					cmdType = fmt.Sprintf("Type_%d", cmd.BaseCmd().Type)
				}
				
				cmdData = fmt.Sprintf("Player: %d", cmd.BaseCmd().PlayerID)
			}

			commands = append(commands, Command{
				Frame: int(cmd.BaseCmd().Frame),
				Type:  cmdType,
				Data:  cmdData,
			})
		}
	}

	// Create response with proper header information
	mapName := "Unknown Map"
	frames := 0
	
	if replay.Header != nil {
		if replay.Header.Map != "" {
			mapName = replay.Header.Map
		}
		if replay.Computed != nil {
			frames = int(replay.Computed.Frames)
		}
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
