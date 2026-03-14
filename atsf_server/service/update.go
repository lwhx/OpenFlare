package service

import (
	"atsflare/common"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
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

const (
	serverReleaseRepo     = "Rain-kl/ATSFlare"
	githubReleasesAPIBase = "https://api.github.com/repos/%s/releases"
)

type ReleaseChannel string

const (
	ReleaseChannelStable  ReleaseChannel = "stable"
	ReleaseChannelPreview ReleaseChannel = "preview"
)

var updateHTTPClient = &http.Client{
	Timeout: 30 * time.Second,
}

var serverUpgradeState struct {
	sync.Mutex
	inProgress bool
	status     string
	logs       []ServerUpgradeLogRecord
}

var manualServerBinaryState struct {
	sync.Mutex
	candidate *manualServerBinaryCandidate
}

var serverBinaryUpgradeExecutor = replaceAndRestartServer

var serverUpgradeDispatchDelay = 500 * time.Millisecond

type LatestServerRelease struct {
	TagName          string                   `json:"tag_name"`
	Body             string                   `json:"body"`
	HTMLURL          string                   `json:"html_url"`
	PublishedAt      string                   `json:"published_at"`
	Channel          string                   `json:"channel"`
	Prerelease       bool                     `json:"prerelease"`
	CurrentVersion   string                   `json:"current_version"`
	HasUpdate        bool                     `json:"has_update"`
	UpgradeSupported bool                     `json:"upgrade_supported"`
	InProgress       bool                     `json:"in_progress"`
	UpgradeStatus    string                   `json:"upgrade_status"`
	UpgradeLogs      []ServerUpgradeLogRecord `json:"upgrade_logs"`
}

type ServerUpgradeLogRecord struct {
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type githubReleaseResponse struct {
	TagName     string        `json:"tag_name"`
	Body        string        `json:"body"`
	HTMLURL     string        `json:"html_url"`
	PublishedAt string        `json:"published_at"`
	Prerelease  bool          `json:"prerelease"`
	Draft       bool          `json:"draft"`
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

func GetLatestServerRelease(ctx context.Context, channel string) (*LatestServerRelease, error) {
	normalizedChannel := normalizeReleaseChannel(channel)
	release, err := fetchLatestRelease(ctx, normalizedChannel)
	if err != nil {
		return nil, err
	}
	return buildLatestServerReleaseView(release, normalizedChannel), nil
}

func ScheduleServerUpgrade(channel string) (*LatestServerRelease, error) {
	normalizedChannel := normalizeReleaseChannel(channel)
	serverUpgradeState.Lock()
	if serverUpgradeState.inProgress {
		serverUpgradeState.Unlock()
		return nil, fmt.Errorf("鏈嶅姟鍗囩骇宸插湪鎵ц涓紝璇风◢鍚庡啀璇?)
	}

	resetServerUpgradeLogsLocked()
	serverUpgradeState.status = "running"
	appendServerUpgradeLogLocked("info", fmt.Sprintf("Automatic upgrade scheduled for channel: %s.", normalizedChannel.String()))

	prepared, err := prepareServerUpgrade(context.Background(), normalizedChannel)
	if err != nil {
		serverUpgradeState.status = "failed"
		appendServerUpgradeLogLocked("error", err.Error())
		serverUpgradeState.Unlock()
		return nil, err
	}

	serverUpgradeState.inProgress = true
	serverUpgradeState.Unlock()

	prepared.release.InProgress = true

	go func(task *preparedServerUpgrade) {
		time.Sleep(serverUpgradeDispatchDelay)
		if err := executeServerUpgrade(task); err != nil {
			recordServerUpgradeFailure(err)
			slog.Error("server self-update failed", "error", err)
		}
	}(prepared)

	return prepared.release, nil
}

func UploadManualServerBinary(ctx context.Context, fileName string, reader io.Reader) (*UploadedServerBinary, error) {
	inProgress, _, _ := snapshotServerUpgradeState()
	if inProgress {
		return nil, fmt.Errorf("鏈嶅姟鍗囩骇宸插湪鎵ц涓紝璇风◢鍚庡啀璇?)
	}
	if strings.TrimSpace(fileName) == "" {
		return nil, fmt.Errorf("缂哄皯涓婁紶鏂囦欢鍚?)
	}
	if reader == nil {
		return nil, fmt.Errorf("缂哄皯涓婁紶鏂囦欢鍐呭")
	}


	execPath, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("鑾峰彇褰撳墠鏈嶅姟绋嬪簭璺緞澶辫触: %v", err)
	}
	if err = verifyExecutableDirectoryWritable(execPath); err != nil {
		return nil, err
	}
	tempPath, err := persistUploadedServerBinary(filepath.Dir(execPath), fileName, reader)
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

	uploadToken, err := newUpgradeToken()
	if err != nil {
		_ = os.Remove(tempPath)
		return nil, fmt.Errorf("鐢熸垚鍗囩骇浠ょ墝澶辫触: %v", err)
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
		return nil, fmt.Errorf("缂哄皯鍗囩骇浠ょ墝")
	}

	serverUpgradeState.Lock()
	if serverUpgradeState.inProgress {
		serverUpgradeState.Unlock()
		return nil, fmt.Errorf("鏈嶅姟鍗囩骇宸插湪鎵ц涓紝璇风◢鍚庡啀璇?)
	}
	serverUpgradeState.Unlock()

	manualServerBinaryState.Lock()
	candidate := manualServerBinaryState.candidate
	if candidate == nil {
		manualServerBinaryState.Unlock()
		return nil, fmt.Errorf("鏈壘鍒板緟纭鐨勪笂浼犲崌绾у寘锛岃閲嶆柊涓婁紶")
	}
	if candidate.UploadToken != uploadToken {
		manualServerBinaryState.Unlock()
		return nil, fmt.Errorf("鍗囩骇浠ょ墝鏃犳晥鎴栧凡杩囨湡锛岃閲嶆柊涓婁紶")
	}
	manualServerBinaryState.candidate = nil
	manualServerBinaryState.Unlock()

	info := buildUploadedServerBinaryView(candidate.FileName, candidate.CurrentVersion, candidate.DetectedVersion, candidate.UploadedAt)
	info.UploadToken = candidate.UploadToken
	if !info.ReadyToUpgrade {
		_ = os.Remove(candidate.TempPath)
		return nil, fmt.Errorf("褰撳墠涓婁紶鐨勪簩杩涘埗涓嶆弧瓒冲崌绾ф潯浠?)
	}

	serverUpgradeState.Lock()
	serverUpgradeState.inProgress = true
	resetServerUpgradeLogsLocked()
	serverUpgradeState.status = "running"
	appendServerUpgradeLogLocked("info", fmt.Sprintf("Manual upgrade confirmed for version: %s.", strings.TrimSpace(candidate.DetectedVersion)))
	serverUpgradeState.Unlock()

	go func(task *manualServerBinaryCandidate) {
		time.Sleep(serverUpgradeDispatchDelay)
		if err := executeServerBinaryCandidateUpgrade(task, "manual"); err != nil {
			recordServerUpgradeFailure(err)
			slog.Error("server manual upgrade failed", "error", err)
			_ = os.Remove(task.TempPath)
		}
	}(candidate)

	return info, nil
}

func fetchLatestRelease(ctx context.Context, channel ReleaseChannel) (*githubReleaseResponse, error) {
	return fetchLatestGitHubRelease(ctx, serverReleaseRepo, channel)
}

func fetchLatestGitHubRelease(ctx context.Context, repo string, channel ReleaseChannel) (*githubReleaseResponse, error) {
	switch normalizeReleaseChannel(string(channel)) {
	case ReleaseChannelPreview:
		return fetchLatestPreviewGitHubRelease(ctx, repo)
	default:
		return fetchLatestStableGitHubRelease(ctx, repo)
	}
}

func fetchLatestStableGitHubRelease(ctx context.Context, repo string) (*githubReleaseResponse, error) {
	url := fmt.Sprintf(githubReleasesAPIBase+"/latest", strings.TrimSpace(repo))
	req, err := newGitHubReleaseRequest(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("鍒涘缓鏇存柊璇锋眰澶辫触")
	}

	resp, err := updateHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("鑾峰彇鏈€鏂扮増鏈け璐? %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub 杩斿洖寮傚父鐘舵€? %s", resp.Status)
	}

	return decodeGitHubRelease(resp.Body)
}

func fetchLatestPreviewGitHubRelease(ctx context.Context, repo string) (*githubReleaseResponse, error) {
	url := fmt.Sprintf(githubReleasesAPIBase+"?per_page=20", strings.TrimSpace(repo))
	req, err := newGitHubReleaseRequest(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("鍒涘缓鏇存柊璇锋眰澶辫触")
	}

	resp, err := updateHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("鑾峰彇 preview 鐗堟湰澶辫触: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub 杩斿洖寮傚父鐘舵€? %s", resp.Status)
	}

	var releases []githubReleaseResponse
	if err = json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return nil, fmt.Errorf("瑙ｆ瀽 preview 鐗堟湰淇℃伅澶辫触")
	}
	for _, release := range releases {
		if release.Draft || !release.Prerelease {
			continue
		}
		releaseCopy := release
		return &releaseCopy, nil
	}
	return nil, fmt.Errorf("褰撳墠娌℃湁鍙敤鐨?preview 鍙戝竷")
}

func fetchGitHubReleaseByTag(ctx context.Context, repo string, tag string) (*githubReleaseResponse, error) {
	tag = strings.TrimSpace(tag)
	if tag == "" {
		return nil, fmt.Errorf("缂哄皯鍙戝竷鐗堟湰鍙?)
	}
	url := fmt.Sprintf(githubReleasesAPIBase+"/tags/%s", strings.TrimSpace(repo), tag)
	req, err := newGitHubReleaseRequest(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("鍒涘缓鏇存柊璇锋眰澶辫触")
	}

	resp, err := updateHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("鑾峰彇鎸囧畾鐗堟湰澶辫触: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("鏈壘鍒版寚瀹氱増鏈? %s", tag)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub 杩斿洖寮傚父鐘舵€? %s", resp.Status)
	}

	return decodeGitHubRelease(resp.Body)
}

func newGitHubReleaseRequest(ctx context.Context, url string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "ATSFlare-Server")
	return req, nil
}

func decodeGitHubRelease(reader io.Reader) (*githubReleaseResponse, error) {
	var release githubReleaseResponse
	if err := json.NewDecoder(reader).Decode(&release); err != nil {
		return nil, fmt.Errorf("瑙ｆ瀽鏈€鏂扮増鏈俊鎭け璐?)
	}
	return &release, nil
}

func buildLatestServerReleaseView(release *githubReleaseResponse, channel ReleaseChannel) *LatestServerRelease {
	currentVersion := strings.TrimSpace(common.Version)
	isDevBuild := currentVersion == "" || strings.EqualFold(currentVersion, "dev")
	hasUpdate := false
	if release != nil && !isDevBuild {
		if channel == ReleaseChannelPreview {
			// Preview releases use a "major.minor.patch-git-<commit>" scheme that cannot
			// be meaningfully compared against the running stable version, so we skip the
			// version check and always allow upgrading when the user explicitly selects
			// the preview channel.
			hasUpdate = true
		} else {
			hasUpdate = isVersionNewer(currentVersion, release.TagName)
		}
	}

	serverUpgradeState.Lock()
	inProgress := serverUpgradeState.inProgress
	serverUpgradeState.Unlock()

	view := &LatestServerRelease{
		Channel:          channel.String(),
		CurrentVersion:   currentVersion,
		HasUpdate:        hasUpdate,
		UpgradeSupported: !isDevBuild && runtime.GOOS != "windows",
		InProgress:       inProgress,
		UpgradeStatus:    upgradeStatus,
		UpgradeLogs:      upgradeLogs,
	}
	if release != nil {
		view.TagName = release.TagName
		view.Body = release.Body
		view.HTMLURL = release.HTMLURL
		view.PublishedAt = release.PublishedAt
		view.Prerelease = release.Prerelease
	}
	return view
}

func prepareServerUpgrade(ctx context.Context, channel ReleaseChannel) (*preparedServerUpgrade, error) {
	release, err := fetchLatestRelease(ctx, channel)
	if err != nil {
		return nil, err
	}

	view := buildLatestServerReleaseView(release, channel)
	if !view.HasUpdate {
		return nil, fmt.Errorf("褰撳墠宸叉槸鏈€鏂扮増鏈?)
	}
	if !view.UpgradeSupported {
		return nil, fmt.Errorf("褰撳墠骞冲彴鏆備笉鏀寔鑷姩鍗囩骇")
	}

	assetName := serverAssetName(runtime.GOOS, runtime.GOARCH)
	recordServerUpgradeLog("info", fmt.Sprintf("Matching release asset: %s.", assetName))

	var downloadURL string
	for _, asset := range release.Assets {
		if asset.Name == assetName {
			downloadURL = asset.BrowserDownloadURL
			break
		}
	}
	if downloadURL == "" {
		return nil, fmt.Errorf("鏈€鏂扮増鏈己灏戝綋鍓嶅钩鍙扮殑鏈嶅姟绔簩杩涘埗: %s", assetName)
	}

	execPath, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("鑾峰彇褰撳墠鏈嶅姟绋嬪簭璺緞澶辫触: %v", err)
	}
	if err = verifyExecutableDirectoryWritable(execPath); err != nil {
		return nil, err
	}
	recordServerUpgradeLog("info", "Verified current executable directory is writable.")


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
		return fmt.Errorf("褰撳墠鏈嶅姟浜岃繘鍒剁洰褰曚笉鍙啓锛屾棤娉曞崌绾? %v", err)
	}
	tempPath := tempFile.Name()
	if closeErr := tempFile.Close(); closeErr != nil {
		_ = os.Remove(tempPath)
		return fmt.Errorf("鏍￠獙鏈嶅姟鍗囩骇鐩綍澶辫触: %v", closeErr)
	}
	if err = os.Remove(tempPath); err != nil {
		return fmt.Errorf("娓呯悊鍗囩骇鏍￠獙鏂囦欢澶辫触: %v", err)
	}
	return nil
}

func executeServerUpgrade(task *preparedServerUpgrade) error {
	recordServerUpgradeLog("info", fmt.Sprintf("Downloading automatic upgrade package for version: %s.", strings.TrimSpace(task.release.TagName)))
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
		return fmt.Errorf("涓嬭浇鏈嶅姟绔崌绾у寘澶辫触: %s", resp.Status)
	}

	recordServerUpgradeLog("info", "Download finished, validating binary version.")
	candidate, err := persistDownloadedServerBinary(ctx, task.execPath, task.release.TagName, resp.Body)
	if err != nil {
		return err
	}
	return executeServerBinaryCandidateUpgrade(candidate, "auto")
}

func executeServerBinaryCandidateUpgrade(task *manualServerBinaryCandidate, source string) error {
	recordServerUpgradeLog("info", fmt.Sprintf("Validated binary version: %s -> %s.", strings.TrimSpace(task.CurrentVersion), strings.TrimSpace(task.DetectedVersion)))
	recordServerUpgradeLog("info", "Replacing executable and preparing restart.")
	if source == "manual" {
		slog.Info("server manual self-update starting", "from", strings.TrimSpace(task.CurrentVersion), "to", strings.TrimSpace(task.DetectedVersion))
	} else {
		slog.Info("server self-update starting", "from", strings.TrimSpace(task.CurrentVersion), "to", strings.TrimSpace(task.DetectedVersion))
	}
	markServerUpgradeSucceeded()
	return serverBinaryUpgradeExecutor(task.ExecPath, task.TempPath)
}

func serverAssetName(goos string, goarch string) string {
	name := fmt.Sprintf("atsflare-server-%s-%s", goos, goarch)
	if goos == "windows" {
		return name + ".exe"
	}
	return name
}

func normalizeReleaseChannel(channel string) ReleaseChannel {
	switch strings.ToLower(strings.TrimSpace(channel)) {
	case string(ReleaseChannelPreview):
		return ReleaseChannelPreview
	default:
		return ReleaseChannelStable
	}
}

func (channel ReleaseChannel) String() string {
	if channel == ReleaseChannelPreview {
		return string(ReleaseChannelPreview)
	}
	return string(ReleaseChannelStable)
}

func isVersionNewer(current string, latest string) bool {
	currentInfo := parseVersionInfo(current)
	latestInfo := parseVersionInfo(latest)
	if currentInfo.IsDev {
		return latestInfo.Valid
	}
	if !currentInfo.Valid || !latestInfo.Valid {
		return false
	}
	return compareVersionInfo(currentInfo, latestInfo) < 0
}

type versionInfo struct {
	Valid      bool
	IsDev      bool
	Numbers    []int
	Prerelease []string
}

func parseVersionInfo(version string) versionInfo {
	normalized := strings.TrimSpace(strings.TrimPrefix(version, "v"))
	if normalized == "" || normalized == "dev" {
		return versionInfo{IsDev: strings.EqualFold(normalized, "dev")}
	}
	base := normalized
	prerelease := ""
	if separator := strings.IndexRune(normalized, '-'); separator >= 0 {
		base = normalized[:separator]
		prerelease = normalized[separator+1:]
	}

	segments := strings.Split(base, ".")
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
			return versionInfo{}
		}
		parts = append(parts, value)
	}
	info := versionInfo{Valid: len(parts) > 0, Numbers: parts}
	if prerelease != "" {
		info.Prerelease = splitPrereleaseIdentifiers(prerelease)
	}
	return info
}

