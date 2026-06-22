package model

import (
	"strconv"
	"strings"
	"time"
)

var enabledOptionAppliers = map[string]func(bool){
	"PasswordRegisterEnabled":      func(v bool) { PasswordRegisterEnabled = v },
	"PasswordLoginEnabled":         func(v bool) { PasswordLoginEnabled = v },
	"CapLoginEnabled":              func(v bool) { CapLoginEnabled = v },
	"EmailVerificationEnabled":     func(v bool) { EmailVerificationEnabled = v },
	"AgentWebsocketUpgradeEnabled": func(v bool) { AgentWebsocketUpgradeEnabled = v },
	"UptimeKumaEnabled":            func(v bool) { UptimeKumaEnabled = v },
	"DatabaseAutoCleanupEnabled":   func(v bool) { DatabaseAutoCleanupEnabled = v },
}

var stringOptionAppliers = map[string]func(string){
	"ServerAddress":             func(v string) { ServerAddress = v },
	"Footer":                    func(v string) { Footer = v },
	"HomePageLink":              func(v string) { HomePageLink = v },
	"SystemName":                func(v string) { SystemName = v },
	"AgentDiscoveryToken":       func(v string) { AgentDiscoveryToken = v },
	"GeoIPProvider":             func(v string) { GeoIPProvider = v },
	"UptimeKumaUrl":             func(v string) { UptimeKumaURL = v },
	"UptimeKumaUsername":        func(v string) { UptimeKumaUsername = v },
	optionKeyUptimeKumaPassword: func(v string) { UptimeKumaPassword = v },
	"UptimeKumaMonitorScope":    func(v string) { UptimeKumaMonitorScope = v },
	"UptimeKumaSelectedSites":   func(v string) { UptimeKumaSelectedSites = v },
}

func applyEnabledOptionMirror(key, value string) {
	applier, ok := enabledOptionAppliers[key]
	if !ok {
		return
	}
	applier(value == optionValueTrue)
}

func applyStringOptionMirror(key, value string) {
	if applier, ok := stringOptionAppliers[key]; ok {
		applier(value)
	}
}

type intOptionApplier struct {
	apply func(int)
	min   int
}

var integerOptionAppliers = map[string]intOptionApplier{
	"SMTPPort":                         {apply: func(v int) { SMTPPort = v }},
	"AgentHeartbeatInterval":           {apply: func(v int) { AgentHeartbeatInterval = v }, min: 1},
	"UptimeKumaSyncInterval":           {apply: func(v int) { UptimeKumaSyncInterval = v }, min: 1},
	"UptimeKumaInterval":               {apply: func(v int) { UptimeKumaInterval = v }, min: 1},
	"UptimeKumaRetry":                  {apply: func(v int) { UptimeKumaRetry = v }, min: 0},
	"UptimeKumaRetryInterval":          {apply: func(v int) { UptimeKumaRetryInterval = v }, min: 1},
	"UptimeKumaTimeout":                {apply: func(v int) { UptimeKumaTimeout = v }, min: 1},
	"DatabaseAutoCleanupRetentionDays": {apply: func(v int) { DatabaseAutoCleanupRetentionDays = v }, min: 1},
}

func applyIntegerOptionMirror(key, value string) {
	applier, ok := integerOptionAppliers[key]
	if !ok {
		return
	}
	intValue, err := strconv.Atoi(value)
	if err != nil || intValue < applier.min {
		return
	}
	applier.apply(intValue)
}

func applySpecialOptionMirror(key, value string) {
	switch key {
	case "NodeOfflineThreshold":
		if v, err := strconv.Atoi(value); err == nil && v > 0 {
			NodeOfflineThreshold = time.Duration(v) * time.Millisecond
		}
	case "AgentUpdateRepo":
		if strings.TrimSpace(value) != "" {
			AgentUpdateRepo = value
		}
	}
}
