package controller

import (
	"atsflare/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetAccessLogs godoc
// @Summary List access logs
// @Tags AccessLogs
// @Produce json
// @Security BearerAuth
// @Param node_id query string false "Node ID"
// @Param p query int false "Page index"
// @Param page_size query int false "Page size"
// @Success 200 {object} map[string]interface{}
// @Router /api/access-logs/ [get]
func GetAccessLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("p", "0"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "0"))
	logs, err := service.ListAccessLogs(c.Query("node_id"), page, pageSize)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, logs)
}