func splitPrereleaseIdentifiers(value string) []string {
	parts := strings.FieldsFunc(strings.TrimSpace(value), func(r rune) bool {
		return r == '.' || r == '-'
	})
	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			filtered = append(filtered, part)
		}
	}
	return filtered
}

func compareVersionInfo(left versionInfo, right versionInfo) int {
	maxLen := len(left.Numbers)
	if len(right.Numbers) > maxLen {
		maxLen = len(right.Numbers)
	}
	for index := 0; index < maxLen; index++ {
		leftValue := 0
		rightValue := 0
		if index < len(left.Numbers) {
			leftValue = left.Numbers[index]
		}
		if index < len(right.Numbers) {
			rightValue = right.Numbers[index]
		}
		if leftValue < rightValue {
			return -1
		}
		if leftValue > rightValue {
			return 1
		}
	}

	if len(left.Prerelease) == 0 && len(right.Prerelease) == 0 {
		return 0
	}
	if len(left.Prerelease) == 0 {
		return 1
	}
	if len(right.Prerelease) == 0 {
		return -1
	}

	maxLen = len(left.Prerelease)
	if len(right.Prerelease) > maxLen {
		maxLen = len(right.Prerelease)
	}
	for index := 0; index < maxLen; index++ {
		if index >= len(left.Prerelease) {
			return -1
		}
		if index >= len(right.Prerelease) {
			return 1
		}
		leftPart := left.Prerelease[index]
		rightPart := right.Prerelease[index]
		leftNumber, leftErr := strconv.Atoi(leftPart)
		rightNumber, rightErr := strconv.Atoi(rightPart)
		switch {
		case leftErr == nil && rightErr == nil:
			if leftNumber < rightNumber {
				return -1
			}
			if leftNumber > rightNumber {
				return 1
			}
		case leftErr == nil && rightErr != nil:
			return -1
		case leftErr != nil && rightErr == nil:
			return 1
		default:
			if leftPart < rightPart {
				return -1
			}
			if leftPart > rightPart {
				return 1
			}
		}
	}
	return 0
}

