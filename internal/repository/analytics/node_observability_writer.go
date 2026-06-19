// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package analytics

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Rain-kl/Wavelet/internal/db"
	"github.com/Rain-kl/Wavelet/internal/db/idgen"
	analyticsmodel "github.com/Rain-kl/Wavelet/internal/model/analytics"
)

// InsertNodeMetricSnapshot writes a metric snapshot when no row exists for node_id+captured_at.
func InsertNodeMetricSnapshot(ctx context.Context, snapshot analyticsmodel.NodeMetricSnapshot) error {
	nodeID := strings.TrimSpace(snapshot.NodeID)
	if nodeID == "" {
		return nil
	}
	capturedAt := snapshot.CapturedAt.UTC()

	exists, err := nodeObservabilityRowExists(
		ctx,
		fmt.Sprintf("SELECT count() FROM %s WHERE node_id = ? AND captured_at = ?", nodeMetricSnapshotTableName()),
		nodeID, capturedAt,
	)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	if db.ChConn == nil {
		return fmt.Errorf("clickhouse connection is not initialized")
	}

	batch, err := db.ChConn.PrepareBatch(ctx, analyticsmodel.NodeMetricSnapshot{}.BatchInsertSQL())
	if err != nil {
		return fmt.Errorf("prepare clickhouse batch: %w", err)
	}

	now := time.Now().UTC()
	id := snapshot.ID
	if id == 0 {
		id = idgen.NextUint64ID()
	}
	createdAt := snapshot.CreatedAt
	if createdAt.IsZero() {
		createdAt = now
	}
	if err := batch.Append(
		id,
		nodeID,
		capturedAt,
		snapshot.CPUUsagePercent,
		snapshot.MemoryUsedBytes,
		snapshot.MemoryTotalBytes,
		snapshot.StorageUsedBytes,
		snapshot.StorageTotalBytes,
		snapshot.DiskReadBytes,
		snapshot.DiskWriteBytes,
		snapshot.NetworkRxBytes,
		snapshot.NetworkTxBytes,
		createdAt.UTC(),
	); err != nil {
		return fmt.Errorf("append node metric snapshot to batch: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send clickhouse batch: %w", err)
	}
	return nil
}

// InsertNodeRequestReport writes a request report when no row exists for node_id+window bounds.
func InsertNodeRequestReport(ctx context.Context, report analyticsmodel.NodeRequestReport) error {
	nodeID := strings.TrimSpace(report.NodeID)
	if nodeID == "" {
		return nil
	}
	windowStartedAt := report.WindowStartedAt.UTC()
	windowEndedAt := report.WindowEndedAt.UTC()

	exists, err := nodeObservabilityRowExists(
		ctx,
		fmt.Sprintf(
			"SELECT count() FROM %s WHERE node_id = ? AND window_started_at = ? AND window_ended_at = ?",
			nodeRequestReportTableName(),
		),
		nodeID, windowStartedAt, windowEndedAt,
	)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	if db.ChConn == nil {
		return fmt.Errorf("clickhouse connection is not initialized")
	}

	batch, err := db.ChConn.PrepareBatch(ctx, analyticsmodel.NodeRequestReport{}.BatchInsertSQL())
	if err != nil {
		return fmt.Errorf("prepare clickhouse batch: %w", err)
	}

	now := time.Now().UTC()
	id := report.ID
	if id == 0 {
		id = idgen.NextUint64ID()
	}
	createdAt := report.CreatedAt
	if createdAt.IsZero() {
		createdAt = now
	}
	if err := batch.Append(
		id,
		nodeID,
		windowStartedAt,
		windowEndedAt,
		report.RequestCount,
		report.ErrorCount,
		report.UniqueVisitorCount,
		report.StatusCodesJSON,
		report.TopDomainsJSON,
		report.SourceCountriesJSON,
		createdAt.UTC(),
	); err != nil {
		return fmt.Errorf("append node request report to batch: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send clickhouse batch: %w", err)
	}
	return nil
}

// InsertNodeObsOpenresty writes an OpenResty observability snapshot.
func InsertNodeObsOpenresty(ctx context.Context, obs analyticsmodel.NodeObsOpenresty) error {
	nodeID := strings.TrimSpace(obs.NodeID)
	if nodeID == "" {
		return nil
	}
	return insertNodeObsOpenrestyBatch(ctx, obs, nodeID)
}

