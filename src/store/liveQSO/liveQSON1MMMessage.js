/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import UUID from 'react-native-uuid'
import { adifModeAndSubmodeForMode, frequencyForBand } from '@ham2k/lib-operation-data'

import { filterRefs } from '../../tools/refTools'
import { sendUDPMessage } from './liveQSOUDPNative'

const DEFAULT_STATION_NAME = 'Ham2K-PoLo'

const N1MM_BANDS = {
  '160m': '1.8',
  '80m': '3.5',
  '60m': '5',
  '40m': '7',
  '30m': '10',
  '20m': '14',
  '17m': '18',
  '15m': '21',
  '12m': '24',
  '10m': '28',
  '6m': '50',
  '4m': '70',
  '2m': '144',
  '70cm': '432',
  '33cm': '902',
  '23cm': '1.2',
  '13cm': '2.3'
}

const XOTA_PROGRAMS = [
  { label: 'POTA', types: ['pota', 'potaActivation'] },
  { label: 'SOTA', types: ['sota', 'sotaActivation'] },
  { label: 'WWFF', types: ['wwff', 'wwffActivation'] },
  { label: 'WWBOTA', types: ['wwbota', 'wwbotaActivation'] },
  { label: 'MOTA', types: ['mota', 'motaActivation'] },
  { label: 'GMA', types: ['gma', 'gmaActivation'] },
  { label: 'WCA', types: ['wcaActivation', 'bcaActivation', 'ecaActivation'] },
  { label: 'TOTA', types: ['tota', 'totaActivation'] }
]

