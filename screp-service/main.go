package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/icza/screp/rep"
	"github.com/icza/screp/repparser"
)

// Error response structure
type ErrorResponse struct {
	Error string `json:"error"`
}

// DetailedPlayerData contains comprehensive player information
type DetailedPlayerData struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Race      string `json:"race"`
	Type      int    `json:"type"`
	Team      int    `json:"team"`
	IsWinner  bool   `json:"isWinner"`
	APM       int    `json:"apm"`
	EAPM      int    `json:"eapm,omitempty"`
	Colors    Colors `json:"colors,omitempty"`
	StartSpot *Point `json:"startSpot,omitempty"`
}

// BuildOrder represents a single action in the build order
type BuildOrder struct {
	Time   string `json:"time"`
	Frame  int    `json:"frame"`
	Supply int    `json:"supply"`
	Action string `json:"action"`
}

// Colors represents player colors
type Colors struct {
	RGB  string `json:"rgb"`
	RGBA string `json:"rgba"`
	Name string `json:"name"`
}

// Point represents a 2D coordinate
type Point struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// GameMetadata contains general game information
type GameMetadata struct {
	GameType      string    `json:"gameType"`
	GameSubType   string    `json:"gameSubType,omitempty"`
	MapName       string    `json:"map"`
	MapSize       string    `json:"mapSize,omitempty"`
	StartTime     time.Time `json:"startTime"`
	Duration      string    `json:"duration"`
	DurationFrames int      `json:"durationFrames"`
	GameEngine    string    `json:"gameEngine"`
	GameEngineVersion string `json:"gameEngineVersion,omitempty"`
}

// DetailedReplayResponse provides comprehensive replay data
type DetailedReplayResponse struct {
	Players      []DetailedPlayerData `json:"players"`
	BuildOrders  map[int][]BuildOrder `json:"buildOrders"`
	Metadata     GameMetadata         `json:"metadata"`
	Commands     int                  `json:"commands"`
	MapHash      string               `json:"mapHash,omitempty"`
	MatchupString string              `json:"matchup"`
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

	// Parse the replay using SCREP with full command parsing
	log.Printf("Parsing replay: %s", tempFile.Name())
	replay, err := repparser.ParseFile(tempFile.Name())
	if err != nil {
		log.Printf("Error parsing replay: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: fmt.Sprintf("Failed to parse replay: %v", err)})
		return
	}

	// Extract comprehensive replay data
	detailedResponse := extractDetailedReplayData(replay)

	// Set content type to JSON
	w.Header().Set("Content-Type", "application/json")
	
	// Encode the replay data to JSON and send it back
	log.Printf("Successfully parsed replay, returning detailed data for %d players", len(detailedResponse.Players))
	err = json.NewEncoder(w).Encode(detailedResponse)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to encode response"})
	}
}

