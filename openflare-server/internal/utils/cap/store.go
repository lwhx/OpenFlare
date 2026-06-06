package cap

import (
	"context"
	"sync"
	"time"
)

// Store defines the storage interface for challenge nonces and verification tokens
type Store interface {
	Get(ctx context.Context, key string) (string, bool, error)
	Set(ctx context.Context, key string, val string, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

type memoryItem struct {
	value     string
	expiresAt time.Time
}

// MemoryStore is a thread-safe in-memory implementation of Store
type MemoryStore struct {
	items map[string]memoryItem
	mu    sync.RWMutex
}

// NewMemoryStore creates and initializes a new MemoryStore
func NewMemoryStore(cleanupInterval time.Duration) *MemoryStore {
	store := &MemoryStore{
		items: make(map[string]memoryItem),
	}
	if cleanupInterval > 0 {
		go store.startCleanupLoop(cleanupInterval)
	}
	return store
}

func (s *MemoryStore) Get(ctx context.Context, key string) (string, bool, error) {
	s.mu.RLock()
	item, found := s.items[key]
	s.mu.RUnlock()

	if !found {
		return "", false, nil
	}

	if time.Now().After(item.expiresAt) {
		s.mu.Lock()
		delete(s.items, key)
		s.mu.Unlock()
		return "", false, nil
	}

	return item.value, true, nil
}

func (s *MemoryStore) Set(ctx context.Context, key string, val string, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[key] = memoryItem{
		value:     val,
		expiresAt: time.Now().Add(ttl),
	}
	return nil
}

func (s *MemoryStore) Delete(ctx context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.items, key)
	return nil
}

func (s *MemoryStore) startCleanupLoop(interval time.Duration) {
	ticker := time.NewTicker(interval)
	for range ticker.C {
		s.cleanupExpired()
	}
}

func (s *MemoryStore) cleanupExpired() {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, v := range s.items {
		if now.After(v.expiresAt) {
			delete(s.items, k)
		}
	}
}
