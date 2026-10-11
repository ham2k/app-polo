// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

// Stub the module's heavier dependencies so this spec exercises only the loop's scheduling.
// `findHooks` is only reached once a round has taken over the loop, so its calls count the rounds
// that actually ran.
const mockFindHooks = jest.fn(() => [])
jest.mock('react-native-config', () => ({}))
jest.mock('react-redux', () => ({ useSelector: () => undefined }))
jest.mock('just-diff', () => ({ diff: () => [] }))
jest.mock('../../extensions/registry', () => ({ findHooks: (...args) => mockFindHooks(...args) }))
jest.mock('../system', () => ({ addNotice: () => {}, clearMatchingNotices: () => {}, selectFeatureFlag: () => false }))
jest.mock('../operations', () => ({ clearAllOperationData: () => {}, getSyncCounts: async () => ({}), markOperationsAsSynced: () => {}, mergeSyncOperations: () => {}, queryOperations: async () => [], resetSyncedStatus: () => {} }))
jest.mock('../qsos', () => ({ markQSOsAsSynced: () => {}, mergeSyncQSOs: () => {}, queryQSOs: async () => [] }))
jest.mock('../time', () => ({ selectFiveSecondsTick: () => 0, startTickTock: () => ({ type: 'start' }), stopTickTock: () => ({ type: 'stop' }) }))
jest.mock('../local', () => ({ selectLocalData: () => ({}), selectLocalExtensionData: () => ({}), setLocalData: () => ({}), setLocalExtensionData: () => ({}) }))
jest.mock('../settings', () => ({ selectSettings: () => ({}) }))
jest.mock('../../distro', () => ({ reportError: () => {}, syncMetaForDistribution: () => ({}) }))

// The loop's state lives in the module, so each test gets a fresh copy.
let GLOBAL, sync
const dispatch = () => {}
const getState = () => ({})
const roundsRun = () => mockFindHooks.mock.calls.length

beforeEach(() => {
  jest.useFakeTimers()
  jest.resetModules()
  mockFindHooks.mockClear()
  GLOBAL = require('../../GLOBAL').default
  sync = require('./sync')
})

afterEach(() => {
  jest.useRealTimers()
  delete GLOBAL.syncEnabled
})

// The bug these pin: a round that returned without taking over and releasing the loop left its
// spent timer blocking the scheduler, and nothing scheduled a loop again until the app restarted.
describe('the sync loop survives rounds that do nothing', () => {
  // Turning the Sync switch off schedules a round, which finds sync disabled. That is how N4DH's
  // iPad stopped syncing in both directions for ten days after sync was turned back on.
  it('runs again once sync is re-enabled', () => {
    GLOBAL.syncEnabled = false
    sync._scheduleNextSyncLoop({ dispatch, delay: 1000 })
    jest.advanceTimersByTime(1000)
    expect(roundsRun()).toBe(0)

    GLOBAL.syncEnabled = true
    sync._scheduleNextSyncLoop({ dispatch, delay: 1000 })
    jest.advanceTimersByTime(1000)
    expect(roundsRun()).toBe(1)
  })

  // Logging a QSO with sync off goes through the debounced send, whose timer jammed the same way.
  it('runs again after a QSO was logged with sync off', () => {
    GLOBAL.syncEnabled = false
    sync.sendQSOsToSyncService({ dispatch, getState })
    jest.advanceTimersByTime(1000)
    expect(roundsRun()).toBe(0)

    GLOBAL.syncEnabled = true
    sync._scheduleNextSyncLoop({ dispatch, delay: 1000 })
    jest.advanceTimersByTime(1000)
    expect(roundsRun()).toBe(1)
  })

  // A round that runs before the sync extension has registered its hook has nothing to sync with.
  it('runs again after a round found no sync hook', () => {
    GLOBAL.syncEnabled = true
    sync._scheduleNextSyncLoop({ dispatch, delay: 1000 })
    jest.advanceTimersByTime(1000)
    expect(roundsRun()).toBe(1)

    sync._scheduleNextSyncLoop({ dispatch, delay: 1000 })
    jest.advanceTimersByTime(1000)
    expect(roundsRun()).toBe(2)
  })
})
