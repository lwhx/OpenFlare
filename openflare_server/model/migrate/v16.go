// v16 升级内容：新增 Tunnel 隧道表，为 nodes 增加 TunnelRelay 相关字段，为 proxy_routes 增加隧道上游支持字段。
// 背景说明：引入 Tunnel 组件后，边缘节点可通过隧道中继回源，需要区分节点类型（edge_node/relay_node）、记录中继绑定端口，
// 并在代理路由中支持 tunnel 上游类型以替代直连回源，同时需要独立的 tunnels 表管理隧道实例。
package migrate

import (
	"fmt"

	"gorm.io/gorm"
)

type nodeV16 struct {
	NodeType      string `gorm:"column:node_type;not null;default:'edge_node'"`
	RelayBindPort int    `gorm:"column:relay_bind_port"`
}

type tunnelV16 struct{}

type proxyRouteV16 struct {
	UpstreamType string `gorm:"column:upstream_type;not null;default:'direct'"`
	TunnelID     *uint  `gorm:"column:tunnel_id"`
}

func init() {
	Register(V16())
}

func V16() Migration {
	return Migration{
		FromVersion: 15,
		ToVersion:   16,
		Migrate:     migrateV16,
		Validate:    validateV16,
	}
}

func (nodeV16) TableName() string {
	return "nodes"
}

func (tunnelV16) TableName() string {
	return "tunnels"
}

func (proxyRouteV16) TableName() string {
	return "proxy_routes"
}

func migrateV16(ctx Context, db *gorm.DB, backend string) error {
	if err := ctx.ApplyCurrentSchema(db, backend); err != nil {
		return err
	}
	if err := db.Exec("UPDATE nodes SET node_type = 'edge_node' WHERE node_type = '' OR node_type IS NULL").Error; err != nil {
		return fmt.Errorf("backfill nodes.node_type: %w", err)
	}
	if err := db.Exec("UPDATE proxy_routes SET upstream_type = 'direct' WHERE upstream_type = '' OR upstream_type IS NULL").Error; err != nil {
		return fmt.Errorf("backfill proxy_routes.upstream_type: %w", err)
	}
	return nil
}

func validateV16(ctx Context, db *gorm.DB, backend string) error {
	if err := ctx.ValidateDatabaseSchemaVersion(db, backend, 15); err != nil {
		return err
	}
	if db == nil || !db.Migrator().HasTable(&tunnelV16{}) {
		return fmt.Errorf("table tunnels is missing")
	}
	if !db.Migrator().HasColumn(&nodeV16{}, "node_type") {
		return fmt.Errorf("column nodes.node_type is missing")
	}
	if !db.Migrator().HasColumn(&proxyRouteV16{}, "upstream_type") {
		return fmt.Errorf("column proxy_routes.upstream_type is missing")
	}
	if !db.Migrator().HasColumn(&nodeV16{}, "relay_bind_port") {
		return fmt.Errorf("column nodes.relay_bind_port is missing")
	}
	if !db.Migrator().HasColumn(&proxyRouteV16{}, "tunnel_id") {
		return fmt.Errorf("column proxy_routes.tunnel_id is missing")
	}
	return nil
}
