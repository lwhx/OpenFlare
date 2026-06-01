package service

import (
	"encoding/json"
	"errors"
	"log/slog"
	"openflare/model"
	"strings"
	"time"
)

type TunnelInput struct {
	Name   string `json:"name"`
	Remark string `json:"remark"`
}

type TunnelView struct {
	ID              uint      `json:"id"`
	TunnelID        string    `json:"tunnel_id"`
	Name            string    `json:"name"`
	TunnelToken     string    `json:"tunnel_token"`
	Status          string    `json:"status"`
	ClientVersion   string    `json:"client_version"`
	FrpVersion      string    `json:"frp_version"`
	LastSeenAt      time.Time `json:"last_seen_at"`
	LastError       string    `json:"last_error"`
	CurrentVersion  string    `json:"current_version"`
	CurrentChecksum string    `json:"current_checksum"`
	ConnectedRelays []string  `json:"connected_relays"`
	Remark          string    `json:"remark"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func ListTunnels() ([]*TunnelView, error) {
	tunnels, err := model.ListTunnels()
	if err != nil {
		return nil, err
	}
	views := make([]*TunnelView, 0, len(tunnels))
	for _, tunnel := range tunnels {
		views = append(views, buildTunnelView(tunnel))
	}
	return views, nil
}

func GetTunnel(id uint) (*TunnelView, error) {
	tunnel, err := model.GetTunnelByID(id)
	if err != nil {
		return nil, err
	}
	return buildTunnelView(tunnel), nil
}

func CreateTunnel(input TunnelInput) (*TunnelView, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("Tunnel 名称不能为空")
	}
	tunnelID, err := newTunnelID()
	if err != nil {
		return nil, err
	}
	tunnelToken, err := newRandomToken()
	if err != nil {
		return nil, err
	}
	tunnel := &model.Tunnel{
		TunnelID:    tunnelID,
		Name:        name,
		TunnelToken: tunnelToken,
		Status:      "offline",
		Remark:      strings.TrimSpace(input.Remark),
	}
	if err := tunnel.Insert(); err != nil {
		if model.IsUniqueConstraintError(err) {
			return nil, errors.New("Tunnel 标识生成冲突，请重试")
		}
		return nil, err
	}
	slog.Info("tunnel created", "name", tunnel.Name, "tunnel_id", tunnel.TunnelID)
	return buildTunnelView(tunnel), nil
}

func UpdateTunnel(id uint, input TunnelInput) (*TunnelView, error) {
	tunnel, err := model.GetTunnelByID(id)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("Tunnel 名称不能为空")
	}
	tunnel.Name = name
	tunnel.Remark = strings.TrimSpace(input.Remark)
	if err := tunnel.Update(); err != nil {
		return nil, err
	}
	slog.Info("tunnel updated", "name", tunnel.Name, "tunnel_id", tunnel.TunnelID)
	return buildTunnelView(tunnel), nil
}

func DeleteTunnel(id uint) error {
	tunnel, err := model.GetTunnelByID(id)
	if err != nil {
		return err
	}
	slog.Info("tunnel deleted", "name", tunnel.Name, "tunnel_id", tunnel.TunnelID)
	return tunnel.Delete()
}

func RotateTunnelToken(id uint) (*TunnelView, error) {
	tunnel, err := model.GetTunnelByID(id)
	if err != nil {
		return nil, err
	}
	newToken, err := newRandomToken()
	if err != nil {
		return nil, err
	}
	tunnel.TunnelToken = newToken
	if err := tunnel.Update(); err != nil {
		return nil, err
	}
	slog.Info("tunnel token rotated", "tunnel_id", tunnel.TunnelID)
	return buildTunnelView(tunnel), nil
}

func AuthenticateTunnelToken(token string) (*model.Tunnel, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, errors.New("缺少 Tunnel Token")
	}
	tunnel, err := model.GetTunnelByTunnelToken(token)
	if err != nil {
		return nil, errors.New("Tunnel Token 无效")
	}
	return tunnel, nil
}

func buildTunnelView(tunnel *model.Tunnel) *TunnelView {
	if tunnel == nil {
		return nil
	}
	relays := decodeTunnelConnectedRelays(tunnel.ConnectedRelays)
	return &TunnelView{
		ID:              tunnel.ID,
		TunnelID:        tunnel.TunnelID,
		Name:            tunnel.Name,
		TunnelToken:     tunnel.TunnelToken,
		Status:          tunnel.Status,
		ClientVersion:   tunnel.ClientVersion,
		FrpVersion:      tunnel.FrpVersion,
		LastSeenAt:      tunnel.LastSeenAt,
		LastError:       tunnel.LastError,
		CurrentVersion:  tunnel.CurrentVersion,
		CurrentChecksum: tunnel.CurrentChecksum,
		ConnectedRelays: relays,
		Remark:          tunnel.Remark,
		CreatedAt:       tunnel.CreatedAt,
		UpdatedAt:       tunnel.UpdatedAt,
	}
}

func decodeTunnelConnectedRelays(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "[]" {
		return make([]string, 0)
	}
	var relays []string
	if err := json.Unmarshal([]byte(raw), &relays); err != nil {
		return make([]string, 0)
	}
	return relays
}

func newTunnelID() (string, error) {
	token, err := newRandomToken()
	if err != nil {
		return "", err
	}
	return "tun-" + token, nil
}
