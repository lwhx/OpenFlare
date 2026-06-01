package controller

import (
	"log/slog"
	"net"
	"openflare/model"
	"openflare/service"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/net/websocket"
)

// FlaredHeartbeat godoc
// @Summary Report OpenFlared client heartbeat
// @Tags Flared
// @Accept json
// @Produce json
// @Security TunnelTokenAuth
// @Param payload body service.FlaredHeartbeatPayload true "Flared heartbeat payload"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /api/flared/heartbeat [post]
func FlaredHeartbeat(c *gin.Context) {
	var payload service.FlaredHeartbeatPayload
	if !bindJSON(c, &payload) {
		return
	}
	authTunnel, ok := c.Get("tunnel")
	if !ok {
		respondUnauthorized(c, "无权进行此操作")
		return
	}
	tunnel := authTunnel.(*model.Tunnel)
	result, err := service.HeartbeatFlared(tunnel, payload)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, result)
}

// FlaredGetActiveConfig godoc
// @Summary Get active tunnel config for OpenFlared client
// @Tags Flared
// @Produce json
// @Security TunnelTokenAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/flared/config/active [get]
func FlaredGetActiveConfig(c *gin.Context) {
	authTunnel, ok := c.Get("tunnel")
	if !ok {
		respondUnauthorized(c, "无权进行此操作")
		return
	}
	tunnel := authTunnel.(*model.Tunnel)
	config, err := service.GetFlaredTunnelConfig(tunnel)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, config)
}

// FlaredReportApplyLog godoc
// @Summary Report apply log for OpenFlared client
// @Tags Flared
// @Accept json
// @Produce json
// @Security TunnelTokenAuth
// @Param payload body service.ApplyLogPayload true "Apply log payload"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /api/flared/apply-log [post]
func FlaredReportApplyLog(c *gin.Context) {
	var payload service.ApplyLogPayload
	if !bindJSON(c, &payload) {
		return
	}
	authTunnel, ok := c.Get("tunnel")
	if !ok {
		respondUnauthorized(c, "无权进行此操作")
		return
	}
	tunnel := authTunnel.(*model.Tunnel)
	payload.NodeID = tunnel.TunnelID
	log, err := service.ReportApplyLog(payload)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, log)
}

// FlaredWebSocket godoc
// @Summary Upgrade OpenFlared connection to websocket
// @Tags Flared
// @Security TunnelTokenAuth
// @Router /api/flared/ws [get]
func FlaredWebSocket(c *gin.Context) {
	authTunnel, ok := c.Get("tunnel")
	if !ok {
		respondUnauthorized(c, "无权进行此操作")
		return
	}
	tunnel := authTunnel.(*model.Tunnel)
	slog.Debug("flared ws upgrade requested", "tunnel_id", tunnel.TunnelID, "remote", c.Request.RemoteAddr)
	websocket.Handler(func(conn *websocket.Conn) {
		client := service.RegisterFlaredWSClient(tunnel.TunnelID)
		defer service.UnregisterFlaredWSClient(client)
		defer func() {
			_ = conn.Close()
			slog.Debug("flared ws connection closed", "tunnel_id", tunnel.TunnelID)
		}()

		slog.Debug("flared ws upgrade succeeded", "tunnel_id", tunnel.TunnelID, "remote", c.Request.RemoteAddr)

		go func() {
			<-client.Done()
			_ = conn.Close()
		}()

		go streamFlaredWSMessages(c, conn, client)

		for {
			var message service.WSMessage
			_ = conn.SetReadDeadline(time.Now().Add(agentWSReadTimeout()))
			if err := websocket.JSON.Receive(conn, &message); err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					slog.Debug("flared ws receive timeout", "tunnel_id", tunnel.TunnelID)
					return
				}
				slog.Debug("flared ws receive failed", "tunnel_id", tunnel.TunnelID, "error", err)
				return
			}
			slog.Debug("flared ws message received", "tunnel_id", tunnel.TunnelID, "type", message.Type)
			switch message.Type {
			case "status":
				// Handle status if needed for flared
			case "ping":
				if !service.SendFlaredWSPong(tunnel.TunnelID) {
					slog.Debug("flared ws pong enqueue failed", "tunnel_id", tunnel.TunnelID)
				}
			case "pong":
				slog.Debug("flared ws pong received", "tunnel_id", tunnel.TunnelID)
			default:
				slog.Debug("flared ws unsupported message type", "tunnel_id", tunnel.TunnelID, "type", message.Type)
			}
		}
	}).ServeHTTP(c.Writer, c.Request)
}

func streamFlaredWSMessages(c *gin.Context, conn *websocket.Conn, client *service.WSClient) {
	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-client.Done():
			return
		case message, ok := <-client.Messages():
			if !ok {
				return
			}
			_ = conn.SetWriteDeadline(time.Now().Add(agentWSWriteTimeout()))
			if err := websocket.JSON.Send(conn, message); err != nil {
				slog.Debug("flared ws send failed", "tunnel_id", client.ID(), "error", err)
				return
			}
		}
	}
}