// Extract detailed data from replay
func extractDetailedReplayData(r *rep.Replay) DetailedReplayResponse {
	response := DetailedReplayResponse{
		Players:     make([]DetailedPlayerData, 0, len(r.Players)),
		BuildOrders: make(map[int][]BuildOrder),
		Metadata: GameMetadata{
			MapName:         r.Header.MapName(),
			StartTime:       r.Header.StartTime(),
			Duration:        formatDuration(r.Header.Frames()),
			DurationFrames:  r.Header.Frames(),
			GameType:        getGameType(r.Header.GameType()),
			GameSubType:     getGameSubType(r.Header.GameType()),
			GameEngine:      "StarCraft",
			GameEngineVersion: "Brood War",
		},
		Commands:     len(r.Commands),
		MapHash:      fmt.Sprintf("%x", r.Map.MapData.Hash()),
	}

	// Store matchup string
	matchupString := ""
	
	// Extract player data
	for idx, player := range r.Players {
		// Skip computer players and observers
		if player.Type != rep.PlayerTypeHuman {
			continue
		}
		
		// Calculate APM
		apm := calculateAPM(r, player.ID, r.Header.Frames())
		
		// Add to matchup string
		if matchupString != "" {
			matchupString += "v"
		}
		matchupString += string(player.Race)
		
		// Create player data object
		playerData := DetailedPlayerData{
			ID:        player.ID,
			Name:      player.Name,
			Race:      getRaceName(player.Race),
			Type:      int(player.Type),
			Team:      player.Team(),
			IsWinner:  isPlayerWinner(r, player.ID),
			APM:       apm,
			EAPM:      int(float64(apm) * 0.7), // Estimate EAPM as 70% of APM if not available
		}
		
		// Add colors if available
		if player.Color < len(r.Header.Colors) {
			color := r.Header.Colors[player.Color]
			playerData.Colors = Colors{
				RGB:  fmt.Sprintf("#%02x%02x%02x", color.R, color.G, color.B),
				RGBA: fmt.Sprintf("rgba(%d,%d,%d,%f)", color.R, color.G, color.B, float64(color.A)/255),
				Name: getColorName(player.Color),
			}
		}
		
		// Add start spot if available
		if player.StartLocation != nil {
			playerData.StartSpot = &Point{
				X: player.StartLocation.X,
				Y: player.StartLocation.Y,
			}
		}
		
		response.Players = append(response.Players, playerData)
		
		// Extract build order for this player
		response.BuildOrders[player.ID] = extractPlayerBuildOrder(r, player.ID)
	}
	
	// Set the matchup string
	response.MatchupString = matchupString

	return response
}

// Extract build order from commands
func extractPlayerBuildOrder(r *rep.Replay, playerID int) []BuildOrder {
	buildOrder := []BuildOrder{}
	
	// Track supply for the player
	currentSupply := 4 // Starting supply in BW is 4
	
	for _, cmd := range r.Commands {
		// Only process commands from this player
		if cmd.PlayerID != playerID {
			continue
		}
		
		// Check if this is a build/train/research command
		actionName := ""
		isBuildCommand := false
		
		// Check command type
		switch cmd.Type() {
		case 0x0C: // Build/train unit
			if len(cmd.Data) >= 2 {
				unitID := int(cmd.Data[0])
				actionName = getUnitName(unitID)
				isBuildCommand = true
				
				// Adjust supply based on unit type
				if isWorker(unitID) {
					currentSupply++
				} else if isSupplyProvider(unitID) {
					// Will add supply when completed, not immediately
				} else if unitID >= 0 && unitID < 228 { // Valid unit ID
					// Other combat units - would need more detailed information to adjust supply correctly
					currentSupply += getUnitSupplyCost(unitID)
				}
			}
		case 0x1F: // Research upgrade
			if len(cmd.Data) >= 2 {
				upgradeID := int(cmd.Data[0])
				actionName = getUpgradeName(upgradeID)
				isBuildCommand = true
			}
		case 0x30, 0x31: // Building placement
			if len(cmd.Data) >= 3 {
				buildingID := int(cmd.Data[0])
				actionName = getBuildingName(buildingID)
				isBuildCommand = true
				
				// Adjust supply if this is a supply provider
				if isSupplyProvider(buildingID) {
					// Supply adjustments will happen when building completes
				}
			}
		}
		
		if isBuildCommand && actionName != "" {
			buildOrder = append(buildOrder, BuildOrder{
				Time:   formatDuration(cmd.Frame),
				Frame:  cmd.Frame,
				Supply: currentSupply,
				Action: actionName,
			})
		}
	}
	
	return buildOrder
}

// Calculate APM (Actions Per Minute) for a player
func calculateAPM(r *rep.Replay, playerID int, totalFrames int) int {
	actionCount := 0
	
	// Count actions for this player
	for _, cmd := range r.Commands {
		if cmd.PlayerID == playerID {
			actionCount++
		}
	}
	
	// Calculate minutes (at 24 frames per second)
	minutes := float64(totalFrames) / 24 / 60
	if minutes < 0.1 {
		minutes = 0.1 // Prevent division by zero
	}
	
	return int(float64(actionCount) / minutes)
}

// Check if a player is a winner
func isPlayerWinner(r *rep.Replay, playerID int) bool {
	for _, winner := range r.Header.WinnerIDs() {
		if winner == playerID {
			return true
		}
	}
	return false
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
	case 'R', 'r':
		return "Random"
	default:
		return "Unknown"
	}
}

