package agent

import (
	"context"
	"errors"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"atsflare-agent/internal/config"
	"atsflare-agent/internal/protocol"
	"atsflare-agent/internal/state"
)

type fakeHeartbeatService struct {
	mu             sync.Mutex
	registerCalls  int
	heartbeatCalls int
	registerErr    error
	heartbeatErrs  []error
	onHeartbeat    func(int)
}

func (f *fakeHeartbeatService) Register(ctx context.Context, payload protocol.NodePayload) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.registerCalls++
	return f.registerErr
}

func (f *fakeHeartbeatService) Heartbeat(ctx context.Context, payload protocol.NodePayload) error {
	f.mu.Lock()
	f.heartbeatCalls++
	callIndex := f.heartbeatCalls
	var err error
	if len(f.heartbeatErrs) >= callIndex {
		err = f.heartbeatErrs[callIndex-1]
	}
	onHeartbeat := f.onHeartbeat
	f.mu.Unlock()
	if onHeartbeat != nil {
		onHeartbeat(callIndex)
	}
	return err
}

type fakeSyncService struct {
	mu             sync.Mutex
	startupErr     error
	syncOnceErr    error
	startupCalls   int
	syncOnceCalls  int
	onSyncOnceCall func(int)
}

func (f *fakeSyncService) SyncOnStartup(ctx context.Context) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.startupCalls++
	return f.startupErr
}

func (f *fakeSyncService) SyncOnce(ctx context.Context) error {
	f.mu.Lock()
	f.syncOnceCalls++
	callIndex := f.syncOnceCalls
	callback := f.onSyncOnceCall
	f.mu.Unlock()
	if callback != nil {
		callback(callIndex)
	}
	return f.syncOnceErr
}

func TestRunnerKeepsHeartbeatWhenStartupSyncFails(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	stateStore := state.NewStore(filepath.Join(t.TempDir(), "state.json"))
	heartbeatService := &fakeHeartbeatService{
		onHeartbeat: func(callCount int) {
			if callCount >= 2 {
				cancel()
			}
		},
	}
	syncService := &fakeSyncService{
		startupErr: errors.New("当前没有激活版本，保持当前 Nginx 配置"),
	}
	runner := &Runner{
		Config: &config.Config{
			NodeName:          "edge-01",
			NodeIP:            "10.0.0.8",
			AgentVersion:      "0.1.0",
			NginxVersion:      "1.25.5",
			HeartbeatInterval: 10 * time.Millisecond,
			SyncInterval:      20 * time.Millisecond,
		},
		StateStore:       stateStore,
		HeartbeatService: heartbeatService,
		SyncService:      syncService,
	}

	err := runner.Run(ctx)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context cancellation, got %v", err)
	}
	if heartbeatService.registerCalls != 1 {
		t.Fatalf("expected 1 register call, got %d", heartbeatService.registerCalls)
	}
	if heartbeatService.heartbeatCalls < 2 {
		t.Fatalf("expected heartbeat loop to continue, got %d heartbeat calls", heartbeatService.heartbeatCalls)
	}
	snapshot, loadErr := stateStore.Load()
	if loadErr != nil {
		t.Fatalf("failed to load state: %v", loadErr)
	}
	if snapshot.LastError != "当前没有激活版本，保持当前 Nginx 配置" {
		t.Fatalf("expected startup sync error to be recorded, got %q", snapshot.LastError)
	}
}

func TestRunnerDoesNotExitOnHeartbeatOrSyncError(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	stateStore := state.NewStore(filepath.Join(t.TempDir(), "state.json"))
	heartbeatService := &fakeHeartbeatService{
		registerErr:   errors.New("register timeout"),
		heartbeatErrs: []error{errors.New("heartbeat timeout")},
	}
	syncService := &fakeSyncService{
		syncOnceErr: errors.New("nginx reload failed"),
		onSyncOnceCall: func(callCount int) {
			if callCount >= 1 {
				cancel()
			}
		},
	}
	runner := &Runner{
		Config: &config.Config{
			NodeName:          "edge-01",
			NodeIP:            "10.0.0.8",
			AgentVersion:      "0.1.0",
			NginxVersion:      "1.25.5",
			HeartbeatInterval: 10 * time.Millisecond,
			SyncInterval:      10 * time.Millisecond,
		},
		StateStore:       stateStore,
		HeartbeatService: heartbeatService,
		SyncService:      syncService,
	}

	err := runner.Run(ctx)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context cancellation, got %v", err)
	}
	if heartbeatService.registerCalls != 1 {
		t.Fatalf("expected register attempt, got %d", heartbeatService.registerCalls)
	}
	if syncService.syncOnceCalls == 0 {
		t.Fatal("expected sync loop to continue after heartbeat/register errors")
	}
	snapshot, loadErr := stateStore.Load()
	if loadErr != nil {
		t.Fatalf("failed to load state: %v", loadErr)
	}
	if snapshot.LastError != "nginx reload failed" {
		t.Fatalf("expected sync error to be recorded, got %q", snapshot.LastError)
	}
}
