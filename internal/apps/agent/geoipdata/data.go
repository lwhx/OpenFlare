// Package geoipdata embeds the default MaxMind GeoLite2 country database.
package geoipdata

import "embed"

// FS holds the embedded GeoLite2-Country.mmdb database.
//
//go:embed GeoLite2-Country.mmdb
var FS embed.FS

// DefaultMMDBName is the filename of the embedded MaxMind country database.
const DefaultMMDBName = "GeoLite2-Country.mmdb"
