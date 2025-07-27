FROM golang:1.19-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git

# Copy go mod files
COPY screp-go-service/go.mod go.mod
COPY screp-go-service/go.sum go.sum
RUN go mod download

# Copy source and build
COPY screp-go-service ./
RUN go build -o parser .

FROM alpine:latest
WORKDIR /root/
RUN apk add --no-cache ca-certificates

COPY --from=builder /app/parser .
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./parser"]