// InsertNodeObsFrps writes an FRPS observability snapshot.
func InsertNodeObsFrps(ctx context.Context, obs analyticsmodel.NodeObsFrps) error {
	nodeID := strings.TrimSpace(obs.NodeID)
	if nodeID == "" {
		return nil
	}
	return insertNodeObsFrpsBatch(ctx, obs, nodeID)
}

// InsertNodeObsFrpc writes an FRPC observability snapshot.
func InsertNodeObsFrpc(ctx context.Context, obs analyticsmodel.NodeObsFrpc) error {
	nodeID := strings.TrimSpace(obs.NodeID)
	if nodeID == "" {
		return nil
	}
	return insertNodeObsFrpcBatch(ctx, obs, nodeID)
}

func insertNodeObsOpenrestyBatch(ctx context.Context, obs analyticsmodel.NodeObsOpenresty, nodeID string) error {
	if db.ChConn == nil {
		return fmt.Errorf("clickhouse connection is not initialized")
	}

	batch, err := db.ChConn.PrepareBatch(ctx, analyticsmodel.NodeObsOpenresty{}.BatchInsertSQL())
	if err != nil {
		return fmt.Errorf("prepare clickhouse batch: %w", err)
	}

	now := time.Now().UTC()
	id := obs.ID
	if id == 0 {
		id = idgen.NextUint64ID()
	}
	createdAt := obs.CreatedAt
	if createdAt.IsZero() {
		createdAt = now
	}
	capturedAt := obs.CapturedAt.UTC()
	if capturedAt.IsZero() {
		capturedAt = now
	}
	if err := batch.Append(
		id,
		nodeID,
		capturedAt,
		obs.OpenrestyRxBytes,
		obs.OpenrestyTxBytes,
		obs.OpenrestyConnections,
		createdAt.UTC(),
	); err != nil {
		return fmt.Errorf("append node openresty observation to batch: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send clickhouse batch: %w", err)
	}
	return nil
}

func insertNodeObsFrpsBatch(ctx context.Context, obs analyticsmodel.NodeObsFrps, nodeID string) error {
	if db.ChConn == nil {
		return fmt.Errorf("clickhouse connection is not initialized")
	}

	batch, err := db.ChConn.PrepareBatch(ctx, analyticsmodel.NodeObsFrps{}.BatchInsertSQL())
	if err != nil {
		return fmt.Errorf("prepare clickhouse batch: %w", err)
	}

	now := time.Now().UTC()
	id := obs.ID
	if id == 0 {
		id = idgen.NextUint64ID()
	}
	createdAt := obs.CreatedAt
	if createdAt.IsZero() {
		createdAt = now
	}
	capturedAt := obs.CapturedAt.UTC()
	if capturedAt.IsZero() {
		capturedAt = now
	}
	if err := batch.Append(
		id,
		nodeID,
		capturedAt,
		obs.FrpsConnections,
		obs.FrpsProxyCount,
		obs.FrpsClientCount,
		obs.FrpsProxies,
		createdAt.UTC(),
	); err != nil {
		return fmt.Errorf("append node frps observation to batch: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send clickhouse batch: %w", err)
	}
	return nil
}

func insertNodeObsFrpcBatch(ctx context.Context, obs analyticsmodel.NodeObsFrpc, nodeID string) error {
	if db.ChConn == nil {
		return fmt.Errorf("clickhouse connection is not initialized")
	}

	batch, err := db.ChConn.PrepareBatch(ctx, analyticsmodel.NodeObsFrpc{}.BatchInsertSQL())
	if err != nil {
		return fmt.Errorf("prepare clickhouse batch: %w", err)
	}

	now := time.Now().UTC()
	id := obs.ID
	if id == 0 {
		id = idgen.NextUint64ID()
	}
	createdAt := obs.CreatedAt
	if createdAt.IsZero() {
		createdAt = now
	}
	capturedAt := obs.CapturedAt.UTC()
	if capturedAt.IsZero() {
		capturedAt = now
	}
	if err := batch.Append(
		id,
		nodeID,
		capturedAt,
		obs.TunnelStatus,
		obs.ConnectedRelaysCount,
		createdAt.UTC(),
	); err != nil {
		return fmt.Errorf("append node frpc observation to batch: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send clickhouse batch: %w", err)
	}
	return nil
}

func nodeObservabilityRowExists(ctx context.Context, countSQL string, args ...any) (bool, error) {
	conn, err := observabilityConn()
	if err != nil {
		return false, err
	}
	var count int64
	if err := conn.QueryRow(ctx, countSQL, args...).Scan(&count); err != nil {
		return false, fmt.Errorf("check observability row exists: %w", err)
	}
	return count > 0, nil
}
