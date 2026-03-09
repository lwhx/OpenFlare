package sync

import (
	"context"

	"atsflare-agent/internal/nginx"
	"atsflare-agent/internal/protocol"
	"atsflare-agent/internal/state"
)

const (
	ApplyResultSuccess = "success"
	ApplyResultFailed  = "failed"
)

type ConfigClient interface {
	GetActiveConfig(ctx context.Context) (*protocol.ActiveConfigResponse, error)
	ReportApplyLog(ctx context.Context, payload protocol.ApplyLogPayload) error
}

type Service struct {
	client       ConfigClient
	nginxManager *nginx.Manager
	stateStore   *state.Store
}

func New(client ConfigClient, nginxManager *nginx.Manager, stateStore *state.Store) *Service {
	return &Service{
		client:       client,
		nginxManager: nginxManager,
		stateStore:   stateStore,
	}
}

func (s *Service) SyncOnce(ctx context.Context) error {
	snapshot, err := s.stateStore.Load()
	if err != nil {
		return err
	}
	config, err := s.client.GetActiveConfig(ctx)
	if err != nil {
		return err
	}
	if snapshot.CurrentVersion == config.Version && snapshot.CurrentChecksum == config.Checksum {
		return nil
	}
	if err = s.nginxManager.Apply(ctx, config.RenderedConfig); err != nil {
		snapshot.LastError = err.Error()
		_ = s.stateStore.Save(snapshot)
		reportErr := s.client.ReportApplyLog(ctx, protocol.ApplyLogPayload{
			NodeID:  snapshot.NodeID,
			Version: config.Version,
			Result:  ApplyResultFailed,
			Message: err.Error(),
		})
		if reportErr != nil {
			return reportErr
		}
		return err
	}
	snapshot.CurrentVersion = config.Version
	snapshot.CurrentChecksum = config.Checksum
	snapshot.LastError = ""
	if err = s.stateStore.Save(snapshot); err != nil {
		return err
	}
	return s.client.ReportApplyLog(ctx, protocol.ApplyLogPayload{
		NodeID:  snapshot.NodeID,
		Version: config.Version,
		Result:  ApplyResultSuccess,
		Message: "apply success",
	})
}
