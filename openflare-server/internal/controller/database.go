package controller

import (
	"github.com/rain-kl/openflare/openflare-server/internal/common/response"
	"github.com/rain-kl/openflare/openflare-server/internal/controller/bind"
	"github.com/rain-kl/openflare/openflare-server/internal/service"

	"github.com/gin-gonic/gin"
)

// CleanupDatabaseObservability godoc
// @Summary Cleanup observability tables
// @Tags Options
// @Accept json
// @Produce json
// @Security OpenFlareTokenAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/option/database/cleanup [post]
func CleanupDatabaseObservability(c *gin.Context) {
	var input service.DatabaseCleanupInput
	if err := bind.OptionalJSON(c.Request.Body, &input); err != nil {
		response.RespondBadRequest(c, "")
		return
	}
	result, err := service.CleanupDatabaseObservability(input)
	if err != nil {
		response.RespondFailure(c, err.Error())
		return
	}
	response.RespondSuccess(c, result)
}
