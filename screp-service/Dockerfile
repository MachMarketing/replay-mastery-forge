
FROM golang:1.19-alpine as builder

WORKDIR /app
COPY . .

RUN go mod download
RUN go build -o screp-server .

FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/screp-server .

EXPOSE 8080

CMD ["./screp-server"]
