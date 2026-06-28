// Copyright ©️ 2026 Jeff Kowalski <jeff.kowalski@gmail.com>
// SPDX-License-Identifier: MPL-2.0

import { findOrCreateOperation } from './findOrCreateOperation'

// deepLinkTools imports this ESM package at module load; stub it out.
jest.mock('@ham2k/lib-operation-data', () => ({ bandForFrequency: () => undefined }))

jest.mock('../../../extensions/registry', () => ({
  findHooks: (category, { key } = {}) => {
    if (category !== 'activity') return []
    const hooks = [
      { key: 'sota', activationType: 'sotaActivation', huntingType: 'sota' },
      { key: 'pota', activationType: 'potaActivation', huntingType: 'pota' }
    ]
    return key ? hooks.filter(h => h.key === key) : hooks
  }
}))

// Stub the slice and sibling actions so this spec exercises only the
// find-or-create logic, without pulling in the store or the database layer.
jest.mock('../operationsSlice', () => ({
  selectAllOperations: (state) => state.operations
}))
jest.mock('./operationsDB', () => ({
  addNewOperation: (operation) => async () => ({ uuid: 'new-op-uuid', ...operation })
}))
// Pass the refs through as if decorated; title derivation is upstream's concern.
jest.mock('./setOperationData', () => ({
  mergeDataIntoOperation: ({ operation, data }) => async () => ({ ...operation, ...data })
}))

describe('findOrCreateOperation', () => {
  const dispatch = jest.fn(async (action) => (typeof action === 'function' ? action(dispatch, () => ({})) : action))
  beforeEach(() => dispatch.mockClear())

  const run = ({ ourRefs, operations }) => findOrCreateOperation({ ourRefs })(dispatch, () => ({ operations }))

  const ourRefs = [{ type: 'sota', ref: 'W6/CT-006' }]

  it('reuses a recent operation activating a matching ref', async () => {
    const recent = { uuid: 'op-1', createdAtMillis: Date.now(), refs: [{ type: 'sotaActivation', ref: 'W6/CT-006' }] }
    const op = await run({ ourRefs, operations: { 'op-1': recent } })
    expect(op.uuid).toBe('op-1')
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('ignores stale operations (older than 24h) and creates a new one', async () => {
    const stale = { uuid: 'op-old', createdAtMillis: Date.now() - 25 * 60 * 60 * 1000, refs: [{ type: 'sotaActivation', ref: 'W6/CT-006' }] }
    const op = await run({ ourRefs, operations: { 'op-old': stale } })
    expect(op.uuid).toBe('new-op-uuid')
    expect(op.refs).toEqual([{ type: 'sotaActivation', ref: 'W6/CT-006' }])
  })

  it('creates a new activation operation when none match', async () => {
    const op = await run({ ourRefs, operations: {} })
    expect(op.uuid).toBe('new-op-uuid')
    expect(op.refs).toEqual([{ type: 'sotaActivation', ref: 'W6/CT-006' }])
  })

  describe('our operation covering more than one reference (n-fer)', () => {
    const multiRefs = [{ type: 'pota', ref: 'US-1234' }, { type: 'sota', ref: 'W6/CT-006' }]
    const recentOp = (refs) => ({ uuid: 'op-multi', createdAtMillis: Date.now(), refs })

    it('reuses an operation whose refs are exactly the requested set (any order)', async () => {
      const recent = recentOp([
        { type: 'sotaActivation', ref: 'W6/CT-006' },
        { type: 'potaActivation', ref: 'US-1234' }
      ])
      const op = await run({ ourRefs: multiRefs, operations: { 'op-multi': recent } })
      expect(op.uuid).toBe('op-multi')
      expect(dispatch).not.toHaveBeenCalled()
    })

    it('creates a new operation carrying every our.ref as an activation', async () => {
      const op = await run({ ourRefs: multiRefs, operations: {} })
      expect(op.uuid).toBe('new-op-uuid')
      expect(op.refs).toEqual([
        { type: 'potaActivation', ref: 'US-1234' },
        { type: 'sotaActivation', ref: 'W6/CT-006' }
      ])
    })

    it('does NOT reuse an operation activating only some of the requested refs', async () => {
      // op is a summit-only activation; the request is park + summit, different activation
      const recent = recentOp([{ type: 'sotaActivation', ref: 'W6/CT-006' }])
      const op = await run({ ourRefs: multiRefs, operations: { 'op-multi': recent } })
      expect(op.uuid).toBe('new-op-uuid')
    })

    it('does NOT reuse a multi-ref operation for a single-ref request (a park without the summit)', async () => {
      // activating just the park must not grab the park+summit n-fer operation
      const recent = recentOp([
        { type: 'potaActivation', ref: 'US-1234' },
        { type: 'sotaActivation', ref: 'W6/CT-006' }
      ])
      const op = await run({ ourRefs: [{ type: 'pota', ref: 'US-1234' }], operations: { 'op-multi': recent } })
      expect(op.uuid).toBe('new-op-uuid')
      expect(op.refs).toEqual([{ type: 'potaActivation', ref: 'US-1234' }])
    })
  })
})
