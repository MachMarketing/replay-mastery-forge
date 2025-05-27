
# Stage 1: Build using local vendor directory
FROM golang:1.19-alpine AS builder
WORKDIR /app

# Copy entire source, including vendor
COPY . ./

# Build with vendor modules only (no network access needed)
RUN go build -mod=vendor -o screp-service .

# Stage 2: Production
FROM alpine:latest
WORKDIR /root/

# Binary aus der Builder-Stage
COPY --from=builder /app/screp-service .

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./screp-service"]
