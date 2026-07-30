// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

// Stub the module's heavier dependencies so this spec exercises only the merge logic,
// without pulling in the store, the database or native modules.
jest.mock('react-native-uuid', () => ({ v4: () => 'uuid' }))
jest.mock('react-native-blob-util', () => ({}))
jest.mock('../../../distro', () => ({ reportError: () => {} }))
jest.mock('../..', () => ({ persistor: {} }))
jest.mock('../../qsos', () => ({ actions: {} }))
jest.mock('../../sync', () => ({ sendOperationsToSyncService: () => {} }))
jest.mock('../../settings', () => ({ selectSettings: () => ({}) }))
jest.mock('../../local', () => ({ selectLocalData: () => ({}), setLocalData: (data) => ({ type: 'setLocalData', data }) }))
jest.mock('../operationsSlice', () => ({ actions: { updateOperations: (ops) => ({ type: 'updateOperations', ops }) } }))
jest.mock('../../db/db', () => ({
  closeDatabaseAndRestart: () => {},
  dbExecute: async () => {},
  dbSelectAll: jest.fn(async () => []),
  dbSelectOne: async () => undefined
}))

const { dbSelectAll } = require('../../db/db')
const { mergeSyncOperations } = require('./operationsDB')

describe('mergeSyncOperations', () => {
  // The returned timestamps drive the client's forward-sync cursor. It records how far we have
  // read the server's change log — not what we chose to write — so it has to move past records
  // the conflict guard rejects. When it doesn't, the server re-sends the same record on every
  // round, forever. See the `existing.updatedAtMillis >= operation.updatedAtMillis` guard.
  let dispatch
  const run = (operations, existing = []) => {
    dbSelectAll.mockImplementationOnce(async () => existing)
    dispatch = jest.fn()
    return mergeSyncOperations({ operations })(dispatch, () => ({}))
  }

  const storeUpdates = () =>
    dispatch.mock.calls.map(([action]) => action).filter((action) => action?.type === 'updateOperations')

  it('advances the cursor past a record the local copy already supersedes', async () => {
    const inbound = { uuid: 'op-1', updatedAtMillis: 1000, syncedAtMillis: 5000 }
    const local = { uuid: 'op-1', updatedAtMillis: 2000 }

    const { latestSyncedAtMillis } = await run([inbound], [local])

    expect(latestSyncedAtMillis).toBe(5000)
  })

  it('advances the cursor past a record echoed back unchanged', async () => {
    // What the server does today when it hands a device its own upload back.
    const ours = { uuid: 'op-1', updatedAtMillis: 2000, syncedAtMillis: 5000 }

    const { latestSyncedAtMillis } = await run([ours], [{ ...ours }])

    expect(latestSyncedAtMillis).toBe(5000)
  })

  it('still applies a record that is newer than the local copy', async () => {
    const inbound = { uuid: 'op-1', updatedAtMillis: 3000, syncedAtMillis: 5000 }
    const local = { uuid: 'op-1', updatedAtMillis: 2000, local: { foo: 'bar' } }

    const { latestSyncedAtMillis } = await run([inbound], [local])

    expect(latestSyncedAtMillis).toBe(5000)
    expect(inbound.local).toEqual({ foo: 'bar' }) // local-only data is carried over, not clobbered
  })

  // The database keeps the newer local copy, but the store is what the screen reads. Handing a
  // rejected record to `updateOperations` merges it over the newer state in memory, so a local
  // edit — changing an operation's activities, say — silently reverts on the next sync round.
  it('keeps a rejected record out of the store', async () => {
    const inbound = { uuid: 'op-1', updatedAtMillis: 1000, syncedAtMillis: 5000, refs: [] }
    const local = { uuid: 'op-1', updatedAtMillis: 2000, refs: [{ type: 'pota', ref: 'US-0001' }] }

    await run([inbound], [local])

    expect(storeUpdates()).toEqual([])
  })

  it('puts an applied record into the store', async () => {
    const inbound = { uuid: 'op-1', updatedAtMillis: 3000, syncedAtMillis: 5000 }
    const local = { uuid: 'op-1', updatedAtMillis: 2000 }

    await run([inbound], [local])

    expect(storeUpdates()).toEqual([{ type: 'updateOperations', ops: [inbound] }])
  })

  it('puts only the applied records of a mixed batch into the store', async () => {
    const rejected = { uuid: 'op-1', updatedAtMillis: 1000, syncedAtMillis: 5000 }
    const accepted = { uuid: 'op-2', updatedAtMillis: 3000, syncedAtMillis: 9000 }

    await run([rejected, accepted], [
      { uuid: 'op-1', updatedAtMillis: 2000 },
      { uuid: 'op-2', updatedAtMillis: 2000 }
    ])

    expect(storeUpdates()).toEqual([{ type: 'updateOperations', ops: [accepted] }])
  })

  it('reports the range spanned by a batch', async () => {
    const operations = [
      { uuid: 'op-1', updatedAtMillis: 1000, syncedAtMillis: 5000 },
      { uuid: 'op-2', updatedAtMillis: 1000, syncedAtMillis: 9000 }
    ]

    const { earliestSyncedAtMillis, latestSyncedAtMillis } = await run(operations, [
      { uuid: 'op-1', updatedAtMillis: 2000 } // superseded locally, still counts toward the range
    ])

    expect(earliestSyncedAtMillis).toBe(5000)
    expect(latestSyncedAtMillis).toBe(9000)
  })
})
