# builder stage
FROM golang:1.19-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download && go mod tidy
COPY . .
RUN go build -o screp-service .

# final stage
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/screp-service .
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["./screp-service"]
  
