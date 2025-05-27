
FROM golang:1.19-alpine as builder

WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY main.go ./

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o screp-server .

# Create production image
FROM alpine:latest

# Install necessary runtime dependencies
RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /app/screp-server .

# Set proper permissions
RUN chmod +x /app/screp-server

# Expose the port the server listens on
EXPOSE 8000

# Tell SCREP server to listen on all interfaces
ENV HOST=0.0.0.0
ENV PORT=8000
ENV CORS_ORIGIN=*

# Command to run the server
CMD ["/app/screp-server"]
