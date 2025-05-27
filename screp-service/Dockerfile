

# Stage 1: Prepare vendor directory
FROM golang:1.19-alpine AS vendor
WORKDIR /app

# Install git for go mod download
RUN apk add --no-cache git

# Copy go files
COPY go.mod go.sum ./

# Disable checksum verification and create vendor directory
ENV GOSUMDB=off
ENV GOPROXY=direct
RUN go mod download
RUN go mod vendor

# Stage 2: Build using vendored dependencies
FROM golang:1.19-alpine AS builder
WORKDIR /app

# Copy vendor directory from previous stage
COPY --from=vendor /app/vendor ./vendor

# Copy source files
COPY . ./

# Build with vendor modules only (no network access needed)
RUN go build -mod=vendor -o screp-service .

# Stage 3: Production
FROM alpine:latest
WORKDIR /root/

# Binary aus der Builder-Stage
COPY --from=builder /app/screp-service .

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./screp-service"]

