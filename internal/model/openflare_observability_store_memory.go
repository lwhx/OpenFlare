// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package model

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/Rain-kl/Wavelet/internal/db/idgen"
)

type memoryObservabilityStore struct {
	mu              sync.RWMutex
	metricSnapshots []*OpenFlareMetricSnapshot
	requestReports  []*OpenFlareRequestReport
	openrestyObs    []*OpenFlareNodeObservationOpenresty
	frpsObs         []*OpenFlareNodeObservationFrps
	frpcObs         []*OpenFlareNodeObservationFrpc
}

func (s *memoryObservabilityStore) InsertMetricSnapshot(_ context.Context, record *OpenFlareMetricSnapshot) error {
	if record == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	copyRecord := cloneOpenFlareMetricSnapshot(record)
	if memoryMetricSnapshotExists(s.metricSnapshots, copyRecord.NodeID, copyRecord.CapturedAt) {
		return nil
	}
	s.metricSnapshots = append(s.metricSnapshots, copyRecord)
	return nil
}

func (s *memoryObservabilityStore) ListMetricSnapshots(_ context.Context, nodeID string, since time.Time, limit int) ([]*OpenFlareMetricSnapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows := memoryFilterMetricSnapshots(s.metricSnapshots, nodeID, since)
	sortOpenFlareMetricSnapshots(rows)
	return memoryLimitObservabilityRows(rows, limit), nil
}

func (s *memoryObservabilityStore) DeleteAllMetricSnapshots(_ context.Context) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := int64(len(s.metricSnapshots))
	s.metricSnapshots = nil
	return count, nil
}

func (s *memoryObservabilityStore) DeleteMetricSnapshotsBefore(_ context.Context, cutoff time.Time) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cutoff = cutoff.UTC()
	remaining := make([]*OpenFlareMetricSnapshot, 0, len(s.metricSnapshots))
	var deleted int64
	for _, row := range s.metricSnapshots {
		if row.CapturedAt.Before(cutoff) {
			deleted++
			continue
		}
		remaining = append(remaining, row)
	}
	s.metricSnapshots = remaining
	return deleted, nil
}

func (s *memoryObservabilityStore) InsertRequestReport(_ context.Context, record *OpenFlareRequestReport) error {
	if record == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	copyRecord := cloneOpenFlareRequestReport(record)
	if memoryRequestReportExists(s.requestReports, copyRecord.NodeID, copyRecord.WindowStartedAt, copyRecord.WindowEndedAt) {
		return nil
	}
	s.requestReports = append(s.requestReports, copyRecord)
	return nil
}

func (s *memoryObservabilityStore) ListRequestReports(_ context.Context, nodeID string, since time.Time, limit int) ([]*OpenFlareRequestReport, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows := memoryFilterRequestReports(s.requestReports, nodeID, since)
	sortOpenFlareRequestReports(rows)
	return memoryLimitObservabilityRows(rows, limit), nil
}

func (s *memoryObservabilityStore) DeleteAllRequestReports(_ context.Context) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := int64(len(s.requestReports))
	s.requestReports = nil
	return count, nil
}

func (s *memoryObservabilityStore) DeleteRequestReportsBefore(_ context.Context, cutoff time.Time) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cutoff = cutoff.UTC()
	remaining := make([]*OpenFlareRequestReport, 0, len(s.requestReports))
	var deleted int64
	for _, row := range s.requestReports {
		if row.WindowEndedAt.Before(cutoff) {
			deleted++
			continue
		}
		remaining = append(remaining, row)
	}
	s.requestReports = remaining
	return deleted, nil
}

func (s *memoryObservabilityStore) InsertNodeObservationOpenresty(_ context.Context, record *OpenFlareNodeObservationOpenresty) error {
	if record == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.openrestyObs = append(s.openrestyObs, cloneOpenFlareNodeObservationOpenresty(record))
	return nil
}

func (s *memoryObservabilityStore) ListNodeObservationOpenresty(_ context.Context, nodeID string, since time.Time, limit int) ([]*OpenFlareNodeObservationOpenresty, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows := memoryFilterOpenrestyObservations(s.openrestyObs, nodeID, since)
	sortOpenFlareNodeObservationOpenresty(rows)
	return memoryLimitObservabilityRows(rows, limit), nil
}

func (s *memoryObservabilityStore) DeleteAllNodeObservationOpenresty(_ context.Context) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := int64(len(s.openrestyObs))
	s.openrestyObs = nil
	return count, nil
}

