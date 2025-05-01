
# StarCraft Replay Parser Test Utility

Dieses Verzeichnis enthält Werkzeuge zum Testen des StarCraft-Replay-Parsers.

## Voraussetzungen

- Node.js (v14+)
- Eine StarCraft Brood War Replay-Datei (.rep)

## Ausführen des Tests

### Mit dem Shell-Skript

```bash
# Machen Sie das Skript ausführbar
chmod +x ./test-parser.sh

# Ausführen mit Standard-Testdatei (wird automatisch gesucht)
./test-parser.sh

# Oder eine spezifische Datei angeben
./test-parser.sh pfad/zu/ihrem/replay.rep

# Debug-Modus aktivieren (für ausführlichere Logs)
./test-parser.sh --debug
```

### Mit npx direkt

```bash
# Ausführen mit Standard-Testdatei
npx ts-node ./src/test/parserTest.ts

# Oder eine spezifische Datei angeben
npx ts-node ./src/test/parserTest.ts pfad/zu/ihrem/replay.rep
```

## Test-Fixtures

Legen Sie Ihre Test-Replay-Dateien (.rep) im Verzeichnis `fixtures` ab, damit sie automatisch vom Testskript erkannt werden.

## Erwartete Ergebnisse

Ein erfolgreicher Test sollte Folgendes anzeigen:
- Spielerinformationen (Namen, Rassen)
- Karte
- Spielergebnis (Sieg/Niederlage)
- Spielzeit
- APM (Actions per Minute)
- Build Order

## Browser-Tests

Für Browser-Tests wurde eine zusätzliche Funktion `runBrowserParserTest` implementiert, die direkt mit einem File-Objekt arbeitet. Dies kann in Cypress oder Playwright-Tests verwendet werden.
