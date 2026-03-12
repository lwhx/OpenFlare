package controller

import (
	"atsflare/service"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type confirmManualUpgradeRequest struct {
	UploadToken string `json:"upload_token"`
}

// GetLatestRelease godoc
// @Summary Get latest GitHub release
// @Tags Update
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/update/latest-release [get]
func GetLatestRelease(c *gin.Context) {
	release, err := service.GetLatestServerRelease(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    release,
	})
}

// UpgradeServer godoc
// @Summary Upgrade server binary from latest GitHub release
// @Tags Update
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/update/upgrade [post]
func UpgradeServer(c *gin.Context) {
	release, err := service.ScheduleServerUpgrade()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "服务升级任务已启动，下载完成后将自动重启。",
		"data":    release,
	})
}

// UploadManualServerBinary godoc
// @Summary Upload server binary and inspect version before upgrade
// @Tags Update
// @Accept mpfd
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/update/manual-upload [post]
func UploadManualServerBinary(c *gin.Context) {
	fileHeader, err := c.FormFile("binary")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "请先选择要上传的服务端二进制文件。",
		})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "读取上传文件失败。",
		})
		return
	}
	defer func() {
		_ = file.Close()
	}()

	info, err := service.UploadManualServerBinary(c.Request.Context(), fileHeader.Filename, file)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	message := strings.TrimSpace(info.ComparisonMessage)
	if message == "" {
		message = "已完成上传并检查升级包版本。"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data":    info,
	})
}

// ConfirmManualServerUpgrade godoc
// @Summary Confirm upgrade with previously uploaded server binary
// @Tags Update
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/update/manual-upgrade [post]
func ConfirmManualServerUpgrade(c *gin.Context) {
	var request confirmManualUpgradeRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "升级确认参数无效。",
		})
		return
	}

	info, err := service.ConfirmManualServerUpgrade(request.UploadToken)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "服务升级任务已启动，确认无误后将自动重启。",
		"data":    info,
	})
}
