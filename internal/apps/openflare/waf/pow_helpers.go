// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package waf

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"regexp"
	"strings"
)

func parsePoWConfigRaw(enabled bool, raw string) (PoWConfig, error) {
	if !enabled {
		return defaultPoWConfig(), nil
	}
	cfg := defaultPoWConfig()
	text := strings.TrimSpace(raw)
	if text == "" || text == "{}" {
		return cfg, nil
	}
	if err := json.Unmarshal([]byte(text), &cfg); err != nil {
		return cfg, errors.New("pow_config 格式无效")
	}
	return cfg, nil
}

func validatePoWCoreSettings(cfg PoWConfig) error {
	if cfg.Difficulty < 1 || cfg.Difficulty > 16 {
		return errors.New("pow_config.difficulty 必须在 1-16 之间")
	}
	if !powAlgorithmValues[cfg.Algorithm] {
		return errors.New("pow_config.algorithm 必须为 fast 或 slow")
	}
	if cfg.SessionTTL < minPoWSessionTTLSeconds {
		return errors.New("pow_config.session_ttl 不能小于 60 秒")
	}
	if cfg.ChallengeTTL < minPoWChallengeTTLSeconds {
		return errors.New("pow_config.challenge_ttl 不能小于 30 秒")
	}
	return nil
}

func validatePoWCIDRs(cidrs []string, listName string) error {
	for _, cidr := range cidrs {
		if _, _, err := net.ParseCIDR(cidr); err != nil {
			return fmt.Errorf("pow_config %s IP CIDR 格式无效: %s", listName, cidr)
		}
	}
	return nil
}

func validatePoWPathRegexes(regexes []string, listName string) error {
	for _, re := range regexes {
		if _, err := regexp.Compile(re); err != nil {
			return fmt.Errorf("pow_config %s路径正则格式无效: %s", listName, re)
		}
	}
	return nil
}

func validatePoWIPs(ips []string, listName string) error {
	for _, ip := range ips {
		if net.ParseIP(ip) == nil {
			return fmt.Errorf("pow_config %s IP 格式无效: %s", listName, ip)
		}
	}
	return nil
}

func validatePoWListMutualExclusion(cfg PoWConfig) error {
	type dimension struct {
		name string
		wl   []string
		bl   []string
	}
	dimensions := []dimension{
		{"IP", cfg.Whitelist.IPs, cfg.Blacklist.IPs},
		{"IP CIDR", cfg.Whitelist.IPCidrs, cfg.Blacklist.IPCidrs},
		{"路径", cfg.Whitelist.Paths, cfg.Blacklist.Paths},
		{"路径正则", cfg.Whitelist.PathRegexes, cfg.Blacklist.PathRegexes},
		{"User-Agent", cfg.Whitelist.UserAgents, cfg.Blacklist.UserAgents},
	}
	for _, dim := range dimensions {
		if len(dim.wl) > 0 && len(dim.bl) > 0 {
			return fmt.Errorf("pow_config %s 不能同时配置白名单和黑名单", dim.name)
		}
	}
	return nil
}
