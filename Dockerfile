
# Stage: Build
FROM golang:1.19-alpine AS builder
WORKDIR /build
RUN apk add --no-cache git

# Copy entire repo
COPY . .

# Build screp-service
WORKDIR /build/screp-service
RUN go mod tidy
RUN go build -o screp-service .

# Stage: Production
FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache wget

COPY --from=builder /build/screp-service/screp-service .
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./screp-service"]
