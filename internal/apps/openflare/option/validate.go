// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package option

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/Rain-kl/Wavelet/internal/apps/openflare/geoip"
	"github.com/Rain-kl/Wavelet/internal/model"
)

const maxOpenRestyGzipCompLevel = 9

var (
	openRestySizePattern          = regexp.MustCompile(`^\d+[kKmMgG]?$`)
	openRestyProxyBuffersPattern  = regexp.MustCompile(`^\d+\s+\d+[kKmMgG]?$`)
	openRestyCacheLevelsPattern   = regexp.MustCompile(`^\d{1,2}(?::\d{1,2}){0,2}$`)
	openRestyDurationTokenPattern = regexp.MustCompile(`^\d+[smhdwSMHDW]$`)
)

const optionValueTrue = "true"

func buildOptionValidationState(options []model.OpenFlareOption) map[string]string {
	model.OptionMapRWMutex.RLock()
	state := make(map[string]string, len(model.OptionMap)+len(options))
	for key, value := range model.OptionMap {
		state[key] = value
	}
	model.OptionMapRWMutex.RUnlock()

	for _, option := range options {
		state[option.Key] = option.Value
	}
	return state
}

func validateOptionWithState(option model.OpenFlareOption, state map[string]string) error {
	switch option.Key {
	case "GitHubOAuthEnabled":
		if option.Value == optionValueTrue && strings.TrimSpace(state["GitHubClientId"]) == "" {
			return fmt.Errorf("无法启用 GitHub OAuth，请先填入 GitHub Client ID 以及 GitHub Client Secret！")
		}
	case "WeChatAuthEnabled":
		if option.Value == optionValueTrue && strings.TrimSpace(state["WeChatServerAddress"]) == "" {
			return fmt.Errorf("无法启用微信登录，请先填入微信登录相关配置信息！")
		}
	}

	if err := validateOpenRestyOption(option.Key, option.Value); err != nil {
		return err
	}
	if err := validateGeoIPOption(option.Key, option.Value); err != nil {
		return err
	}
	if err := validateDatabaseCleanupOption(option.Key, option.Value); err != nil {
		return err
	}
	if err := validateAgentOption(option.Key, option.Value); err != nil {
		return err
	}
	return validateUptimeKumaOption(option.Key, option.Value, state)
}

func validatePositiveIntegerOption(key, value string) error {
	intValue, err := strconv.Atoi(value)
	if err != nil || intValue <= 0 {
		return fmt.Errorf("%s 必须为大于 0 的整数", key)
	}
	return nil
}

func validateBooleanOption(key, value string) error {
	switch value {
	case optionValueTrue, "false":
		return nil
	default:
		return fmt.Errorf("%s 必须为 true 或 false", key)
	}
}

func validateGeoIPOption(key, value string) error {
	if key != "GeoIPProvider" {
		return nil
	}
	if geoip.IsValidProvider(value) {
		return nil
	}
	return fmt.Errorf("%s 仅支持 disabled、mmdb、ip-api、geojs、ipinfo", key)
}

func validateDatabaseCleanupOption(key, value string) error {
	switch key {
	case "DatabaseAutoCleanupEnabled":
		return validateBooleanOption(key, value)
	case "DatabaseAutoCleanupRetentionDays":
		intValue, err := strconv.Atoi(value)
		if err != nil || intValue < 1 {
			return fmt.Errorf("%s 必须为大于等于 1 的整数天", key)
		}
	}
	return nil
}

func validateAgentOption(key, value string) error {
	if key == "AgentWebsocketUpgradeEnabled" {
		return validateBooleanOption(key, strings.TrimSpace(value))
	}
	return nil
}

func validateUptimeKumaOption(key, value string, state map[string]string) error {
	trimmed := strings.TrimSpace(value)
	switch key {
	case "UptimeKumaEnabled":
		return validateUptimeKumaEnabled(key, trimmed, state)
	case "UptimeKumaUsername":
		return validateUptimeKumaUsername(trimmed, state)
	case "UptimeKumaUrl":
		return validateUptimeKumaURL(trimmed)
	case "UptimeKumaMonitorScope":
		return validateUptimeKumaMonitorScope(trimmed)
	case "UptimeKumaSyncInterval", "UptimeKumaInterval", "UptimeKumaRetryInterval", "UptimeKumaTimeout":
		return validatePositiveIntegerOption(key, trimmed)
	case "UptimeKumaRetry":
		return validateUptimeKumaRetry(key, trimmed)
	}
	return nil
}

func validateUptimeKumaEnabled(key, trimmed string, state map[string]string) error {
	if err := validateBooleanOption(key, trimmed); err != nil {
		return err
	}
	if trimmed != optionValueTrue {
		return nil
	}
	url := strings.TrimSpace(state["UptimeKumaUrl"])
	username := strings.TrimSpace(state["UptimeKumaUsername"])
	password := strings.TrimSpace(state["UptimeKumaPassword"])
	if url == "" {
		return fmt.Errorf("启用 Uptime Kuma 时地址不能为空")
	}
	if username == "" {
		return fmt.Errorf("启用 Uptime Kuma 时用户名不能为空")
	}
	if password == "" && model.UptimeKumaPassword == "" {
		return fmt.Errorf("启用 Uptime Kuma 时密码不能为空")
	}
	return nil
}

func validateUptimeKumaUsername(trimmed string, state map[string]string) error {
	if trimmed == "" && state["UptimeKumaEnabled"] == optionValueTrue {
		return fmt.Errorf("启用 Uptime Kuma 时用户名不能为空")
	}
	return nil
}

func validateUptimeKumaURL(trimmed string) error {
	if trimmed != "" && !strings.HasPrefix(trimmed, "http://") && !strings.HasPrefix(trimmed, "https://") {
		return fmt.Errorf("uptime Kuma 地址必须以 http:// 或 https:// 开头")
	}
	return nil
}

func validateUptimeKumaMonitorScope(trimmed string) error {
	if trimmed != "all" && trimmed != "selected" {
		return fmt.Errorf("监控范围必须为全部站点 (all) 或选择站点 (selected)")
	}
	return nil
}

func validateUptimeKumaRetry(key, trimmed string) error {
	intValue, err := strconv.Atoi(trimmed)
	if err != nil || intValue < 0 {
		return fmt.Errorf("%s 必须为大于等于 0 的整数", key)
	}
	return nil
}

func validateOptions(options []model.OpenFlareOption) error {
	if len(options) == 0 {
		return errors.New(errInvalidParams)
	}

	state := buildOptionValidationState(options)
	for _, option := range options {
		if strings.TrimSpace(option.Key) == "" {
			return errors.New(errInvalidParams)
		}
		if err := validateOptionWithState(option, state); err != nil {
			return err
		}
	}
	return nil
}