func (s *memoryObservabilityStore) DeleteNodeObservationOpenrestyBefore(_ context.Context, cutoff time.Time) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cutoff = cutoff.UTC()
	remaining := make([]*OpenFlareNodeObservationOpenresty, 0, len(s.openrestyObs))
	var deleted int64
	for _, row := range s.openrestyObs {
		if row.CapturedAt.Before(cutoff) {
			deleted++
			continue
		}
		remaining = append(remaining, row)
	}
	s.openrestyObs = remaining
	return deleted, nil
}

func (s *memoryObservabilityStore) InsertNodeObservationFrps(_ context.Context, record *OpenFlareNodeObservationFrps) error {
	if record == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.frpsObs = append(s.frpsObs, cloneOpenFlareNodeObservationFrps(record))
	return nil
}

func (s *memoryObservabilityStore) ListNodeObservationFrps(_ context.Context, nodeID string, since time.Time, limit int) ([]*OpenFlareNodeObservationFrps, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows := memoryFilterFrpsObservations(s.frpsObs, nodeID, since)
	sortOpenFlareNodeObservationFrps(rows)
	return memoryLimitObservabilityRows(rows, limit), nil
}

func (s *memoryObservabilityStore) DeleteAllNodeObservationFrps(_ context.Context) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := int64(len(s.frpsObs))
	s.frpsObs = nil
	return count, nil
}

func (s *memoryObservabilityStore) DeleteNodeObservationFrpsBefore(_ context.Context, cutoff time.Time) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cutoff = cutoff.UTC()
	remaining := make([]*OpenFlareNodeObservationFrps, 0, len(s.frpsObs))
	var deleted int64
	for _, row := range s.frpsObs {
		if row.CapturedAt.Before(cutoff) {
			deleted++
			continue
		}
		remaining = append(remaining, row)
	}
	s.frpsObs = remaining
	return deleted, nil
}

func (s *memoryObservabilityStore) InsertNodeObservationFrpc(_ context.Context, record *OpenFlareNodeObservationFrpc) error {
	if record == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.frpcObs = append(s.frpcObs, cloneOpenFlareNodeObservationFrpc(record))
	return nil
}

func (s *memoryObservabilityStore) ListNodeObservationFrpc(_ context.Context, nodeID string, since time.Time, limit int) ([]*OpenFlareNodeObservationFrpc, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows := memoryFilterFrpcObservations(s.frpcObs, nodeID, since)
	sortOpenFlareNodeObservationFrpc(rows)
	return memoryLimitObservabilityRows(rows, limit), nil
}

func (s *memoryObservabilityStore) DeleteAllNodeObservationFrpc(_ context.Context) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := int64(len(s.frpcObs))
	s.frpcObs = nil
	return count, nil
}

func (s *memoryObservabilityStore) DeleteNodeObservationFrpcBefore(_ context.Context, cutoff time.Time) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cutoff = cutoff.UTC()
	remaining := make([]*OpenFlareNodeObservationFrpc, 0, len(s.frpcObs))
	var deleted int64
	for _, row := range s.frpcObs {
		if row.CapturedAt.Before(cutoff) {
			deleted++
			continue
		}
		remaining = append(remaining, row)
	}
	s.frpcObs = remaining
	return deleted, nil
}

func memoryFilterMetricSnapshots(rows []*OpenFlareMetricSnapshot, nodeID string, since time.Time) []*OpenFlareMetricSnapshot {
	result := make([]*OpenFlareMetricSnapshot, 0, len(rows))
	for _, row := range rows {
		if !memoryObservabilityMatchesNodeID(row.NodeID, nodeID) {
			continue
		}
		if !since.IsZero() && row.CapturedAt.Before(since) {
			continue
		}
		result = append(result, row)
	}
	return result
}

func memoryFilterRequestReports(rows []*OpenFlareRequestReport, nodeID string, since time.Time) []*OpenFlareRequestReport {
	result := make([]*OpenFlareRequestReport, 0, len(rows))
	for _, row := range rows {
		if !memoryObservabilityMatchesNodeID(row.NodeID, nodeID) {
			continue
		}
		if !since.IsZero() && row.WindowEndedAt.Before(since) {
			continue
		}
		result = append(result, row)
	}
	return result
}

