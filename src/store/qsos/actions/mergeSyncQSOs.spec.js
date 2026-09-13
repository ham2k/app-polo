// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

// Stub everything around the store so this spec exercises only how a synced page is ingested.
jest.mock('react-native-uuid', () => ({ v4: () => 'generated-uuid' }))
jest.mock('../../../GLOBAL', () => ({ deviceId: 'DEADBEEF00' }))
jest.mock('../qsosSlice', () => ({ actions: { addQSO: (p) => ({ type: 'addQSO', ...p }), setQSOs: () => ({}), setQSOsStatus: () => ({}) } }))
jest.mock('../../operations', () => ({ actions: {}, saveOperationLocalData: () => ({}), updateOperationInfo: () => ({ type: 'updateOperationInfo' }) }))
jest.mock('../../db/db', () => ({ dbExecute: jest.fn(async () => {}), dbSelectAll: jest.fn(async () => []), dbExecuteBatch: jest.fn(async () => {}) }))
jest.mock('../../sync', () => ({ sendQSOsToSyncService: () => {} }))
jest.mock('../../../tools/perfTools', () => ({ logTimer: () => {} }))
jest.mock('../../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/useCallLookup', () => ({ annotateQSO: async (q) => q }))
jest.mock('../../settings', () => ({ selectSettings: () => ({}) }))
jest.mock('../../runtime', () => ({ selectRuntimeOnline: () => false }))

const { dbExecute } = require('../../db/db')
const { mergeSyncQSOs } = require('./qsosDB')

const getState = () => ({ qsos: { qsos: {} } })
const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch, getState) : action))

// HALO-609. HaLo writes an event marker as `{band: 'event', event: {...}}` with no `our`/`their`.
// `qsoKey` destructures both, so the first such marker on a page threw out of `mergeSyncQSOs`,
// the sync loop's catch discarded the round - the other 299 records, the watermark, the cursor -
// and the next round asked for the same page. A device stayed one page short of every contact
// behind that marker, forever, with nothing reported.
describe('mergeSyncQSOs', () => {
  beforeEach(() => {
    dbExecute.mockClear()
  })

  it('stores a HaLo event marker under our own placeholder calls, and still banks the watermark', async () => {
    const marker = { uuid: 'm1', band: 'event', startAtMillis: 1000, event: { event: 'break' }, operation: 'op1', updatedAtMillis: 5, syncedAtMillis: 500 }
    const contact = { uuid: 'c1', band: '20m', mode: 'CW', our: { call: 'N0DEV' }, their: { call: 'W1AW' }, startAtMillis: 2000, operation: 'op1', updatedAtMillis: 6, syncedAtMillis: 600 }

    const { latestSyncedAtMillis, earliestSyncedAtMillis } = await mergeSyncQSOs({ qsos: [marker, contact] })(dispatch, getState)

    expect(latestSyncedAtMillis).toEqual(600)
    expect(earliestSyncedAtMillis).toEqual(500)
    expect(marker.our).toEqual({ call: 'EVENT' })
    expect(marker.their).toEqual({ call: 'BREAK' })
    expect(dbExecute).toHaveBeenCalledTimes(1)
    const params = dbExecute.mock.calls[0][1]
    expect(params).toContain('m1')
    expect(params).toContain('c1')
  })

  it('stores a record with no calls at all under empty ones, so nothing downstream reads a call off undefined', async () => {
    const odd = { uuid: 'x1', band: '20m', startAtMillis: 1000, operation: 'op1', updatedAtMillis: 5, syncedAtMillis: 500 }

    await expect(mergeSyncQSOs({ qsos: [odd] })(dispatch, getState)).resolves.toEqual({ latestSyncedAtMillis: 500, earliestSyncedAtMillis: 500 })
    expect(odd.our).toEqual({})
    expect(odd.their).toEqual({})
    expect(odd.key).toEqual(expect.any(String))
    expect(dbExecute).toHaveBeenCalledTimes(1)
  })

  // A store failure still discards the round: the caller banks the watermark only if this
  // returns, and a transient SQLite error must be retried rather than paged past for good.
  it('lets a store failure propagate, so the round is retried rather than its records skipped', async () => {
    dbExecute.mockImplementationOnce(async () => { throw new Error('disk says no') })
    const a = { uuid: 'a1', band: '20m', mode: 'CW', our: { call: 'N0DEV' }, their: { call: 'W1AW' }, startAtMillis: 1000, operation: 'opA', updatedAtMillis: 5, syncedAtMillis: 500 }

    await expect(mergeSyncQSOs({ qsos: [a] })(dispatch, getState)).rejects.toThrow('disk says no')
  })
})
