
# Build stage
FROM golang:1.19-alpine AS builder
RUN apk add --no-cache git

# Copy the entire screp-service directory
COPY screp-service /app/screp-service
WORKDIR /app/screp-service

# Download modules and build
RUN go mod tidy
RUN go build -o screp-service .

# Production stage
FROM alpine:latest
RUN apk add --no-cache wget
WORKDIR /root

# Copy built binary
COPY --from=builder /app/screp-service/screp-service .  
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./screp-service"]
