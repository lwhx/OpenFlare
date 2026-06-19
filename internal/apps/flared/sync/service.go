// Package sync periodically fetches and applies the active tunnel configuration.
package sync

import (
	"context"
	"log/slog"
	"time"

	"github.com/Rain-kl/Wavelet/internal/apps/flared/config"
	"github.com/Rain-kl/Wavelet/internal/apps/flared/frpc"
	"github.com/Rain-kl/Wavelet/internal/apps/flared/httpclient"
	service "github.com/Rain-kl/Wavelet/pkg/protocol"
)

// Service synchronizes tunnel configuration from the control plane to the local frpc manager.
type Service struct {
	client      *httpclient.Client
	frpcManager *frpc.Manager
	config      *config.Config
	triggerCh   chan struct{}
}

// New creates a sync service with the given client, frpc manager, and config.
func New(client *httpclient.Client, manager *frpc.Manager, cfg *config.Config) *Service {
	return &Service{
		client:      client,
		frpcManager: manager,
		config:      cfg,
		triggerCh:   make(chan struct{}, 1),
	}
}

// Trigger requests an immediate configuration sync without waiting for the next interval.
func (s *Service) Trigger() {
	select {
	case s.triggerCh <- struct{}{}:
	default:
	}
}

// Run starts the sync loop until ctx is canceled.
func (s *Service) Run(ctx context.Context) {
	ticker := time.NewTicker(s.config.SyncInterval.Duration())
	defer ticker.Stop()

	// initial sync
	s.doSync(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.doSync(ctx)
		case <-s.triggerCh:
			s.doSync(ctx)
		}
	}
}

func (s *Service) doSync(ctx context.Context) {
	slog.Debug("fetching active tunnel config")
	configResp, err := s.client.GetActiveConfig(ctx)
	if err != nil {
		slog.Error("failed to fetch active tunnel config", "error", err)
		return
	}

	// 不在 sync 层做版本早退，由 frpcManager.UpdateConfig 负责判断。
	// 原因：重启后进程全部消失，即使版本/checksum 未变，仍需重新拉起 frpc 进程。
	err = s.frpcManager.UpdateConfig(ctx, configResp)

	result := "success"
	message := "apply success"
	if err != nil {
		result = "failed"
		message = err.Error()
		slog.Error("failed to apply tunnel config", "error", err)
	} else {
		slog.Info("tunnel config applied successfully", "version", configResp.Version)
	}

	// Report apply log
	logPayload := service.ApplyLogPayload{
		Version:  configResp.Version,
		Result:   result,
		Message:  message,
		Checksum: configResp.Checksum,
	}
	if reportErr := s.client.ReportApplyLog(ctx, logPayload); reportErr != nil {
		slog.Error("failed to report apply log", "error", reportErr)
	}
}
