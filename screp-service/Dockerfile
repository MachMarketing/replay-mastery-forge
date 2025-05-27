
# Build-Stage
FROM golang:1.23-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git

# Copy go.mod first for better caching
COPY go.mod ./

# Initialize and download dependencies - this will create a fresh go.sum
RUN go mod tidy && go mod download

# Copy source code
COPY . .

# Run go mod tidy again to ensure everything is up to date, then build
RUN go mod tidy && go build -o screp-service .

# Production-Stage
FROM alpine:latest

WORKDIR /root
RUN apk add --no-cache ca-certificates wget

COPY --from=builder /app/screp-service .

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./screp-service"]
