/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// See https://discord.com/developers/docs/resources/webhook#execute-webhook

import { Alert } from 'react-native'

import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'

import { reportError } from '../../../distro'
import GLOBAL from '../../../GLOBAL'
import packageJson from '../../../../package.json'

import { findRef } from '../../../tools/refTools'
import { fmtFreqInMHz } from '../../../tools/frequencyFormats'

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
  category: 'devmode',
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

const OUTBOUND_SPOT_TYPES = {
  'siotaActivation': 'SiOTA',
  'wwffActivation': 'WWFF',
}

const INBOUND_SPOT_TYPES = {
  'SiOTA': 'siota',
  'WWFF': 'wwff'
}

const INBOUND_SPOT_ICONS = {
  'SiOTA': SiOTAInfo.icon,
  'WWFF': WWFFInfo.icon
}

const CACHE = {}

const SpotsHook = {
  ...Info,
  sourceName: 'ParksnPeaks',

  isSelfSpotEnabled: ({ operation, settings }) => {
    return settings?.accounts?.parksnpeaks?.apiKey && operation.refs.some((ref) => OUTBOUND_SPOT_TYPES[ref.type])
  },

  isOtherSpotEnabled: ({ qso, settings }) => {
    return settings?.accounts?.parksnpeaks?.apiKey && qso.refs.some((ref) => OUTBOUND_SPOT_TYPES[ref.type])
  },

  postSelfSpot: ({ t, operation, vfo, comments }) => async (dispatch, getState) => {
    if (GLOBAL?.flags?.services?.parksnpeaks === false) return false

    const state = getState()

    let activatorCallsign = operation.stationCall || state.settings.operatorCall
    if (operation.local?.isMultiStation) {
      activatorCallsign = `${activatorCallsign}/M${operation.local.multiIdentifier ?? "0"}`
    }

    for (const ref of operation.refs) {
      if (OUTBOUND_SPOT_TYPES[ref.type]) {
        try {
          const response = await fetch('https://www.parksnpeaks.org/api/spot', {
            method: 'POST',
            headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` },
            body: JSON.stringify({
              actCallsign: activatorCallsign,
              actClass: OUTBOUND_SPOT_TYPES[ref.type],
              actSite: ref.ref,
              freq: fmtFreqInMHz(vfo.freq, { mode: 'compact' }),
              mode: vfo.mode || null,
              comments,
              userID: state.settings?.accounts?.parksnpeaks?.userId,
              APIKey: state.settings?.accounts?.parksnpeaks?.apiKey
            })
          })
          const body = await response.text()
          if (response.status !== 200 || body.match(/Failure/)) {
            console.error('PnP api error', body)
            Alert.alert(t('extensions.spots.parksnpeaks.postSpotAPI.error', 'Error posting spot to ParksnPeaks'), body)
            return false
          }
        } catch (error) {
          console.error('PnP js error', error)
          Alert.alert(t('extensions.spots.parksnpeaks.postSpotAPI.error', 'Error posting spot to ParksnPeaks'), error.message)
          reportError('Error posting spot to ParksnPeaks', error)
        }
      }
    }
    return true
  },
  postOtherSpot: ({ t, comments, qso, spotterCall }) => async (dispatch, getState) => {
    const state = getState()
    for (const ref of qso.refs) {
      if (OUTBOUND_SPOT_TYPES[ref.type]) {
        try {
          const response = await fetch('https://www.parksnpeaks.org/api/spot', {
            method: 'POST',
            headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` },
            body: JSON.stringify({
              actCallsign: qso.their.call,
              actClass: OUTBOUND_SPOT_TYPES[ref.type],
              actSite: ref.ref,
              freq: fmtFreqInMHz(qso.freq, { mode: 'compact' }),
              mode: qso.mode || null,
              comments,
              userID: state.settings?.accounts?.parksnpeaks?.userId,
              APIKey: state.settings?.accounts?.parksnpeaks?.apiKey
            })
          })
          const body = await response.text()
          if (response.status !== 200 || body.match(/Failure/)) {
            console.error('PnP api error', body)
            Alert.alert(t('extensions.spots.parksnpeaks.postSpotAPI.error', 'Error posting spot to ParksnPeaks'), body)
            return false
          }
        } catch (error) {
          Alert.alert(t('extensions.spots.parksnpeaks.postSpotAPI.error', 'Error posting spot to ParksnPeaks'), error.message)
          reportError('Error posting spot to ParksnPeaks', error)
        }
      }
    }
    return true
  },
  fetchSpots: async ({ online, settings, dispatch }) => {
    if (GLOBAL?.flags?.services?.parksnpeaks === false) return []

    let spots = []
    if (online) {
      const response = await fetch('https://www.parksnpeaks.org/api/ALL', {
        method: 'GET',
        headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` }
      })
      spots = await response.json()
      CACHE.spots = [...spots]
      console.log('PnP Spots', spots)
    } else {
      spots = [...CACHE.spots]
    }

    const qsos = []
    for (const spot of spots) {
      console.log('PnP Spot', spot)

      if (!INBOUND_SPOT_TYPES[spot.actClass]) continue

      const spotTime = Date.parse(spot.actTime + 'Z')
      const freq = parseFloat(spot.actFreq) * 1000
      const qso = {
        their: { call: spot.actCallsign.toUpperCase().trim() },
        freq,
        band: freq ? bandForFrequency(freq) : 'other',
        mode: spot.actMode?.toUpperCase() || (freq ? modeForFrequency(freq, { ituRegion: 3, countryCode: 'AU', entityPrefix: 'VK' }) : 'SSB'),
        refs: [{
          ref: spot.actSiteID,
          type: INBOUND_SPOT_TYPES[spot.actClass]
        }],
        spot: {
          timeInMillis: spotTime,
          source: Info.key,
          icon: INBOUND_SPOT_ICONS[spot.actClass] || Info.icon,
          label: `${spot.actSiteID}: ${spot?.altLocation || 'Unknown Reference'}`,
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
