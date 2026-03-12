package service

import (
	"atsflare/common"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

const latestReleaseURL = "https://api.github.com/repos/Rain-kl/ATSFlare/releases/latest"

var updateHTTPClient = &http.Client{
	Timeout: 30 * time.Second,
}

var serverUpgradeState struct {
	sync.Mutex
	inProgress bool
}

var manualServerBinaryState struct {
	sync.Mutex
	candidate *manualServerBinaryCandidate
}

var serverBinaryUpgradeExecutor = replaceAndRestartServer

var serverUpgradeDispatchDelay = 500 * time.Millisecond

type LatestServerRelease struct {
	TagName          string `json:"tag_name"`
	Body             string `json:"body"`
	HTMLURL          string `json:"html_url"`
	PublishedAt      string `json:"published_at"`
	CurrentVersion   string `json:"current_version"`
	HasUpdate        bool   `json:"has_update"`
	UpgradeSupported bool   `json:"upgrade_supported"`
	InProgress       bool   `json:"in_progress"`
}

type githubReleaseResponse struct {
	TagName     string        `json:"tag_name"`
	Body        string        `json:"body"`
	HTMLURL     string        `json:"html_url"`
	PublishedAt string        `json:"published_at"`
	Assets      []githubAsset `json:"assets"`
}

type githubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

type preparedServerUpgrade struct {
	release     *LatestServerRelease
	downloadURL string
	execPath    string
}

type UploadedServerBinary struct {
	UploadToken       string    `json:"upload_token"`
	FileName          string    `json:"file_name"`
	DetectedVersion   string    `json:"detected_version"`
	CurrentVersion    string    `json:"current_version"`
	HasUpdate         bool      `json:"has_update"`
	UpgradeSupported  bool      `json:"upgrade_supported"`
	ReadyToUpgrade    bool      `json:"ready_to_upgrade"`
	ComparisonMessage string    `json:"comparison_message"`
	UploadedAt        time.Time `json:"uploaded_at"`
}

type manualServerBinaryCandidate struct {
	UploadToken     string
	FileName        string
	DetectedVersion string
	CurrentVersion  string
	TempPath        string
	ExecPath        string
	UploadedAt      time.Time
}

func GetLatestServerRelease(ctx context.Context) (*LatestServerRelease, error) {
	release, err := fetchLatestRelease(ctx)
	if err != nil {
		return nil, err
	}
	return buildLatestServerReleaseView(release), nil
}

func ScheduleServerUpgrade() (*LatestServerRelease, error) {
	serverUpgradeState.Lock()
	if serverUpgradeState.inProgress {
		serverUpgradeState.Unlock()
		return nil, fmt.Errorf("服务升级已在执行中，请稍后再试")
	}

	prepared, err := prepareServerUpgrade(context.Background())
	if err != nil {
		serverUpgradeState.Unlock()
		return nil, err
	}

	serverUpgradeState.inProgress = true
	serverUpgradeState.Unlock()

	prepared.release.InProgress = true

	go func(task *preparedServerUpgrade) {
		time.Sleep(serverUpgradeDispatchDelay)
		if err := executeServerUpgrade(task); err != nil {
			log.Printf("server self-update failed: %v", err)
			serverUpgradeState.Lock()
			serverUpgradeState.inProgress = false
			serverUpgradeState.Unlock()
		}
	}(prepared)

	return prepared.release, nil
}

func UploadManualServerBinary(ctx context.Context, fileName string, reader io.Reader) (*UploadedServerBinary, error) {
	serverUpgradeState.Lock()
	inProgress := serverUpgradeState.inProgress
	serverUpgradeState.Unlock()
	if inProgress {
		return nil, fmt.Errorf("服务升级已在执行中，请稍后再试")
	}
	if strings.TrimSpace(fileName) == "" {
		return nil, fmt.Errorf("缺少上传文件名")
	}
	if reader == nil {
		return nil, fmt.Errorf("缺少上传文件内容")
	}

	tempPath, err := persistUploadedServerBinary(fileName, reader)
	if err != nil {
		return nil, err
	}

	detectedVersion, err := detectUploadedServerBinaryVersion(ctx, tempPath)
	if err != nil {
		_ = os.Remove(tempPath)
		return nil, err
	}

	currentVersion := strings.TrimSpace(common.Version)
	uploadedAt := time.Now()
	info := buildUploadedServerBinaryView(fileName, currentVersion, detectedVersion, uploadedAt)
	if !info.ReadyToUpgrade {
		_ = os.Remove(tempPath)
		return info, nil
	}

	execPath, err := os.Executable()
	if err != nil {
		_ = os.Remove(tempPath)
		return nil, fmt.Errorf("获取当前服务程序路径失败: %v", err)
	}
	if err = verifyExecutableDirectoryWritable(execPath); err != nil {
		_ = os.Remove(tempPath)
		return nil, err
	}

	uploadToken, err := newUpgradeToken()
	if err != nil {
		_ = os.Remove(tempPath)
		return nil, fmt.Errorf("生成升级令牌失败: %v", err)
	}

	manualServerBinaryState.Lock()
	cleanupManualServerBinaryCandidateLocked()
	manualServerBinaryState.candidate = &manualServerBinaryCandidate{
		UploadToken:     uploadToken,
		FileName:        fileName,
		DetectedVersion: detectedVersion,
		CurrentVersion:  currentVersion,
		TempPath:        tempPath,
		ExecPath:        execPath,
		UploadedAt:      uploadedAt,
	}
	manualServerBinaryState.Unlock()

	info.UploadToken = uploadToken
	return info, nil
}

func ConfirmManualServerUpgrade(uploadToken string) (*UploadedServerBinary, error) {
	uploadToken = strings.TrimSpace(uploadToken)
	if uploadToken == "" {
		return nil, fmt.Errorf("缺少升级令牌")
	}

	serverUpgradeState.Lock()
	if serverUpgradeState.inProgress {
		serverUpgradeState.Unlock()
		return nil, fmt.Errorf("服务升级已在执行中，请稍后再试")
	}
	serverUpgradeState.Unlock()

	manualServerBinaryState.Lock()
	candidate := manualServerBinaryState.candidate
	if candidate == nil {
		manualServerBinaryState.Unlock()
		return nil, fmt.Errorf("未找到待确认的上传升级包，请重新上传")
	}
	if candidate.UploadToken != uploadToken {
		manualServerBinaryState.Unlock()
		return nil, fmt.Errorf("升级令牌无效或已过期，请重新上传")
	}
	manualServerBinaryState.candidate = nil
	manualServerBinaryState.Unlock()

	info := buildUploadedServerBinaryView(candidate.FileName, candidate.CurrentVersion, candidate.DetectedVersion, candidate.UploadedAt)
	info.UploadToken = candidate.UploadToken
	if !info.ReadyToUpgrade {
		_ = os.Remove(candidate.TempPath)
		return nil, fmt.Errorf("当前上传的二进制不满足升级条件")
	}

	serverUpgradeState.Lock()
	serverUpgradeState.inProgress = true
	serverUpgradeState.Unlock()

	go func(task *manualServerBinaryCandidate) {
		time.Sleep(serverUpgradeDispatchDelay)
		if err := executeManualServerUpgrade(task); err != nil {
			log.Printf("server manual upgrade failed: %v", err)
			serverUpgradeState.Lock()
			serverUpgradeState.inProgress = false
			serverUpgradeState.Unlock()
			_ = os.Remove(task.TempPath)
		}
	}(candidate)

	return info, nil
}

func fetchLatestRelease(ctx context.Context) (*githubReleaseResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, latestReleaseURL, nil)
	if err != nil {
		return nil, fmt.Errorf("创建更新请求失败")
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "ATSFlare-Server")

	resp, err := updateHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("获取最新版本失败: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub 返回异常状态: %s", resp.Status)
	}

	var release githubReleaseResponse
	if err = json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("解析最新版本信息失败")
	}
	return &release, nil
}

