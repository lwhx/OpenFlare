package router

import (
	"atsflare/common"
	"atsflare/controller"
	"atsflare/middleware"
	"embed"
	"fmt"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"io/fs"
	"net/http"
	pathpkg "path"
	"strings"
)

func setWebRouter(router *gin.Engine, buildFS embed.FS, indexPage []byte) {
	exportedBuildFS, err := fs.Sub(buildFS, "web/build")
	if err != nil {
		panic(err)
	}

	router.Use(middleware.GlobalWebRateLimit())
	fileDownloadRoute := router.Group("/")
	fileDownloadRoute.GET("/upload/:file", middleware.DownloadRateLimit(), controller.DownloadFile)
	registerLegacyWebRedirects(router)
	router.Use(middleware.Cache())
	router.Use(static.Serve("/", common.EmbedFolder(buildFS, "web/build")))
	router.NoRoute(func(c *gin.Context) {
		if serveExportedPage(c, exportedBuildFS) {
			return
		}

		if isStaticAssetRequest(c.Request.URL.Path) {
			c.Status(http.StatusNotFound)
			return
		}

		c.Data(http.StatusOK, "text/html; charset=utf-8", indexPage)
	})
}

func registerLegacyWebRedirects(router *gin.Engine) {
	legacyRoutes := map[string]string{
		"/proxy-route":     "/proxy-routes",
		"/config-version":  "/config-versions",
		"/node":            "/nodes",
		"/apply-log":       "/apply-logs",
		"/managed-domain":  "/managed-domains",
		"/tls-certificate": "/tls-certificates",
		"/file":            "/files",
		"/user":            "/users",
		"/user/add":        "/users?mode=create",
		"/user/edit":       "/users",
		"/setting":         "/settings",
	}

	for source, target := range legacyRoutes {
		router.GET(source, func(target string) gin.HandlerFunc {
			return func(c *gin.Context) {
				c.Redirect(http.StatusFound, target)
			}
		}(target))
	}

	router.GET("/user/edit/:id", func(c *gin.Context) {
		target := fmt.Sprintf("/users?edit=%s", c.Param("id"))
		c.Redirect(http.StatusFound, target)
	})
}

func serveExportedPage(c *gin.Context, buildFS fs.FS) bool {
	requestPath := strings.Trim(c.Request.URL.Path, "/")

	candidates := []string{"index.html"}
	if requestPath != "" {
		candidates = []string{
			requestPath + ".html",
			pathpkg.Join(requestPath, "index.html"),
		}
	}

	for _, candidate := range candidates {
		content, err := fs.ReadFile(buildFS, candidate)
		if err == nil {
			c.Data(http.StatusOK, "text/html; charset=utf-8", content)
			return true
		}
	}

	return false
}

func isStaticAssetRequest(requestPath string) bool {
	return strings.HasPrefix(requestPath, "/_next/") || pathpkg.Ext(requestPath) != ""
}
