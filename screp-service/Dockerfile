# Stage 1: Build the Go binary
FROM golang:1.19-alpine AS builder
WORKDIR /app

# Copy go.mod/go.sum and disable checksum DB
COPY go.mod go.sum ./
ENV GOSUMDB=off

# Download & tidy modules
RUN go mod download && go mod tidy

# Copy source and build
COPY . ./
RUN go build -o screp-service .

# Stage 2: Production image
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/screp-service .

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./screp-service"]