func buildLatestServerReleaseView(release *githubReleaseResponse) *LatestServerRelease {
	currentVersion := strings.TrimSpace(common.Version)
	isDevBuild := currentVersion == "" || strings.EqualFold(currentVersion, "dev")
	hasUpdate := false
	if release != nil && !isDevBuild {
		hasUpdate = isVersionNewer(currentVersion, release.TagName)
	}

	serverUpgradeState.Lock()
	inProgress := serverUpgradeState.inProgress
	serverUpgradeState.Unlock()

	view := &LatestServerRelease{
		CurrentVersion:   currentVersion,
		HasUpdate:        hasUpdate,
		UpgradeSupported: !isDevBuild && runtime.GOOS != "windows",
		InProgress:       inProgress,
	}
	if release != nil {
		view.TagName = release.TagName
		view.Body = release.Body
		view.HTMLURL = release.HTMLURL
		view.PublishedAt = release.PublishedAt
	}
	return view
}

func prepareServerUpgrade(ctx context.Context) (*preparedServerUpgrade, error) {
	release, err := fetchLatestRelease(ctx)
	if err != nil {
		return nil, err
	}

	view := buildLatestServerReleaseView(release)
	if !view.HasUpdate {
		return nil, fmt.Errorf("当前已是最新版本")
	}
	if !view.UpgradeSupported {
		return nil, fmt.Errorf("当前平台暂不支持自动升级")
	}

	assetName := serverAssetName(runtime.GOOS, runtime.GOARCH)
	var downloadURL string
	for _, asset := range release.Assets {
		if asset.Name == assetName {
			downloadURL = asset.BrowserDownloadURL
			break
		}
	}
	if downloadURL == "" {
		return nil, fmt.Errorf("最新版本缺少当前平台的服务端二进制: %s", assetName)
	}

	execPath, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("获取当前服务程序路径失败: %v", err)
	}
	if err = verifyExecutableDirectoryWritable(execPath); err != nil {
		return nil, err
	}

	return &preparedServerUpgrade{
		release:     view,
		downloadURL: downloadURL,
		execPath:    execPath,
	}, nil
}

