// Copyright 2026 Arctel.net
// SPDX-License-Identifier: Apache-2.0

package analytics

import (
	"context"
	"testing"
	"time"

	"github.com/Rain-kl/Wavelet/internal/db"
	analyticsmodel "github.com/Rain-kl/Wavelet/internal/model/analytics"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInsertNodeObsOpenresty_EmptyNodeID(t *testing.T) {
	err := InsertNodeObsOpenresty(context.Background(), analyticsmodel.NodeObsOpenresty{})
	require.NoError(t, err)
}

func TestInsertNodeObsOpenresty_UsesModelBatchSQL(t *testing.T) {
	ctx := context.Background()
	mockBatch := &mockBatch{}
	mockConn := &mockConn{
		batch:      mockBatch,
		batchQuery: analyticsmodel.NodeObsOpenresty{}.BatchInsertSQL(),
	}
	db.SetChConnForTest(mockConn)
	t.Cleanup(func() { db.SetChConnForTest(nil) })

	capturedAt := time.Now().UTC()
	err := InsertNodeObsOpenresty(ctx, analyticsmodel.NodeObsOpenresty{
		NodeID:               "node-a",
		CapturedAt:           capturedAt,
		OpenrestyRxBytes:     100,
		OpenrestyTxBytes:     200,
		OpenrestyConnections: 3,
		CreatedAt:            capturedAt,
	})
	require.NoError(t, err)
	assert.True(t, mockConn.prepareCalled)
	assert.Equal(t, analyticsmodel.NodeObsOpenresty{}.BatchInsertSQL(), mockConn.preparedQuery)
	assert.True(t, mockBatch.sendCalled)
	require.Len(t, mockBatch.rows, 1)
	assert.Equal(t, "node-a", mockBatch.rows[0][1])
}
