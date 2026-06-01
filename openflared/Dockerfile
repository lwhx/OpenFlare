FROM golang:1.24-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
COPY openflare_server/go.mod openflare_server/go.sum ../openflare_server/
RUN go mod download

COPY openflare_server/ ../openflare_server/
COPY openflared/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o flared ./cmd/flared

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata curl && \
    curl -L -o /tmp/frp.tar.gz https://github.com/fatedier/frp/releases/download/v0.58.0/frp_0.58.0_linux_amd64.tar.gz && \
    tar -xzf /tmp/frp.tar.gz -C /tmp/ && \
    mv /tmp/frp_0.58.0_linux_amd64/frpc /usr/bin/frpc && \
    chmod +x /usr/bin/frpc && \
    rm -rf /tmp/frp*

WORKDIR /app

COPY --from=builder /build/flared .

ENV OPENFLARE_DATA_DIR=/app/data
ENV OPENFLARE_FRPC_PATH=/usr/bin/frpc

CMD ["./flared"]