func verifyExecutableDirectoryWritable(execPath string) error {
	dir := filepath.Dir(execPath)
	tempFile, err := os.CreateTemp(dir, "atsflare-server-upgrade-check-*")
	if err != nil {
		return fmt.Errorf("当前服务二进制目录不可写，无法升级: %v", err)
	}
	tempPath := tempFile.Name()
	if closeErr := tempFile.Close(); closeErr != nil {
		_ = os.Remove(tempPath)
		return fmt.Errorf("校验服务升级目录失败: %v", closeErr)
	}
	if err = os.Remove(tempPath); err != nil {
		return fmt.Errorf("清理升级校验文件失败: %v", err)
	}
	return nil
}

func executeServerUpgrade(task *preparedServerUpgrade) error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, task.downloadURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/octet-stream")
	req.Header.Set("User-Agent", "ATSFlare-Server")

	resp, err := updateHTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("下载服务端升级包失败: %s", resp.Status)
	}

	tmpPath := task.execPath + ".update"
	tmpFile, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return err
	}
	if _, err = io.Copy(tmpFile, resp.Body); err != nil {
		_ = tmpFile.Close()
		_ = os.Remove(tmpPath)
		return err
	}
	if err = tmpFile.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return err
	}

	common.SysLog("server self-update starting: from=" + strings.TrimSpace(common.Version) + " to=" + task.release.TagName)
	return serverBinaryUpgradeExecutor(task.execPath, tmpPath)
}

func executeManualServerUpgrade(task *manualServerBinaryCandidate) error {
	common.SysLog("server manual self-update starting: from=" + strings.TrimSpace(task.CurrentVersion) + " to=" + strings.TrimSpace(task.DetectedVersion))
	return serverBinaryUpgradeExecutor(task.ExecPath, task.TempPath)
}

func serverAssetName(goos string, goarch string) string {
	name := fmt.Sprintf("atsflare-server-%s-%s", goos, goarch)
	if goos == "windows" {
		return name + ".exe"
	}
	return name
}

func isVersionNewer(current string, latest string) bool {
	currentParts := parseVersionParts(current)
	latestParts := parseVersionParts(latest)
	maxLen := len(currentParts)
	if len(latestParts) > maxLen {
		maxLen = len(latestParts)
	}

	for i := 0; i < maxLen; i++ {
		currentPart := 0
		latestPart := 0
		if i < len(currentParts) {
			currentPart = currentParts[i]
		}
		if i < len(latestParts) {
			latestPart = latestParts[i]
		}
		if latestPart > currentPart {
			return true
		}
		if latestPart < currentPart {
			return false
		}
	}
	return false
}

func parseVersionParts(version string) []int {
	normalized := strings.TrimSpace(strings.TrimPrefix(version, "v"))
	if normalized == "" || normalized == "dev" {
		return nil
	}

	segments := strings.Split(normalized, ".")
	parts := make([]int, 0, len(segments))
	for _, segment := range segments {
		segment = strings.TrimSpace(segment)
		if segment == "" {
			parts = append(parts, 0)
			continue
		}

		numeric := strings.Builder{}
		for _, r := range segment {
			if r < '0' || r > '9' {
				break
			}
			numeric.WriteRune(r)
		}
		if numeric.Len() == 0 {
			parts = append(parts, 0)
			continue
		}
		value, err := strconv.Atoi(numeric.String())
		if err != nil {
			parts = append(parts, 0)
			continue
		}
		parts = append(parts, value)
	}
	return parts
}

