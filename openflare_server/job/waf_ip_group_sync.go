package job

import (
	"log/slog"
	"openflare/service"
)

type WAFIPGroupSyncJob struct{}

func (j *WAFIPGroupSyncJob) Run() {
	if err := service.SyncDueWAFIPGroups(); err != nil {
		slog.Error("failed to sync due waf ip groups", "error", err)
	}
}
