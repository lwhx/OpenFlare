package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/rain-kl/openflare/openflare-server/internal/common"
	"github.com/rain-kl/openflare/openflare-server/internal/utils/cap"
)

// RedisCapStore wraps the shared Redis client to implement the cap.Store interface
type RedisCapStore struct{}

func (s *RedisCapStore) Get(ctx context.Context, key string) (string, bool, error) {
	val, err := common.RDB.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return "", false, nil
		}
		return "", false, err
	}
	return val, true, nil
}

func (s *RedisCapStore) Set(ctx context.Context, key string, val string, ttl time.Duration) error {
	return common.RDB.Set(ctx, key, val, ttl).Err()
}

func (s *RedisCapStore) Delete(ctx context.Context, key string) error {
	return common.RDB.Del(ctx, key).Err()
}

// CapManager is the global CAPTCHA manager instance
var CapManager *cap.Manager

// InitCap initializes the global CAPTCHA manager
func InitCap() {
	var store cap.Store
	if common.RedisEnabled {
		store = &RedisCapStore{}
		slog.Info("CAPTCHA service initialized with Redis store")
	} else {
		store = cap.NewMemoryStore(1 * time.Minute)
		slog.Info("CAPTCHA service initialized with Memory store")
	}

	secret := common.JWTSecret
	if secret == "" {
		secret = common.SessionSecret
	}
	secretBytes := []byte(secret)
	if len(secretBytes) < 16 {
		// CAPTCHA JWT verification requires a key of at least 16 bytes
		padding := make([]byte, 16-len(secretBytes))
		secretBytes = append(secretBytes, padding...)
	}

	CapManager = cap.NewManager(cap.Config{
		Secret:              secretBytes,
		ChallengeCount:      50,
		ChallengeSize:       32,
		ChallengeDifficulty: 4,
		ChallengeTTL:        10 * time.Minute,
		TokenTTL:            20 * time.Minute,
	}, store)
}
