// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'

import { fmtNumber } from '@ham2k/lib-format-tools'
import { findRef, replaceRef } from '@ham2k/lib-qson-tools'
import { superModeForMode } from '@ham2k/lib-operation-data'

import { H2kEnhancedTextInput } from '../../../ui/index.js'

import { ActivityOptions } from './IARUHFActivityOptions'

export const Info = {
  key: 'iaru-hf',
  icon: 'earth',
  name: 'IARU HF World Championship (Beta)',
  shortName: 'IARU HF WC'
}

const VALID_BANDS = ['160m', '80m', '40m', '20m', '15m', '10m']
const OFFICIAL_CODES = ['AC', 'R1', 'R2', 'R3']

const Extension = {
  ...Info,
  category: 'contests',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook, priority: 200 }) // Contests get highest priority
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler, priority: 200 }) // Contests get highest priority
  }
}

export default Extension

const ActivityHook = {
  ...Info,
  Options: ActivityOptions,

  standardExchangeFields: { state: false, grid: false },

  mainExchangeForOperation,
  processQSOBeforeSaveWithDispatch
}

const ReferenceHandler = {
  ...Info,

  descriptionPlaceholder: '',
  description: (operation) => {
    const ref = findRef(operation, Info.key)
    return ['IARU HF WC', ref?.modeRestriction && ref.modeRestriction !== 'Mixed' ? ref.modeRestriction : undefined].filter(Boolean).join(' ')
  },

  suggestOperationTitle: ({ ref }) => {
    return { for: ['IARU HF WC', ref?.modeRestriction && ref.modeRestriction !== 'Mixed' ? ref.modeRestriction : undefined].filter(Boolean).join(' ') }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref?.type === Info?.key) {
      return [{
        format: 'adif',
        exportType: 'contest-adif',
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}',
        templateData: { handlerShortName: Info.shortName, handlerName: Info.name }
      },
      {
        format: 'cabrillo',
        exportType: 'generic-cabrillo',
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}',
        templateData: { handlerShortName: Info.shortName, handlerName: Info.name }
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const ref = findRef(operation, Info.key)
    const qsoRef = findRef(qso, Info.key)

    const fields = [
      { CONTEST_ID: 'IARU-HF' },

      { STX_STRING: ourExchangeString(ref) },
      { SRX_STRING: qsoRef?.theirExchange }
    ]

    return fields
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    headers.push(['CONTEST', 'IARU-HF'])
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
        (qso?.mode === 'CW' ? settings?.defaultReportCW || '599' : settings?.defaultReport || '59'),
        (ourExchangeString(ref) || '-'),
        (qso?.their?.call || '-'),
        (qso?.mode === 'CW' ? settings?.defaultReportCW || '599' : settings?.defaultReport || '59'),
        (qsoRef?.theirExchange || '-')
      ]
    ]

    return rows
  },

  relevantInfoForQSOItem: ({ qso }) => {
    const qsoRef = findRef(qso, Info.key)
    if (qsoRef) {
      return [String(qsoRef?.theirExchange ?? '')]
    }
  },

  scoringForQSO: ({ qso, qsos, score, operation, vfo, ref, ourInfo }) => {
    const { band: qsoBand, mode: qsoMode, key, startAtMillis } = qso
    const { band: vfoBand, mode: vfoMode } = vfo ?? {}
    const band = qsoBand ?? vfoBand
    const mode = qsoMode ?? vfoMode

    const qsoScoring = {
      type: Info.key,
      value: 0,
      mult: undefined,
      band,
      notices: [],
      alerts: []
    }

    const superMode = superModeForMode(mode)

    if (ref?.modeRestriction === 'CW' && superMode !== 'CW') {
      qsoScoring.alerts.push('invalidMode')
      return qsoScoring
    } else if (ref?.modeRestriction === 'Phone' && superMode !== 'PHONE') {
      qsoScoring.alerts.push('invalidMode')
      return qsoScoring
    } else if (superMode !== 'CW' && superMode !== 'PHONE') {
      qsoScoring.alerts.push('invalidMode')
      return qsoScoring
    }

    if (!VALID_BANDS.includes(band)) {
      qsoScoring.alerts.push('invalidBand')
      return qsoScoring
    }

    const qsoRef = findRef(qso, Info.key)
    const theirExchange = String(qsoRef?.theirExchange ?? qso?.their?.ituZone ?? qso?.their?.guess?.ituZone ?? '').trim().toUpperCase()

    let theirZone
    let theirHQ
    let theirOfficial
    if (OFFICIAL_CODES.includes(theirExchange)) {
      theirOfficial = theirExchange
    } else if (/^\d+$/.test(theirExchange)) {
      theirZone = String(parseInt(theirExchange, 10))
    } else {
      theirHQ = theirExchange
    }

    if (theirOfficial) {
      qsoScoring.value = 1
      qsoScoring.mult = `${band}|${theirOfficial}`
    } else if (theirHQ) {
      qsoScoring.value = 1
      qsoScoring.mult = `${band}|HQ:${theirHQ}`
    } else {
      const ourZone = ref?.zone ?? ourInfo?.ituZone
      const ourContinent = ourInfo?.continent ?? qso?.our?.guess?.continent
      const theirContinent = qso?.their?.continent ?? qso?.their?.guess?.continent

      if (ourZone && String(ourZone) === theirZone) {
        qsoScoring.value = 1
      } else if (ourContinent && theirContinent && ourContinent === theirContinent) {
        qsoScoring.value = 3
      } else {
        qsoScoring.value = 5
      }
      qsoScoring.mult = `${band}|Z${theirZone}`
    }

    if (qsoScoring.mult && (!score?.mults || !score.mults[qsoScoring.mult])) {
      qsoScoring.notices.push('newMult')
    }

    const nearDupes = qsos.filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.key !== key)

    if (nearDupes.length !== 0) {
      const sameBandMode = nearDupes.filter(q => q.band === band && superModeForMode(q.mode) === superMode).length !== 0
      if (sameBandMode) {
        qsoScoring.value = 0
        qsoScoring.mult = undefined
        qsoScoring.alerts.push('duplicate')
      } else {
        const sameBand = nearDupes.filter(q => q.band === band).length !== 0
        const sameMode = nearDupes.filter(q => superModeForMode(q.mode) === superMode).length !== 0
        if (!sameBand) qsoScoring.notices.push('newBand')
        if (!sameMode) qsoScoring.notices.push('newMode')
      }
    }

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

    const multCount = Object.keys(score.mults).length

    score.summary = `×${fmtNumber(multCount)}: ${fmtNumber(score.total)} pts`

    const parts = []
    parts.push(`**${fmtNumber(score.total)} Total Points**`)
    parts.push(`**${fmtNumber(score.qsoPoints)} Points x ${fmtNumber(multCount)} Mults**`)
    parts.push(
      ['160m', '80m', '40m', '20m', '15m', '10m'].map(band => {
        if (score.bands[band]) {
          return `**${band}**: ${fmtNumber(score.bands[band])} QSOs, ${fmtNumber(score.bandPoints[band])} points, ${Object.keys(score.bandMults[band] ?? {}).length} mults`
        } else {
          return `**${band}**: -`
        }
      }).filter(x => x).join('\n')
    )

    score.longSummary = parts.join('\n')
    return score
  }
}

