package updater

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"runtime"
	"strings"
	"syscall"
	"time"

	"atsflare-agent/internal/config"
)

type Service struct {
	httpClient   *http.Client
	lastCheckTag string
}

func New() *Service {
	return &Service{
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

type githubRelease struct {
	TagName string        `json:"tag_name"`
	Assets  []githubAsset `json:"assets"`
}

type githubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

func (s *Service) CheckAndUpdate(ctx context.Context, repo string) error {
	release, err := s.getLatestRelease(ctx, repo)
	if err != nil {
		return fmt.Errorf("check latest release: %w", err)
	}
	if release == nil || release.TagName == "" {
		return nil
	}

	remoteVersion := normalizeVersion(release.TagName)
	localVersion := normalizeVersion(config.AgentVersion)

	if remoteVersion == localVersion || remoteVersion == s.lastCheckTag {
		return nil
	}
	if !isNewer(localVersion, remoteVersion) {
		s.lastCheckTag = remoteVersion
		return nil
	}

	log.Printf("agent update available: %s -> %s", localVersion, remoteVersion)
	assetName := fmt.Sprintf("atsflare-agent-%s-%s", runtime.GOOS, runtime.GOARCH)

	var downloadURL string
	for _, asset := range release.Assets {
		if asset.Name == assetName {
			downloadURL = asset.BrowserDownloadURL
			break
		}
	}
	if downloadURL == "" {
		s.lastCheckTag = remoteVersion
		return fmt.Errorf("no matching asset %q in release %s", assetName, release.TagName)
	}

	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("get executable path: %w", err)
	}
	if err = s.downloadAndReplace(ctx, downloadURL, execPath); err != nil {
		return fmt.Errorf("download and replace: %w", err)
	}

	log.Printf("agent binary updated, restarting...")
	return s.restart(execPath)
}

func (s *Service) getLatestRelease(ctx context.Context, repo string) (*githubRelease, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", repo)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api returned %s", resp.Status)
	}

	var release githubRelease
	if err = json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, err
	}
	return &release, nil
}

func (s *Service) downloadAndReplace(ctx context.Context, url string, targetPath string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download returned %s", resp.Status)
	}

	tmpPath := targetPath + ".update"
	tmpFile, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return err
	}
	if _, err = io.Copy(tmpFile, resp.Body); err != nil {
		tmpFile.Close()
		os.Remove(tmpPath)
		return err
	}
	tmpFile.Close()

	backupPath := targetPath + ".bak"
	os.Remove(backupPath)
	if err = os.Rename(targetPath, backupPath); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("backup current binary: %w", err)
	}
	if err = os.Rename(tmpPath, targetPath); err != nil {
		// Attempt to restore backup
		os.Rename(backupPath, targetPath)
		return fmt.Errorf("replace binary: %w", err)
	}
	os.Remove(backupPath)
	return nil
}

func (s *Service) restart(execPath string) error {
	argv := os.Args
	if err := syscall.Exec(execPath, argv, os.Environ()); err != nil {
		return fmt.Errorf("exec restart: %w", err)
	}
	return errors.New("unreachable after exec")
}

func normalizeVersion(v string) string {
	v = strings.TrimSpace(v)
	v = strings.TrimPrefix(v, "v")
	return v
}

func isNewer(local, remote string) bool {
	localParts := strings.Split(local, ".")
	remoteParts := strings.Split(remote, ".")
	maxLen := len(localParts)
	if len(remoteParts) > maxLen {
		maxLen = len(remoteParts)
	}
	for i := 0; i < maxLen; i++ {
		lp, rp := "0", "0"
		if i < len(localParts) {
			lp = localParts[i]
		}
		if i < len(remoteParts) {
			rp = remoteParts[i]
		}
		if rp > lp {
			return true
		}
		if rp < lp {
			return false
		}
	}
	return false
}
