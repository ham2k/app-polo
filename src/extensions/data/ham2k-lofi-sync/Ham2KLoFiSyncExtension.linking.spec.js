// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

// Which linking call asks LoFi to mail a confirmation. The server mails one for every pending
// permission unless the request opts out, so the mutation to catch is linkClient dropping
// `send_email: false`: the code screen then arrives alongside a mail nobody asked for, "send a
// confirmation email instead" sends a second, and the five-second tick that re-requests an
// expired code sends another every ten minutes.

jest.mock('react-native-config', () => ({}))
jest.mock('@sentry/react-native', () => ({ captureMessage: () => {} }))
jest.mock('../../../store/settings', () => ({ selectSettings: () => ({}) }))
jest.mock('../../../store/local', () => ({ selectLocalExtensionData: () => ({}), setLocalExtensionData: () => ({}) }))
jest.mock('../../../distro', () => ({ syncMetaForDistribution: () => ({}) }))

// The app defines GLOBAL in its entry point; a spec has to stand it up itself.
global.GLOBAL = global

const requests = []
jest.mock('../../../tools/fetchWithTimeout', () => ({
  fetchWithTimeout: async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) })
    if (String(url).endsWith('/v1/client')) {
      return { status: 200, text: async () => JSON.stringify({ token: 'session-token' }) }
    }
    return { status: 200, text: async () => JSON.stringify({ permission: { status: 'pending', challenge_token: '123456' } }) }
  }
}))

const Extension = require('./Ham2KLoFiSyncExtension').default

// Reached through activation, which is also the one place that proves these are the calls the
// app itself gets handed.
let syncHook
Extension.onActivation({ registerHook: (category, { hook }) => { syncHook = hook } })

const run = async (thunk) => thunk(() => {}, () => ({}))
const permissionRequests = () => requests.filter(r => String(r.url).endsWith('/v1/client/permissions'))

beforeEach(() => { requests.length = 0 })

describe('linking', () => {
  it('tells the server not to mail when the code is shown on screen', async () => {
    await run(syncHook.linkClient('ham@example.com'))
    expect(permissionRequests()).toHaveLength(1)
    expect(permissionRequests()[0].body).toEqual({ email: 'ham@example.com', send_email: false })
  })

  it('mails only when the user asked for the email instead', async () => {
    await run(syncHook.linkClientWithEmail('ham@example.com'))
    expect(permissionRequests()).toHaveLength(1)
    expect(permissionRequests()[0].body).toEqual({ email: 'ham@example.com', send_email: true })
  })
})
