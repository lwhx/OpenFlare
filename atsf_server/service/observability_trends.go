package service

import (
	"atsflare/model"
	"time"
)

const observabilityTrendBuckets = 24

type TrafficTrendPoint struct {
	BucketStartedAt    time.Time `json:"bucket_started_at"`
	RequestCount       int64     `json:"request_count"`
	ErrorCount         int64     `json:"error_count"`
	UniqueVisitorCount int64     `json:"unique_visitor_count"`
}

type CapacityTrendPoint struct {
	BucketStartedAt           time.Time `json:"bucket_started_at"`
	AverageCPUUsagePercent    float64   `json:"average_cpu_usage_percent"`
	AverageMemoryUsagePercent float64   `json:"average_memory_usage_percent"`
	ReportedNodes             int       `json:"reported_nodes"`
}

type NetworkTrendPoint struct {
	BucketStartedAt  time.Time `json:"bucket_started_at"`
	NetworkRxBytes   int64     `json:"network_rx_bytes"`
	NetworkTxBytes   int64     `json:"network_tx_bytes"`
	OpenrestyRxBytes int64     `json:"openresty_rx_bytes"`
	OpenrestyTxBytes int64     `json:"openresty_tx_bytes"`
	ReportedNodes    int       `json:"reported_nodes"`
}

type DiskIOTrendPoint struct {
	BucketStartedAt time.Time `json:"bucket_started_at"`
	DiskReadBytes   int64     `json:"disk_read_bytes"`
	DiskWriteBytes  int64     `json:"disk_write_bytes"`
	ReportedNodes   int       `json:"reported_nodes"`
}

type capacityTrendAccumulator struct {
	cpuSum   float64
	cpuCount int
	memSum   float64
	memCount int
	nodes    map[string]struct{}
}

type snapshotTrendAccumulator struct {
	nodes map[string]struct{}
}

func buildTrafficTrendPoints(now time.Time, reports []*model.NodeRequestReport) []TrafficTrendPoint {
	start := trendWindowStart(now)
	points := make([]TrafficTrendPoint, observabilityTrendBuckets)
	for index := range points {
		points[index].BucketStartedAt = start.Add(time.Duration(index) * time.Hour)
	}

	for _, report := range reports {
		index, ok := trendBucketIndex(report.WindowEndedAt, start)
		if !ok {
			continue
		}
		points[index].RequestCount += report.RequestCount
		points[index].ErrorCount += report.ErrorCount
		points[index].UniqueVisitorCount += report.UniqueVisitorCount
	}

	return points
}

func buildCapacityTrendPoints(now time.Time, snapshots []*model.NodeMetricSnapshot) []CapacityTrendPoint {
	start := trendWindowStart(now)
	points := make([]CapacityTrendPoint, observabilityTrendBuckets)
	accumulators := make([]capacityTrendAccumulator, observabilityTrendBuckets)
	for index := range points {
		points[index].BucketStartedAt = start.Add(time.Duration(index) * time.Hour)
		accumulators[index].nodes = make(map[string]struct{})
	}

	for _, snapshot := range snapshots {
		index, ok := trendBucketIndex(snapshot.CapturedAt, start)
		if !ok {
			continue
		}
		if snapshot.CPUUsagePercent > 0 {
			accumulators[index].cpuSum += snapshot.CPUUsagePercent
			accumulators[index].cpuCount++
		}
		if memoryUsage := percentage(snapshot.MemoryUsedBytes, snapshot.MemoryTotalBytes); memoryUsage > 0 {
			accumulators[index].memSum += memoryUsage
			accumulators[index].memCount++
		}
		if snapshot.NodeID != "" {
			accumulators[index].nodes[snapshot.NodeID] = struct{}{}
		}
	}

	for index := range points {
		if accumulators[index].cpuCount > 0 {
			points[index].AverageCPUUsagePercent = accumulators[index].cpuSum / float64(accumulators[index].cpuCount)
		}
		if accumulators[index].memCount > 0 {
			points[index].AverageMemoryUsagePercent = accumulators[index].memSum / float64(accumulators[index].memCount)
		}
		points[index].ReportedNodes = len(accumulators[index].nodes)
	}

	return points
}

func buildNetworkTrendPoints(now time.Time, snapshots []*model.NodeMetricSnapshot) []NetworkTrendPoint {
	start := trendWindowStart(now)
	points := make([]NetworkTrendPoint, observabilityTrendBuckets)
	accumulators := make([]snapshotTrendAccumulator, observabilityTrendBuckets)
	for index := range points {
		points[index].BucketStartedAt = start.Add(time.Duration(index) * time.Hour)
		accumulators[index].nodes = make(map[string]struct{})
	}

	for _, snapshot := range snapshots {
		index, ok := trendBucketIndex(snapshot.CapturedAt, start)
		if !ok {
			continue
		}
		points[index].NetworkRxBytes += snapshot.NetworkRxBytes
		points[index].NetworkTxBytes += snapshot.NetworkTxBytes
		points[index].OpenrestyRxBytes += snapshot.OpenrestyRxBytes
		points[index].OpenrestyTxBytes += snapshot.OpenrestyTxBytes
		if snapshot.NodeID != "" {
			accumulators[index].nodes[snapshot.NodeID] = struct{}{}
		}
	}

	for index := range points {
		points[index].ReportedNodes = len(accumulators[index].nodes)
	}

	return points
}

func buildDiskIOTrendPoints(now time.Time, snapshots []*model.NodeMetricSnapshot) []DiskIOTrendPoint {
	start := trendWindowStart(now)
	points := make([]DiskIOTrendPoint, observabilityTrendBuckets)
	accumulators := make([]snapshotTrendAccumulator, observabilityTrendBuckets)
	for index := range points {
		points[index].BucketStartedAt = start.Add(time.Duration(index) * time.Hour)
		accumulators[index].nodes = make(map[string]struct{})
	}

	for _, snapshot := range snapshots {
		index, ok := trendBucketIndex(snapshot.CapturedAt, start)
		if !ok {
			continue
		}
		points[index].DiskReadBytes += snapshot.DiskReadBytes
		points[index].DiskWriteBytes += snapshot.DiskWriteBytes
		if snapshot.NodeID != "" {
			accumulators[index].nodes[snapshot.NodeID] = struct{}{}
		}
	}

	for index := range points {
		points[index].ReportedNodes = len(accumulators[index].nodes)
	}

	return points
}

func trendWindowStart(now time.Time) time.Time {
	return now.Truncate(time.Hour).Add(-(observabilityTrendBuckets - 1) * time.Hour)
}

func trendBucketIndex(timestamp time.Time, start time.Time) (int, bool) {
	if timestamp.Before(start) {
		return 0, false
	}
	delta := timestamp.Sub(start)
	index := int(delta / time.Hour)
	if index < 0 || index >= observabilityTrendBuckets {
		return 0, false
	}
	return index, true
}
