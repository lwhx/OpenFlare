// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package tasks

import (
	"context"
	"sync"
	"time"

	"github.com/Rain-kl/Wavelet/internal/apps/openflare/uptimekuma"
	"github.com/Rain-kl/Wavelet/internal/model"
	"github.com/Rain-kl/Wavelet/pkg/logger"
)

var (
	lastUptimeKumaSyncTime time.Time
	uptimeKumaSyncMutex    sync.Mutex
)

func init() {
	registerJob("uptime_kuma_sync", "* * * * *", runUptimeKumaSyncJob)
}

func runUptimeKumaSyncJob(ctx context.Context) {
	if !model.UptimeKumaEnabled {
		return
	}

	interval := model.UptimeKumaSyncInterval
	if interval <= 0 {
		interval = 5
	}

	if time.Since(lastUptimeKumaSyncTime) < time.Duration(interval)*time.Minute {
		return
	}

	if !uptimeKumaSyncMutex.TryLock() {
		logger.WarnF(ctx, "[OpenFlareTasks] Uptime Kuma sync job is already running, skipping this scheduled run")
		return
	}
	defer uptimeKumaSyncMutex.Unlock()

	logger.InfoF(ctx, "[OpenFlareTasks] Starting scheduled Uptime Kuma sync")
	if err := uptimekuma.SyncToUptimeKuma(ctx); err != nil {
		logger.ErrorF(ctx, "[OpenFlareTasks] Uptime Kuma sync failed: %v", err)
		return
	}

	lastUptimeKumaSyncTime = time.Now()
	logger.InfoF(ctx, "[OpenFlareTasks] Uptime Kuma sync completed successfully")
}
