
# SCREP Parsing Service

Ein einfacher Go-Microservice, der die icza/screp-Bibliothek nutzt, um StarCraft: Brood War-Replays zu parsen (inkl. Remastered).

## Voraussetzungen

- Go 1.19 oder neuer
- Docker (optional)

## Installation & Build

1. Klone das Repo und wechsle ins Service-Verzeichnis:
   ```bash
   git clone https://github.com/MachMarketing/replay-mastery-forge.git
   cd replay-mastery-forge/screp-service
   ```

2. Module herunterladen und aufräumen:
   ```bash
   go mod download
   go mod tidy
   ```

3. Binary bauen:
   ```bash
   go build -o screp-service .
   ```

## Konfiguration

- Der Service hört standardmäßig auf Port `8080`.  
- Du kannst mit der Umgebungsvariable `PORT` einen anderen Port setzen:
  ```bash
  PORT=9000 ./screp-service
  ```

## API

### GET /health

Einfache Health-Check-Route. Gibt `200 OK` zurück, wenn der Service läuft.

### POST /parse

Parst eine `.rep`-Datei und liefert JSON mit den Feldern `players`, `commands` und `header` (`frames`, `mapName`).

- **Content-Type**: `application/octet-stream`  
- **Body**: rohes Replay-File (ArrayBuffer)

**Beispiel**:
```bash
curl -X POST http://localhost:8080/parse \
     -H "Content-Type: application/octet-stream" \
     --data-binary @path/to/replay.rep
```

**Response** (200):
```json
{
  "players": [ /* Array mit Player-Objekten */ ],
  "commands": [ /* Array mit Command-Objekten */ ],
  "header": {
    "frames": 12345,
    "mapName": "Lost Temple"
  }
}
```

## Docker

1. Im `screp-service`-Ordner liegt bereits das Dockerfile, das das Binary baut und einen Health-Check konfiguriert.  
2. Build & Run:
   ```bash
   docker build -t screp-service .
   docker run -p 8080:8080 screp-service
   ```

## Deployment

Am einfachsten via Container-Plattform deiner Wahl:

- Render.com (Docker-Web-Service, Port 8080, Root `screp-service`, Startkommando `./screp-service`)
- Google Cloud Run
- AWS Fargate / ECS
- Azure Container Instances
- Heroku Container Registry  
- u.v.m.

Achte darauf, in deiner Umgebung die **Health-Check-URL** `/health` und den **Parse-Endpoint** `/parse` zu verwenden.

---

So bist du auf alle Änderungen abgestimmt und der Service lässt sich ohne weitere Anpassungen bauen, deployen und betreiben.
