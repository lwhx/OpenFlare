// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package waf

import (
	oftasks "github.com/Rain-kl/Wavelet/internal/apps/openflare/tasks"
)

func init() {
	oftasks.RegisterWAFIPGroupSync(SyncDueWAFIPGroups)
}
