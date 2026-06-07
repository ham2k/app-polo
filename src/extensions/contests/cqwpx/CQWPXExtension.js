/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber } from '@ham2k/lib-format-tools'
import { findRef, replaceRef } from '@ham2k/lib-qson-tools'

import { H2kTextInput } from '../../../ui/index.js'
import { setOperationData } from '../../../store/operations'

import { ActivityOptions } from './CQWPXActivityOptions'

export const Info = {
  key: 'cqwpx',
  icon: 'flag-checkered',
  name: 'CQ WPX Contest (Beta)',
  shortName: 'CQ WPX'
}

const Extension = {
  ...Info,
  category: 'contests',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler })
  }
}

export default Extension

const ActivityHook = {
  ...Info,
  Options: ActivityOptions,

  standardExchangeFields: { state: false, grid: false },

  mainExchangeForOperation,
  prepareNewQSO,
  processQSOBeforeSaveWithDispatch
}

const ReferenceHandler = {
  ...Info,

  descriptionPlaceholder: '',
  description: (operation) => {
    const ref = findRef(operation, Info.key)
    return ['CQ WPX', ref.mode].filter(Boolean).join(' ')
  },

  suggestOperationTitle: ({ ref }) => {
    return { for: ['CQ WPX', ref.mode].filter(Boolean).join(' ') }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref?.type === Info?.key) {
      return [{
        format: 'adif',
        exportType: 'contest-adif',
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}',
        templateData: { handlerShortName: ref.contestIdentifier, handlerName: ref.contestIdentifier }
      },
      {
        format: 'cabrillo',
        exportType: 'generic-cabrillo',
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}',
        templateData: { handlerShortName: ref.contestIdentifier, handlerName: ref.contestIdentifier }
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const ref = findRef(operation, Info.key)
    const qsoRef = findRef(qso, Info.key)

    if (ref?.mode) {
      const fields = [
        { CONTEST_ID: `CQ-WPX-${ref.mode}` },

        { STX: qsoRef?.ourNumber },
        { SRX: qsoRef?.theirNumber }
      ]

      return fields
    }
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)

    headers.push(['CONTEST', `CQ-WPX-${ref.mode}`])
    headers.push(['CALLSIGN', operation.stationCall || settings.operatorCall])
    headers.push(['NAME', ''])
    if (operation.local?.operatorCall) headers.push(['OPERATORS', operation.local.operatorCall])
    if (operation.grid) headers.push(['GRID-LOCATOR', operation.grid])
    return headers
  },

  qsoToCabrilloParts: ({ qso, ref, operation, settings }) => {
    const qsoRef = findRef(qso, Info.key)

    const ourCall = operation.stationCall || settings.operatorCall

    const rows = [
      [
        (ourCall ?? '-'),
        (qso?.mode === 'CW' || qso?.mode === 'RTTY' ? settings?.defaultReportCW || '599' : settings?.defaultReport || '59'),
        (qsoRef?.ourNumber || '0'),
        (qso?.their?.call || '-'),
        (qso?.mode === 'CW' || qso?.mode === 'RTTY' ? settings?.defaultReportCW || '599' : settings?.defaultReport || '59'),
        (qsoRef?.theirNumber || '0')
      ]
    ]

    return rows
  },

  relevantInfoForQSOItem: ({ qso, operation }) => {
    const qsoRef = findRef(qso, Info.key)
    if (qsoRef) {
      return [qsoRef?.ourNumber, qsoRef?.theirNumber]
    }
  },

  scoringForQSO: ({ qso, qsos, score, operation, ref, ourInfo }) => {
    const { band, key, startAtMillis } = qso
    // console.log('scoringForQSO?', qso, ref, score)
    const qsoScoring = {
      type: Info.key,
      value: 1,
      mult: undefined,
      band,
      notices: [],
      alerts: []
    }

    if (ref.mode === 'CW' || ref.mode === 'RTTY') {
      if (qso.mode !== 'CW' && qso.mode !== 'RTTY') {
        qsoScoring.value = 0
        qsoScoring.alerts.push('invalidMode')
        return qsoScoring
      }
    } else if (ref.mode === 'SSB') {
      if (qso.mode !== 'SSB' && qso.mode !== 'USB' && qso.mode !== 'LSB') {
        qsoScoring.value = 0
        qsoScoring.alerts.push('invalidMode')
        return qsoScoring
      }
    }

    /*
     * B. QSO Points: A station may be worked once on each band for QSO point credit:
     * 1. Contacts between stations on different continents are worth three (3) points on 28, 21,
     *    and 14 MHz and six (6) points on 7, 3.5, and 1.8 MHz.
     * 2. Contacts between stations on the same continent, but different countries,
     *    are worth one (1) point on 28, 21, and 14 MHz and two (2) points on 7, 3.5,
     *    and 1.8 MHz. Exception: For North American stations only—contacts between stations
     *    within the North American boundaries (both stations must be located in North America)
     *    are worth two (2) points on 28, 21, and 14 MHz and four (4) points on 7, 3.5, and 1.8 MHz.
     * 3. Contacts between stations in the same country are worth 1 point regardless of band.
     */

    const ourContinent = ourInfo?.continent ?? qso?.our?.guess?.continent
    const theirContinent = qso?.their?.continent ?? qso?.their?.guess?.continent
    // console.log('-- continent', ourContinent, theirContinent)
    if (ourContinent && theirContinent) {
      if (ourContinent !== theirContinent) qsoScoring.value = 3
      else if (ourContinent === 'NA' && theirContinent === 'NA') qsoScoring.value = 2
      else {
        const ourDXCC = ourInfo?.dxccCode ?? ourInfo?.dxccCode
        const theirDXCC = qso?.their?.dxccCode ?? qso?.their?.guess?.dxccCode
        // console.log('-- dxcc', ourDXCC, theirDXCC)
        if (ourDXCC && theirDXCC && ourDXCC !== theirDXCC) qsoScoring.value = 2
      }
    }

    if (band === '160m' || band === '80m' || band === '40m') qsoScoring.value = qsoScoring.value * 2
    else if (band !== '20m' && band !== '15m' && band !== '10m') {
      qsoScoring.alerts.push('invalidBand')
      qsoScoring.value = 0
      return qsoScoring
    }

    qsoScoring.mult = qso?.their?.extendedPrefix ?? qso?.their?.guess?.extendedPrefix ?? qso?.their?.prefix ?? qso?.their?.guess?.prefix
    const lastChar = qsoScoring.mult ? qsoScoring.mult[qsoScoring.mult.length - 1] : undefined
    if (lastChar && !lastChar.match(/[0-9]/)) {
      qsoScoring.mult = `${qsoScoring.mult}0`
    }

    if (qsoScoring.mult && (!score?.mults || !score.mults[qsoScoring.mult])) {
      qsoScoring.notices.push('newMult')
      qsoScoring.notices.push(qsoScoring.mult)
    }

    const nearDupes = qsos.filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.key !== key)

    if (nearDupes.length !== 0) {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      if (sameBand) {
        qsoScoring.value = 0
        qsoScoring.alerts.push('duplicate')
      } else {
        qsoScoring.notices.push('newBand')
      }
    }
    // console.log('-- qsoScoring', qsoScoring)
    return qsoScoring
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, ref }) => {
    if (!qsoScore.value) return score

    if (!score?.key) score = undefined // Reset if score doesn't have the right shape
    score = score ?? {
      key: ref?.type,
      icon: Info.icon,
      label: Info.shortName,
      total: 0,
      qsoCount: 0,
      qsoPoints: 0,
      bands: {},
      bandPoints: {},
      mults: {},
      bandMults: {}
    }

    score.qsoCount = score.qsoCount + 1
    score.qsoPoints = score.qsoPoints + qsoScore.value

    score.bands[qsoScore.band] = (score.bands[qsoScore.band] || 0) + 1
    score.bandPoints[qsoScore.band] = (score.bandPoints[qsoScore.band] || 0) + qsoScore.value

    score.mults[qsoScore.mult] = (score.mults[qsoScore.mult] || 0) + 1
    score.bandMults[qsoScore.band] = score.bandMults[qsoScore.band] || {}
    score.bandMults[qsoScore.band][qsoScore.mult] = (score.bandMults[qsoScore.band][qsoScore.mult] || 0) + 1

    score.total = score.qsoPoints * Object.keys(score.mults).length

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    if (!score.total) {
      score.summary = '0 pts'
      score.longSummary = '0 pts\nNo valid QSOs yet!'
      return score
    }

    score.summary = `×${fmtNumber(Object.keys(score.mults).length)}: ${fmtNumber(score.total)} pts`

    const parts = []
    parts.push(`**${fmtNumber(score.total)} Total Points**`)
    parts.push(`**${fmtNumber(score.qsoPoints)} Points x ${Object.keys(score.mults).length} Mults**`)
    parts.push(
      ['160m', '80m', '40m', '20m', '15m', '10m'].map(band => {
        if (score.bands[band]) {
          return `**${band}**: ${fmtNumber(score.bands[band])} QSOs, ${fmtNumber(score.bandPoints[band])} points, ${Object.keys(score.bandMults[band]).length} mults`
        } else {
          return `**${band}**: -`
        }
      }).filter(x => x).join('\n')
    )
    parts.push('')
    parts.push(`### ${fmtNumber(Object.keys(score.mults).length)} Prefixes`)
    const mults = Object.keys(score.mults).sort()
    const longestMult = Math.max(...mults.map(m => m.length))

    let line = '> '
    mults.forEach(mult => {
      line += `**~~${mult}~~**${mult.length < longestMult ? ' '.repeat(longestMult - mult.length) : ''} `
    })
    parts.push(line)

    score.longSummary = parts.join('\n')
    return score
  }
}

