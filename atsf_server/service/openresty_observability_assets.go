package service

import "fmt"

const (
	openRestyObservabilitySupportDir  = "observability"
	openRestyObservabilityInitLuaPath = openRestyObservabilitySupportDir + "/init.lua"
	openRestyObservabilityLogLuaPath  = openRestyObservabilitySupportDir + "/log.lua"
	openRestyObservabilityReadLuaPath = openRestyObservabilitySupportDir + "/read.lua"
	openRestyObservabilityWindowTTL   = 7200
)

const openRestyObservabilityInitLua = `local dict = ngx.shared.atsflare_observability
if not dict then
    return
end

local now = ngx.time()
local current_window = dict:get("current_window")
if not current_window then
    dict:set("current_window", now)
    dict:set("window_started_at:" .. now, now)
end
`

const openRestyObservabilityLogLua = `local dict = ngx.shared.atsflare_observability
if not dict then
    return
end

local ttl = ` + "7200" + `
local current_window = dict:get("current_window")
local now = ngx.time()
if not current_window then
    current_window = now
    dict:set("current_window", current_window)
    dict:set("window_started_at:" .. current_window, now)
end

local function ensure_counter(key)
    dict:add(key, 0, ttl)
end

local function incr(key, delta)
    ensure_counter(key)
    local value, err = dict:incr(key, delta)
    if not value and err == "not found" then
        dict:set(key, delta, ttl)
    end
end

local function remember_value(list_key, marker_key, value)
    if value == "" then
        return
    end
    if not dict:add(marker_key, 1, ttl) then
        return
    end
    local existing = dict:get(list_key)
    if not existing or existing == "" then
        dict:set(list_key, value, ttl)
        return
    end
    dict:set(list_key, existing .. "\n" .. value, ttl)
end

local window_prefix = tostring(current_window)
incr("request_count:" .. window_prefix, 1)

local status = tostring(ngx.status or 0)
if status ~= "0" then
    incr("status:" .. window_prefix .. ":" .. status, 1)
    remember_value(
        "status_keys:" .. window_prefix,
        "status_marker:" .. window_prefix .. ":" .. status,
        status
    )
    if tonumber(status) and tonumber(status) >= 500 then
        incr("error_count:" .. window_prefix, 1)
    end
end

local host = tostring(ngx.var.host or "")
if host ~= "" then
    incr("domain:" .. window_prefix .. ":" .. host, 1)
    remember_value(
        "domain_keys:" .. window_prefix,
        "domain_marker:" .. window_prefix .. ":" .. host,
        host
    )
end

local remote_addr = tostring(ngx.var.binary_remote_addr or ngx.var.remote_addr or "")
if remote_addr ~= "" and dict:add("visitor:" .. window_prefix .. ":" .. remote_addr, 1, ttl) then
    incr("unique_visitor_count:" .. window_prefix, 1)
end

local request_length = tonumber(ngx.var.request_length) or 0
if request_length > 0 then
    incr("openresty_rx_bytes:" .. window_prefix, request_length)
end

local bytes_sent = tonumber(ngx.var.bytes_sent) or tonumber(ngx.var.body_bytes_sent) or 0
if bytes_sent > 0 then
    incr("openresty_tx_bytes:" .. window_prefix, bytes_sent)
end
`

const openRestyObservabilityReadLua = `local cjson = require "cjson.safe"

local dict = ngx.shared.atsflare_observability
if not dict then
    ngx.status = ngx.HTTP_SERVICE_UNAVAILABLE
    ngx.say(cjson.encode({ message = "shared dict unavailable" }))
    return
end

local now = ngx.time()
local current_window = dict:get("current_window")
if not current_window then
    current_window = now
    dict:set("current_window", current_window)
    dict:set("window_started_at:" .. current_window, now)
end

local function read_counter(key)
    return tonumber(dict:get(key) or 0) or 0
end

local function read_map(window_id, prefix, list_key)
    local result = {}
    local raw = dict:get(list_key .. ":" .. window_id)
    if not raw or raw == "" then
        return result
    end
    for value in string.gmatch(raw, "[^\n]+") do
        result[value] = read_counter(prefix .. ":" .. window_id .. ":" .. value)
    end
    return result
end

local payload = {
    window_started_at_unix = read_counter("window_started_at:" .. current_window),
    window_ended_at_unix = now,
    request_count = read_counter("request_count:" .. current_window),
    error_count = read_counter("error_count:" .. current_window),
    unique_visitor_count = read_counter("unique_visitor_count:" .. current_window),
    status_codes = read_map(current_window, "status", "status_keys"),
    top_domains = read_map(current_window, "domain", "domain_keys"),
    source_countries = {},
    openresty_rx_bytes = read_counter("openresty_rx_bytes:" .. current_window),
    openresty_tx_bytes = read_counter("openresty_tx_bytes:" .. current_window)
}

local next_window = now
if next_window <= current_window then
    next_window = current_window + 1
end
dict:set("current_window", next_window)
dict:set("window_started_at:" .. next_window, now)

ngx.header.content_type = "application/json"
ngx.say(cjson.encode(payload))
`

func buildOpenRestyObservabilitySupportFiles() []SupportFile {
	return []SupportFile{
		{Path: openRestyObservabilityInitLuaPath, Content: openRestyObservabilityInitLua},
		{Path: openRestyObservabilityLogLuaPath, Content: openRestyObservabilityLogLua},
		{Path: openRestyObservabilityReadLuaPath, Content: openRestyObservabilityReadLua},
	}
}

func renderOpenRestyObservabilityTemplateBlock() string {
	return stringsJoinLines(
		"    lua_shared_dict atsflare_observability 10m;",
		fmt.Sprintf("    init_worker_by_lua_file %s/%s;", nginxLuaDirPlaceholder, openRestyObservabilityInitLuaPath),
		fmt.Sprintf("    log_by_lua_file %s/%s;", nginxLuaDirPlaceholder, openRestyObservabilityLogLuaPath),
		"",
		fmt.Sprintf("    server {"),
		fmt.Sprintf("        listen 127.0.0.1:%s;", nginxObservabilityPortPlaceholder),
		"        server_name atsflare-observability;",
		"        access_log off;",
		"        allow 127.0.0.1;",
		"        deny all;",
		"",
		"        location = /atsflare/observability {",
		"            default_type application/json;",
		fmt.Sprintf("            content_by_lua_file %s/%s;", nginxLuaDirPlaceholder, openRestyObservabilityReadLuaPath),
		"        }",
		"",
		"        location = /atsflare/stub_status {",
		"            stub_status;",
		"        }",
		"    }",
		"",
	)
}

func stringsJoinLines(lines ...string) string {
	if len(lines) == 0 {
		return ""
	}
	result := ""
	for index, line := range lines {
		if index > 0 {
			result += "\n"
		}
		result += line
	}
	return result + "\n"
}
