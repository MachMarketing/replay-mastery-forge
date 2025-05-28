
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/nicklaw5/go-starscape-replay/replay"
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
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func parseHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	tmpFile, err := os.CreateTemp("", "replay*.rep")
	if err != nil {
		log.Printf("Error creating temp file: %v", err)
		http.Error(w, "Failed to create temp file", http.StatusInternalServerError)
		return
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	if _, err := tmpFile.Write(body); err != nil {
		log.Printf("Error writing to temp file: %v", err)
		http.Error(w, "Failed to write temp file", http.StatusInternalServerError)
		return
	}
	tmpFile.Close()

	replayData, err := replay.ParseFile(tmpFile.Name())
	if err != nil {
		log.Printf("Error parsing replay: %v", err)
		http.Error(w, fmt.Sprintf("Failed to parse replay: %v", err), http.StatusBadRequest)
		return
	}

	var players []Player
	var commands []Command
	mapName := "Unknown Map"
	frames := 0

	if replayData.Header != nil {
		frames = int(replayData.Header.Frames)
		if replayData.Header.Map != "" {
			mapName = replayData.Header.Map
		}

		for _, player := range replayData.Header.Players {
			if player != nil && player.Name != "" {
				raceStr := getRaceString(player.Race)
				apm := calculateAPM(replayData, player.ID, frames)

				players = append(players, Player{
					Name: player.Name,
					Race: raceStr,
					APM:  apm,
					EAPM: apm,
				})
			}
		}
	}

	if replayData.Commands != nil && len(replayData.Commands) > 0 {
		maxCommands := 100
		for i, cmd := range replayData.Commands {
			if i >= maxCommands {
				break
			}
			if cmd != nil {
				frame := int(cmd.Frame)
				cmdType := fmt.Sprintf("%T", cmd)
				
				commands = append(commands, Command{
					Frame: frame,
					Type:  cmdType,
					Data:  fmt.Sprintf("Player: %d", cmd.PlayerID),
				})
			}
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

	log.Printf("Parsed replay: %d players, %d commands", len(players), len(commands))
}

func getRaceString(race int) string {
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

func calculateAPM(replayData *replay.Replay, playerID int, totalFrames int) int {
	if replayData.Commands == nil || len(replayData.Commands) == 0 || totalFrames <= 0 {
		return 0
	}

	playerCommands := 0
	for _, cmd := range replayData.Commands {
		if cmd != nil && cmd.PlayerID == playerID {
			playerCommands++
		}
	}

	gameDurationMinutes := float64(totalFrames) / (24.0 * 60.0)
	if gameDurationMinutes < 1 {
		gameDurationMinutes = 1
	}

	return int(float64(playerCommands) / gameDurationMinutes)
}

func main() {
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

	log.Printf("Server started on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
