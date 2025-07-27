package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/icza/screp/rep"
)

type PlayerInfo struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Race string `json:"race"`
	APM  int    `json:"apm"`
	EAPM int    `json:"eapm"`
}

type Command struct {
	PlayerID    int     `json:"playerId"`
	Frame       int     `json:"frame"`
	Time        float64 `json:"time"`
	CommandType string  `json:"commandType"`
	AbilityName string  `json:"abilityName"`
}

type BuildOrder struct {
	PlayerID int       `json:"playerId"`
	Sequence []Command `json:"sequence"`
}

type ReplayResult struct {
	MapName         string        `json:"mapName"`
	DurationSeconds float32       `json:"durationSeconds"`
	Players         []PlayerInfo  `json:"players"`
	BuildOrders     []BuildOrder  `json:"buildOrders"`
	Actions         []Command     `json:"actions"`
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if r.Method == "OPTIONS" {
			return
		}

		next.ServeHTTP(w, r)
	})
}

func parseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	file, _, err := r.FormFile("replay")
	if err != nil {
		http.Error(w, "Missing replay file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	rp, err := rep.ParseReplay(file)
	if err != nil {
		http.Error(w, "Parse error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	mapName := rp.Header.MapName
	duration := float32(rp.Header.Frames) / 23.81 // Convert frames to seconds

	// Extract players
	players := make([]PlayerInfo, len(rp.Header.Players))
	for i, p := range rp.Header.Players {
		players[i] = PlayerInfo{
			ID:   i,
			Name: p.Name,
			Race: p.Race.String(),
			APM:  calculateAPM(rp, i),
			EAPM: calculateEAPM(rp, i),
		}
	}

	// Extract all commands/actions
	var actions []Command
	for _, cmd := range rp.Commands {
		if cmd.BaseCmd() != nil {
			actions = append(actions, Command{
				PlayerID:    int(cmd.BaseCmd().PlayerID),
				Frame:       int(cmd.BaseCmd().Frame),
				Time:        float64(cmd.BaseCmd().Frame) / 23.81,
				CommandType: cmd.BaseCmd().Type.String(),
				AbilityName: getAbilityName(cmd),
			})
		}
	}

	// Extract build orders (Train + Build commands)
	buildOrders := make([]BuildOrder, len(players))
	for i, p := range players {
		var seq []Command
		for _, a := range actions {
			if a.PlayerID == p.ID && (a.CommandType == "Train" || a.CommandType == "Build") {
				seq = append(seq, a)
			}
		}
		buildOrders[i] = BuildOrder{PlayerID: p.ID, Sequence: seq}
	}

	res := ReplayResult{
		MapName:         mapName,
		DurationSeconds: duration,
		Players:         players,
		BuildOrders:     buildOrders,
		Actions:         actions,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func calculateAPM(rp *rep.Replay, playerID int) int {
	actionCount := 0
	for _, cmd := range rp.Commands {
		if cmd.BaseCmd() != nil && int(cmd.BaseCmd().PlayerID) == playerID {
			actionCount++
		}
	}
	gameMinutes := float64(rp.Header.Frames) / 23.81 / 60
	if gameMinutes == 0 {
		return 0
	}
	return int(float64(actionCount) / gameMinutes)
}

func calculateEAPM(rp *rep.Replay, playerID int) int {
	// Simplified EAPM calculation - excludes some non-essential actions
	effectiveActions := 0
	for _, cmd := range rp.Commands {
		if cmd.BaseCmd() != nil && int(cmd.BaseCmd().PlayerID) == playerID {
			// Filter out some non-essential commands for EAPM
			if cmd.BaseCmd().Type.String() != "Select" && cmd.BaseCmd().Type.String() != "Nothing" {
				effectiveActions++
			}
		}
	}
	gameMinutes := float64(rp.Header.Frames) / 23.81 / 60
	if gameMinutes == 0 {
		return 0
	}
	return int(float64(effectiveActions) / gameMinutes)
}

func getAbilityName(cmd rep.Cmd) string {
	if cmd.BaseCmd() == nil {
		return "Unknown"
	}
	// This is a simplified ability name extraction
	// The icza/screp library provides different command types
	return cmd.BaseCmd().Type.String()
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func main() {
	r := mux.NewRouter()
	
	// Apply CORS middleware
	r.Use(corsMiddleware)
	
	r.HandleFunc("/parse", parseHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/health", healthHandler).Methods("GET")
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}