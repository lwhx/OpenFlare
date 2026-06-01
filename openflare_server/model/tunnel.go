package model

import "time"

type Tunnel struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	TunnelID        string    `json:"tunnel_id" gorm:"uniqueIndex;size:64;not null"`
	Name            string    `json:"name" gorm:"size:128;not null"`
	TunnelToken     string    `json:"-" gorm:"size:128;index"`
	Status          string    `json:"status" gorm:"size:16;not null;default:'offline'"`
	ClientVersion   string    `json:"client_version" gorm:"size:64"`
	FrpVersion      string    `json:"frp_version" gorm:"size:64"`
	LastSeenAt      time.Time `json:"last_seen_at"`
	LastError       string    `json:"last_error" gorm:"type:text"`
	CurrentVersion  string    `json:"current_version" gorm:"size:32"`
	CurrentChecksum string    `json:"current_checksum" gorm:"size:64"`
	ConnectedRelays string    `json:"connected_relays" gorm:"type:text;not null;default:'[]'"`
	Remark          string    `json:"remark" gorm:"size:255"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func ListTunnels() (tunnels []*Tunnel, err error) {
	err = DB.Order("id desc").Find(&tunnels).Error
	return tunnels, err
}

func GetTunnelByID(id uint) (*Tunnel, error) {
	tunnel := &Tunnel{}
	err := DB.First(tunnel, id).Error
	return tunnel, err
}

func GetTunnelByTunnelID(tunnelID string) (*Tunnel, error) {
	tunnel := &Tunnel{}
	err := DB.Where("tunnel_id = ?", tunnelID).First(tunnel).Error
	return tunnel, err
}

func GetTunnelByTunnelToken(token string) (*Tunnel, error) {
	tunnel := &Tunnel{}
	err := DB.Where("tunnel_token = ?", token).First(tunnel).Error
	return tunnel, err
}

func (tunnel *Tunnel) Insert() error {
	return DB.Create(tunnel).Error
}

func (tunnel *Tunnel) Update() error {
	return DB.Save(tunnel).Error
}

func (tunnel *Tunnel) Delete() error {
	return DB.Delete(tunnel).Error
}
