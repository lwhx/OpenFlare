package heartbeat

import (
	"context"

	"atsflare-agent/internal/protocol"
)

type Client interface {
	RegisterNode(ctx context.Context, payload protocol.NodePayload) error
	Heartbeat(ctx context.Context, payload protocol.NodePayload) error
}

type Service struct {
	client Client
}

func New(client Client) *Service {
	return &Service{client: client}
}

func (s *Service) Register(ctx context.Context, payload protocol.NodePayload) error {
	return s.client.RegisterNode(ctx, payload)
}

func (s *Service) Heartbeat(ctx context.Context, payload protocol.NodePayload) error {
	return s.client.Heartbeat(ctx, payload)
}
