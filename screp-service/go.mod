Öffne screp-service/go.mod und ändere ihn zu folgender Version:
module screp-service

go 1.19

require (
  github.com/gorilla/mux v1.8.0
  github.com/joho/godotenv v1.4.0
  github.com/icza/screp v1.7.1

  // explizit die Sub-Packages für den Parser
  github.com/icza/screp/rep v1.7.1
  github.com/icza/screp/repparser v1.7.1
)
