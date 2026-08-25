// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

// Stub the module's heavier dependencies so this spec exercises only the decisions
// about when a failed sync is worth handing to the backup service.
jest.mock('react-native-config', () => ({}))
jest.mock('@sentry/react-native', () => ({ captureMessage: () => {} }))
jest.mock('../../../store/settings', () => ({ selectSettings: () => ({}) }))
jest.mock('../../../store/local', () => ({ selectLocalExtensionData: () => ({}), setLocalExtensionData: () => ({}) }))
jest.mock('../../../distro', () => ({ syncMetaForDistribution: () => ({}) }))
jest.mock('../../../tools/fetchWithTimeout', () => ({ fetchWithTimeout: async () => ({}) }))

const { _captureableFailure, _hasSomethingToPreserve } = require('./Ham2KLoFiSyncExtension')

describe('_captureableFailure', () => {
  it('says nothing failed when the sync succeeded', () => {
    expect(_captureableFailure({ ok: true, status: 200 })).toBeUndefined()
  })

  // The reason has to survive the trip to the backup service: a timeout and a request
  // that never opened a connection point at different problems, and the Aug 2026
  // incident could not be told apart from a real outage without going to the CDN's logs.
  it('passes through the reason the request layer labelled the failure with', () => {
    expect(_captureableFailure({ ok: false, status: 0, failure: { reason: 'network', status: 0 } }))
      .toEqual({ reason: 'network', status: 0 })
    expect(_captureableFailure({ ok: false, status: 504, failure: { reason: 'timeout', status: 504 } }))
      .toEqual({ reason: 'timeout', status: 504 })
  })

  it('treats an unlabelled server error as LoFi answering badly', () => {
    expect(_captureableFailure({ ok: false, status: 503 })).toEqual({ reason: 'server_error', status: 503 })
  })

  // Turning the service off is a decision, not an outage. Capturing here would file one
  // on every sync round for as long as the flag stays off.
  it('never captures when the LoFi service is deliberately disabled', () => {
    expect(_captureableFailure({ ok: false, status: 500, failure: { reason: 'disabled', status: 500 } })).toBeUndefined()
  })

  // A 4xx is LoFi rejecting this payload. Sending it to the backup service preserves
  // nothing -- replaying it would only get it rejected again.
  it('ignores client errors', () => {
    expect(_captureableFailure({ ok: false, status: 400 })).toBeUndefined()
    expect(_captureableFailure({ ok: false, status: 401 })).toBeUndefined()
  })
})

describe('_hasSomethingToPreserve', () => {
  // The exact payload shape of all 879 captures of the Aug 2026 incident: an empty poll,
  // nothing pending behind it. Capturing these cost a round trip every few seconds, 879
  // stored rows and an alert, and preserved nothing at all.
  it('is false for an empty poll with nothing pending', () => {
    expect(_hasSomethingToPreserve({
      operations: [],
      meta: { qsoCount: 107779, unsyncedQSOCount: 0, operationCount: 663, unsyncedOperationCount: 0 }
    })).toBe(false)
  })

  it('is true when the round is carrying qsos or operations', () => {
    expect(_hasSomethingToPreserve({ qsos: [{ uuid: 'q' }], operations: [], meta: {} })).toBe(true)
    expect(_hasSomethingToPreserve({ operations: [{ uuid: 'o' }], meta: {} })).toBe(true)
  })

  // Defence in depth rather than a reachable state: getSyncCounts filters the same way the
  // batch queries do, so a non-zero count means the batch came back non-empty. Pinned anyway,
  // because the guard's promise is about the device holding unsynced work, not about which
  // query noticed it.
  it('is true when the counts report unsynced work behind an empty batch', () => {
    expect(_hasSomethingToPreserve({ operations: [], meta: { unsyncedQSOCount: 3, unsyncedOperationCount: 0 } })).toBe(true)
    expect(_hasSomethingToPreserve({ operations: [], meta: { unsyncedQSOCount: 0, unsyncedOperationCount: 1 } })).toBe(true)
  })

  // Settings-only rounds are excluded on purpose: `settingsSynced` stays false for the whole
  // of an outage, so capturing them would mean a capture every round - the flood this guard
  // exists to prevent, for state that re-syncs itself once LoFi is back.
  it('is false for a settings-only round', () => {
    expect(_hasSomethingToPreserve({ operations: [], settings: { operatorCall: 'KI2D' }, meta: { unsyncedQSOCount: 0, unsyncedOperationCount: 0 } })).toBe(false)
  })

  it('survives a payload with no meta at all', () => {
    expect(_hasSomethingToPreserve({})).toBe(false)
    expect(_hasSomethingToPreserve(undefined)).toBe(false)
  })
})
