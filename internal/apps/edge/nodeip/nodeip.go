// Package nodeip detects the preferred public IP address for edge nodes.
package nodeip

import (
	"context"
	"net"
	"time"

	"github.com/Rain-kl/Wavelet/pkg/geoip"
	"github.com/Rain-kl/Wavelet/pkg/geoip/iputil"
)

const (
	outboundIPLookupTimeout = 5 * time.Second
	publicIPPriorityScore   = 2 // matches iputil.Score for public IPv4 addresses
)

// LookupOutboundIP and LookupLocalIP are the provider functions used to detect the node's outbound/local IP.
// They are package-level variables so they can be overridden in tests.
var (
	LookupOutboundIP = geoip.GetOutboundIP
	LookupLocalIP    = DetectLocal
)

// Detect returns the best available outbound or local IPv4 address for this node.
func Detect() string {
	if ip := detectOutbound(context.Background()); ip != "" {
		return ip
	}
	return LookupLocalIP()
}

// DetectWithContext returns the best available outbound or local IPv4 address, respecting ctx for cancellation.
func DetectWithContext(ctx context.Context) string {
	if ip := detectOutbound(ctx); ip != "" {
		return ip
	}
	return LookupLocalIP()
}

func detectOutbound(ctx context.Context) string {
	ctx, cancel := context.WithTimeout(ctx, outboundIPLookupTimeout)
	defer cancel()
	ip, err := LookupOutboundIP(ctx)
	if err != nil || ip == nil {
		return ""
	}
	return ip.String()
}

// DetectLocal returns the highest-priority non-loopback local IPv4 address found on system interfaces.
func DetectLocal() string {
	interfaces, err := net.Interfaces()
	if err != nil {
		return ""
	}
	bestIP := ""
	bestPriority := -1
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok || ipNet.IP == nil || ipNet.IP.IsLoopback() {
				continue
			}
			ipv4 := ipNet.IP.To4()
			if ipv4 == nil {
				continue
			}
			priority := iputil.Score(ipv4)
			if priority > bestPriority {
				bestIP = ipv4.String()
				bestPriority = priority
			}
			if bestPriority == publicIPPriorityScore {
				return bestIP
			}
		}
	}
	return bestIP
}
