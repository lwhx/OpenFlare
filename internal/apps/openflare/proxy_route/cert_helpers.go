// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package proxy_route

import (
	"context"
	"errors"
)

func normalizeExplicitDomainCertIDs(ctx context.Context, domains []string, rawDomainCertIDs []uint) ([]uint, []uint, *uint, error) {
	if len(rawDomainCertIDs) != len(domains) {
		return nil, nil, nil, errors.New(errProxyRouteCertDomainLength)
	}

	normalizedDomainCertIDs := make([]uint, len(rawDomainCertIDs))
	uniqueCertIDs := make([]uint, 0, len(rawDomainCertIDs))
	seen := make(map[uint]struct{}, len(rawDomainCertIDs))
	hasAssignedCertificate := false
	for index, item := range rawDomainCertIDs {
		if item == 0 {
			continue
		}
		if _, err := lookupTLSCertificateByID(ctx, item); err != nil {
			return nil, nil, nil, errors.New(errProxyRouteCertNotFound)
		}
		normalizedDomainCertIDs[index] = item
		hasAssignedCertificate = true
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		uniqueCertIDs = append(uniqueCertIDs, item)
	}
	if !hasAssignedCertificate {
		return nil, nil, nil, errors.New(errProxyRouteCertRequired)
	}

	primaryCertID := &uniqueCertIDs[0]
	return normalizedDomainCertIDs, uniqueCertIDs, primaryCertID, nil
}

func normalizeDerivedDomainCertIDs(
	ctx context.Context,
	domains []string,
	normalizedCertIDs []uint,
) ([]uint, []uint, *uint, error) {
	switch {
	case len(normalizedCertIDs) == 0:
		return nil, nil, nil, errors.New(errProxyRouteCertRequired)
	case len(normalizedCertIDs) == 1:
		domainCertIDs := make([]uint, len(domains))
		for index := range domainCertIDs {
			domainCertIDs[index] = normalizedCertIDs[0]
		}
		primaryCertID := &normalizedCertIDs[0]
		return domainCertIDs, normalizedCertIDs, primaryCertID, nil
	case len(normalizedCertIDs) == len(domains):
		domainCertIDs := make([]uint, len(normalizedCertIDs))
		copy(domainCertIDs, normalizedCertIDs)
		primaryCertID := &normalizedCertIDs[0]
		return domainCertIDs, normalizedCertIDs, primaryCertID, nil
	default:
		domainCertIDs, err := deriveDomainCertIDsFromCertificateSet(ctx, domains, normalizedCertIDs)
		if err != nil {
			return nil, nil, nil, err
		}
		primaryCertID := &normalizedCertIDs[0]
		return domainCertIDs, normalizedCertIDs, primaryCertID, nil
	}
}
