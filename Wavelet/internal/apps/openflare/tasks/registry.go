// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package tasks

import (
	"context"
	"sync"

	"github.com/Rain-kl/Wavelet/pkg/logger"
	"github.com/robfig/cron/v3"
)

type cronJob struct {
	name string
	spec string
	run  func(context.Context)
}

var (
	registryMu sync.Mutex
	started    bool
	cronJobs   []cronJob
	cronRunner *cron.Cron
	jobCtx     context.Context
	jobCancel  context.CancelFunc
)

func registerJob(name, cronSpec string, fn func(context.Context)) {
	registryMu.Lock()
	defer registryMu.Unlock()
	cronJobs = append(cronJobs, cronJob{name: name, spec: cronSpec, run: fn})
}

// RegisterCronJob registers a cron job from another OpenFlare package (for example waf).
// Prefer registerJob from init() inside this package when possible.
func RegisterCronJob(name, cronSpec string, fn func(context.Context)) {
	registerJob(name, cronSpec, fn)
}

// LogJobError records a failed OpenFlare cron job run.
func LogJobError(ctx context.Context, name string, err error) {
	logger.ErrorF(ctx, "[OpenFlareTasks] %s failed: %v", name, err)
}

// Start launches the cron scheduler in a background goroutine. Safe to call multiple times.
func Start(ctx context.Context) {
	registryMu.Lock()
	defer registryMu.Unlock()
	if started {
		return
	}

	jobCtx, jobCancel = context.WithCancel(context.Background())
	runner := cron.New()
	for _, job := range cronJobs {
		current := job
		if _, err := runner.AddFunc(current.spec, func() {
			current.run(jobCtx)
		}); err != nil {
			logger.ErrorF(ctx, "[OpenFlareTasks] register cron job %q failed: %v", current.name, err)
			continue
		}
		logger.InfoF(ctx, "[OpenFlareTasks] registered cron job %q (%s)", current.name, current.spec)
	}
	runner.Start()
	cronRunner = runner
	started = true
}

// Stop shuts down the cron scheduler gracefully and cancels job contexts.
func Stop() {
	registryMu.Lock()
	defer registryMu.Unlock()
	if !started || cronRunner == nil {
		return
	}

	stopCtx := cronRunner.Stop()
	<-stopCtx.Done()
	if jobCancel != nil {
		jobCancel()
	}

	cronRunner = nil
	started = false
	jobCtx = nil
	jobCancel = nil
}

// ResetRegistryForTest clears scheduler state so unit tests can call Start again.
func ResetRegistryForTest() {
	Stop()
	registryMu.Lock()
	defer registryMu.Unlock()
	cronJobs = nil
}
