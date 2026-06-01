package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"openflare/model"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
)

const (
	WAFIPGroupTypeManual       = "manual"
	WAFIPGroupTypeAutomatic    = "automatic"
	WAFIPGroupTypeSubscription = "subscription"

	WAFIPGroupSubscriptionFormatText = "text"
	WAFIPGroupSubscriptionFormatJSON = "json"

	defaultWAFIPGroupSyncIntervalMinutes = 1440
	minWAFIPGroupSyncIntervalMinutes     = 5
	maxWAFIPGroupSyncIntervalMinutes     = 43200
	maxWAFIPGroupSubscriptionBytes       = 2 * 1024 * 1024
)

type WAFIPGroupInput struct {
	Name                    string          `json:"name"`
	Type                    string          `json:"type"`
	Enabled                 bool            `json:"enabled"`
	IPList                  []string        `json:"ip_list"`
	AutoConfig              json.RawMessage `json:"auto_config"`
	SubscriptionURL         string          `json:"subscription_url"`
	SubscriptionFormat      string          `json:"subscription_format"`
	SubscriptionMappingRule string          `json:"subscription_mapping_rule"`
	SyncIntervalMinutes     int             `json:"sync_interval_minutes"`
	Remark                  string          `json:"remark"`
}

type WAFIPGroupView struct {
	ID                      uint            `json:"id"`
	Name                    string          `json:"name"`
	Type                    string          `json:"type"`
	Enabled                 bool            `json:"enabled"`
	IPList                  []string        `json:"ip_list"`
	AutoConfig              json.RawMessage `json:"auto_config"`
	SubscriptionURL         string          `json:"subscription_url"`
	SubscriptionFormat      string          `json:"subscription_format"`
	SubscriptionMappingRule string          `json:"subscription_mapping_rule"`
	SyncIntervalMinutes     int             `json:"sync_interval_minutes"`
	LastSyncedAt            string          `json:"last_synced_at,omitempty"`
	NextSyncAt              string          `json:"next_sync_at,omitempty"`
	LastSyncStatus          string          `json:"last_sync_status"`
	LastSyncMessage         string          `json:"last_sync_message"`
	Remark                  string          `json:"remark"`
	ReferencedByRuleCount   int             `json:"referenced_by_rule_count"`
	CreatedAt               string          `json:"created_at"`
	UpdatedAt               string          `json:"updated_at"`
}

type WAFIPGroupSyncResult struct {
	Group      WAFIPGroupView `json:"group"`
	IPCount    int            `json:"ip_count"`
	SyncedAt   string         `json:"synced_at"`
	NextSyncAt string         `json:"next_sync_at"`
	Status     string         `json:"status"`
	Message    string         `json:"message"`
}

func ListWAFIPGroups() ([]WAFIPGroupView, error) {
	groups, err := model.ListWAFIPGroups()
	if err != nil {
		return nil, err
	}
	referenceCounts, err := loadWAFIPGroupReferenceCounts()
	if err != nil {
		return nil, err
	}
	views := make([]WAFIPGroupView, 0, len(groups))
	for _, group := range groups {
		view, err := buildWAFIPGroupView(group, referenceCounts[group.ID])
		if err != nil {
			return nil, err
		}
		views = append(views, view)
	}
	return views, nil
}

func GetWAFIPGroup(id uint) (*WAFIPGroupView, error) {
	group, err := model.GetWAFIPGroupByID(id)
	if err != nil {
		return nil, err
	}
	referenceCounts, err := loadWAFIPGroupReferenceCounts()
	if err != nil {
		return nil, err
	}
	view, err := buildWAFIPGroupView(group, referenceCounts[group.ID])
	if err != nil {
		return nil, err
	}
	return &view, nil
}

func CreateWAFIPGroup(input WAFIPGroupInput) (*WAFIPGroupView, error) {
	group, err := buildWAFIPGroup(nil, input)
	if err != nil {
		return nil, err
	}
	if err := group.Insert(); err != nil {
		return nil, err
	}
	return GetWAFIPGroup(group.ID)
}

func UpdateWAFIPGroup(id uint, input WAFIPGroupInput) (*WAFIPGroupView, error) {
	group, err := model.GetWAFIPGroupByID(id)
	if err != nil {
		return nil, err
	}
	group, err = buildWAFIPGroup(group, input)
	if err != nil {
		return nil, err
	}
	if err := group.Update(); err != nil {
		return nil, err
	}
	return GetWAFIPGroup(group.ID)
}

