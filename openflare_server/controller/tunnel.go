package controller

import (
	"openflare/service"

	"github.com/gin-gonic/gin"
)

func GetTunnels(c *gin.Context) {
	tunnels, err := service.ListTunnels()
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, tunnels)
}

func GetTunnel(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}
	tunnel, err := service.GetTunnel(id)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, tunnel)
}

func CreateTunnel(c *gin.Context) {
	var input service.TunnelInput
	if !bindJSON(c, &input) {
		return
	}
	tunnel, err := service.CreateTunnel(input)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, tunnel)
}

func UpdateTunnel(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}
	var input service.TunnelInput
	if !bindJSON(c, &input) {
		return
	}
	tunnel, err := service.UpdateTunnel(id, input)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, tunnel)
}

func DeleteTunnel(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}
	if err := service.DeleteTunnel(id); err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, nil)
}

func RotateTunnelToken(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}
	tunnel, err := service.RotateTunnelToken(id)
	if err != nil {
		respondFailure(c, err.Error())
		return
	}
	respondSuccess(c, tunnel)
}
