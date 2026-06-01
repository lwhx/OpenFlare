package heartbeat

import (
	"context"
	"log/slog"
	"time"

	"openflare-flared/internal/config"
	"openflare-flared/internal/frpc"
	"openflare-flared/internal/httpclient"
	"openflare/service"
)

type Service struct {
	client      *httpclient.Client
	frpcManager *frpc.Manager
	config      *config.Config
}

func New(client *httpclient.Client, manager *frpc.Manager, cfg *config.Config) *Service {
	return &Service{
		client:      client,
		frpcManager: manager,
		config:      cfg,
	}
}

func (s *Service) Run(ctx context.Context) {
	ticker := time.NewTicker(s.config.HeartbeatInterval.Duration())
	defer ticker.Stop()

	// initial heartbeat
	s.doHeartbeat(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.doHeartbeat(ctx)
		}
	}
}

func (s *Service) doHeartbeat(ctx context.Context) {
	slog.Debug("sending flared heartbeat")

	payload := service.FlaredHeartbeatPayload{
		ClientVersion:   "0.1.0", // TODO dynamically inject build version
		FrpVersion:      s.frpcManager.GetVersion(),
		TunnelStatus:    "running", // TODO implement proper status tracking
		ConnectedRelays: s.frpcManager.GetConnectedRelays(),
		CurrentVersion:  s.frpcManager.GetCurrentConfigVersion(),
		CurrentChecksum: s.frpcManager.GetCurrentConfigChecksum(),
	}

	_, err := s.client.Heartbeat(ctx, payload)
	if err != nil {
		slog.Error("flared heartbeat failed", "error", err)
		return
	}
	slog.Debug("flared heartbeat succeeded")
}
