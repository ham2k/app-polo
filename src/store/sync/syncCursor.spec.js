// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

// Stub the module's heavier dependencies so this spec exercises only the cursor bookkeeping.
jest.mock('react-native-config', () => ({}))
jest.mock('react-redux', () => ({ useSelector: () => undefined }))
jest.mock('just-diff', () => ({ diff: () => [] }))
jest.mock('../../extensions/registry', () => ({ findHooks: () => [] }))
jest.mock('../system', () => ({ addNotice: () => {}, clearMatchingNotices: () => {}, selectFeatureFlag: () => false }))
jest.mock('../operations', () => ({ clearAllOperationData: () => {}, getSyncCounts: async () => ({}), markOperationsAsSynced: () => {}, mergeSyncOperations: () => {}, queryOperations: async () => [], resetSyncedStatus: () => {} }))
jest.mock('../qsos', () => ({ markQSOsAsSynced: () => {}, mergeSyncQSOs: () => {}, queryQSOs: async () => [] }))
jest.mock('../time', () => ({ selectFiveSecondsTick: () => 0, startTickTock: () => ({ type: 'start' }), stopTickTock: () => ({ type: 'stop' }) }))
jest.mock('../local', () => ({ selectLocalData: () => ({}), selectLocalExtensionData: () => ({}), setLocalData: () => ({}), setLocalExtensionData: () => ({}) }))
jest.mock('../settings', () => ({ selectSettings: () => ({}) }))
jest.mock('../../distro', () => ({ reportError: () => {}, syncMetaForDistribution: () => ({}) }))

const { _nextSyncCursor, _backfillFallbackMillis, _cursorWasRefused } = require('./sync')

// LOFI-41. The failure these pin is silent: a millisecond holding more records than the server's
// page extension can carry (8000) is truncated, and paging on by millisecond skips the remainder
// for good - `recordsLeft` counts down to zero around the hole and the backfill reports itself
// complete. Following the server's row cursor is what reaches those records.
describe('_nextSyncCursor', () => {
  it('stores the cursor the server names', () => {
    expect(_nextSyncCursor({ sideMeta: { next_cursor: 'row:40' }, receivedCount: 50 })).toEqual('row:40')
  })

  it('accepts either spelling, because reading only one silently ignores a real response', () => {
    expect(_nextSyncCursor({ sideMeta: { nextCursor: 'row:41' }, receivedCount: 50 })).toEqual('row:41')
  })

  // A client sends its cursor INSTEAD of the millisecond bound - the server ignores
  // `syncedUntilMillis` entirely once a valid one arrives - so a spent cursor that is kept pins
  // the window open and re-serves the same tail every round, forever.
  it('clears a cursor when a page came back naming no position', () => {
    expect(_nextSyncCursor({ sideMeta: { records_left: 0 }, receivedCount: 3 })).toBeNull()
  })

  it('clears a cursor the server says it refused, rather than re-sending it', () => {
    expect(_nextSyncCursor({ sideMeta: {}, receivedCount: 0, refused: true })).toBeNull()
  })

  // The other half of that rule, and the reason it cannot simply be "no cursor means clear": a
  // cooldown-gated round carries counts and NO page, so it says nothing about where we are.
  // Clearing there would restart the walk from the millisecond bound.
  it('leaves the cursor alone when the round returned no page at all', () => {
    expect(_nextSyncCursor({ sideMeta: { records_left: 12 }, receivedCount: 0 })).toBeUndefined()
  })

  it('leaves it alone when there is no meta for the side at all', () => {
    expect(_nextSyncCursor({ sideMeta: undefined, receivedCount: 0 })).toBeUndefined()
  })
})

// The millisecond value is only ever a fallback for the row cursor, read if the cursor is lost -
// refused after a format change, or a server that stops honouring it. Which value is safe depends
// on how the page was built, and the two are opposites.
describe('_backfillFallbackMillis', () => {
  // No cursor: the server extended the page over its whole edge millisecond, so `< earliest`
  // skips nothing. `+ 1` here asks for `< earliest + 1`, re-requesting that millisecond every
  // round - which is exactly how a backfill stalls forever on a large group of tied records.
  it('banks the stamp as-is when no cursor was sent', () => {
    expect(_backfillFallbackMillis({ earliestSyncedAtMillis: 100, sentCursor: undefined })).toEqual(100)
  })

  // Cursor: the page stopped at the limit wherever that landed, so records sharing `earliest` may
  // not have been delivered. `< earliest` would skip them permanently and nothing would count the
  // loss; `+ 1` re-covers the millisecond, and re-delivery is idempotent.
  it('backs off one millisecond when a cursor was sent, so the fallback re-covers the stamp', () => {
    expect(_backfillFallbackMillis({ earliestSyncedAtMillis: 100, sentCursor: 'row:40' })).toEqual(101)
  })
})

describe('_cursorWasRefused', () => {
  it('sees the refusal the server reports for that side', () => {
    const response = { json: { errors: { qsos: { pagination: { cursor: 'Unsupported cursor version' } } } } }
    expect(_cursorWasRefused(response, 'qsos')).toBe(true)
    expect(_cursorWasRefused(response, 'operations')).toBe(false)
  })

  // Server-supplied, and read in the middle of a sync round: an unexpected shape must not throw.
  it('is not fooled or broken by an unrecognizable errors block', () => {
    expect(_cursorWasRefused({ json: { errors: 'went wrong' } }, 'qsos')).toBe(false)
    expect(_cursorWasRefused({ json: { errors: { qsos: 'went wrong' } } }, 'qsos')).toBe(false)
    expect(_cursorWasRefused({ json: {} }, 'qsos')).toBe(false)
    expect(_cursorWasRefused({}, 'qsos')).toBe(false)
    expect(_cursorWasRefused(undefined, 'qsos')).toBe(false)
  })
})