func memoryFilterOpenrestyObservations(rows []*OpenFlareNodeObservationOpenresty, nodeID string, since time.Time) []*OpenFlareNodeObservationOpenresty {
	result := make([]*OpenFlareNodeObservationOpenresty, 0, len(rows))
	for _, row := range rows {
		if !memoryObservabilityMatchesNodeID(row.NodeID, nodeID) {
			continue
		}
		if !since.IsZero() && row.CapturedAt.Before(since) {
			continue
		}
		result = append(result, row)
	}
	return result
}

func memoryFilterFrpsObservations(rows []*OpenFlareNodeObservationFrps, nodeID string, since time.Time) []*OpenFlareNodeObservationFrps {
	result := make([]*OpenFlareNodeObservationFrps, 0, len(rows))
	for _, row := range rows {
		if !memoryObservabilityMatchesNodeID(row.NodeID, nodeID) {
			continue
		}
		if !since.IsZero() && row.CapturedAt.Before(since) {
			continue
		}
		result = append(result, row)
	}
	return result
}

func memoryFilterFrpcObservations(rows []*OpenFlareNodeObservationFrpc, nodeID string, since time.Time) []*OpenFlareNodeObservationFrpc {
	result := make([]*OpenFlareNodeObservationFrpc, 0, len(rows))
	for _, row := range rows {
		if !memoryObservabilityMatchesNodeID(row.NodeID, nodeID) {
			continue
		}
		if !since.IsZero() && row.CapturedAt.Before(since) {
			continue
		}
		result = append(result, row)
	}
	return result
}

func memoryObservabilityMatchesNodeID(rowNodeID string, nodeID string) bool {
	trimmed := strings.TrimSpace(nodeID)
	if trimmed == "" {
		return true
	}
	return rowNodeID == trimmed
}

func memoryMetricSnapshotExists(rows []*OpenFlareMetricSnapshot, nodeID string, capturedAt time.Time) bool {
	capturedAt = capturedAt.UTC()
	for _, row := range rows {
		if row.NodeID == nodeID && row.CapturedAt.UTC().Equal(capturedAt) {
			return true
		}
	}
	return false
}

func memoryRequestReportExists(rows []*OpenFlareRequestReport, nodeID string, windowStartedAt, windowEndedAt time.Time) bool {
	windowStartedAt = windowStartedAt.UTC()
	windowEndedAt = windowEndedAt.UTC()
	for _, row := range rows {
		if row.NodeID == nodeID &&
			row.WindowStartedAt.UTC().Equal(windowStartedAt) &&
			row.WindowEndedAt.UTC().Equal(windowEndedAt) {
			return true
		}
	}
	return false
}

func sortOpenFlareMetricSnapshots(items []*OpenFlareMetricSnapshot) {
	sort.Slice(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		if left == nil || right == nil {
			return left != nil
		}
		if compare := openFlareAccessLogCompareInt64(left.CapturedAt.Unix(), right.CapturedAt.Unix()); compare != 0 {
			return compare > 0
		}
		return openFlareAccessLogCompareInt64(openFlareAccessLogUintToInt64(uint64(left.ID)), openFlareAccessLogUintToInt64(uint64(right.ID))) > 0
	})
}

func sortOpenFlareRequestReports(items []*OpenFlareRequestReport) {
	sort.Slice(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		if left == nil || right == nil {
			return left != nil
		}
		if compare := openFlareAccessLogCompareInt64(left.WindowEndedAt.Unix(), right.WindowEndedAt.Unix()); compare != 0 {
			return compare > 0
		}
		return openFlareAccessLogCompareInt64(openFlareAccessLogUintToInt64(uint64(left.ID)), openFlareAccessLogUintToInt64(uint64(right.ID))) > 0
	})
}

func sortOpenFlareNodeObservationOpenresty(items []*OpenFlareNodeObservationOpenresty) {
	sort.Slice(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		if left == nil || right == nil {
			return left != nil
		}
		if compare := openFlareAccessLogCompareInt64(left.CapturedAt.Unix(), right.CapturedAt.Unix()); compare != 0 {
			return compare > 0
		}
		return openFlareAccessLogCompareInt64(openFlareAccessLogUintToInt64(uint64(left.ID)), openFlareAccessLogUintToInt64(uint64(right.ID))) > 0
	})
}

func sortOpenFlareNodeObservationFrps(items []*OpenFlareNodeObservationFrps) {
	sort.Slice(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		if left == nil || right == nil {
			return left != nil
		}
		if compare := openFlareAccessLogCompareInt64(left.CapturedAt.Unix(), right.CapturedAt.Unix()); compare != 0 {
			return compare > 0
		}
		return openFlareAccessLogCompareInt64(openFlareAccessLogUintToInt64(uint64(left.ID)), openFlareAccessLogUintToInt64(uint64(right.ID))) > 0
	})
}