function prepareNewQSO ({ operation, qso }) {
  const opRef = findRef(operation, Info.key)
  if (!opRef) return qso

  const qsoRef = findRef(qso.refs, Info.key) || { type: Info.type }

  qsoRef.ourNumber = String(opRef?.nextNumber || 1)
  qso.refs = replaceRef(qso.refs, Info.key, qsoRef)
  return qso
}

async function processQSOBeforeSaveWithDispatch ({ qso, qsos, operation, dispatch }) {
  const opRef = findRef(operation, Info.key)

  if (opRef) {
    const ref = findRef(qso?.refs, Info.key) || { type: Info.key }

    if (ref.ourNumber || ref.theirNumber) {
      qso.refs = replaceRef(qso.refs, Info.key, ref)
      qso.their.exchange = String(ref.theirNumber ?? '-')
      if (ref.ourNumber) {
        qso.our.exchange = String(ref.ourNumber ?? '-')
        const num = parseInt(ref.ourNumber, 10)
        if (!isNaN(num)) {
          await dispatch(setOperationData({
            uuid: operation.uuid,
            refs: replaceRef(operation.refs, Info.key, {
              ...opRef,
              nextNumber: Math.max(num, (operation.nextNumber || 0)) + 1
            })
          }))
        }
      }
    }
  }
  return qso
}

