
# Stage: Build
FROM golang:1.19-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o screp-service .

# Stage: Production
FROM alpine:latest
WORKDIR /root/
RUN apk add --no-cache wget

COPY --from=builder /app/screp-service .
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./screp-service"]
