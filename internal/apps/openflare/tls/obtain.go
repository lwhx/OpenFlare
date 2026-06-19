// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package tls

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Rain-kl/Wavelet/internal/apps/openflare/tls/acme"
	"github.com/Rain-kl/Wavelet/internal/model"
)

const (
	acmeRenewLeadTime      = 7 * 24 * time.Hour
	tlsProviderACME        = "acme"
	tlsApplyStatusApplying = "applying"
	tlsApplyStatusReady    = "ready"
)

var obtainTLSCertificate = obtainCertificate

// SetObtainCertificateFuncForTest swaps the async obtain implementation for tests.
func SetObtainCertificateFuncForTest(fn func(context.Context, *model.TLSCertificate) error) func() {
	previous := obtainTLSCertificate
	obtainTLSCertificate = fn
	return func() {
		obtainTLSCertificate = previous
	}
}

func obtainCertificate(ctx context.Context, cert *model.TLSCertificate) error {
	cert.ApplyStatus = tlsApplyStatusApplying
	if err := model.SaveTLSCertificate(ctx, cert); err != nil {
		return err
	}

	acmeAccount, err := resolveAcmeAccount(ctx, cert)
	if err != nil {
		return updateCertError(ctx, cert, fmt.Sprintf("Failed to get ACME account: %v", err))
	}

	dnsAccount, err := model.GetDNSAccountByID(ctx, cert.DNSAccountID)
	if err != nil {
		return updateCertError(ctx, cert, fmt.Sprintf("Failed to get DNS account: %v", err))
	}

	dnsAuth, err := openSensitive(dnsAccount.Authorization)
	if err != nil {
		return updateCertError(ctx, cert, fmt.Sprintf("Failed to decrypt DNS credentials: %v", err))
	}

	acmePrivateKey, err := openSensitive(acmeAccount.PrivateKey)
	if err != nil {
		return updateCertError(ctx, cert, fmt.Sprintf("Failed to decrypt ACME account key: %v", err))
	}

	domains := splitAcmeDomains(cert.PrimaryDomain, cert.OtherDomains)

	newAccountURL, newPrivateKeyPEM, result, err := acme.ObtainSSL(
		acmeAccount.Email,
		acmePrivateKey,
		acmeAccount.URL,
		dnsAccount.Type,
		dnsAuth,
		cert.DNS1,
		cert.DNS2,
		cert.DisableCNAME,
		cert.SkipDNS,
		cert.KeyAlgorithm,
		domains,
	)

	if err := persistAcmeAccountUpdates(ctx, cert, acmeAccount, newAccountURL, newPrivateKeyPEM, acmePrivateKey); err != nil {
		return updateCertError(ctx, cert, err.Error())
	}

	if err != nil {
		return updateCertError(ctx, cert, err.Error())
	}

	if err := saveObtainedCertificate(ctx, cert, result); err != nil {
		return updateCertError(ctx, cert, err.Error())
	}
	return nil
}

func updateCertError(ctx context.Context, cert *model.TLSCertificate, message string) error {
	cert.ApplyStatus = "error"
	cert.ApplyMessage = message
	if err := model.SaveTLSCertificate(ctx, cert); err != nil {
		return err
	}
	return fmt.Errorf("%s", message)
}

func splitAcmeDomains(primaryDomain, otherDomains string) []string {
	primaryDomain = strings.TrimSpace(primaryDomain)
	domains := []string{}
	if primaryDomain != "" {
		domains = append(domains, primaryDomain)
	}
	otherDomains = strings.TrimSpace(otherDomains)
	if otherDomains == "" {
		return domains
	}

	separator := "\n"
	if !strings.Contains(otherDomains, "\n") && strings.Contains(otherDomains, ",") {
		separator = ","
	}
	for _, domain := range strings.Split(otherDomains, separator) {
		domain = strings.TrimSpace(domain)
		if domain != "" {
			domains = append(domains, domain)
		}
	}
	return domains
}

// CertificatesDueForRenewal returns ACME certificates that should be renewed at the given time.
func CertificatesDueForRenewal(certificates []model.TLSCertificate, now time.Time) []model.TLSCertificate {
	due := make([]model.TLSCertificate, 0)
	for _, cert := range certificates {
		if !cert.AutoRenew || cert.Provider != tlsProviderACME || cert.ApplyStatus == tlsApplyStatusApplying {
			continue
		}
		if cert.NotAfter.IsZero() {
			continue
		}
		if cert.NotAfter.Sub(now) < acmeRenewLeadTime {
			due = append(due, cert)
		}
	}
	return due
}