function escapeXML (value) {
  return `${value ?? ''}`
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function formatN1MMTimestamp (date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  const seconds = `${date.getSeconds()}`.padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function buildN1MMContactId (uuid = UUID.v4()) {
  const normalized = `${uuid ?? ''}`.replace(/[^0-9a-f]/gi, '')

  if (normalized.length === 32) {
    return normalized.toUpperCase()
  }

  return `${UUID.v4()}`.replace(/[^0-9a-f]/gi, '').padEnd(32, '0').slice(0, 32).toUpperCase()
}

function xmlTag (name, value) {
  return `\t<${name}>${escapeXML(value)}</${name}>`
}

function compactXMLValue (value) {
  if (value === undefined || value === null) return ''
  return `${value}`.trim()
}

function xmlEntriesToString (entries, { skipEmptyFields = true } = {}) {
  return entries
    .filter(([name, value]) => !skipEmptyFields || compactXMLValue(value) !== '')
    .map(([name, value]) => xmlTag(name, compactXMLValue(value)))
    .join('\n')
}

function n1mmModeForQSO (qso) {
  const [mode] = adifModeAndSubmodeForMode(qso?.mode)
  return mode ?? qso?.mode ?? 'CW'
}

function n1mmFrequencyForQSO (qso) {
  const freq = Number(qso?.freq ?? frequencyForBand(qso?.band, qso?.mode))
  if (!freq) return '1406900'
  return `${Math.round(freq * 100)}`
}

function n1mmBandForQSO (qso) {
  if (qso?.band && N1MM_BANDS[qso.band]) {
    return N1MM_BANDS[qso.band]
  }

  const freq = Number(qso?.freq ?? frequencyForBand(qso?.band, qso?.mode))
  if (!freq) return N1MM_BANDS['20m']
  return `${Math.trunc(freq / 1000)}`
}

function numericExchangeValue (exchange) {
  const compact = compactXMLValue(exchange)
  if (!compact.match(/^\d+$/)) return ''
  return compact
}

function compactRefValues (refs = [], types = []) {
  const uniqueRefs = new Set()

  types.forEach((type) => {
    filterRefs(refs, type).forEach((ref) => {
      if (ref?.ref) uniqueRefs.add(ref.ref)
    })
  })

  return [...uniqueRefs]
}

function formatXOTASummary ({ qso, operation }) {
  const theirSections = XOTA_PROGRAMS
    .map(({ label, types }) => {
      const refs = compactRefValues(qso?.refs, types)
      return refs.length > 0 ? `${label}: ${refs.join(' ')}` : ''
    })
    .filter(Boolean)

  const ourSections = XOTA_PROGRAMS
    .map(({ label, types }) => {
      const refs = compactRefValues(operation?.refs, types)
      return refs.length > 0 ? `${label}: ${refs.join(' ')}` : ''
    })
    .filter(Boolean)

  if (theirSections.length > 0 && ourSections.length > 0) {
    return `${theirSections.join('; ')}; My refs: ${ourSections.join('; ')}`
  }

  if (theirSections.length > 0) {
    return theirSections.join('; ')
  }

  if (ourSections.length > 0) {
    return `My refs: ${ourSections.join('; ')}`
  }

  return ''
}

function buildN1MMComment ({ qso, operation }) {
  const xotaSummary = formatXOTASummary({ qso, operation })
  return [compactXMLValue(qso?.notes), xotaSummary].filter(Boolean).join(' | ')
}

export function buildN1MMContactInfoValuesForQSO ({
  qso,
  operation,
  stationName = DEFAULT_STATION_NAME,
  contestname = 'DX',
  contestnr = '0',
  app = 'PoLo'
}) {
  const date = new Date(qso?.startAtMillis ?? Date.now())
  const timestamp = formatN1MMTimestamp(date)
  const mycall = qso?.our?.call || operation?.stationCall || 'N0CALL'
  const operator = qso?.our?.operatorCall || operation?.local?.operatorCall || mycall
  const call = qso?.their?.call || 'N0CALL'
  const comment = buildN1MMComment({ qso, operation })
  const xotaSummary = formatXOTASummary({ qso, operation })

  return {
    app,
    contestname,
    contestnr,
    timestamp,
    mycall,
    band: n1mmBandForQSO(qso),
    rxfreq: n1mmFrequencyForQSO(qso),
    txfreq: n1mmFrequencyForQSO(qso),
    operator,
    mode: n1mmModeForQSO(qso),
    call,
    countryprefix: qso?.their?.entityPrefix ?? qso?.their?.guess?.entityPrefix,
    wpxprefix: qso?.their?.baseCall ?? qso?.their?.guess?.baseCall,
    stationprefix: mycall,
    continent: qso?.their?.continent ?? qso?.their?.guess?.continent,
    snt: qso?.our?.sent || '599',
    sntnr: numericExchangeValue(qso?.our?.exchange),
    rcv: qso?.their?.sent || '599',
    rcvnr: numericExchangeValue(qso?.their?.exchange),
    gridsquare: qso?.their?.grid ?? qso?.their?.guess?.grid,
    exchangel: qso?.their?.exchange,
    section: qso?.their?.arrlSection,
    comment,
    qth: qso?.their?.city ?? qso?.their?.guess?.city,
    name: qso?.their?.name ?? qso?.their?.guess?.name,
    power: qso?.power,
    misctext: xotaSummary,
    zone: qso?.their?.cqZone ?? qso?.their?.guess?.cqZone,
    prec: '',
    ck: '',
    ismultiplierl: '0',
    ismultiplier2: '0',
    ismultiplier3: '0',
    points: '1',
    radionr: '1',
    run1run2: '1',
    RoverLocation: '',
    RadioInterfaced: '0',
    NetworkedCompNr: '0',
    IsOriginal: 'True',
    NetBiosName: '',
    IsRunQSO: '0',
    StationName: stationName,
    ID: buildN1MMContactId(qso?.uuid),
    IsClaimedQso: '1',
    oldtimestamp: timestamp,
    oldcall: call,
    SentExchange: qso?.our?.exchange
  }
}

export function buildN1MMContactInfoXML (values = {}, options = {}) {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<contactinfo>',
    xmlEntriesToString([
      ['app', values.app ?? 'PoLo'],
      ['contestname', values.contestname ?? 'DX'],
      ['contestnr', values.contestnr ?? '0'],
      ['timestamp', values.timestamp ?? formatN1MMTimestamp()],
      ['mycall', values.mycall ?? 'N0CALL'],
      ['band', values.band ?? '14'],
      ['rxfreq', values.rxfreq ?? '1406900'],
      ['txfreq', values.txfreq ?? values.rxfreq ?? '1406900'],
      ['operator', values.operator ?? values.mycall ?? 'N0CALL'],
      ['mode', values.mode ?? 'CW'],
      ['call', values.call ?? 'N0CALL'],
      ['countryprefix', values.countryprefix],
      ['wpxprefix', values.wpxprefix],
      ['stationprefix', values.stationprefix ?? values.mycall ?? 'N0CALL'],
      ['continent', values.continent],
      ['snt', values.snt ?? '599'],
      ['sntnr', values.sntnr],
      ['rcv', values.rcv ?? '599'],
      ['rcvnr', values.rcvnr],
      ['gridsquare', values.gridsquare],
      ['exchangel', values.exchangel],
      ['section', values.section],
      ['comment', values.comment],
      ['qth', values.qth],
      ['name', values.name],
      ['power', values.power],
      ['misctext', values.misctext],
      ['zone', values.zone],
      ['prec', values.prec],
      ['ck', values.ck],
      ['ismultiplierl', values.ismultiplierl ?? '0'],
      ['ismultiplier2', values.ismultiplier2 ?? '0'],
      ['ismultiplier3', values.ismultiplier3 ?? '0'],
      ['points', values.points ?? '1'],
      ['radionr', values.radionr ?? '1'],
      ['run1run2', values.run1run2 ?? '1'],
      ['RoverLocation', values.RoverLocation],
      ['RadioInterfaced', values.RadioInterfaced ?? '0'],
      ['NetworkedCompNr', values.NetworkedCompNr ?? '0'],
      ['IsOriginal', values.IsOriginal ?? 'True'],
      ['NetBiosName', values.NetBiosName],
      ['IsRunQSO', values.IsRunQSO ?? '0'],
      ['StationName', values.StationName ?? DEFAULT_STATION_NAME],
      ['ID', values.ID ?? buildN1MMContactId()],
      ['IsClaimedQso', values.IsClaimedQso ?? '1'],
      ['oldtimestamp', values.oldtimestamp ?? values.timestamp ?? formatN1MMTimestamp()],
      ['oldcall', values.oldcall ?? values.call ?? 'N0CALL'],
      ['SentExchange', values.SentExchange]
    ], options),
    '</contactinfo>'
  ].join('\n')
}

export function buildN1MMContactInfoXMLForQSO ({
  qso,
  operation,
  skipEmptyFields = true,
  ...options
}) {
  const values = buildN1MMContactInfoValuesForQSO({
    qso,
    operation,
    ...options
  })

  return buildN1MMContactInfoXML(values, { skipEmptyFields })
}

export async function sendLiveQSON1MMTest ({ settings, operatorCall, date = new Date() }) {
  const payload = buildN1MMContactInfoXMLForQSO({
    qso: {
      uuid: UUID.v4(),
      startAtMillis: date.getTime(),
      band: '20m',
      freq: 14069,
      mode: 'CW',
      notes: '',
      their: {
        call: 'N0CALL',
        sent: '599',
        exchange: 'TEST'
      },
      our: {
        call: operatorCall || 'N0CALL',
        operatorCall: operatorCall || 'N0CALL',
        sent: '599'
      }
    },
    operation: {
      refs: []
    },
    skipEmptyFields: settings?.skipEmptyFields !== false
  })

  return sendUDPMessage({
    url: settings?.url,
    payload,
    broadcast: false
  })
}
