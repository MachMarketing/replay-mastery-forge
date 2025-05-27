package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"reflect"

	"github.com/gorilla/mux"
	"github.com/icza/screp"
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

	replay, err := screp.ParseFile(tmpFile.Name())
	if err != nil {
		log.Printf("Error parsing replay: %v", err)
		http.Error(w, fmt.Sprintf("Failed to parse replay: %v", err), http.StatusBadRequest)
		return
	}

	var players []Player
	var commands []Command
	mapName := "Unknown Map"
	frames := 0

	if replay.Header != nil {
		frames = int(replay.Header.Frames)
		if replay.Header.Map != "" {
			mapName = replay.Header.Map
		}

		for _, player := range replay.Header.Players {
			if player != nil && player.Name != "" {
				raceStr := getRaceString(player.Race)
				apm := calculateAPM(replay, player.ID, frames)

				players = append(players, Player{
					Name: player.Name,
					Race: raceStr,
					APM:  apm,
					EAPM: apm,
				})
			}
		}
	}

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

	gameDurationMinutes := float64(totalFrames) / (24.0 * 60.0)
	if gameDurationMinutes < 1 {
		gameDurationMinutes = 1
	}

	return int(float64(playerCommands) / gameDurationMinutes)
}

func getCommandTypeString(cmd interface{}) string {
	if cmd == nil {
		return "Unknown"
	}
	return reflect.TypeOf(cmd).String()
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