func DeleteWAFIPGroup(id uint) error {
	group, err := model.GetWAFIPGroupByID(id)
	if err != nil {
		return err
	}
	counts, err := loadWAFIPGroupReferenceCounts()
	if err != nil {
		return err
	}
	if counts[group.ID] > 0 {
		return errors.New("IP 组已被 WAF 规则组引用，请先移除引用")
	}
	return group.Delete()
}

func SyncWAFIPGroup(id uint) (*WAFIPGroupSyncResult, error) {
	group, err := model.GetWAFIPGroupByID(id)
	if err != nil {
		return nil, err
	}
	return syncWAFIPGroup(group, time.Now().UTC())
}

func SyncDueWAFIPGroups() error {
	now := time.Now().UTC()
	groups, err := model.ListDueSubscriptionWAFIPGroups(now)
	if err != nil {
		return err
	}
	for _, group := range groups {
		if _, err := syncWAFIPGroup(group, now); err != nil {
			continue
		}
	}
	return nil
}

func buildWAFIPGroup(group *model.WAFIPGroup, input WAFIPGroupInput) (*model.WAFIPGroup, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("IP 组名称不能为空")
	}
	groupType := normalizeWAFIPGroupType(input.Type)
	if groupType == "" {
		return nil, errors.New("IP 组类型无效")
	}
	ipList := input.IPList
	subscriptionURL := ""
	subscriptionFormat := normalizeWAFIPGroupSubscriptionFormat(input.SubscriptionFormat)
	mappingRule := strings.TrimSpace(input.SubscriptionMappingRule)
	syncInterval := normalizeWAFIPGroupSyncInterval(input.SyncIntervalMinutes)
	autoConfig := "{}"

	switch groupType {
	case WAFIPGroupTypeManual:
		subscriptionFormat = WAFIPGroupSubscriptionFormatText
		mappingRule = ""
	case WAFIPGroupTypeAutomatic:
		raw := strings.TrimSpace(string(input.AutoConfig))
		if raw == "" {
			raw = "{}"
		}
		if !json.Valid([]byte(raw)) || strings.HasPrefix(raw, "[") {
			return nil, errors.New("自动 IP 组配置必须是 JSON 对象")
		}
		autoConfig = raw
		subscriptionFormat = WAFIPGroupSubscriptionFormatText
		mappingRule = ""
	case WAFIPGroupTypeSubscription:
		subscriptionURL = strings.TrimSpace(input.SubscriptionURL)
		if err := validateSubscriptionURL(subscriptionURL); err != nil {
			return nil, err
		}
		if subscriptionFormat == "" {
			subscriptionFormat = WAFIPGroupSubscriptionFormatText
		}
	}

	normalizedIPs, err := normalizeWAFIPList(ipList)
	if err != nil {
		return nil, err
	}
	ipListJSON, _ := json.Marshal(normalizedIPs)
	if group == nil {
		group = &model.WAFIPGroup{}
	}
	group.Name = name
	group.Type = groupType
	group.Enabled = input.Enabled
	group.IPList = string(ipListJSON)
	group.AutoConfig = autoConfig
	group.SubscriptionURL = subscriptionURL
	group.SubscriptionFormat = subscriptionFormat
	group.SubscriptionMappingRule = mappingRule
	group.SyncIntervalMinutes = syncInterval
	group.NextSyncAt = nextWAFIPGroupSyncAt(group.Type, group.Enabled, syncInterval, group.NextSyncAt)
	group.Remark = strings.TrimSpace(input.Remark)
	return group, nil
}

func buildWAFIPGroupView(group *model.WAFIPGroup, referenceCount int) (WAFIPGroupView, error) {
	if group == nil {
		return WAFIPGroupView{}, errors.New("waf ip group is nil")
	}
	ips, err := decodeStringList(group.IPList)
	if err != nil {
		return WAFIPGroupView{}, err
	}
	autoConfig := json.RawMessage(strings.TrimSpace(group.AutoConfig))
	if len(autoConfig) == 0 {
		autoConfig = json.RawMessage("{}")
	}
	view := WAFIPGroupView{
		ID:                      group.ID,
		Name:                    group.Name,
		Type:                    group.Type,
		Enabled:                 group.Enabled,
		IPList:                  ips,
		AutoConfig:              autoConfig,
		SubscriptionURL:         group.SubscriptionURL,
		SubscriptionFormat:      group.SubscriptionFormat,
		SubscriptionMappingRule: group.SubscriptionMappingRule,
		SyncIntervalMinutes:     group.SyncIntervalMinutes,
		LastSyncStatus:          group.LastSyncStatus,
		LastSyncMessage:         group.LastSyncMessage,
		Remark:                  group.Remark,
		ReferencedByRuleCount:   referenceCount,
		CreatedAt:               group.CreatedAt.Format(time.RFC3339),
		UpdatedAt:               group.UpdatedAt.Format(time.RFC3339),
	}
	if group.LastSyncedAt != nil {
		view.LastSyncedAt = group.LastSyncedAt.Format(time.RFC3339)
	}
	if group.NextSyncAt != nil {
		view.NextSyncAt = group.NextSyncAt.Format(time.RFC3339)
	}
	return view, nil
}

