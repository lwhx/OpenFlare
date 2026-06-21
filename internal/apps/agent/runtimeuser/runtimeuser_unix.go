//go:build unix

package runtimeuser

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"
)

func dropTo(account *Account) error {
	if err := syscall.Setgid(account.GID); err != nil {
		return fmt.Errorf("setgid %d: %w", account.GID, err)
	}
	if err := syscall.Setuid(account.UID); err != nil {
		return fmt.Errorf("setuid %d: %w", account.UID, err)
	}
	return nil
}

func ensureWorldTraversablePath(targetDir string) error {
	const maxDepth = 12
	current := filepath.Clean(strings.TrimSpace(targetDir))
	if current == "" || current == "." {
		return nil
	}
	for depth := 0; depth < maxDepth; depth++ {
		if err := os.Chmod(current, DefaultDirPerm); err != nil { //nolint:gosec // parent dirs must be traversable by the runtime user
			if os.IsNotExist(err) || os.IsPermission(err) {
				break
			}
			return fmt.Errorf("chmod %s: %w", current, err)
		}
		parent := filepath.Dir(current)
		if parent == current {
			break
		}
		current = parent
	}
	return nil
}

func applyOwnershipAndModes(root string, account *Account, dirPerm os.FileMode, filePerm os.FileMode) error {
	return filepath.WalkDir(root, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if os.Geteuid() == 0 {
			if chownErr := os.Chown(path, account.UID, account.GID); chownErr != nil && !os.IsNotExist(chownErr) { //nolint:gosec // path is under managed root walk
				return fmt.Errorf("chown %s: %w", path, chownErr)
			}
		}
		if entry.IsDir() {
			if chmodErr := os.Chmod(path, dirPerm); chmodErr != nil && !os.IsNotExist(chmodErr) { //nolint:gosec // path is under managed root walk
				return fmt.Errorf("chmod dir %s: %w", path, chmodErr)
			}
			return nil
		}
		if !info.Mode().IsRegular() {
			return nil
		}
		mode := filePerm
		if chmodErr := os.Chmod(path, mode); chmodErr != nil && !os.IsNotExist(chmodErr) { //nolint:gosec // path is under managed root walk
			return fmt.Errorf("chmod file %s: %w", path, chmodErr)
		}
		return nil
	})
}

func ensureModesOnly(root string, dirPerm os.FileMode, filePerm os.FileMode) error {
	return filepath.WalkDir(root, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if entry.IsDir() {
			if chmodErr := os.Chmod(path, dirPerm); chmodErr != nil && !os.IsNotExist(chmodErr) { //nolint:gosec // path is under managed root walk
				return fmt.Errorf("chmod dir %s: %w", path, chmodErr)
			}
			return nil
		}
		if !info.Mode().IsRegular() {
			return nil
		}
		if chmodErr := os.Chmod(path, filePerm); chmodErr != nil && !os.IsNotExist(chmodErr) { //nolint:gosec // path is under managed root walk
			return fmt.Errorf("chmod file %s: %w", path, chmodErr)
		}
		return nil
	})
}