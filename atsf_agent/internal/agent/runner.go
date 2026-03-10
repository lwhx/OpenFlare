package agent

import (
	"context"
	"log"
	"time"

	"atsflare-agent/internal/config"
	"atsflare-agent/internal/protocol"
	"atsflare-agent/internal/state"
)

type HeartbeatService interface {
	Register(ctx context.Context, payload protocol.NodePayload) error
	Heartbeat(ctx context.Context, payload protocol.NodePayload) error
}

type SyncService interface {
	SyncOnStartup(ctx context.Context) error
	SyncOnce(ctx context.Context) error
}

type Runner struct {
	Config           *config.Config
	StateStore       *state.Store
	HeartbeatService HeartbeatService
	SyncService      SyncService
}

func (r *Runner) Run(ctx context.Context) error {
	nodeID, err := r.StateStore.EnsureNodeID()
	if err != nil {
		return err
	}
	if err = r.HeartbeatService.Register(ctx, r.nodePayload(nodeID)); err != nil {
		log.Printf("agent register failed: %v", err)
	}
	if err = r.SyncService.SyncOnStartup(ctx); err != nil {
		r.recordSyncError(err)
		log.Printf("agent startup sync failed: %v", err)
	}
	if err = r.HeartbeatService.Heartbeat(ctx, r.nodePayload(nodeID)); err != nil {
		log.Printf("agent startup heartbeat failed: %v", err)
	}

	heartbeatTicker := time.NewTicker(r.Config.HeartbeatInterval)
	defer heartbeatTicker.Stop()
	syncTicker := time.NewTicker(r.Config.SyncInterval)
	defer syncTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-heartbeatTicker.C:
			if err = r.HeartbeatService.Heartbeat(ctx, r.nodePayload(nodeID)); err != nil {
				log.Printf("agent heartbeat failed: %v", err)
			}
		case <-syncTicker.C:
			if err = r.SyncService.SyncOnce(ctx); err != nil {
				r.recordSyncError(err)
				log.Printf("agent sync failed: %v", err)
			}
		}
	}
}

func (r *Runner) recordSyncError(err error) {
	if err == nil || r.StateStore == nil {
		return
	}
	snapshot, loadErr := r.StateStore.Load()
	if loadErr != nil {
		log.Printf("load state before recording sync error failed: %v", loadErr)
		return
	}
	snapshot.LastError = err.Error()
	if saveErr := r.StateStore.Save(snapshot); saveErr != nil {
		log.Printf("save state after sync error failed: %v", saveErr)
	}
}

func (r *Runner) nodePayload(nodeID string) protocol.NodePayload {
	snapshot, _ := r.StateStore.Load()
	return protocol.NodePayload{
		NodeID:         nodeID,
		Name:           r.Config.NodeName,
		IP:             r.Config.NodeIP,
		AgentVersion:   r.Config.AgentVersion,
		NginxVersion:   r.Config.NginxVersion,
		CurrentVersion: snapshot.CurrentVersion,
		LastError:      snapshot.LastError,
	}
}
