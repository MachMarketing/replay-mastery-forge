
# Stage 1: Build & Vendor
FROM golang:1.19-alpine AS builder
WORKDIR /app

# Modul-Dateien kopieren
COPY go.mod go.sum ./

# Dependencies herunterladen & ins vendor-Verzeichnis schreiben
RUN go mod download && go mod vendor

# Quellcode kopieren
COPY . ./

# Aus dem lokalen vendor bauen, kein Online-fetch mehr
RUN go build -mod=vendor -o screp-service .

# Stage 2: Production
FROM alpine:latest
WORKDIR /root/

# Binary aus der Builder-Stage
COPY --from=builder /app/screp-service .

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./screp-service"]
