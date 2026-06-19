// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package websocket

import (
	"encoding/json"
	"log/slog"
	"time"

	"github.com/gorilla/websocket"
)

func runReadPump(
	nodeID string,
	conn *websocket.Conn,
	closeFn func(),
	logLabel string,
	sendPong func(string) bool,
	clientPongType string,
) {
	defer closeFn()
	_ = conn.SetReadDeadline(time.Now().Add(wsReadDeadline))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(wsReadDeadline))
	})

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			slog.Debug(logLabel+" read closed", "node_id", nodeID, "error", err)
			return
		}

		var message Message
		if err = json.Unmarshal(data, &message); err != nil {
			slog.Debug(logLabel+" invalid message", "node_id", nodeID, "error", err)
			continue
		}

		switch message.Type {
		case messageTypePing:
			_ = sendPong(nodeID)
		case clientPongType:
		default:
			slog.Debug(logLabel+" unsupported message", "node_id", nodeID, "type", message.Type)
		}
	}
}
