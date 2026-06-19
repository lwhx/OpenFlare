// Package geoipupdate schedules local MaxMind GeoIP database updates for the agent.
package geoipupdate

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/Rain-kl/Wavelet/internal/apps/agent/geoipdata"
	"github.com/Rain-kl/Wavelet/pkg/geoip"
)

const (
	mmdbDirPerm  = 0o750
	mmdbFilePerm = 0o600
)

// Updater periodically downloads a fresh GeoIP MMDB file and seeds the
// initial embedded database when none is present on disk.
type Updater struct {
	MMDBPath       string
	DownloadURL    string
	UpdateInterval time.Duration
}

// EnsureInitialDatabase seeds the MMDB file from the embedded database if it does not exist on disk.
func (u *Updater) EnsureInitialDatabase() error {
	path := filepath.Clean(u.MMDBPath)
	if path == "" || path == "." {
		return nil
	}
	if _, err := os.Stat(path); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("stat mmdb file failed: %w", err)
	}
	data, err := fs.ReadFile(geoipdata.FS, geoipdata.DefaultMMDBName)
	if err != nil {
		return fmt.Errorf("read embedded mmdb failed: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(path), mmdbDirPerm); err != nil {
		return fmt.Errorf("create mmdb directory failed: %w", err)
	}
	if err := os.WriteFile(path, data, mmdbFilePerm); err != nil {
		return fmt.Errorf("write initial mmdb failed: %w", err)
	}
	slog.Info("initialized GeoIP mmdb from embedded database", "path", path, "size", len(data))
	return nil
}

// Run starts the periodic GeoIP update loop and blocks until ctx is cancelled.
func (u *Updater) Run(ctx context.Context) {
	if u == nil || u.MMDBPath == "" || u.UpdateInterval <= 0 {
		return
	}
	if err := u.EnsureInitialDatabase(); err != nil {
		slog.Warn("initialize GeoIP mmdb failed", "path", u.MMDBPath, "error", err)
	}
	ticker := time.NewTicker(u.UpdateInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := geoip.DownloadMaxMindDatabase(ctx, u.MMDBPath, u.DownloadURL); err != nil {
				slog.Warn("update GeoIP mmdb failed", "path", u.MMDBPath, "error", err)
				continue
			}
			slog.Info("GeoIP mmdb updated", "path", u.MMDBPath)
		}
	}
}
