package httpclient

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"atsflare-agent/internal/protocol"
)

type Client struct {
	baseURL    string
	token      string
	httpClient *http.Client
}

func New(baseURL string, token string, timeout time.Duration) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   token,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) RegisterNode(ctx context.Context, payload protocol.NodePayload) error {
	return c.postJSON(ctx, "/api/agent/nodes/register", payload, nil)
}

func (c *Client) Heartbeat(ctx context.Context, payload protocol.NodePayload) error {
	return c.postJSON(ctx, "/api/agent/nodes/heartbeat", payload, nil)
}

func (c *Client) GetActiveConfig(ctx context.Context) (*protocol.ActiveConfigResponse, error) {
	resp := protocol.APIResponse[protocol.ActiveConfigResponse]{}
	if err := c.getJSON(ctx, "/api/agent/config-versions/active", &resp); err != nil {
		return nil, err
	}
	if !resp.Success {
		return nil, errors.New(resp.Message)
	}
	return &resp.Data, nil
}

func (c *Client) ReportApplyLog(ctx context.Context, payload protocol.ApplyLogPayload) error {
	return c.postJSON(ctx, "/api/agent/apply-logs", payload, nil)
}

func (c *Client) getJSON(ctx context.Context, path string, target any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-Agent-Token", c.token)
	return c.do(req, target)
}

func (c *Client) postJSON(ctx context.Context, path string, body any, target any) error {
	data, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Agent-Token", c.token)
	return c.do(req, target)
}

func (c *Client) do(req *http.Request, target any) error {
	res, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return errors.New(res.Status)
	}
	if target == nil {
		var wrapper protocol.APIResponse[json.RawMessage]
		if err = json.NewDecoder(res.Body).Decode(&wrapper); err != nil {
			return err
		}
		if !wrapper.Success {
			return errors.New(wrapper.Message)
		}
		return nil
	}
	return json.NewDecoder(res.Body).Decode(target)
}
