package model

import (
	"fmt"
	"sort"
	"strings"
	"sync"

	"github.com/bwmarrin/snowflake"
	"gorm.io/gorm"
	"gorm.io/sharding"
)

const observabilityShardCount = 10

var (
	observabilityIDNode     *snowflake.Node
	observabilityIDNodeErr  error
	observabilityIDNodeOnce sync.Once
)

func registerSharding(db *gorm.DB, backend string) error {
	if db == nil {
		return nil
	}
	_ = backend
	if err := db.Use(sharding.Register(sharding.Config{
		ShardingKey:         "id",
		NumberOfShards:      observabilityShardCount,
		PrimaryKeyGenerator: sharding.PKCustom,
		PrimaryKeyGeneratorFn: func(tableIdx int64) int64 {
			return 0
		},
	}, shardedObservabilityTables()...)); err != nil {
		return fmt.Errorf("register observability sharding failed: %w", err)
	}
	return nil
}

func shardedObservabilityTables() []any {
	return []any{
		&NodeMetricSnapshot{},
		&NodeRequestReport{},
		&NodeAccessLog{},
	}
}

func shardedObservabilityBaseTables() []string {
	return []string{
		"node_metric_snapshots",
		"node_request_reports",
		"node_access_logs",
	}
}

func isShardedObservabilityTable(tableName string) bool {
	switch strings.TrimSpace(tableName) {
	case "node_metric_snapshots", "node_request_reports", "node_access_logs":
		return true
	default:
		return false
	}
}

func observabilityShardTables(baseTable string) []string {
	tables := make([]string, 0, observabilityShardCount)
	for _, suffix := range observabilityShardSuffixes() {
		tables = append(tables, baseTable+suffix)
	}
	return tables
}

func observabilityShardSuffixes() []string {
	suffixes := make([]string, 0, observabilityShardCount)
	for index := 0; index < observabilityShardCount; index++ {
		suffixes = append(suffixes, fmt.Sprintf("_%02d", index))
	}
	return suffixes
}

func observabilityShardSuffixForID(id uint) string {
	return fmt.Sprintf("_%02d", uint64(id)%uint64(observabilityShardCount))
}

func observabilityShardTableForID(baseTable string, id uint) string {
	return baseTable + observabilityShardSuffixForID(id)
}

func legacyObservabilityShardTableName(tableName string) string {
	return tableName + "_legacy_v2_to_v3"
}

func normalizeShardedDB(db *gorm.DB) *gorm.DB {
	if db != nil {
		return db
	}
	return DB
}

func nextObservabilityID() (uint, error) {
	observabilityIDNodeOnce.Do(func() {
		observabilityIDNode, observabilityIDNodeErr = snowflake.NewNode(0)
	})
	if observabilityIDNodeErr != nil {
		return 0, observabilityIDNodeErr
	}
	id := observabilityIDNode.Generate().Int64()
	if id <= 0 {
		return 0, fmt.Errorf("generated invalid observability id %d", id)
	}
	return uint(id), nil
}

func assignObservabilityID(id *uint) error {
	if id == nil || *id != 0 {
		return nil
	}
	generated, err := nextObservabilityID()
	if err != nil {
		return err
	}
	*id = generated
	return nil
}

func queryAcrossShards[T any](baseTable string, query func(tx *gorm.DB) ([]T, error)) ([]T, error) {
	return queryAcrossShardsWithDB(DB, baseTable, query)
}

func queryAcrossShardsWithDB[T any](db *gorm.DB, baseTable string, query func(tx *gorm.DB) ([]T, error)) ([]T, error) {
	items := make([]T, 0)
	db = normalizeShardedDB(db)
	for _, table := range observabilityShardTables(baseTable) {
		rows, err := query(db.Table(table))
		if err != nil {
			return nil, err
		}
		items = append(items, rows...)
	}
	return items, nil
}

func sortShardRows[T any](items []T, less func(left T, right T) bool) {
	sort.Slice(items, func(i int, j int) bool {
		return less(items[i], items[j])
	})
}
