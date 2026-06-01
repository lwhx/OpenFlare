package service

import (
	"log/slog"
)

var DefaultFlaredWSHub = NewWSHub("flared")

func RegisterFlaredWSClient(tunnelID string) *WSClient {
	return DefaultFlaredWSHub.Register(tunnelID)
}

func UnregisterFlaredWSClient(client *WSClient) {
	DefaultFlaredWSHub.Unregister(client)
}

func IsFlaredWSConnected(tunnelID string) bool {
	return DefaultFlaredWSHub.IsConnected(tunnelID)
}

func SendFlaredWSPong(tunnelID string) bool {
	return DefaultFlaredWSHub.SendMessage(tunnelID, WSMessage{
		Type: "pong",
	})
}

func SendFlaredWSActiveConfig(tunnelID string, activeConfig *ActiveConfigMeta) bool {
	if activeConfig == nil {
		return false
	}
	return DefaultFlaredWSHub.SendMessage(tunnelID, WSMessage{
		Type:    "active_config",
		Payload: activeConfig,
	})
}

func BroadcastFlaredWSActiveConfig(activeConfig *ActiveConfigMeta) WSBroadcastResult {
	if activeConfig == nil {
		slog.Debug("flared ws broadcast skipped because active config is nil")
		return WSBroadcastResult{}
	}
	res := DefaultFlaredWSHub.Broadcast(WSMessage{
		Type:    "active_config",
		Payload: activeConfig,
	})
	slog.Debug("flared ws broadcast active config",
		"version", activeConfig.Version,
		"checksum", activeConfig.Checksum,
		"client_count", res.ClientCount,
		"success_count", res.SuccessCount,
		"failed_tunnels", res.FailedIDs,
	)
	return res
}
