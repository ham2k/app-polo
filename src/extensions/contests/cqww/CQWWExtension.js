// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'

import { fmtNumber } from '@ham2k/lib-format-tools'
import { findRef, replaceRef } from '@ham2k/lib-qson-tools'

import { H2kEnhancedTextInput } from '../../../ui/index.js'

import { ActivityOptions } from './CQWWActivityOptions'

export const Info = {
  key: 'cqww',
  icon: 'earth',
  name: 'CQ World Wide DX Contest (Beta)',
  shortName: 'CQ WW'
}

const VALID_BANDS = ['160m', '80m', '40m', '20m', '15m', '10m']

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
    return ['CQ WW', ref?.mode].filter(Boolean).join(' ')
  },

  suggestOperationTitle: ({ ref }) => {
    return { for: ['CQ WW', ref?.mode].filter(Boolean).join(' ') }
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

    if (ref?.mode) {
      const fields = [
        { CONTEST_ID: `CQ-WW-${ref.mode}` },

        { STX_STRING: ourZoneString(ref) },
        { SRX_STRING: qsoRef?.theirZone }
      ]

      return fields
    }
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)

    headers.push(['CONTEST', `CQ-WW-${ref?.mode}`])
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
        (ourZoneString(ref) || '-'),
        (qso?.their?.call || '-'),
        (qso?.mode === 'CW' ? settings?.defaultReportCW || '599' : settings?.defaultReport || '59'),
        (qsoRef?.theirZone || '-')
      ]
    ]

    return rows
  },

  relevantInfoForQSOItem: ({ qso }) => {
    const qsoRef = findRef(qso, Info.key)
    if (qsoRef) {
      return [String(qsoRef?.theirZone ?? '')]
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

    if (ref?.mode === 'CW') {
      if (mode !== 'CW') {
        qsoScoring.alerts.push('invalidMode')
        return qsoScoring
      }
    } else if (ref?.mode === 'SSB') {
      if (mode !== 'SSB' && mode !== 'USB' && mode !== 'LSB') {
        qsoScoring.alerts.push('invalidMode')
        return qsoScoring
      }
    }

    if (!VALID_BANDS.includes(band)) {
      qsoScoring.alerts.push('invalidBand')
      return qsoScoring
    }

    const qsoRef = findRef(qso, Info.key)
    const theirZone = String(qsoRef?.theirZone ?? qso?.their?.cqZone ?? qso?.their?.guess?.cqZone ?? '').trim().replace(/^0+(?=\d)/, '')

    const ourContinent = ourInfo?.continent ?? qso?.our?.guess?.continent
    const theirContinent = qso?.their?.continent ?? qso?.their?.guess?.continent
    const ourCountry = ourInfo?.dxccCode ?? ourInfo?.entityPrefix
    const theirCountry = qso?.their?.dxccCode ?? qso?.their?.guess?.dxccCode

    if (ourCountry && theirCountry && ourCountry === theirCountry) {
      qsoScoring.value = 0
    } else if (ourContinent && theirContinent && ourContinent === theirContinent) {
      if (ourContinent === 'NA' && theirContinent === 'NA') qsoScoring.value = 2
      else qsoScoring.value = 1
    } else {
      qsoScoring.value = 3
    }

    const mults = []
    if (theirZone) mults.push(`${band}|Z${theirZone}`)
    if (theirCountry) mults.push(`${band}|C${theirCountry}`)
    qsoScoring.mult = mults

    const newMults = mults.filter(m => !score?.mults || !score.mults[m])
    if (newMults.length > 0) {
      qsoScoring.notices.push('newMult')
    }

    const nearDupes = qsos.filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.key !== key)

    if (nearDupes.length !== 0) {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      if (sameBand) {
        qsoScoring.value = 0
        qsoScoring.mult = []
        qsoScoring.alerts.push('duplicate')
      } else {
        qsoScoring.notices.push('newBand')
      }
    }

    return qsoScoring
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, ref }) => {
    if (!qsoScore.value && (!qsoScore.mult || qsoScore.mult.length === 0)) return score

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

    if (qsoScore.value) {
      score.qsoCount = score.qsoCount + 1
      score.qsoPoints = score.qsoPoints + qsoScore.value
      score.bands[qsoScore.band] = (score.bands[qsoScore.band] || 0) + 1
      score.bandPoints[qsoScore.band] = (score.bandPoints[qsoScore.band] || 0) + qsoScore.value
    }

    for (const mult of (qsoScore.mult ?? [])) {
      score.mults[mult] = (score.mults[mult] || 0) + 1
      score.bandMults[qsoScore.band] = score.bandMults[qsoScore.band] || {}
      score.bandMults[qsoScore.band][mult] = (score.bandMults[qsoScore.band][mult] || 0) + 1
    }

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
        if (score.bands[band] || score.bandMults[band]) {
          return `**${band}**: ${fmtNumber(score.bands[band] ?? 0)} QSOs, ${fmtNumber(score.bandPoints[band] ?? 0)} points, ${Object.keys(score.bandMults[band] ?? {}).length} mults`
        } else {
          return `**${band}**: -`
        }
      }).filter(x => x).join('\n')
    )

    score.longSummary = parts.join('\n')
    return score
  }
}

async function processQSOBeforeSaveWithDispatch ({ qso, qsos, operation, dispatch }) {
  const qsoRef = findRef(qso, Info.key)

  if (!qsoRef || !qsoRef.theirZone) {
    qso.refs = replaceRef(qso.refs, Info.key, { ...qsoRef ?? {}, theirZone: qso?.their?.cqZone ?? qso?.their?.guess?.cqZone })
  }

  return qso
}

function ourZoneString (ref) {
  return ref?.zone ?? ''
}

function mainExchangeForOperation (props) {
  const { qso, updateQSO, styles, disabled, refStack } = props
  const qsoRef = findRef(qso?.refs, Info.key) || { type: Info.key }

  const fields = []

  fields.push(
    <H2kEnhancedTextInput
      {...props}
      key={`${Info.key}/theirZone`}
      innerRef={refStack.shift()}
      style={[styles?.text?.numbers, { minWidth: styles.oneSpace * 5.7, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Zone'}
      placeholder={qso?.their?.cqZone ? String(qso.their.cqZone) : (qso?.their?.guess?.cqZone ? String(qso.their.guess.cqZone) : '')}
      keyboard={'numbers'}
      numeric={true}
      noSpaces={true}
      value={qsoRef?.theirZone ?? ''}
      disabled={disabled}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...qsoRef, theirZone: text }),
        their: { exchange: text }
      })}
    />
  )

  return fields
}
