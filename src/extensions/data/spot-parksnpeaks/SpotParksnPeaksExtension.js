// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { Alert } from 'react-native'

import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'

import { reportError } from '../../../distro'
import GLOBAL from '../../../GLOBAL'
import packageJson from '../../../../package.json'

import { PnPAccountSetting } from './PnPAccountSetting'

import { Info as SiOTAInfo } from '../../activities/siota/SiOTAInfo'
import { Info as WWFFInfo } from '../../activities/wwff/WWFFInfo'

export const Info = {
  key: 'parksnpeaks',
  icon: 'forest-outline',
  name: 'ParksnPeaks Spots',
  description: 'ParksnPeaks spotting service (VK and ZL mostly)'
}

const Extension = {
  ...Info,
  category: 'lookup',
  onActivation: ({ registerHook }) => {
    registerHook('spots', { hook: SpotsHook })
    registerHook('setting', {
      hook: {
        key: 'pnp-account',
        category: 'account',
        SettingItem: PnPAccountSetting
      }
    })
  }
}
export default Extension

const API_BASE = 'https://www.parksnpeaks.org/api'

// The service is told only the reference and works out the award from it.
const SELF_SPOT_TYPES = ['siotaActivation', 'wwffActivation']

// What a QSO carries: a logged contact with a park has `wwff`, never `wwffActivation`.
const OTHER_SPOT_TYPES = ['siota', 'wwff']

// Keyed UPPER-CASED and matched without regard to case: the October 2026 site
// publishes 'SIOTA' where the old one published 'SiOTA'.
const INBOUND_SPOT_TYPES = {
  SIOTA: 'siota',
  WWFF: 'wwff'
}

const INBOUND_SPOT_ICONS = {
  SIOTA: SiOTAInfo.icon,
  WWFF: WWFFInfo.icon
}

const CACHE = {}

