FROM golang:alpine AS builder
RUN apk add --no-cache git ca-certificates
WORKDIR /src
ADD go.mod go.sum ./
RUN go mod download
ADD . .
RUN go build -o /src/pat

FROM alpine:latest
RUN apk add --no-cache ca-certificates
LABEL org.opencontainers.image.source=https://github.com/9M2PJU/pat
LABEL org.opencontainers.image.description="Pat - A portable Winlink client for amateur radio email"
LABEL org.opencontainers.image.licenses=MIT

COPY --from=builder /src/pat /bin/pat

# Set up the same environment as before
WORKDIR /app
ENV XDG_CONFIG_HOME=/app
ENV XDG_DATA_HOME=/app
ENV XDG_STATE_HOME=/app
ENV PAT_HTTPADDR=:8080
EXPOSE 8080
ENTRYPOINT ["/bin/pat"]
CMD ["http"]