// Get game type from game type code
func getGameType(gameType int) string {
	switch gameType {
	case 0:
		return "Custom"
	case 1:
		return "Melee"
	case 2:
		return "Free for All"
	case 3:
		return "One vs One"
	case 4:
		return "Capture the Flag"
	case 5:
		return "Greed"
	case 6:
		return "Slaughter"
	case 7:
		return "Sudden Death"
	case 8:
		return "Ladder"
	case 9:
		return "Use Map Settings"
	case 10:
		return "Team Melee"
	case 11:
		return "Team Free for All"
	case 12:
		return "Team Capture the Flag"
	case 15:
		return "Top vs Bottom"
	default:
		return fmt.Sprintf("Unknown (%d)", gameType)
	}
}

// Get game sub-type
func getGameSubType(gameType int) string {
	switch gameType {
	case 8:
		return "Ladder"
	case 9:
		return "UMS"
	default:
		return ""
	}
}

// Get color name from color code
func getColorName(colorCode int) string {
	colors := []string{
		"Red", "Blue", "Teal", "Purple", "Orange", "Brown", "White", "Yellow",
		"Green", "Pale Yellow", "Tan", "Dark Aqua", "Pale Green", "Bluish Grey", "Pale Yellow", "Cyan",
	}
	
	if colorCode >= 0 && colorCode < len(colors) {
		return colors[colorCode]
	}
	
	return fmt.Sprintf("Color %d", colorCode)
}

// Check if a unit is a worker
func isWorker(unitID int) bool {
	return unitID == 7 || unitID == 41 || unitID == 64 // SCV, Probe, Drone
}

// Check if a unit/building is a supply provider
func isSupplyProvider(unitID int) bool {
	// Supply Depot, Pylon, Overlord and their variants
	return unitID == 106 || unitID == 156 || unitID == 157 || unitID == 41
}

// Get unit supply cost
func getUnitSupplyCost(unitID int) int {
	// This is a simplified version - a complete implementation would have all unit costs
	switch unitID {
	case 0, 7, 41, 64: // SCV, Probe, Drone
		return 1
	case 32, 33, 34, 35, 36, 37, 38, 39, 40, 43, 44, 65, 66, 67, 103, 104, 105: // Basic units
		return 1
	case 53, 54, 68, 70, 73, 79, 80, 83, 86, 88, 101: // Medium units
		return 2
	case 25, 27, 69, 75, 78, 81, 84, 85, 87, 89, 98, 142: // Heavy units
		return 3
	case 72, 76, 77, 82, 125, 127, 132, 133, 134: // Very heavy units
		return 4
	default:
		return 2 // Default supply cost
	}
}

// Get building name from building ID
func getBuildingName(buildingID int) string {
	// This is a simplified mapping - a complete implementation would have all building names
	buildings := map[int]string{
		106: "Supply Depot",
		107: "Command Center",
		108: "Comsat Station",
		109: "Nuclear Silo",
		110: "Supply Depot",
		111: "Refinery",
		112: "Barracks",
		113: "Academy",
		114: "Factory",
		115: "Starport",
		116: "Control Tower",
		117: "Science Facility",
		118: "Covert Ops",
		119: "Physics Lab",
		120: "Engineering Bay",
		121: "Armory",
		122: "Missile Turret",
		123: "Bunker",
		
		// Protoss buildings
		154: "Nexus",
		155: "Robotics Facility",
		156: "Pylon",
		157: "Assimilator",
		159: "Observatory",
		160: "Gateway",
		162: "Photon Cannon",
		163: "Citadel of Adun",
		164: "Cybernetics Core",
		165: "Templar Archives",
		166: "Forge",
		167: "Stargate",
		169: "Fleet Beacon",
		170: "Arbiter Tribunal",
		171: "Robotics Support Bay",
		172: "Shield Battery",
		
		// Zerg buildings
		130: "Infested Command Center",
		131: "Hatchery",
		132: "Lair",
		133: "Hive",
		134: "Nydus Canal",
		135: "Hydralisk Den",
		136: "Defiler Mound",
		137: "Greater Spire",
		138: "Queens Nest",
		139: "Evolution Chamber",
		140: "Ultralisk Cavern",
		141: "Spire",
		142: "Spawning Pool",
		143: "Creep Colony",
		144: "Spore Colony",
		146: "Sunken Colony",
		149: "Extractor",
	}
	
	if name, ok := buildings[buildingID]; ok {
		return name
	}
	
	return fmt.Sprintf("Building #%d", buildingID)
}

