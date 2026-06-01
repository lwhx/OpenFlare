FROM golang:1.25-alpine AS builder

WORKDIR /build

COPY openflare_relay/go.mod openflare_relay/go.sum ./
COPY openflare_server /openflare_server
COPY openflare_relay /openflare_relay

WORKDIR /openflare_relay
RUN CGO_ENABLED=0 GOOS=linux go build -o openflare-relay ./cmd/relay

# Final runtime image
FROM fatedier/frps:v0.69.0

# Copy openflare-relay binary
COPY --from=builder /openflare_relay/openflare-relay /usr/local/bin/openflare-relay

VOLUME ["/var/lib/openflare-relay"]

ENV OPENFLARE_FRPS_PATH=/usr/bin/frps
ENV OPENFLARE_DATA_DIR=/var/lib/openflare-relay

ENTRYPOINT ["/usr/local/bin/openflare-relay"]
