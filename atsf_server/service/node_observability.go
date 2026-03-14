package service

import (
	"atsflare/model"
	"errors"
	"time"

	"gorm.io/gorm"
)

const (
	defaultObservabilityWindow = 24 * time.Hour
	defaultObservabilityLimit  = 120
	maxObservabilityLimit      = 500
)

type NodeObservabilityQuery struct {
	Hours int `json:"hours"`
	Limit int `json:"limit"`
}

type NodeObservabilityView struct {
	NodeID          string                      `json:"node_id"`
	Profile         *model.NodeSystemProfile    `json:"profile"`
	MetricSnapshots []*model.NodeMetricSnapshot `json:"metric_snapshots"`
	TrafficReports  []*model.NodeRequestReport  `json:"traffic_reports"`
	HealthEvents    []*model.NodeHealthEvent    `json:"health_events"`
}

func GetNodeObservability(id uint, query NodeObservabilityQuery) (*NodeObservabilityView, error) {
	node, err := model.GetNodeByID(id)
	if err != nil {
		return nil, err
	}

	limit := normalizeObservabilityLimit(query.Limit)
	since := time.Now().Add(-normalizeObservabilityWindow(query.Hours))

	profile, err := model.GetNodeSystemProfile(node.NodeID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		profile = nil
	}

	snapshots, err := model.ListNodeMetricSnapshots(node.NodeID, since, limit)
	if err != nil {
		return nil, err
	}
	reports, err := model.ListNodeRequestReports(node.NodeID, since, limit)
	if err != nil {
		return nil, err
	}
	events, err := model.ListNodeHealthEvents(node.NodeID, false, limit)
	if err != nil {
		return nil, err
	}

	return &NodeObservabilityView{
		NodeID:          node.NodeID,
		Profile:         profile,
		MetricSnapshots: snapshots,
		TrafficReports:  reports,
		HealthEvents:    events,
	}, nil
}

func normalizeObservabilityLimit(limit int) int {
	if limit <= 0 {
		return defaultObservabilityLimit
	}
	if limit > maxObservabilityLimit {
		return maxObservabilityLimit
	}
	return limit
}

func normalizeObservabilityWindow(hours int) time.Duration {
	if hours <= 0 {
		return defaultObservabilityWindow
	}
	return time.Duration(hours) * time.Hour
}
