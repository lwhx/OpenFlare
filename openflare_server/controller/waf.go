package controller

import (
	"openflare/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type wafIDsRequest struct {
	IDs []uint `json:"ids"`
}

func ListWAFRuleGroups(c *gin.Context) {
	groups, err := service.ListWAFRuleGroups()
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, groups)
}

func GetWAFRuleGroup(c *gin.Context) {
	id, ok := parseUintPathParam(c, "id")
	if !ok {
		return
	}
	group, err := service.GetWAFRuleGroup(id)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, group)
}

func CreateWAFRuleGroup(c *gin.Context) {
	var input service.WAFRuleGroupInput
	if !bindJSON(c, &input) {
		return
	}
	group, err := service.CreateWAFRuleGroup(input)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, group)
}

func UpdateWAFRuleGroup(c *gin.Context) {
	id, ok := parseUintPathParam(c, "id")
	if !ok {
		return
	}
	var input service.WAFRuleGroupInput
	if !bindJSON(c, &input) {
		return
	}
	group, err := service.UpdateWAFRuleGroup(id, input)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, group)
}

func DeleteWAFRuleGroup(c *gin.Context) {
	id, ok := parseUintPathParam(c, "id")
	if !ok {
		return
	}
	if err := service.DeleteWAFRuleGroup(id); err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccessMessage(c, "")
}

func ReplaceWAFRuleGroupSites(c *gin.Context) {
	id, ok := parseUintPathParam(c, "id")
	if !ok {
		return
	}
	var request wafIDsRequest
	if !bindJSON(c, &request) {
		return
	}
	group, err := service.ReplaceWAFRuleGroupSites(id, request.IDs)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, group)
}

func GetWAFSiteRuleGroups(c *gin.Context) {
	routeID, ok := parseUintPathParam(c, "route_id")
	if !ok {
		return
	}
	view, err := service.GetWAFSiteRuleGroups(routeID)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, view)
}

func ReplaceWAFSiteRuleGroups(c *gin.Context) {
	routeID, ok := parseUintPathParam(c, "route_id")
	if !ok {
		return
	}
	var request wafIDsRequest
	if !bindJSON(c, &request) {
		return
	}
	view, err := service.ReplaceWAFSiteRuleGroups(routeID, request.IDs)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, view)
}

func parseUintPathParam(c *gin.Context, name string) (uint, bool) {
	id, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil || id == 0 {
		respondBadRequest(c, "invalid id")
		return 0, false
	}
	return uint(id), true
}
