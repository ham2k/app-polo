// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

// Stub the module's heavier dependencies so this spec exercises only the backoff schedule.
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

const GLOBAL = require('../../GLOBAL').default
const { _delayAfterSyncErrors } = require('./sync')

describe('_delayAfterSyncErrors', () => {
  afterEach(() => { delete GLOBAL.syncLoopDelay })

  // The bug this pins: the loop used to stop scheduling past eight errors, which handed the
  // five-second tick a permanently open gate (its check period is measured from the last
  // *successful* sync) and turned a 148-second backoff into a retry every five seconds. So the
  // schedule must never reward more failures with a shorter wait.
  it('never retries sooner as failures accumulate', () => {
    let previous = 0
    for (let errors = 1; errors <= 40; errors++) {
      const delay = _delayAfterSyncErrors(errors)
      expect(delay).toBeGreaterThanOrEqual(previous)
      previous = delay
    }
  })

  it('backs off exponentially at first', () => {
    expect(_delayAfterSyncErrors(1)).toBe(22000)
    expect(_delayAfterSyncErrors(2)).toBe(24000)
    expect(_delayAfterSyncErrors(3)).toBe(28000)
  })

  // A ceiling, so a long outage settles into a steady retry rather than doubling into hours.
  it('stops doubling at the ceiling', () => {
    const ceiling = _delayAfterSyncErrors(8)

    expect(ceiling).toBe(276000)
    expect(_delayAfterSyncErrors(9)).toBe(ceiling)
    expect(_delayAfterSyncErrors(500)).toBe(ceiling)
  })

  it('honours a configured loop delay', () => {
    GLOBAL.syncLoopDelay = 5000
    expect(_delayAfterSyncErrors(1)).toBe(7000)
  })
})
