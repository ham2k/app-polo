// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { fmtCabrilloDate, fmtCabrilloTime } from '@ham2k/lib-format-tools'
import { EHF_BANDS, SHF_BANDS, UHF_BANDS, VHF_BANDS } from '@ham2k/lib-operation-data'
import { findRef } from '@ham2k/lib-qson-tools'

import packageJson from '../../package.json'
import { refsForSegment } from './segmentRefs'

export function qsonToCabrillo ({ operation, qsos, settings, handler, combineSegmentRefs }) {
  let ref = findRef(operation, handler.key)

  let str = ''

  str += 'START-OF-LOG: 3.0\n'
  str += `CREATED-BY: Ham2K Portable Logger ${packageJson?.version ?? ''}\n`
  if (handler.cabrilloHeaders) {
    str += handler
      .cabrilloHeaders({ operation, settings, headers: [] })
      .map((header) => header[1] ? `${header[0]}: ${header[1]}` : '')
      .filter(x => x)
      .join('\n') + '\n'
  }

  for (const qso of qsos) {
    if (qso.deleted) continue
    if (qso.event) {
      if (qso.event.event === 'break' || qso.event.event === 'start') {
        const refs = refsForSegment({ refs: operation.refs, segmentRefs: qso.event.operation?.refs, combineSegmentRefs })
        operation = { ...operation, ...qso.event.operation, refs }
        ref = findRef(operation, handler.key)
      }
      continue
    }

    let combinations = handler.qsoToCabrilloParts && handler.qsoToCabrilloParts({ qso, operation, ref, settings })
    if (!Array.isArray(combinations?.[0])) {
      combinations = [combinations]
    }
    combinations.forEach(parts => {
      str += 'QSO: '
      str += cabrilloFreq(qso).padEnd(5, ' ') + ' '
      str += cabrilloMode(qso).padEnd(2, ' ') + ' '
      str += fmtCabrilloDate(qso?.startAtMillis ?? qso?.endAtMillis).padEnd(10, ' ') + ' '
      str += fmtCabrilloTime(qso?.startAtMillis ?? qso?.endAtMillis).padEnd(4, ' ') + ' '
      str += parts.join(' ') + '\n'
    })
  }

  str += 'END-OF-LOG:\n'
  return str
}

const DEFAULT_FREQUENCIES_PER_BAND = {
  '160m': '1800',
  '80m': '3500',
  '60m': '5332', // Not a Cabrillo Standard
  '30m': '10100', // Not a Cabrillo Standard
  '40m': '7000',
  '20m': '14000',
  '17m': '18068', // Not a Cabrillo Standard
  '15m': '21000',
  '12m': '24890', // Not a Cabrillo Standard
  '10m': '28000',
  '6m': '50',
  '5m': '60', // Not a Cabrillo Standard
  '4m': '70',
  '2m': '144',
  '1.25m': '222',
  '70cm': '432',
  '33cm': '902',
  '23cm': '1.2G',
  '13cm': '2.3G',
  '9cm': '3.4G',
  '6cm': '5.7G',
  '3cm': '10G',
  '1.25cm': '24G',
  '6mm': '47G',
  '4mm': '75G',
  '2.5mm': '122G',
  '2mm': '134G',
  '1mm': '241G',
  submm: 'LIGHT'
}

const BANDS_REPORTED_AS_IDENTIFIERS = new Set([...VHF_BANDS, ...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS])

// VHF+ Cabrillo logs use specific values per band; HF logs use kHz.
// The band decides, not the frequency: microwave operators often log '10368.1' meaning MHz,
// and a magnitude test would report that as an HF frequency instead of '10G'.
function cabrilloFreq (qso) {
  if (BANDS_REPORTED_AS_IDENTIFIERS.has(qso.band)) return DEFAULT_FREQUENCIES_PER_BAND[qso.band] ?? '0'
  if (qso.freq) return `${Math.round(qso.freq)}`
  return DEFAULT_FREQUENCIES_PER_BAND[qso.band] ?? '0'
}

function cabrilloMode (qso) {
  if (qso?.mode === 'SSB') return 'PH'
  else if (qso?.mode === 'USB') return 'PH'
  else if (qso?.mode === 'LSB') return 'PH'
  else if (qso?.mode === 'AM') return 'PH'
  else if (qso?.mode === 'FM') return 'PH'
  else if (qso?.mode === 'CW') return 'CW'
  else return 'DG'
}
