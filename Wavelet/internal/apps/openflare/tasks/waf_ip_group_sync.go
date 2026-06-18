// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package tasks

import "context"

// RegisterWAFIPGroupSync registers the WAF IP group sync cron job without importing waf.
func RegisterWAFIPGroupSync(syncFn func(context.Context) error) {
	RegisterCronJob("waf_ip_group_sync", "@every 5m", func(ctx context.Context) {
		if err := syncFn(ctx); err != nil {
			LogJobError(ctx, "waf_ip_group_sync", err)
		}
	})
}
