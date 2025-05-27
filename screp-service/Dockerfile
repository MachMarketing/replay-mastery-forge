
# Build-Stage
FROM golang:1.19-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git

# Module und Code kopieren, dann bauen
COPY screp-service/go.mod screp-service/go.sum ./
RUN go mod download
COPY screp-service ./
RUN go build -o screp-service .

# Production-Stage
FROM alpine:latest
WORKDIR /root
RUN apk add --no-cache wget

COPY --from=builder /app/screp-service .
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./screp-service"]
