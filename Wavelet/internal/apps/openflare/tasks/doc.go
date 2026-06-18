// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

// Package tasks is the single home for OpenFlare scheduled and background work
// that runs inside the API process (goroutines plus robfig/cron), not the Asynq
// worker or scheduler.
//
// Each job lives in its own file and registers via registerJob in init(). This
// layout is intentional so jobs can migrate to a future task framework without
// changing call sites: swap the registry implementation while keeping per-job files.
//
// Wire-up: bootstrap.RegisterOpenFlareBackgroundTasks imports this package so
// init() registrations run; bootstrap.Init starts the cron scheduler when the
// process serves the HTTP API.
package tasks