func buildUploadedServerBinaryView(fileName string, currentVersion string, detectedVersion string, uploadedAt time.Time) *UploadedServerBinary {
	upgradeSupported := isManualServerUpgradeSupported(currentVersion)
	hasUpdate := false
	comparisonMessage := ""

	switch {
	case !upgradeSupported:
		comparisonMessage = "褰撳墠鏈嶅姟鐗堟湰涓嶆敮鎸佹墜鍔ㄥ崌绾х‘璁ゆ祦绋?
	case normalizeVersion(currentVersion) == normalizeVersion(detectedVersion):
		comparisonMessage = "涓婁紶浜岃繘鍒朵笌褰撳墠鏈嶅姟鐗堟湰涓€鑷达紝鏃犻渶鍗囩骇"
	case isVersionNewer(currentVersion, detectedVersion):
		hasUpdate = true
		comparisonMessage = fmt.Sprintf("妫€娴嬪埌鍙崌绾х増鏈細%s -> %s", strings.TrimSpace(currentVersion), strings.TrimSpace(detectedVersion))
	default:
		comparisonMessage = "涓婁紶浜岃繘鍒剁増鏈笉楂樹簬褰撳墠鏈嶅姟鐗堟湰锛屽凡鎷掔粷鍗囩骇"
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

func persistUploadedServerBinary(tempDir string, fileName string, reader io.Reader) (string, error) {
	suffix := filepath.Ext(strings.TrimSpace(fileName))
	if runtime.GOOS == "windows" && suffix == "" {
		suffix = ".exe"
	}
	tempDir = strings.TrimSpace(tempDir)
	if tempDir == "" {
		tempDir = os.TempDir()
	}
	tempFile, err := os.CreateTemp(tempDir, "atsflare-server-manual-upgrade-*"+suffix)
	if err != nil {
		return "", fmt.Errorf("鍒涘缓涓存椂鍗囩骇鏂囦欢澶辫触: %v", err)
	}
	tempPath := tempFile.Name()
	if _, err = io.Copy(tempFile, reader); err != nil {
		_ = tempFile.Close()
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("鍐欏叆涓婁紶浜岃繘鍒跺け璐? %v", err)
	}
	if err = tempFile.Close(); err != nil {
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("鍏抽棴涓存椂鍗囩骇鏂囦欢澶辫触: %v", err)
	}
	if err = os.Chmod(tempPath, 0o755); err != nil && runtime.GOOS != "windows" {
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("璁剧疆涓存椂鍗囩骇鏂囦欢鏉冮檺澶辫触: %v", err)
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
		return "", fmt.Errorf("妫€鏌ヤ笂浼犱簩杩涘埗鐗堟湰澶辫触: %w: %s", err, strings.TrimSpace(string(output)))
	}
	version := strings.TrimSpace(string(output))
	if version == "" {
		return "", fmt.Errorf("涓婁紶浜岃繘鍒舵湭杩斿洖鏈夋晥鐗堟湰鍙?)
	}
	for _, line := range strings.Split(version, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			return trimmed, nil
		}
	}
	return "", fmt.Errorf("涓婁紶浜岃繘鍒舵湭杩斿洖鏈夋晥鐗堟湰鍙?)
}

func persistDownloadedServerBinary(ctx context.Context, execPath string, releaseTag string, reader io.Reader) (*manualServerBinaryCandidate, error) {
	fileName := serverAssetName(runtime.GOOS, runtime.GOARCH)
	tempPath, err := persistUploadedServerBinary(filepath.Dir(execPath), fileName, reader)
	if err != nil {
		return nil, err
	}

	detectedVersion, err := detectUploadedServerBinaryVersion(ctx, tempPath)
	if err != nil {
		_ = os.Remove(tempPath)
		return nil, err
	}
	recordServerUpgradeLog("info", fmt.Sprintf("Detected downloaded binary version: %s.", strings.TrimSpace(detectedVersion)))

	if normalizeVersion(detectedVersion) != normalizeVersion(releaseTag) {
		_ = os.Remove(tempPath)
		return nil, fmt.Errorf("涓嬭浇鍖呯増鏈牎楠屽け璐ワ細release=%s锛宐inary=%s", strings.TrimSpace(releaseTag), strings.TrimSpace(detectedVersion))
	}

	info := buildUploadedServerBinaryView(fileName, common.Version, detectedVersion, time.Now())
	if !info.ReadyToUpgrade {
		_ = os.Remove(tempPath)
		return nil, fmt.Errorf(info.ComparisonMessage)
	}

	return &manualServerBinaryCandidate{
		FileName:        fileName,
		DetectedVersion: detectedVersion,
		CurrentVersion:  strings.TrimSpace(common.Version),
		TempPath:        tempPath,
		ExecPath:        execPath,
		UploadedAt:      time.Now(),
	}, nil
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

func snapshotServerUpgradeState() (bool, string, []ServerUpgradeLogRecord) {
	serverUpgradeState.Lock()
	defer serverUpgradeState.Unlock()

	status := strings.TrimSpace(serverUpgradeState.status)
	if status == "" {
		status = "idle"
	}
	logs := make([]ServerUpgradeLogRecord, len(serverUpgradeState.logs))
	copy(logs, serverUpgradeState.logs)
	return serverUpgradeState.inProgress, status, logs
}

func resetServerUpgradeLogsLocked() {
	serverUpgradeState.logs = nil
}

func appendServerUpgradeLogLocked(level string, message string) {
	serverUpgradeState.logs = append(serverUpgradeState.logs, ServerUpgradeLogRecord{
		Level:     strings.TrimSpace(level),
		Message:   strings.TrimSpace(message),
		CreatedAt: time.Now(),
	})
	if len(serverUpgradeState.logs) > 100 {
		serverUpgradeState.logs = append([]ServerUpgradeLogRecord(nil), serverUpgradeState.logs[len(serverUpgradeState.logs)-100:]...)
	}
}

func recordServerUpgradeLog(level string, message string) {
	serverUpgradeState.Lock()
	appendServerUpgradeLogLocked(level, message)
	serverUpgradeState.Unlock()
}

func markServerUpgradeSucceeded() {
	serverUpgradeState.Lock()
	serverUpgradeState.inProgress = false
	serverUpgradeState.status = "succeeded"
	appendServerUpgradeLogLocked("info", "Upgrade binary is ready; server restart will begin.")
	serverUpgradeState.Unlock()
}

func recordServerUpgradeFailure(err error) {
	serverUpgradeState.Lock()
	serverUpgradeState.inProgress = false
	serverUpgradeState.status = "failed"
	if err != nil {
		appendServerUpgradeLogLocked("error", err.Error())
	}
	serverUpgradeState.Unlock()
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



