package model

import (
	"openflare/common"
	"testing"
)

func TestInitOptionMapDefaultsRegisterDisabled(t *testing.T) {
	previousRegisterEnabled := common.RegisterEnabled
	previousOptionMap := common.OptionMap
	previousDB := DB
	t.Cleanup(func() {
		common.RegisterEnabled = previousRegisterEnabled
		common.OptionMap = previousOptionMap
		DB = previousDB
	})

	DB = openTestSQLiteDB(t, "options-defaults.db")
	common.RegisterEnabled = false
	common.OptionMap = nil

	InitOptionMap()

	if got := common.OptionMap["RegisterEnabled"]; got != "false" {
		t.Fatalf("expected RegisterEnabled default to be false, got %q", got)
	}
	if common.RegisterEnabled {
		t.Fatal("expected RegisterEnabled to remain false after InitOptionMap")
	}
}
