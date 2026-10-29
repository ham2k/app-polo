// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

jest.mock('./PnPAccountSetting', () => ({}))
jest.mock('../../../distro', () => ({ reportError: () => {} }))
jest.mock('../../activities/siota/SiOTAInfo', () => ({ Info: { icon: 'siota-icon' } }))
jest.mock('../../activities/wwff/WWFFInfo', () => ({ Info: { icon: 'wwff-icon' } }))

import { Alert } from 'react-native'

import Extension from './SpotParksnPeaksExtension'

const hooks = {}
Extension.onActivation({ registerHook: (category, { hook }) => { hooks[category] = hook } })
const SpotsHook = hooks.spots

const t = (_key, fallback, args = {}) => fallback.replace(/{{(\w+)}}/g, (_m, name) => String(args[name]))

const state = { settings: { operatorCall: 'VK2ABC', accounts: { parksnpeaks: { userId: 'VK2ABC', apiKey: 'k' } } } }
const getState = () => state

let sent
function respond (body, status = 200) {
  sent = []
  global.fetch = jest.fn(async (url, options) => {
    sent.push({ url, ...options })
    return { status, text: async () => body, json: async () => JSON.parse(body) }
  })
}

function postedFields () {
  expect(sent).toHaveLength(1)
  // React Native's FormData keeps its fields as parts; Node's is iterable.
  const form = sent[0].body
  if (form.getParts) return Object.fromEntries(form.getParts().map((part) => [part.fieldName, part.string]))
  return Object.fromEntries(form.entries())
}

const operation = { stationCall: 'VK2ABC', refs: [{ type: 'wwffActivation', ref: 'VKFF-1997' }, { type: 'siotaActivation', ref: 'VK-SI0042' }, { type: 'potaActivation', ref: 'AU-0001' }] }
const selfSpot = () => SpotsHook.postSelfSpot({ t, operation, vfo: { freq: 7160.5, mode: 'SSB' }, comments: 'up 5' })(() => {}, getState)

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

const alerted = () => Alert.alert.mock.calls.map((call) => call[1]).join('\n')

describe('ParksnPeaks spot feed', () => {
  const row = (overrides) => ({
    actTime: '2026-10-28 23:43:19',
    actSiteID: 'VKFF-3076',
    actCallsign: 'vk2xwb',
    actMode: 'SSB',
    actFreq: '7.144',
    actClass: 'WWFF',
    actLocation: 'Murraguldrie Flora Reserve',
    actComments: '',
    actSpoter: 'vk2xwb',
    ...overrides
  })

  it('asks for Oceania only, since the feed is otherwise worldwide', async () => {
    respond(JSON.stringify([]))
    await SpotsHook.fetchSpots({ online: true })
    expect(sent[0].url).toBe('https://www.parksnpeaks.org/api/ALL?continent=OC')
  })

  // The October 2026 site publishes 'SIOTA' where the old one published 'SiOTA';
  // matched exactly, every silo vanished from the feed.
  it('reads the class whatever its case', async () => {
    respond(JSON.stringify([row({ actCallsign: 'vk3sio', actClass: 'SIOTA', actSiteID: 'VK-RCG2' }), row({ actClass: 'POTA', actCallsign: 'vk1cc' })]))
    const spots = await SpotsHook.fetchSpots({ online: true })
    expect(spots.map((spot) => spot.their.call)).toEqual(['VK3SIO'])
    expect(spots[0].refs).toEqual([{ ref: 'VK-RCG2', type: 'siota' }])
    expect(spots[0].spot.icon).toBe('siota-icon')
  })
})

describe('ParksnPeaks spot posting', () => {
  it('posts one spot carrying every reference, in kHz, to the documented endpoint', async () => {
    respond(JSON.stringify({ success: true, message: '' }))
    expect(await selfSpot()).toBe(true)
    expect(sent[0].url).toBe('https://www.parksnpeaks.org/api/spots')
    expect(postedFields()).toEqual({
      userID: 'VK2ABC',
      APIKey: 'k',
      activator: 'VK2ABC',
      spotter: 'VK2ABC',
      // POTA has its own source and is not this one's to spot.
      reference: 'VKFF-1997,VK-SI0042',
      // kHz since the October 2026 rewrite: the old MHz '7.160' spots 7 kHz.
      frequency: '7160.5',
      mode: 'SSB',
      comments: 'up 5',
      do_not_lookup: 'true'
    })
  })

  // A logged contact with a park carries `wwff`, never `wwffActivation`.
  it('spots someone else from the HUNTING refs a QSO carries', async () => {
    respond(JSON.stringify({ success: true }))
    const qso = { their: { call: 'VK5DEF' }, freq: 14310, mode: 'SSB', refs: [{ type: 'wwff', ref: 'VKFF-0100' }] }
    expect(SpotsHook.isOtherSpotEnabled({ qso, settings: state.settings })).toBeTruthy()
    expect(await SpotsHook.postOtherSpot({ t, qso, comments: '', spotterCall: 'VK2ABC' })(() => {}, getState)).toBe(true)
    expect(postedFields()).toMatchObject({ activator: 'VK5DEF', spotter: 'VK2ABC', reference: 'VKFF-0100', frequency: '14310' })
  })

  it('a refused login says so and points at the account settings', async () => {
    respond(JSON.stringify({ success: false, message: 'Authentication failed!' }))
    expect(await selfSpot()).toBe(false)
    expect(alerted()).toMatch(/Authentication failed!.*Settings › Accounts & Services › ParksnPeaks/)
  })

  // The site's firewall answers 403 with a page of its own; the login was never looked at.
  it('a bare 403 is not blamed on the login', async () => {
    respond('<html>Attention Required! | Cloudflare</html>', 403)
    expect(await selfSpot()).toBe(false)
    expect(alerted()).toMatch(/HTTP 403/)
    expect(alerted()).not.toMatch(/Settings/)
  })

  it('a refusal of the spot itself shows the service reason', async () => {
    respond(JSON.stringify({ success: false, message: 'Unknown reference VKFF-9999' }))
    expect(await selfSpot()).toBe(false)
    expect(alerted()).toBe('Unknown reference VKFF-9999')
  })

  // These may each follow a spot that DID land, so the operator is told to look
  // before posting again rather than inviting a duplicate.
  it('an HTTP error, an unreadable answer or no answer at all is no confirmation', async () => {
    respond(JSON.stringify({ success: true }), 500)
    expect(await selfSpot()).toBe(false)
    expect(alerted()).toMatch(/HTTP 500[\s\S]*check before posting again/)

    Alert.alert.mockClear()
    respond(JSON.stringify([]))
    expect(await selfSpot()).toBe(false)
    expect(alerted()).toMatch(/could not be read[\s\S]*check before posting again/)

    Alert.alert.mockClear()
    respond('')
    global.fetch = jest.fn(async () => { throw new Error('Network request failed') })
    expect(await selfSpot()).toBe(false)
    expect(alerted()).toMatch(/No answer.*Network request failed[\s\S]*check before posting again/)
  })

  it('any 2xx carrying success is a spot that landed', async () => {
    respond(JSON.stringify({ success: true, message: 'Spot created' }), 201)
    expect(await selfSpot()).toBe(true)
    expect(Alert.alert).not.toHaveBeenCalled()
  })
})