func syncWAFIPGroup(group *model.WAFIPGroup, now time.Time) (*WAFIPGroupSyncResult, error) {
	if group == nil {
		return nil, errors.New("IP 组不存在")
	}
	if group.Type != WAFIPGroupTypeSubscription {
		return nil, errors.New("只有订阅类型 IP 组支持同步")
	}
	content, err := downloadWAFIPGroupSubscription(group.SubscriptionURL)
	if err != nil {
		recordWAFIPGroupSyncFailure(group, now, err)
		return nil, err
	}
	ips, err := parseWAFIPGroupSubscription(content, group.SubscriptionFormat, group.SubscriptionMappingRule)
	if err != nil {
		recordWAFIPGroupSyncFailure(group, now, err)
		return nil, err
	}
	ipListJSON, _ := json.Marshal(ips)
	nextSyncAt := now.Add(time.Duration(group.SyncIntervalMinutes) * time.Minute)
	group.IPList = string(ipListJSON)
	group.LastSyncedAt = &now
	group.NextSyncAt = &nextSyncAt
	group.LastSyncStatus = "success"
	group.LastSyncMessage = fmt.Sprintf("同步成功，共 %d 条 IP/IP 段", len(ips))
	if err := group.UpdateSyncResult(); err != nil {
		return nil, err
	}
	view, err := GetWAFIPGroup(group.ID)
	if err != nil {
		return nil, err
	}
	return &WAFIPGroupSyncResult{
		Group:      *view,
		IPCount:    len(ips),
		SyncedAt:   now.Format(time.RFC3339),
		NextSyncAt: nextSyncAt.Format(time.RFC3339),
		Status:     group.LastSyncStatus,
		Message:    group.LastSyncMessage,
	}, nil
}

func recordWAFIPGroupSyncFailure(group *model.WAFIPGroup, now time.Time, syncErr error) {
	nextSyncAt := now.Add(time.Duration(normalizeWAFIPGroupSyncInterval(group.SyncIntervalMinutes)) * time.Minute)
	group.LastSyncedAt = &now
	group.NextSyncAt = &nextSyncAt
	group.LastSyncStatus = "failed"
	group.LastSyncMessage = syncErr.Error()
	_ = group.UpdateSyncResult()
}

func downloadWAFIPGroupSubscription(rawURL string) ([]byte, error) {
	if err := validateSubscriptionURL(rawURL); err != nil {
		return nil, err
	}
	client := http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(rawURL)
	if err != nil {
		return nil, fmt.Errorf("下载订阅失败: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("订阅返回状态码 %d", resp.StatusCode)
	}
	var buffer bytes.Buffer
	reader := io.LimitReader(resp.Body, maxWAFIPGroupSubscriptionBytes+1)
	if _, err := buffer.ReadFrom(reader); err != nil {
		return nil, fmt.Errorf("读取订阅内容失败: %w", err)
	}
	if buffer.Len() > maxWAFIPGroupSubscriptionBytes {
		return nil, fmt.Errorf("订阅内容不能超过 %d 字节", maxWAFIPGroupSubscriptionBytes)
	}
	return buffer.Bytes(), nil
}

func parseWAFIPGroupSubscription(content []byte, format string, mappingRule string) ([]string, error) {
	switch normalizeWAFIPGroupSubscriptionFormat(format) {
	case WAFIPGroupSubscriptionFormatJSON:
		items, err := parseWAFIPGroupJSONSubscription(content, mappingRule)
		if err != nil {
			return nil, err
		}
		return normalizeWAFIPList(items)
	default:
		return normalizeWAFIPList(parseWAFIPGroupTextSubscription(string(content)))
	}
}

func parseWAFIPGroupTextSubscription(text string) []string {
	lines := strings.Split(text, "\n")
	items := make([]string, 0, len(lines))
	for _, line := range lines {
		item := strings.TrimSpace(line)
		if item == "" || strings.HasPrefix(item, "#") {
			continue
		}
		items = append(items, item)
	}
	return items
}

func parseWAFIPGroupJSONSubscription(content []byte, mappingRule string) ([]string, error) {
	var payload any
	if err := json.Unmarshal(content, &payload); err != nil {
		return nil, fmt.Errorf("JSON 订阅解析失败: %w", err)
	}
	nodes, err := selectJSONMappingNodes(payload, mappingRule)
	if err != nil {
		return nil, err
	}
	items := make([]string, 0, len(nodes))
	for _, node := range nodes {
		collectJSONStrings(node, &items)
	}
	if len(items) == 0 {
		return nil, errors.New("JSON 订阅没有解析到 IP/IP 段")
	}
	return items, nil
}

func selectJSONMappingNodes(payload any, mappingRule string) ([]any, error) {
	rule := strings.TrimSpace(mappingRule)
	if rule == "" || rule == "$" {
		return []any{payload}, nil
	}
	rule = strings.TrimPrefix(rule, "$.")
	nodes := []any{payload}
	for _, rawSegment := range strings.Split(rule, ".") {
		segment := strings.TrimSpace(rawSegment)
		if segment == "" {
			continue
		}
		expandArray := strings.HasSuffix(segment, "[]")
		segment = strings.TrimSuffix(segment, "[]")
		next := make([]any, 0)
		for _, node := range nodes {
			object, ok := node.(map[string]any)
			if !ok {
				continue
			}
			value, ok := object[segment]
			if !ok {
				continue
			}
			if expandArray {
				array, ok := value.([]any)
				if !ok {
					continue
				}
				next = append(next, array...)
			} else {
				next = append(next, value)
			}
		}
		nodes = next
	}
	if len(nodes) == 0 {
		return nil, fmt.Errorf("JSON 映射规则 %q 未匹配到内容", mappingRule)
	}
	return nodes, nil
}

func collectJSONStrings(node any, items *[]string) {
	switch value := node.(type) {
	case string:
		*items = append(*items, value)
	case []any:
		for _, item := range value {
			collectJSONStrings(item, items)
		}
	}
}

func validateSubscriptionURL(rawURL string) error {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" {
		return errors.New("订阅 URL 无效")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return errors.New("订阅 URL 仅支持 http 或 https")
	}
	return nil
}

