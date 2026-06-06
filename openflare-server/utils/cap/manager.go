package cap

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"strings"
	"time"
)

// Config holds settings for the CAPTCHA manager
type Config struct {
	Secret              []byte        // HMAC signing key
	ChallengeCount      int           // Number of PoW puzzles
	ChallengeSize       int           // Size of the salt string
	ChallengeDifficulty int           // Length of difficulty target prefix
	ChallengeTTL        time.Duration // Lifespan of the challenge JWT
	TokenTTL            time.Duration // Lifespan of the redeem token
}

// Manager orchestrates challenge generation and solution validation
type Manager struct {
	conf  Config
	store Store
}

// NewManager creates a new CAPTCHA Manager
func NewManager(conf Config, store Store) *Manager {
	if conf.ChallengeCount <= 0 {
		conf.ChallengeCount = 50
	}
	if conf.ChallengeSize <= 0 {
		conf.ChallengeSize = 32
	}
	if conf.ChallengeDifficulty <= 0 {
		conf.ChallengeDifficulty = 4
	}
	if conf.ChallengeTTL <= 0 {
		conf.ChallengeTTL = 10 * time.Minute
	}
	if conf.TokenTTL <= 0 {
		conf.TokenTTL = 20 * time.Minute
	}
	return &Manager{
		conf:  conf,
		store: store,
	}
}

// Generate creates a challenge response
func (m *Manager) Generate(scope string) (*ChallengeResponse, error) {
	c := ChallengeConfig{
		Count:      m.conf.ChallengeCount,
		Size:       m.conf.ChallengeSize,
		Difficulty: m.conf.ChallengeDifficulty,
		ExpiresMs:  m.conf.ChallengeTTL,
	}
	return GenerateChallenge(m.conf.Secret, c, scope)
}

// Redeem verifies PoW solutions and returns a one-time redeem token
func (m *Manager) Redeem(ctx context.Context, token string, solutions []int, scope string) (*RedeemResponse, error) {
	sigHex := jwtSigHex(token)
	if sigHex == "" {
		return &RedeemResponse{Success: false, Error: "invalid_token"}, nil
	}

	// Replay prevention: check if this JWT signature has already been used
	nonceKey := "cap:nonce:" + sigHex
	_, exists, err := m.store.Get(ctx, nonceKey)
	if err != nil {
		return &RedeemResponse{Success: false, Error: "nonce_store_error"}, err
	}
	if exists {
		return &RedeemResponse{Success: false, Error: "already_redeemed"}, nil
	}

	payload, err := VerifyChallengeSolutions(token, solutions, m.conf.Secret, scope)
	if err != nil {
		return &RedeemResponse{Success: false, Error: err.Error()}, nil
	}

	// Verification succeeded. Consume the nonce.
	now := time.Now().UnixNano() / int64(time.Millisecond)
	ttlMs := time.Duration(payload.Expires-now) * time.Millisecond
	if ttlMs < time.Second {
		ttlMs = time.Second
	}
	if err := m.store.Set(ctx, nonceKey, "1", ttlMs); err != nil {
		return &RedeemResponse{Success: false, Error: "nonce_store_error"}, err
	}

	// Generate a redeem token formatted as "id:verToken"
	id := randomHex(8)
	verToken := randomHex(15)
	verHashBytes := sha256.Sum256([]byte(verToken))
	verHashHex := hex.EncodeToString(verHashBytes[:])

	tokenKey := "cap:token:" + id + ":" + verHashHex
	tokenExpires := time.Now().Add(m.conf.TokenTTL)

	// Value stored is "expiresNano|scope"
	storeVal := strconv.FormatInt(tokenExpires.UnixNano(), 10) + "|" + scope

	if err := m.store.Set(ctx, tokenKey, storeVal, m.conf.TokenTTL); err != nil {
		return &RedeemResponse{Success: false, Error: "token_store_error"}, err
	}

	return &RedeemResponse{
		Success: true,
		Token:   id + ":" + verToken,
		Expires: tokenExpires.UnixNano() / int64(time.Millisecond),
	}, nil
}

// VerifyToken validates and consumes the redeem token (single-use)
func (m *Manager) VerifyToken(ctx context.Context, token string, expectedScope string) (bool, error) {
	if token == "" {
		return false, nil
	}
	parts := strings.Split(token, ":")
	if len(parts) != 2 {
		return false, nil
	}
	id := parts[0]
	verToken := parts[1]

	verHashBytes := sha256.Sum256([]byte(verToken))
	verHashHex := hex.EncodeToString(verHashBytes[:])

	tokenKey := "cap:token:" + id + ":" + verHashHex

	val, exists, err := m.store.Get(ctx, tokenKey)
	if err != nil {
		return false, err
	}
	if !exists {
		return false, nil
	}

	// Single-use: consume/delete the token immediately
	_ = m.store.Delete(ctx, tokenKey)

	valParts := strings.Split(val, "|")
	if len(valParts) != 2 {
		return false, nil
	}

	expNano, err := strconv.ParseInt(valParts[0], 10, 64)
	if err != nil {
		return false, nil
	}
	tokenScope := valParts[1]

	if expectedScope != "" && tokenScope != expectedScope {
		return false, nil
	}

	if time.Now().UnixNano() > expNano {
		return false, nil // Expired
	}

	return true, nil
}
