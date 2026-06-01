package flared

import (
	"context"
	"log/slog"
	"time"

	"openflare-flared/internal/config"
	"openflare-flared/internal/frpc"
	"openflare-flared/internal/heartbeat"
	"openflare-flared/internal/httpclient"
	"openflare-flared/internal/sync"
	"openflare-flared/internal/wsclient"
)

type Runner struct {
	Config           *config.Config
	HeartbeatService *heartbeat.Service
	FrpcManager      *frpc.Manager
	SyncService      *sync.Service
	WebSocketService *wsclient.Client
	HttpClient       *httpclient.Client
}

func (r *Runner) Run(ctx context.Context) error {
	// Start background services
	go r.HeartbeatService.Run(ctx)
	go r.SyncService.Run(ctx)

	// WebSocket reconnection loop
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		conn, err := r.WebSocketService.Connect(ctx)
		if err != nil {
			slog.Error("flared ws connect failed, will retry", "error", err)
			r.sleepContext(ctx, 5*time.Second)
			continue
		}

		r.handleConnection(ctx, conn)
		_ = conn.Close()
		slog.Info("flared ws connection closed, reconnecting...")
		r.sleepContext(ctx, 2*time.Second)
	}
}

func (r *Runner) handleConnection(ctx context.Context, conn *wsclient.Connection) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		msg, err := conn.Receive()
		if err != nil {
			slog.Error("flared ws receive failed", "error", err)
			return
		}

		switch msg.Type {
		case "ping":
			_ = conn.SendPong()
		case "active_config":
			// Server notifies there is a new config available
			slog.Info("received config update notification from server")
			r.SyncService.Trigger()
		default:
			slog.Debug("ignored unknown ws message type", "type", msg.Type)
		}
	}
}

func (r *Runner) sleepContext(ctx context.Context, d time.Duration) {
	select {
	case <-ctx.Done():
	case <-time.After(d):
	}
}
