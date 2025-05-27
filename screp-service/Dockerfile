
# Stage 1: Vendor dependencies
FROM golang:1.19-alpine AS vendor

# Install git for module download
RUN apk add --no-cache git

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download && go mod vendor

# Stage 2: Build binary using vendor directory
FROM golang:1.19-alpine AS builder
WORKDIR /app

# Copy vendored modules and source
COPY --from=vendor /app/vendor ./vendor
COPY . ./

# Build with vendor
RUN go build -mod=vendor -o screp-service .

# Stage 3: Production image
FROM alpine:latest
WORKDIR /root/

# Copy built binary
COPY --from=builder /app/screp-service .

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./screp-service"]