func normalizeWAFIPGroupType(value string) string {
	switch strings.TrimSpace(value) {
	case WAFIPGroupTypeManual, "":
		return WAFIPGroupTypeManual
	case WAFIPGroupTypeAutomatic:
		return WAFIPGroupTypeAutomatic
	case WAFIPGroupTypeSubscription:
		return WAFIPGroupTypeSubscription
	default:
		return ""
	}
}

func normalizeWAFIPGroupSubscriptionFormat(value string) string {
	switch strings.TrimSpace(value) {
	case WAFIPGroupSubscriptionFormatJSON:
		return WAFIPGroupSubscriptionFormatJSON
	default:
		return WAFIPGroupSubscriptionFormatText
	}
}

func normalizeWAFIPGroupSyncInterval(value int) int {
	if value <= 0 {
		return defaultWAFIPGroupSyncIntervalMinutes
	}
	if value < minWAFIPGroupSyncIntervalMinutes {
		return minWAFIPGroupSyncIntervalMinutes
	}
	if value > maxWAFIPGroupSyncIntervalMinutes {
		return maxWAFIPGroupSyncIntervalMinutes
	}
	return value
}

func nextWAFIPGroupSyncAt(groupType string, enabled bool, interval int, current *time.Time) *time.Time {
	if groupType != WAFIPGroupTypeSubscription || !enabled {
		return nil
	}
	if current != nil && current.After(time.Now().UTC()) {
		return current
	}
	next := time.Now().UTC().Add(time.Duration(normalizeWAFIPGroupSyncInterval(interval)) * time.Minute)
	return &next
}

func loadWAFIPGroupReferenceCounts() (map[uint]int, error) {
	var groups []model.WAFRuleGroup
	if err := model.DB.Select("ip_whitelist_groups", "ip_blacklist_groups").Find(&groups).Error; err != nil {
		return nil, err
	}
	counts := make(map[uint]int)
	for _, group := range groups {
		for _, id := range mustDecodeUintList(group.IPWhitelistGroups) {
			counts[id]++
		}
		for _, id := range mustDecodeUintList(group.IPBlacklistGroups) {
			counts[id]++
		}
	}
	return counts, nil
}

func normalizeWAFIPGroupIDs(ids []uint) ([]uint, error) {
	normalized := uniqueUintIDs(ids)
	for _, id := range normalized {
		if _, err := model.GetWAFIPGroupByID(id); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, fmt.Errorf("IP 组 %d 不存在", id)
			}
			return nil, err
		}
	}
	return normalized, nil
}

func mustDecodeUintList(raw string) []uint {
	var values []uint
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &values); err != nil {
		return []uint{}
	}
	values = uniqueUintIDs(values)
	sort.Slice(values, func(i, j int) bool { return values[i] < values[j] })
	return values
}
