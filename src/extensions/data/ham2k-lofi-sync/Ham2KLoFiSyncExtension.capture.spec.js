// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

// What a failed sync tells the backup service about how it failed. The service stores
// `failure.status` as the HTTP status the client saw, 0 when nothing answered. A request
// this client aborted itself got no answer: reporting it as 504 made the Oct 2026 client
// timeouts read as a gateway failing while LoFi was serving every other request in
// ~100ms, which sent the investigation looking for a server problem that wasn't there.

jest.mock('react-native-config', () => ({ HAM2K_BACKUP_TOKEN: 'backup-token' }))
jest.mock('@sentry/react-native', () => ({ captureMessage: () => {} }))
jest.mock('../../../store/settings', () => ({ selectSettings: () => ({}) }))
jest.mock('../../../store/local', () => ({ selectLocalExtensionData: () => ({}), setLocalExtensionData: () => ({}) }))
jest.mock('../../../distro', () => ({ syncMetaForDistribution: () => ({}) }))

// The app defines GLOBAL in its entry point; a spec has to stand it up itself.
global.GLOBAL = global

const mockCaptures = []
let mockSyncFailure
jest.mock('../../../tools/fetchWithTimeout', () => {
  const actual = jest.requireActual('../../../tools/fetchWithTimeout')
  return {
    ...actual,
    fetchWithTimeout: async (url, options) => {
      if (String(url).endsWith('/v1/client')) {
        return { status: 200, text: async () => JSON.stringify({ token: 'session-token' }) }
      }
      if (String(url).endsWith('/v1/capture')) {
        mockCaptures.push(JSON.parse(options.body))
        return { status: 201 }
      }
      throw mockSyncFailure()
    }
  }
})

const { FetchTimeoutError } = jest.requireActual('../../../tools/fetchWithTimeout')
const Extension = require('./Ham2KLoFiSyncExtension').default

let syncHook
Extension.onActivation({ registerHook: (category, { hook }) => { syncHook = hook } })

const run = async (thunk) => thunk(() => {}, () => ({}))
const somethingToPreserve = { qsos: [{ uuid: 'q1' }], operations: [], meta: {} }

beforeEach(() => { mockCaptures.length = 0 })

describe('the failure a capture reports', () => {
  it('says a timed-out sync got no HTTP status at all', async () => {
    mockSyncFailure = () => new FetchTimeoutError()
    await run(syncHook.sync(somethingToPreserve))

    expect(mockCaptures).toHaveLength(1)
    expect(mockCaptures[0].failure).toEqual({ reason: 'timeout', status: 0 })
  })

  it('says the same of a request that never connected', async () => {
    mockSyncFailure = () => new Error('Network request failed')
    await run(syncHook.sync(somethingToPreserve))

    expect(mockCaptures).toHaveLength(1)
    expect(mockCaptures[0].failure).toEqual({ reason: 'network', status: 0 })
  })
})
