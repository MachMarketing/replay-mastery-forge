
# SCREP Parsing Service

This is a simple web service that utilizes the [SCREP](https://github.com/icza/screp) Go library to parse StarCraft: Brood War replay files.

## Prerequisites

- Go 1.19 or later
- Basic knowledge of running Go applications

## Setup and Installation

1. First, make sure you have Go installed on your system. If not, you can download it from [golang.org](https://golang.org/dl/).

2. Install the dependencies:

```bash
go mod download
```

3. Build the application:

```bash
go build -o screp-server .
```

## Running the Service

Execute the compiled binary:

```bash
./screp-server
```

By default, the server will listen on port 8080. You can change this by setting the PORT environment variable:

```bash
PORT=9000 ./screp-server
```

## API Endpoint

### POST /parse

Parses a StarCraft: Brood War replay file (.rep).

#### Request

- Content-Type: `multipart/form-data`
- Body: Include a file field named "file" containing the replay data

#### Response

- Content-Type: `application/json`
- Body: JSON object containing the parsed replay data

#### Example

```bash
curl -X POST -F "file=@path/to/replay.rep" http://localhost:8080/parse
```

## Deployment Options

### Docker

You can containerize this service using Docker:

1. Create a Dockerfile in this directory:
```dockerfile
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
```

2. Build and run the Docker image:
```bash
docker build -t screp-service .
docker run -p 8080:8080 screp-service
```

### Cloud Deployment

This service can be deployed to various cloud platforms:

- Google Cloud Run
- AWS Lambda with API Gateway
- Heroku
- DigitalOcean App Platform

Choose the platform that best suits your needs and follow their deployment documentation.
