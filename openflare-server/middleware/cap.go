package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/rain-kl/openflare/openflare-server/common"
	"github.com/rain-kl/openflare/openflare-server/service"
)

// CapAuth wraps the core Cap middleware with OpenFlare's dynamic CapLoginEnabled configuration switch
func CapAuth(scope string) gin.HandlerFunc {
	return service.CapManager.VerifyMiddleware(scope, func() bool {
		return common.CapLoginEnabled
	})
}
