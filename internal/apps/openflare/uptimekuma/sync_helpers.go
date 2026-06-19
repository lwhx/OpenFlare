// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package uptimekuma

import (
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/Rain-kl/Wavelet/internal/model"
)

const monitorListWaitTimeout = 5 * time.Second

func validateUptimeKumaConfig() (string, string, string, error) {
	kumaURL := strings.TrimSpace(model.UptimeKumaURL)
	kumaUsername := strings.TrimSpace(model.UptimeKumaUsername)
	kumaPassword := strings.TrimSpace(model.UptimeKumaPassword)
	if kumaURL == "" || kumaUsername == "" || kumaPassword == "" {
		return kumaURL, kumaUsername, kumaPassword, fmt.Errorf(
			"uptime Kuma URL, username, or password is not configured (URL: %q, Username: %q, PasswordLength: %d)",
			kumaURL, kumaUsername, len(kumaPassword),
		)
	}
	return kumaURL, kumaUsername, kumaPassword, nil
}

func connectAndLoginUptimeKuma(kumaURL, kumaUsername, kumaPassword string) (*SocketIOClient, error) {
	slog.Debug("Connecting to Uptime Kuma socket endpoint", "url", kumaURL)
	client := NewSocketIOClient(kumaURL)
	if err := client.Connect(); err != nil {
		slog.Error("Failed to connect to Uptime Kuma endpoint", "url", kumaURL, "error", err)
		return nil, fmt.Errorf("failed to connect to Uptime Kuma: %w", err)
	}

	slog.Debug("Sending login request to Uptime Kuma", "username", kumaUsername)
	loginAck, err := client.Emit("login", map[string]string{
		"username": kumaUsername,
		"password": kumaPassword,
	})
	if err != nil {
		client.Close()
		slog.Error("Failed to send login request to Uptime Kuma", "username", kumaUsername, "error", err)
		return nil, fmt.Errorf("login request failed: %w", err)
	}

	var loginResult struct {
		Ok bool `json:"ok"`
	}
	if err := ParseAckResponse(loginAck, &loginResult); err != nil || !loginResult.Ok {
		client.Close()
		slog.Error("Uptime Kuma login verification failed", "username", kumaUsername, "error", err)
		return nil, fmt.Errorf("login failed: %w", err)
	}
	slog.Debug("Successfully logged into Uptime Kuma", "username", kumaUsername)

	slog.Debug("Waiting for monitor list push from Uptime Kuma")
	select {
	case <-client.GetMonitorListChan():
		slog.Debug("Received monitor list from Uptime Kuma")
	case <-time.After(monitorListWaitTimeout):
		client.Close()
		slog.Error("Timeout waiting for Uptime Kuma monitorList push event")
		return nil, fmt.Errorf("timeout waiting for monitorList event from Uptime Kuma")
	}
	return client, nil
}

func syncRouteMonitors(client *SocketIOClient, expectedRoutes []*model.ProxyRoute, existingMonitors map[string]Monitor, openFlareTagID int) map[string]bool {
	expectedSitesMap := make(map[string]bool, len(expectedRoutes))
	for _, route := range expectedRoutes {
		expectedSitesMap[route.SiteName] = true
		targetURL, urlErr := routeMonitorURL(route)
		if urlErr != nil {
			slog.Error("Failed to resolve monitor URL", "name", route.SiteName, "error", urlErr)
			continue
		}

		existing, exists := existingMonitors[route.SiteName]
		if !exists {
			if err := createMonitor(client, route.SiteName, targetURL, openFlareTagID); err != nil {
				slog.Error("Failed to add monitor to Uptime Kuma", "name", route.SiteName, "error", err)
			}
			continue
		}
		if monitorNeedsUpdate(existing, targetURL) {
			if err := updateMonitor(client, existing.ID, route.SiteName, targetURL); err != nil {
				slog.Error("Failed to edit monitor in Uptime Kuma", "name", route.SiteName, "error", err)
			}
		}
	}
	return expectedSitesMap
}

func removeStaleMonitors(client *SocketIOClient, existingMonitors map[string]Monitor, expectedSitesMap map[string]bool) {
	for name, monitor := range existingMonitors {
		if expectedSitesMap[name] {
			continue
		}
		slog.Info("Deleting monitor in Uptime Kuma", "name", name, "monitorID", monitor.ID)
		deleteAck, err := client.Emit("deleteMonitor", monitor.ID)
		if err != nil {
			slog.Error("Failed to delete monitor in Uptime Kuma", "name", name, "monitorID", monitor.ID, "error", err)
			continue
		}
		if err := ParseAckResponse(deleteAck, nil); err != nil {
			slog.Error("Failed to parse delete monitor result", "name", name, "monitorID", monitor.ID, "error", err)
		}
	}
}