function mainExchangeForOperation (props) {
  const { qso, operation, updateQSO, styles, disabled, refStack } = props
  const qsoRef = findRef(qso?.refs, Info.key) || { type: Info.key }

  const fields = []

  fields.push(
    <H2kTextInput
      {...props}
      key={`${Info.key}/ourNumber`}
      // innerRef={refStack.shift()}   // Don't use a `ref` so that this input cannot be focused using the space key
      skipFocus={true}
      style={[styles?.text?.numbers, { minWidth: styles.oneSpace * 5.7, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Our #'}
      placeholder={qsoRef?.ourNumber ?? operation?.nextNumber ?? '1'}
      keyboard={'numbers'}
      numeric={true}
      noSpaces={true}
      value={qsoRef?.ourNumber ?? operation?.nextNumber ?? '1'}
      disabled={disabled}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...qsoRef, ourNumber: text })
      })}
    />
  )

  fields.push(
    <H2kTextInput
      {...props}
      key={`${Info.key}/theirNumber`}
      innerRef={refStack.shift()}
      style={[styles?.text?.numbers, { minWidth: styles.oneSpace * 5.7, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Their #'}
      placeholder={qsoRef?.theirNumber ?? ''}
      keyboard={'numbers'}
      numeric={true}
      noSpaces={true}
      value={qsoRef?.theirNumber ?? ''}
      disabled={disabled}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...qsoRef, theirNumber: text })
      })}
    />
  )

  return fields
}
