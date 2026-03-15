package controller

import (
	"openflare/service"

	"github.com/gin-gonic/gin"
)

// GetDashboardOverview godoc
// @Summary Get dashboard overview
// @Tags Dashboard
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /api/dashboard/overview [get]
func GetDashboardOverview(c *gin.Context) {
	view, err := service.GetDashboardOverview()
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, view)
}
