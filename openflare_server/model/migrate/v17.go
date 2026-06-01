package migrate

import (
	"fmt"

	"gorm.io/gorm"
)

type wafIPGroupV17 struct{}

type wafRuleGroupV17 struct {
	IPWhitelistGroups string `gorm:"column:ip_whitelist_groups;type:text;not null;default:'[]'"`
	IPBlacklistGroups string `gorm:"column:ip_blacklist_groups;type:text;not null;default:'[]'"`
}

func init() {
	Register(V17())
}

func V17() Migration {
	return Migration{
		FromVersion: 16,
		ToVersion:   17,
		Migrate:     migrateV17,
		Validate:    validateV17,
	}
}

func (wafIPGroupV17) TableName() string {
	return "waf_ip_groups"
}

func (wafRuleGroupV17) TableName() string {
	return "waf_rule_groups"
}

func migrateV17(ctx Context, db *gorm.DB, backend string) error {
	return nil
}

func validateV17(ctx Context, db *gorm.DB, backend string) error {
	if err := ctx.ValidateDatabaseSchemaVersion(db, backend, 16); err != nil {
		return err
	}
	if db == nil || !db.Migrator().HasTable(&wafIPGroupV17{}) {
		return fmt.Errorf("table waf_ip_groups is missing")
	}
	if !db.Migrator().HasColumn(&wafRuleGroupV17{}, "ip_whitelist_groups") {
		return fmt.Errorf("column waf_rule_groups.ip_whitelist_groups is missing")
	}
	if !db.Migrator().HasColumn(&wafRuleGroupV17{}, "ip_blacklist_groups") {
		return fmt.Errorf("column waf_rule_groups.ip_blacklist_groups is missing")
	}
	return nil
}
