package common

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

var StartTime = time.Now().Unix() // unit: second
var Version = "dev"               // release builds inject the tag version via ldflags
var SystemName = "ATSFlare"
var ServerAddress = "http://localhost:3000"
var Footer = ""
var HomePageLink = ""

// Any options with "Secret", "Token" in its key won't be return by GetOptions

var SessionSecret = uuid.New().String()
var SQLitePath = "atsflare.db"

var OptionMap map[string]string
var OptionMapRWMutex sync.RWMutex

var ItemsPerPage = 10

var PasswordLoginEnabled = true
var PasswordRegisterEnabled = true
var EmailVerificationEnabled = false
var GitHubOAuthEnabled = false
var WeChatAuthEnabled = false
var TurnstileCheckEnabled = false
var RegisterEnabled = true

var SMTPServer = ""
var SMTPPort = 587
var SMTPAccount = ""
var SMTPToken = ""

var GitHubClientId = ""
var GitHubClientSecret = ""

var WeChatServerAddress = ""
var WeChatServerToken = ""
var WeChatAccountQRCodeImageURL = ""

var TurnstileSiteKey = ""
var TurnstileSecretKey = ""
var AgentToken = ""
var AgentDiscoveryToken = ""
var NodeOfflineThreshold = 2 * time.Minute

// V3 operational settings (hot-reloadable via Option table)
var AgentHeartbeatInterval = 30000 // milliseconds
var AgentSyncInterval = 30000      // milliseconds
var AgentUpdateRepo = "Rain-kl/ATSFlare"

// V5 OpenResty performance settings (hot-reloadable via Option table)
var OpenRestyWorkerProcesses = "auto"
var OpenRestyWorkerConnections = 4096
var OpenRestyWorkerRlimitNofile = 65535
var OpenRestyEventsUse = ""
var OpenRestyEventsMultiAcceptEnabled = false
var OpenRestyKeepaliveTimeout = 65
var OpenRestyKeepaliveRequests = 1000
var OpenRestyClientHeaderTimeout = 15
var OpenRestyClientBodyTimeout = 15
var OpenRestySendTimeout = 30
var OpenRestyProxyConnectTimeout = 5
var OpenRestyProxySendTimeout = 60
var OpenRestyProxyReadTimeout = 60
var OpenRestyProxyBufferingEnabled = true
var OpenRestyProxyBuffers = "16 16k"
var OpenRestyProxyBufferSize = "8k"
var OpenRestyProxyBusyBuffersSize = "64k"
var OpenRestyGzipEnabled = true
var OpenRestyGzipMinLength = 1024
var OpenRestyGzipCompLevel = 5
var OpenRestyCacheEnabled = false
var OpenRestyCachePath = ""
var OpenRestyCacheLevels = "1:2"
var OpenRestyCacheInactive = "30m"
var OpenRestyCacheMaxSize = "1g"
var OpenRestyCacheKeyTemplate = "$scheme$proxy_host$request_uri"
var OpenRestyCacheLockEnabled = true
var OpenRestyCacheLockTimeout = "5s"
var OpenRestyCacheUseStale = "error timeout updating http_500 http_502 http_503 http_504"

const (
	RoleGuestUser  = 0
	RoleCommonUser = 1
	RoleAdminUser  = 10
	RoleRootUser   = 100
)

var (
	FileUploadPermission    = RoleGuestUser
	FileDownloadPermission  = RoleGuestUser
	ImageUploadPermission   = RoleGuestUser
	ImageDownloadPermission = RoleGuestUser
)

// All duration's unit is seconds
// Shouldn't larger then RateLimitKeyExpirationDuration
var (
	GlobalApiRateLimitNum            = 300
	GlobalApiRateLimitDuration int64 = 3 * 60

	GlobalWebRateLimitNum            = 300
	GlobalWebRateLimitDuration int64 = 3 * 60

	UploadRateLimitNum            = 50
	UploadRateLimitDuration int64 = 60

	DownloadRateLimitNum            = 50
	DownloadRateLimitDuration int64 = 60

	CriticalRateLimitNum            = 100
	CriticalRateLimitDuration int64 = 20 * 60
)

var RateLimitKeyExpirationDuration = 20 * time.Minute

const (
	UserStatusEnabled  = 1 // don't use 0, 0 is the default value!
	UserStatusDisabled = 2 // also don't use 0
)
