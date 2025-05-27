# ─── Builder Stage ───────────────────────────────────────────────────────────
FROM golang:1.19-alpine AS builder
WORKDIR /app

# Module-Caching & tidy
COPY go.mod go.sum ./
RUN go mod download && go mod tidy

# Quellcode kopieren und bauen
COPY . ./
RUN go build -o screp-service .

# ─── Production Stage ────────────────────────────────────────────────────────
FROM alpine:latest
WORKDIR /root/

# Binary aus Builder kopieren
COPY --from=builder /app/screp-service .

# Port und Health-Check
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Start-Kommando
CMD ["./screp-service"]
