
# builder stage
FROM golang:1.19-alpine AS builder
WORKDIR /app
# Copy go.mod and go.sum first for dependency caching
COPY go.mod go.sum ./
# Download modules
RUN go mod download
# Copy the full source code
COPY . ./
# Tidy modules to include subpackages
RUN go mod tidy
# Build the service binary
RUN go build -o screp-service .

# final stage
FROM alpine:latest
WORKDIR /root/
# Copy the built binary
COPY --from=builder /app/screp-service .
# Expose port
EXPOSE 8080
# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8080/health || exit 1
# Start command
CMD ["./screp-service"]
