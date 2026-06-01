package middleware

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"openflare/service"
)

// TunnelAuth authenticates OpenFlared client requests using X-Tunnel-Token.
func TunnelAuth() func(c *gin.Context) {
	return func(c *gin.Context) {
		token := c.GetHeader("X-Tunnel-Token")
		tunnel, err := service.AuthenticateTunnelToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "无权进行此操作，Tunnel Token 无效",
			})
			c.Abort()
			return
		}
		c.Set("tunnel", tunnel)
		c.Next()
	}
}
