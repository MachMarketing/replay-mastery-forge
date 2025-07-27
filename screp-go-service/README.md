# Go Replay Parser Service

This service uses the `icza/screp` library to parse StarCraft: Remastered replay files.

## API Endpoints

### POST /parse
Parses a replay file and returns game data.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: replay file with field name "replay"

**Response:**
```json
{
  "mapName": "Lost Temple",
  "durationSeconds": 1234.5,
  "players": [
    {
      "id": 0,
      "name": "Player1",
      "race": "Protoss",
      "apm": 150,
      "eapm": 120
    }
  ],
  "buildOrders": [
    {
      "playerId": 0,
      "sequence": [
        {
          "playerId": 0,
          "frame": 1000,
          "time": 42.0,
          "commandType": "Build",
          "abilityName": "Pylon"
        }
      ]
    }
  ],
  "actions": [...]
}
```

### GET /health
Health check endpoint.

## Running

```bash
go run main.go
```

Service runs on port 8080 by default, or PORT environment variable.