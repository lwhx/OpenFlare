package cap

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestCapFullFlow(t *testing.T) {
	secret := []byte("a-very-long-secret-key-at-least-16-bytes")
	store := NewMemoryStore(1 * time.Minute)

	manager := NewManager(Config{
		Secret:              secret,
		ChallengeCount:      3, // small count for fast test
		ChallengeSize:       32,
		ChallengeDifficulty: 3, // small difficulty for fast test
		ChallengeTTL:        5 * time.Second,
		TokenTTL:            10 * time.Second,
	}, store)

	scope := "test-scope"
	resp, err := manager.Generate(scope)
	if err != nil {
		t.Fatalf("Generate failed: %v", err)
	}

	if resp.Challenge.C != 3 {
		t.Errorf("Expected count 3, got %d", resp.Challenge.C)
	}

	// Solve the challenge (acting as client)
	solutions := make([]int, resp.Challenge.C)
	tokenFnv := fnv1a(resp.Token)
	for i := 0; i < resp.Challenge.C; i++ {
		idxStr := strconv.Itoa(i + 1)
		saltSeed := fnv1aResume(tokenFnv, idxStr)
		targetSeed := fnv1aResume(saltSeed, "d")
		salt := prngFromHash(saltSeed, resp.Challenge.S)
		target := prngFromHash(targetSeed, resp.Challenge.D)

		// Brute force the PoW solution
		var found bool
		for nonce := 0; nonce < 1000000; nonce++ {
			hashInput := salt + strconv.Itoa(nonce)
			hashBytes := sha256.Sum256([]byte(hashInput))
			hashHex := hex.EncodeToString(hashBytes[:])
			if strings.HasPrefix(hashHex, target) {
				solutions[i] = nonce
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("Failed to solve puzzle %d", i)
		}
	}

	// Redeem
	ctx := context.Background()
	redeemResp, err := manager.Redeem(ctx, resp.Token, solutions, scope)
	if err != nil {
		t.Fatalf("Redeem failed: %v", err)
	}
	if !redeemResp.Success {
		t.Fatalf("Redeem returned success=false: %s", redeemResp.Error)
	}
	if redeemResp.Token == "" {
		t.Fatalf("Expected token, got empty")
	}

	// Verify the token
	valid, err := manager.VerifyToken(ctx, redeemResp.Token, scope)
	if err != nil {
		t.Fatalf("VerifyToken failed: %v", err)
	}
	if !valid {
		t.Fatalf("Expected redeem token to be valid")
	}

	// Verify token is one-time use
	validAgain, err := manager.VerifyToken(ctx, redeemResp.Token, scope)
	if err != nil {
		t.Fatalf("VerifyToken second call failed: %v", err)
	}
	if validAgain {
		t.Fatalf("Expected redeem token to be single-use (invalidated after verification)")
	}
}