// Get unit name from unit ID
func getUnitName(unitID int) string {
	// This is a simplified mapping - a complete implementation would have all unit names
	units := map[int]string{
		0: "Marine",
		1: "Ghost",
		2: "Vulture",
		3: "Goliath",
		7: "SCV",
		8: "Wraith",
		9: "Science Vessel",
		10: "Dropship",
		11: "Battlecruiser",
		12: "Nuclear Missile",
		32: "Firebat",
		34: "Medic",
		
		// Protoss units
		61: "Dark Templar",
		64: "Probe",
		65: "Zealot",
		66: "Dragoon",
		67: "High Templar",
		68: "Archon",
		69: "Scout",
		70: "Arbiter",
		71: "Carrier",
		72: "Interceptor",
		73: "Dark Archon",
		83: "Reaver",
		84: "Observer",
		85: "Shuttle",
		
		// Zerg units
		35: "Zergling",
		36: "Hydralisk",
		37: "Ultralisk",
		38: "Broodling",
		39: "Drone",
		40: "Overlord",
		41: "Mutalisk",
		42: "Guardian",
		43: "Queen",
		44: "Defiler",
		45: "Scourge",
		46: "Infested Terran",
		47: "Valkyrie",
		48: "Cocoon",
		49: "Lurker Egg",
		50: "Lurker",
	}
	
	if name, ok := units[unitID]; ok {
		return name
	}
	
	return fmt.Sprintf("Unit #%d", unitID)
}

// Get upgrade name from upgrade ID
func getUpgradeName(upgradeID int) string {
	// This is a simplified mapping - a complete implementation would have all upgrade names
	upgrades := map[int]string{
		0: "Terran Infantry Armor",
		1: "Terran Vehicle Plating",
		2: "Terran Ship Plating",
		3: "Zerg Carapace",
		4: "Zerg Flyer Carapace",
		5: "Protoss Ground Armor",
		6: "Protoss Air Armor",
		7: "Terran Infantry Weapons",
		8: "Terran Vehicle Weapons",
		9: "Terran Ship Weapons",
		10: "Zerg Melee Attacks",
		11: "Zerg Missile Attacks",
		12: "Zerg Flyer Attacks",
		13: "Protoss Ground Weapons",
		14: "Protoss Air Weapons",
		15: "Protoss Plasma Shields",
		16: "U-238 Shells",
		17: "Ion Thrusters",
		18: "Burst Lasers",
		19: "Titan Reactor",
		20: "Ocular Implants",
		21: "Moebius Reactor",
		22: "Apollo Reactor",
		23: "Colossus Reactor",
		24: "Ventral Sacs",
		25: "Antennae",
		26: "Pneumatized Carapace",
		27: "Metabolic Boost",
		28: "Adrenal Glands",
		29: "Muscular Augments",
		30: "Grooved Spines",
		31: "Gamete Meiosis",
		32: "Metasynaptic Node",
		33: "Singularity Charge",
		34: "Leg Enhancements",
		35: "Scarab Damage",
		36: "Reaver Capacity",
		37: "Gravitic Drive",
		38: "Sensor Array",
		39: "Gravitic Boosters",
		40: "Khaydarin Amulet",
		41: "Apial Sensors",
		42: "Gravitic Thrusters",
		43: "Carrier Capacity",
		44: "Khaydarin Core",
	}
	
	if name, ok := upgrades[upgradeID]; ok {
		return name
	}
	
	return fmt.Sprintf("Upgrade #%d", upgradeID)
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
