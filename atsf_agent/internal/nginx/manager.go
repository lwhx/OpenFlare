package nginx

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

type Executor interface {
	Test(ctx context.Context) error
	Reload(ctx context.Context) error
}

type ShellExecutor struct {
	Binary string
}

func (e *ShellExecutor) Test(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, e.Binary, "-t")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("nginx -t failed: %w: %s", err, string(output))
	}
	return nil
}

func (e *ShellExecutor) Reload(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, e.Binary, "-s", "reload")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("nginx reload failed: %w: %s", err, string(output))
	}
	return nil
}

type Manager struct {
	RouteConfigPath string
	Executor        Executor
}

func (m *Manager) Apply(ctx context.Context, content string) error {
	backupPath, hadExisting, err := m.backup()
	if err != nil {
		return err
	}
	if err = os.WriteFile(m.RouteConfigPath, []byte(content), 0o644); err != nil {
		return err
	}
	if err = m.Executor.Test(ctx); err != nil {
		_ = m.restore(backupPath, hadExisting)
		return err
	}
	if err = m.Executor.Reload(ctx); err != nil {
		_ = m.restore(backupPath, hadExisting)
		return err
	}
	if backupPath != "" {
		_ = os.Remove(backupPath)
	}
	return nil
}

func (m *Manager) backup() (string, bool, error) {
	if m.RouteConfigPath == "" {
		return "", false, errors.New("route config path 不能为空")
	}
	if err := os.MkdirAll(filepath.Dir(m.RouteConfigPath), 0o755); err != nil {
		return "", false, err
	}
	data, err := os.ReadFile(m.RouteConfigPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", false, nil
		}
		return "", false, err
	}
	backupPath := m.RouteConfigPath + ".bak"
	if err = os.WriteFile(backupPath, data, 0o644); err != nil {
		return "", false, err
	}
	return backupPath, true, nil
}

func (m *Manager) restore(backupPath string, hadExisting bool) error {
	if hadExisting {
		data, err := os.ReadFile(backupPath)
		if err != nil {
			return err
		}
		return os.WriteFile(m.RouteConfigPath, data, 0o644)
	}
	if err := os.Remove(m.RouteConfigPath); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
