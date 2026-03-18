package controller

import (
	"openflare/model"
	"openflare/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

// AgentRegister godoc
// @Summary Register or discover agent node
// @Tags Agent
// @Accept json
// @Produce json
// @Security AgentTokenAuth
// @Param payload body service.AgentNodePayload true "Agent node payload"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /api/agent/nodes/register [post]
func AgentRegister(c *gin.Context) {
	var payload service.AgentNodePayload
	if err := decodeJSONBody(c.Request.Body, &payload); err != nil {
		respondBadRequest(c, "")
		return
	}

	var (
		result *service.AgentRegistrationResponse
		err    error
	)
	if authNode, ok := c.Get("agent_node"); ok {
		result, err = service.RegisterNodeWithAgentToken(authNode.(*model.Node), payload)
	} else {
		result, err = service.RegisterNodeWithDiscovery(payload)
	}
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, result)
}

// AgentHeartbeat godoc
// @Summary Report agent heartbeat
// @Tags Agent
// @Accept json
// @Produce json
// @Security AgentTokenAuth
// @Param payload body service.AgentNodePayload true "Agent heartbeat payload"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /api/agent/nodes/heartbeat [post]
func AgentHeartbeat(c *gin.Context) {
	var payload service.AgentNodePayload
	if err := decodeJSONBody(c.Request.Body, &payload); err != nil {
		respondBadRequest(c, "")
		return
	}

	authNode, ok := c.Get("agent_node")
	if !ok {
		respondUnauthorized(c, "鏃犳潈杩涜姝ゆ搷浣滐紝Agent Token 鏃犳晥")
		return
	}

	node, err := service.HeartbeatNode(authNode.(*model.Node), payload)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccessWithExtras(c, node.Node, gin.H{
		"agent_settings": node.AgentSettings,
		"active_config":  node.ActiveConfig,
	})
}

// AgentGetActiveConfig godoc
// @Summary Get active config for agent
// @Tags Agent
// @Produce json
// @Security AgentTokenAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/agent/config-versions/active [get]
func AgentGetActiveConfig(c *gin.Context) {
	config, err := service.GetActiveConfigForAgent()
	if err != nil {
		respondFailure(c, "当前没有激活版本")
		return
	}
	respondSuccess(c, config)
}

// AgentReportApplyLog godoc
// @Summary Report agent apply result
// @Tags Agent
// @Accept json
// @Produce json
// @Security AgentTokenAuth
// @Param payload body service.ApplyLogPayload true "Apply log payload"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /api/agent/apply-logs [post]
func AgentReportApplyLog(c *gin.Context) {
	var payload service.ApplyLogPayload
	if err := decodeJSONBody(c.Request.Body, &payload); err != nil {
		respondBadRequest(c, "")
		return
	}

	if authNode, ok := c.Get("agent_node"); ok {
		payload.NodeID = authNode.(*model.Node).NodeID
	}

	log, err := service.ReportApplyLog(payload)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, log)
}

// GetNodes godoc
// @Summary List nodes
// @Tags Nodes
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/nodes/ [get]
func GetNodes(c *gin.Context) {
	nodes, err := service.ListNodeViews()
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, nodes)
}

// GetApplyLogs godoc
// @Summary List apply logs
// @Tags ApplyLogs
// @Produce json
// @Security BearerAuth
// @Param node_id query string false "Node ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/apply-logs/ [get]
func GetApplyLogs(c *gin.Context) {
	logs, err := service.ListApplyLogsPage(service.ApplyLogListQuery{
		NodeID:   c.Query("node_id"),
		PageNo:   readIntQueryFallback(c, "pageNo", "page_no"),
		PageSize: readIntQueryFallback(c, "pageSize", "page_size"),
	})
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, logs)
}

// CleanupApplyLogs godoc
// @Summary Cleanup apply logs
// @Tags ApplyLogs
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/apply-logs/cleanup [post]
func CleanupApplyLogs(c *gin.Context) {
	var input service.ApplyLogCleanupInput
	if err := c.ShouldBindJSON(&input); err != nil {
		respondBadRequest(c, "")
		return
	}
	result, err := service.CleanupApplyLogs(input)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, result)
}

func readIntQueryFallback(c *gin.Context, primary string, secondary string) int {
	value := c.Query(primary)
	if value == "" {
		value = c.Query(secondary)
	}
	parsed, _ := strconv.Atoi(value)
	return parsed
}