func buildUploadedServerBinaryView(fileName string, currentVersion string, detectedVersion string, uploadedAt time.Time) *UploadedServerBinary {
	upgradeSupported := isManualServerUpgradeSupported(currentVersion)
	hasUpdate := false
	comparisonMessage := ""

	switch {
	case !upgradeSupported:
		comparisonMessage = "当前服务版本不支持手动升级确认流程"
	case normalizeVersion(currentVersion) == normalizeVersion(detectedVersion):
		comparisonMessage = "上传二进制与当前服务版本一致，无需升级"
	case isVersionNewer(currentVersion, detectedVersion):
		hasUpdate = true
		comparisonMessage = fmt.Sprintf("检测到可升级版本：%s -> %s", strings.TrimSpace(currentVersion), strings.TrimSpace(detectedVersion))
	default:
		comparisonMessage = "上传二进制版本不高于当前服务版本，已拒绝升级"
	}

	return &UploadedServerBinary{
		FileName:          strings.TrimSpace(fileName),
		DetectedVersion:   strings.TrimSpace(detectedVersion),
		CurrentVersion:    strings.TrimSpace(currentVersion),
		HasUpdate:         hasUpdate,
		UpgradeSupported:  upgradeSupported,
		ReadyToUpgrade:    upgradeSupported && hasUpdate,
		ComparisonMessage: comparisonMessage,
		UploadedAt:        uploadedAt,
	}
}

func isManualServerUpgradeSupported(currentVersion string) bool {
	normalized := strings.TrimSpace(strings.TrimPrefix(currentVersion, "v"))
	return normalized != "" && !strings.EqualFold(normalized, "dev")
}

func persistUploadedServerBinary(fileName string, reader io.Reader) (string, error) {
	suffix := filepath.Ext(strings.TrimSpace(fileName))
	if runtime.GOOS == "windows" && suffix == "" {
		suffix = ".exe"
	}
	tempFile, err := os.CreateTemp("", "atsflare-server-manual-upgrade-*"+suffix)
	if err != nil {
		return "", fmt.Errorf("创建临时升级文件失败: %v", err)
	}
	tempPath := tempFile.Name()
	if _, err = io.Copy(tempFile, reader); err != nil {
		_ = tempFile.Close()
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("写入上传二进制失败: %v", err)
	}
	if err = tempFile.Close(); err != nil {
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("关闭临时升级文件失败: %v", err)
	}
	if err = os.Chmod(tempPath, 0o755); err != nil && runtime.GOOS != "windows" {
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("设置临时升级文件权限失败: %v", err)
	}
	return tempPath, nil
}

func detectUploadedServerBinaryVersion(ctx context.Context, filePath string) (string, error) {
	commandCtx := ctx
	if commandCtx == nil {
		commandCtx = context.Background()
	}
	cmd := exec.CommandContext(commandCtx, filePath, "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("检查上传二进制版本失败: %w: %s", err, strings.TrimSpace(string(output)))
	}
	version := strings.TrimSpace(string(output))
	if version == "" {
		return "", fmt.Errorf("上传二进制未返回有效版本号")
	}
	for _, line := range strings.Split(version, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			return trimmed, nil
		}
	}
	return "", fmt.Errorf("上传二进制未返回有效版本号")
}

func cleanupManualServerBinaryCandidateLocked() {
	if manualServerBinaryState.candidate == nil {
		return
	}
	_ = os.Remove(manualServerBinaryState.candidate.TempPath)
	manualServerBinaryState.candidate = nil
}

func newUpgradeToken() (string, error) {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}

func normalizeVersion(version string) string {
	return strings.TrimSpace(strings.TrimPrefix(version, "v"))
}

func UpdateHTTPClientForTest() *http.Client {
	return updateHTTPClient
}

func SetUpdateHTTPClientForTest(client *http.Client) {
	updateHTTPClient = client
}

func ServerBinaryUpgradeExecutorForTest() func(string, string) error {
	return serverBinaryUpgradeExecutor
}

func SetServerBinaryUpgradeExecutorForTest(executor func(string, string) error) {
	if executor == nil {
		serverBinaryUpgradeExecutor = replaceAndRestartServer
		return
	}
	serverBinaryUpgradeExecutor = executor
}

func ServerUpgradeDispatchDelayForTest() time.Duration {
	return serverUpgradeDispatchDelay
}

func SetServerUpgradeDispatchDelayForTest(delay time.Duration) {
	if delay < 0 {
		delay = 0
	}
	serverUpgradeDispatchDelay = delay
}
