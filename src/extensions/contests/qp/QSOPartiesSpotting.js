/*
 * Copyright ©️ 2025-2026 Sebastian Delmont <sd@ham2k.com>, 2025 Phillip Kessels <dl9pk@darc.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import base64 from 'react-native-quick-base64'

import { gridToLocation, latitudeInMinutes, longitudeInMinutes } from '@ham2k/lib-geo-tools'
import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'
import { fmtFreq, parseFreq } from '@ham2k/lib-format-tools'
import { findRef } from '@ham2k/lib-qson-tools'

import GLOBAL from '../../../GLOBAL'
import packageJson from '../../../../package.json'
import { fetchWithTimeout } from '../../../tools/fetchWithTimeout'

import { qpData, qpParseLocations } from './QSOPartiesExtension'
import { Info } from './QSOPartiesInfo'

const DEBUG = false

const APRS_SERVER = 'https://ametx.com:8888'
const MOBILE_TRACKER_SERVER = 'https://mobiletracker.stateqso.com'

// const PARTY_HUB_SERVER = 'http://qsopartyhub.com'
const PARTY_HUB_SERVER = 'https://test.lofi.ham2k.net/ham2k-proxy/qsopartyhub'

export const QSOPartiesPostSelfSpot = ({ operation, vfo, settings, comments }) => async (_dispatch, getState) => {
  const opRef = findRef(operation, Info.key)
  const qp = qpData({ ref: opRef })
  const counties = qpParseLocations({ qp, location: opRef?.location, qso: {} })

  // console.log('QP Self Spotting', { opRef, operation })

  if (opRef?.spotToQPHub) {
    let call = operation.stationCall

    if (operation.local?.isMultiStation) {
      call = `${call}/M${operation.local.multiIdentifier ?? '0'}`
    }

    // console.log('-- spot to QP Hub')

    const page = `${(qp?.qsoPartyHubName ?? qp?.short).toLowerCase()}-spots.php`
    const url = `${PARTY_HUB_SERVER}/${page}`

    const form = new FormData()
    form.append('station', call ?? '?')
    form.append('frequency', fmtFreq(vfo.freq) || '00')
    form.append('county', counties?.[0]?.location || '')
    form.append('comment', [
      counties?.length > 1 ? counties?.map(county => county.location)?.join('/') : '',
      comments,
      '[via Ham2K]'
    ].filter(x => x).join(' '))
    form.append('poster', operation?.local?.operatorCall || settings?.operatorCall || '')

    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
        },
        body: form
      })

      if (response.ok) {
        await response.text()
      } else {
        console.log('Error reporting data:', response)
        await response.text()
      }
    } catch (error) {
      console.log('Error reporting data:', error)
    }
  }

  if (opRef?.spotToAPRS && operation?.grid) {
    let call = operation.stationCall

    if (operation.local?.isMultiStation) {
      call = `${call}-${operation.local.multiIdentifier ?? '0'}`
    }

    console.log('-- spot to APRS')

    // See https://www.aprs-is.net/SendOnlyPorts.aspx and https://ham.packet-radio.net/packet/aprs-wb2osz/Understanding-APRS-Packets.pdf

    const header = `user ${call} pass ${_aprsPasscodeForCall(call)} vers Ham2K-PoLo ${packageJson?.version}`
    const message = `${qp.aprsShort ?? qp.short} ${fmtFreq(vfo.freq)} ${counties?.map(county => county.location)?.join('/')}`

    let command
    if (operation?.grid) {
      const [latitude, longitude] = gridToLocation(operation.grid)
      const latInfo = latitudeInMinutes(latitude)
      const lonInfo = longitudeInMinutes(longitude)
      command = [
        '!',
        latInfo.degrees.toString().padStart(2, '0'),
        latInfo.fractionalMinutes.toFixed(2).toString().padStart(5, '0'),
        latInfo.direction,
        '/',
        lonInfo.degrees.toString().padStart(3, '0'),
        lonInfo.fractionalMinutes.toFixed(2).toString().padStart(5, '0'),
        lonInfo.direction,
        '(', // Symbol for car with antenna
        message
      ].join('')
    } else {
      command = `:${message}`
    }

    // console.log('-- command', command)

    try {
      await fetchWithTimeout(APRS_SERVER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Accept-Type': 'text/plain',
          'User-Agent': `Ham2K Portable Logger/${packageJson.version}`,
          Authorization: `APRS-IS ${base64.encode(header)}`
        },
        body: `${call}>APRS,TCPIP*:${command}`
      })
    } catch (error) {
      console.log('Error reporting data:', error)
      return false
    }
  }
  return true
}

export const SpotsHook = {
  ...Info,
  sourceName: 'QSO Parties',

  sourceNameForRef: ({ ref, operation }) => {
    const qp = qpData({ ref })

    return qp.short ?? qp.name ?? 'QSO Party'
  },

  fetchSpots: async ({ online, settings, dispatch, operation }) => {
    const ref = findRef(operation, Info.activationType)
    const qp = qpData({ ref })

    const spots = []

    const now = new Date()

    if (online && GLOBAL?.flags?.services?.qpmobiletracker !== false) {
      if (DEBUG) console.log('Fetching Mobile Tracker Spots', qp)

      try {
        const response = await fetchWithTimeout(`${MOBILE_TRACKER_SERVER}/stations.geojson`, {
          'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
        })

        if (response.ok) {
          const data = await response.json()
          if (DEBUG) console.log('-- Data', data)
          const rawSpots = data.features.map(feature => {
            const { properties } = feature
            const { call, frequency, text, countyCode } = properties ?? {}
            const cleanText = text.replace(/^${qp.short} [\d.]+/, '')
            return {
              their: { call },
              freq: parseFloat(frequency) * 1000,
              band: bandForFrequency(parseFloat(frequency) * 1000),
              mode: modeForFrequency(parseFloat(frequency) * 1000, { ituRegion: 2 }),
              refs: [{ type: Info.activationType, location: countyCode }],
              spot: {
                timeInMillis: now.getTime(),
                source: Info.key,
                subSource: `${Info.key}/mobiletracker`,
                icon: Info.icon,
                label: `${qp.short}: ${[countyCode, cleanText].filter(x => x).join(' • ')}`,
                sourceInfo: {
                  source: 'Mobile Tracker',
                  comments: text,
                  spotter: call
                }
              }
            }
          })
          const includedSpots = {}
          rawSpots.sort((a, b) => a.spot.timeInMillis - b.spot.timeInMillis).forEach(spot => {
            if (!includedSpots[spot.their.call]) {
              includedSpots[spot.their.call] = spot
              spots.push(spot)
            }
          })
          if (DEBUG) console.log('-- Spots', spots)
        }
      } catch (error) {
        if (DEBUG) console.log('Error fetching Mobile Tracker Spots', error)
      }
    }

    if (online && GLOBAL?.flags?.services?.qphub !== false) {
      const url = `${PARTY_HUB_SERVER}/${(qp?.qsoPartyHubName ?? qp?.short).toLowerCase()}-table.php`

      try {
        if (DEBUG) console.log('Fetching QP Hub Spots', url)

        const response = await fetchWithTimeout(url, {
          'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
        })

        if (response.ok) {
          const body = await response.text()
          if (DEBUG) console.log('-- Body', body)
          const table = body.match(/<table id=spots>(.*?)<\/table>/m)?.[1] ?? ''
          if (DEBUG) console.log('-- Table', table)
          const rows = table.match(/<tr[^>]*>.*?<\/tr>/gs) || []
          rows.shift() // Remove header row
          if (DEBUG) console.log('-- Rows', rows)

          const calls = {}
          for (const row of rows) {
            const cells = row.match(/<td>(.*?)<\/td>/gs).map(cell => cell.replace(/<[^>]*>?/g, ''))

            const freq = parseFreq(cells[2])

            const spot = ({
              their: { call: cells[1] },
              freq,
              band: bandForFrequency(freq),
              mode: modeForFrequency(freq, { ituRegion: 2 }),
              refs: [{ type: Info.activationType, location: cells[3] }],
              spot: {
                timeInMillis: Date.parse(cells[0] + 'Z') ?? now,
                source: Info.key,
                subSource: `${Info.key}/qsopartyhub`,
                icon: Info.icon,
                label: `${qp.short}: ${[cells[3], cells[4]].filter(x => x).join(' • ')}`,
                sourceInfo: {
                  source: 'QP Hub',
                  comments: cells[4],
                  spotter: cells[5]
                }
              }
            })
            if (!spot.their.call) continue
            if (!spot.freq) continue
            if (!spot.spot.timeInMillis) continue
            if (!calls[spot.their.call] || spot.spot.timeInMillis > calls[spot.their.call].spot.timeInMillis) {
              calls[spot.their.call] = spot
            }
          }
          if (DEBUG) console.log('-- Calls', calls)
          spots.push(...Object.values(calls))
        }
      } catch (error) {
        console.error('Error fetching QP Hub Spots', url, error)
      }
    }

    return spots
  }
}

function _aprsPasscodeForCall (call) {
  call = call.toUpperCase()
  call = call.split('-')[0]
  let passcode = 29666
  for (let index = 0; index < call.length; index += 2) {
    passcode = passcode ^ call.charCodeAt(index) * 256
    passcode = passcode ^ call.charCodeAt(index + 1)
  }
  passcode = passcode & 32767
  return passcode
}