func sortOpenFlareNodeObservationFrpc(items []*OpenFlareNodeObservationFrpc) {
	sort.Slice(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		if left == nil || right == nil {
			return left != nil
		}
		if compare := openFlareAccessLogCompareInt64(left.CapturedAt.Unix(), right.CapturedAt.Unix()); compare != 0 {
			return compare > 0
		}
		return openFlareAccessLogCompareInt64(openFlareAccessLogUintToInt64(uint64(left.ID)), openFlareAccessLogUintToInt64(uint64(right.ID))) > 0
	})
}

func memoryLimitObservabilityRows[T any](rows []T, limit int) []T {
	if limit <= 0 || len(rows) <= limit {
		result := make([]T, len(rows))
		copy(result, rows)
		return result
	}
	result := make([]T, limit)
	copy(result, rows[:limit])
	return result
}

func cloneOpenFlareMetricSnapshot(record *OpenFlareMetricSnapshot) *OpenFlareMetricSnapshot {
	copyRecord := *record
	if copyRecord.ID == 0 {
		copyRecord.ID = uint(idgen.NextUint64ID())
	}
	now := time.Now().UTC()
	if copyRecord.CreatedAt.IsZero() {
		copyRecord.CreatedAt = now
	}
	copyRecord.CapturedAt = copyRecord.CapturedAt.UTC()
	copyRecord.CreatedAt = copyRecord.CreatedAt.UTC()
	return &copyRecord
}

func cloneOpenFlareRequestReport(record *OpenFlareRequestReport) *OpenFlareRequestReport {
	copyRecord := *record
	if copyRecord.ID == 0 {
		copyRecord.ID = uint(idgen.NextUint64ID())
	}
	now := time.Now().UTC()
	if copyRecord.CreatedAt.IsZero() {
		copyRecord.CreatedAt = now
	}
	copyRecord.WindowStartedAt = copyRecord.WindowStartedAt.UTC()
	copyRecord.WindowEndedAt = copyRecord.WindowEndedAt.UTC()
	copyRecord.CreatedAt = copyRecord.CreatedAt.UTC()
	return &copyRecord
}

func cloneOpenFlareNodeObservationOpenresty(record *OpenFlareNodeObservationOpenresty) *OpenFlareNodeObservationOpenresty {
	copyRecord := *record
	if copyRecord.ID == 0 {
		copyRecord.ID = uint(idgen.NextUint64ID())
	}
	now := time.Now().UTC()
	if copyRecord.CreatedAt.IsZero() {
		copyRecord.CreatedAt = now
	}
	if copyRecord.CapturedAt.IsZero() {
		copyRecord.CapturedAt = now
	}
	copyRecord.CapturedAt = copyRecord.CapturedAt.UTC()
	copyRecord.CreatedAt = copyRecord.CreatedAt.UTC()
	return &copyRecord
}

func cloneOpenFlareNodeObservationFrps(record *OpenFlareNodeObservationFrps) *OpenFlareNodeObservationFrps {
	copyRecord := *record
	if copyRecord.ID == 0 {
		copyRecord.ID = uint(idgen.NextUint64ID())
	}
	now := time.Now().UTC()
	if copyRecord.CreatedAt.IsZero() {
		copyRecord.CreatedAt = now
	}
	if copyRecord.CapturedAt.IsZero() {
		copyRecord.CapturedAt = now
	}
	copyRecord.CapturedAt = copyRecord.CapturedAt.UTC()
	copyRecord.CreatedAt = copyRecord.CreatedAt.UTC()
	return &copyRecord
}

func cloneOpenFlareNodeObservationFrpc(record *OpenFlareNodeObservationFrpc) *OpenFlareNodeObservationFrpc {
	copyRecord := *record
	if copyRecord.ID == 0 {
		copyRecord.ID = uint(idgen.NextUint64ID())
	}
	now := time.Now().UTC()
	if copyRecord.CreatedAt.IsZero() {
		copyRecord.CreatedAt = now
	}
	if copyRecord.CapturedAt.IsZero() {
		copyRecord.CapturedAt = now
	}
	copyRecord.CapturedAt = copyRecord.CapturedAt.UTC()
	copyRecord.CreatedAt = copyRecord.CreatedAt.UTC()
	return &copyRecord
}