async function processQSOBeforeSaveWithDispatch({ qso, qsos, operation, dispatch }) {
  const qsoRef = findRef(qso, Info.key)

  if (!qsoRef || !qsoRef.theirExchange) {
    qso.refs = replaceRef(qso.refs, Info.key, { ...qsoRef ?? {}, theirExchange: qso?.their?.ituZone ?? qso?.their?.guess?.ituZone })
  }

  return qso
}


function ourExchangeString (ref) {
  if (!ref) return ''
  if (ref.stationType === 'hq') return ref.society ?? ''
  if (ref.stationType === 'official') return ref.official ?? ''
  return ref.zone ?? ''
}

function mainExchangeForOperation (props) {
  const { qso, updateQSO, styles, disabled, refStack } = props
  const qsoRef = findRef(qso?.refs, Info.key) || { type: Info.key }

  const fields = []

  fields.push(
    <H2kEnhancedTextInput
      {...props}
      key={`${Info.key}/theirExchange`}
      innerRef={refStack.shift()}
      style={[styles?.text?.numbers, { minWidth: styles.oneSpace * 8, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Zone / HQ'}
      placeholder={qso?.their?.ituZone ?? qso?.their?.guess?.ituZone ?? ''}
      keyboard={'dumb'}
      uppercase={true}
      noSpaces={true}
      value={qsoRef?.theirExchange ?? ''}
      disabled={disabled}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...qsoRef, theirExchange: text }),
        their: { exchange: text }
      })}
    />
  )

  return fields
}