const SpotsHook = {
  ...Info,
  sourceName: 'ParksnPeaks',

  isSelfSpotEnabled: ({ operation, settings }) => {
    return settings?.accounts?.parksnpeaks?.apiKey && operation.refs.some((ref) => SELF_SPOT_TYPES.includes(ref.type))
  },

  isOtherSpotEnabled: ({ qso, settings }) => {
    return settings?.accounts?.parksnpeaks?.apiKey && qso.refs.some((ref) => OTHER_SPOT_TYPES.includes(ref.type))
  },

  postSelfSpot: ({ t, operation, vfo, comments }) => async (dispatch, getState) => {
    if (GLOBAL?.flags?.services?.parksnpeaks === false) return false

    const state = getState()

    let activatorCallsign = operation.stationCall || state.settings.operatorCall
    if (operation.local?.isMultiStation) {
      activatorCallsign = `${activatorCallsign}/OP${operation.local.multiIdentifier ?? '0'}`
    }

    const refs = operation.refs.filter((ref) => SELF_SPOT_TYPES.includes(ref.type) && ref.ref).map((ref) => ref.ref)
    if (refs.length === 0 || !vfo?.freq) return false

    return postSpotToPnP({ t, state, activator: activatorCallsign, spotter: activatorCallsign, refs, freq: vfo.freq, mode: vfo.mode, comments })
  },
  postOtherSpot: ({ t, comments, qso, spotterCall }) => async (dispatch, getState) => {
    if (GLOBAL?.flags?.services?.parksnpeaks === false) return false

    const state = getState()

    const refs = qso.refs.filter((ref) => OTHER_SPOT_TYPES.includes(ref.type) && ref.ref).map((ref) => ref.ref)
    if (refs.length === 0 || !qso.freq || !qso.their?.call) return false

    return postSpotToPnP({ t, state, activator: qso.their.call, spotter: spotterCall, refs, freq: qso.freq, mode: qso.mode, comments })
  },
  fetchSpots: async ({ online, settings, dispatch }) => {
    if (GLOBAL?.flags?.services?.parksnpeaks === false) return []

    let spots = []
    if (online) {
      // Oceania only: the feed is otherwise worldwide, hundreds of rows of
      // mostly US POTA. `continent` is not in the published API docs, but the
      // service honours it.
      const response = await fetch(`${API_BASE}/ALL?continent=OC`, {
        method: 'GET',
        headers: {
          'User-Agent': `Ham2K Portable Logger/${packageJson.version}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0'
        }
      })
      spots = await response.json()
      CACHE.spots = [...spots]
    } else {
      spots = [...CACHE.spots]
    }

    const qsos = []
    for (const spot of spots) {
      const spotClass = (spot.actClass || '').toUpperCase()
      if (!INBOUND_SPOT_TYPES[spotClass]) continue

      const spotTime = Date.parse(spot.actTime + 'Z')
      const freq = parseFloat(spot.actFreq) * 1000
      const qso = {
        their: { call: spot.actCallsign.toUpperCase().trim() },
        freq,
        band: freq ? bandForFrequency(freq) : 'other',
        mode: spot.actMode?.toUpperCase() || (freq ? modeForFrequency(freq, { ituRegion: 3, countryCode: 'AU', entityPrefix: 'VK' }) : 'SSB'),
        refs: [{
          ref: spot.actSiteID,
          type: INBOUND_SPOT_TYPES[spotClass]
        }],
        spot: {
          timeInMillis: spotTime,
          source: Info.key,
          icon: INBOUND_SPOT_ICONS[spotClass] || Info.icon,
          label: `${spot.actSiteID}: ${spot?.actLocation || ''}`,
          sourceInfo: {
            comments: spot.actComments,
            spotter: spot.actSpoter.toUpperCase().trim()
          }
        }
      }
      qsos.push(qso)
    }

    const dedupedQSOs = []
    const includedCalls = {}
    for (const qso of qsos) {
      if (!includedCalls[qso.their.call]) {
        includedCalls[qso.their.call] = true
        dedupedQSOs.push(qso)
      }
    }

    return dedupedQSOs
  }
}

// The service answers `{ success, message }`, with HTTP 200 for a rejected spot
// too. Undefined for any answer not of that shape.
function verdictOf (body) {
  try {
    const parsed = JSON.parse(body ?? '')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || typeof parsed.success !== 'boolean') return undefined
    const message = typeof parsed.message === 'string' && parsed.message.trim() ? parsed.message.trim() : undefined
    return { success: parsed.success, message }
  } catch (error) {
    return undefined
  }
}

// A refusal of the LOGIN rather than of the spot, as the service words it ('Authentication failed!').
const AUTH_REFUSAL = /authenticat|authori[sz]|credential|api ?key|\bpin\b|password|login/i

// One spot carrying every reference, comma-joined, as ZLOTA spotting posts to this same service.
async function postSpotToPnP ({ t, state, activator, spotter, refs, freq, mode, comments }) {
  const account = state.settings?.accounts?.parksnpeaks
  const refList = refs.join(', ')
  const errorTitle = t('extensions.spots.parksnpeaks.postSpotAPI.error', 'Error posting spot to ParksnPeaks')
  const checkFirst = t('extensions.spots.parksnpeaks.postSpotAPI.checkFirst', 'If the spot went out it is on the ParksnPeaks spot list, so check before posting again.')

  const formData = new FormData()
  formData.append('userID', account?.userId ?? '')
  formData.append('APIKey', account?.apiKey ?? '')
  formData.append('activator', activator)
  // The login IS a callsign on this service, so it stands in when there is no spotter.
  formData.append('spotter', spotter || account?.userId || '')
  formData.append('reference', refs.join(','))
  // kHz: the October 2026 site takes kHz where the old one took MHz.
  formData.append('frequency', String(Math.round(freq * 10) / 10))
  formData.append('mode', mode || '')
  formData.append('comments', comments || '')
  // Without it the service adds every reference containing these, so a silo
  // in a park becomes a park activation the operator never claimed.
  formData.append('do_not_lookup', 'true')

  let response
  let body
  try {
    response = await fetch(`${API_BASE}/spots`, {
      method: 'POST',
      headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}`, Accept: 'application/json' },
      body: formData
    })
    body = await response.text()
  } catch (error) {
    // Not proof the spot never went out: a request can fail after it was sent.
    console.error('PnP js error', error)
    Alert.alert(errorTitle, `${t('extensions.spots.parksnpeaks.postSpotAPI.noAnswer', 'No answer from ParksnPeaks for {{refs}}: {{error}}', { refs: refList, error: error.message })}\n\n${checkFirst}`)
    reportError('Error posting spot to ParksnPeaks', error)
    return false
  }

  // Only the service's own JSON verdict is a refusal; an HTTP error or an
  // answer that cannot be read may follow a spot that DID land, so those say so
  // rather than inviting a duplicate.
  const verdict = verdictOf(body)
  const answered = response.status >= 200 && response.status < 300
  if (answered && verdict?.success) return true

  console.error('PnP api error', response.status, body)
  if (response.status === 401 || (verdict?.success === false && AUTH_REFUSAL.test(verdict.message ?? ''))) {
    Alert.alert(errorTitle, t('extensions.spots.parksnpeaks.postSpotAPI.loginRefused', 'ParksnPeaks refused the login ({{reason}}). Check your callsign and API key or PIN in Settings › Accounts & Services › ParksnPeaks.', { reason: verdict?.message ?? `HTTP ${response.status}` }))
  } else if (!answered) {
    const reason = verdict?.message ? ` (${verdict.message})` : ''
    Alert.alert(errorTitle, `${t('extensions.spots.parksnpeaks.postSpotAPI.httpError', 'ParksnPeaks answered HTTP {{status}} for {{refs}}', { status: response.status, refs: refList })}${reason}\n\n${checkFirst}`)
  } else if (!verdict) {
    Alert.alert(errorTitle, `${t('extensions.spots.parksnpeaks.postSpotAPI.unreadable', 'ParksnPeaks gave an answer that could not be read for {{refs}}', { refs: refList })}\n\n${checkFirst}`)
  } else {
    Alert.alert(errorTitle, verdict.message ?? t('extensions.spots.parksnpeaks.postSpotAPI.rejected', 'ParksnPeaks rejected the spot for {{refs}}', { refs: refList }))
  }
  return false
}
