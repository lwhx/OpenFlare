// Package runtimeuser defines the shared OS account used by the agent process
// and OpenResty worker processes so file ownership stays aligned.
package runtimeuser

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/user"
	"path/filepath"
	"strconv"
	"strings"

	openrestyrender "github.com/Rain-kl/Wavelet/pkg/render/openresty"
)

// Name is the dedicated service account shared by the agent and OpenResty workers.
const Name = openrestyrender.OpenFlareRuntimeUser

const (
	// DefaultDirPerm is the normalized permission for runtime directories.
	DefaultDirPerm = 0o755
	// DefaultFilePerm is the normalized permission for runtime files.
	DefaultFilePerm = 0o644
)

// Account holds the resolved UID/GID for Name on the current host.
type Account struct {
	Name string
	UID  int
	GID  int
}

// Lookup resolves the runtime account on the current host.
func Lookup() (*Account, error) {
	record, err := user.Lookup(Name)
	if err != nil {
		return nil, fmt.Errorf("lookup %s: %w", Name, err)
	}
	uid, err := strconv.Atoi(record.Uid)
	if err != nil {
		return nil, fmt.Errorf("parse uid for %s: %w", Name, err)
	}
	gid, err := strconv.Atoi(record.Gid)
	if err != nil {
		return nil, fmt.Errorf("parse gid for %s: %w", Name, err)
	}
	return &Account{Name: Name, UID: uid, GID: gid}, nil
}

// CurrentEUID returns the effective UID of the current process.
func CurrentEUID() int {
	return os.Geteuid()
}

// IsRuntimeUser reports whether the current process runs as Name.
func IsRuntimeUser() bool {
	account, err := Lookup()
	if err != nil {
		return false
	}
	return os.Geteuid() == account.UID
}

// EnsureProcessUser drops from root to Name when possible so the agent writes
// files with the same ownership OpenResty workers read.
func EnsureProcessUser() error {
	account, err := Lookup()
	if err != nil {
		slog.Warn("runtime user unavailable, agent continues as current user", "user", Name, "euid", os.Geteuid(), "error", err)
		return nil
	}
	if os.Geteuid() == account.UID {
		slog.Info("agent running as runtime user", "user", Name, "uid", account.UID)
		return nil
	}
	if os.Geteuid() != 0 {
		slog.Warn("agent is not running as runtime user", "expected", Name, "euid", os.Geteuid())
		return nil
	}
	if dropErr := dropTo(account); dropErr != nil {
		return dropErr
	}
	slog.Info("agent dropped privileges to runtime user", "user", Name, "uid", account.UID)
	return nil
}

// EnsurePathOwnership makes root and its ancestors traversable, assigns runtime
// ownership when running as root, and normalizes directory/file modes.
func EnsurePathOwnership(root string, dirPerm os.FileMode, filePerm os.FileMode) error {
	root = filepath.Clean(strings.TrimSpace(root))
	if root == "" || root == "." {
		return nil
	}
	if err := ensureWorldTraversablePath(root); err != nil {
		return err
	}
	if _, statErr := os.Stat(root); os.IsNotExist(statErr) {
		return nil
	}
	account, lookupErr := Lookup()
	if lookupErr != nil {
		var unknown user.UnknownUserError
		if errors.As(lookupErr, &unknown) {
			return ensureModesOnly(root, dirPerm, filePerm)
		}
		return lookupErr
	}
	return applyOwnershipAndModes(root, account, dirPerm, filePerm)
}