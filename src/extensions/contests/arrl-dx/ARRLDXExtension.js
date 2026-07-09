// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'

import { fmtNumber } from '@ham2k/lib-format-tools'
import { findRef, replaceRef } from '@ham2k/lib-qson-tools'

import { H2kEnhancedTextInput } from '../../../ui/index.js'

import { ActivityOptions } from './ARRLDXActivityOptions'

export const Info = {
  key: 'arrl-dx',
  icon: 'earth',
  name: 'ARRL International DX Contest (Beta)',
  shortName: 'ARRL DX'
}

const VALID_BANDS = ['160m', '80m', '40m', '20m', '15m', '10m']

// DXCC entity codes for the mainland USA and Canada — everyone else (including
// Alaska, Hawaii, St. Paul Is. and Sable Is., which are separate DXCC entities)
// participates as a "DX" station in this contest.
const WVE_DXCC_CODES = [1, 291]

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
    return ['ARRL DX', ref?.mode].filter(Boolean).join(' ')
  },

  suggestOperationTitle: ({ ref }) => {
    return { for: ['ARRL DX', ref?.mode].filter(Boolean).join(' ') }
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
        { CONTEST_ID: `ARRL-DX-${cabrilloMode(ref.mode)}` },

        { STX_STRING: ref?.exchange },
        { SRX_STRING: qsoRef?.theirExchange }
      ]

      return fields
    }
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)

    headers.push(['CONTEST', `ARRL-DX-${cabrilloMode(ref?.mode)}`])
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
        (ref?.exchange || '-'),
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

    if (ref?.mode === 'CW') {
      if (mode !== 'CW') {
        qsoScoring.alerts.push('invalidMode')
        return qsoScoring
      }
    } else if (ref?.mode === 'Phone') {
      if (mode !== 'SSB' && mode !== 'USB' && mode !== 'LSB') {
        qsoScoring.alerts.push('invalidMode')
        return qsoScoring
      }
    }

    if (!VALID_BANDS.includes(band)) {
      qsoScoring.alerts.push('invalidBand')
      return qsoScoring
    }

    const ourCategory = ref?.stationType ?? categoryForDXCCCode(ourInfo?.dxccCode)
    const theirDXCCCode = qso?.their?.dxccCode ?? qso?.their?.guess?.dxccCode
    const theirCategory = categoryForDXCCCode(theirDXCCCode)

    if (ourCategory && theirCategory && ourCategory === theirCategory) {
      qsoScoring.alerts.push('invalidCountry')
      return qsoScoring
    }

    const qsoRef = findRef(qso, Info.key)
    const theirExchange = String(qsoRef?.theirExchange ?? (ourCategory === 'wve' ? '' : (qso?.their?.state ?? qso?.their?.guess?.state)) ?? '').trim().toUpperCase()

    qsoScoring.value = 3

    if (ourCategory === 'wve') {
      // We're W/VE, so our multiplier is the DXCC entity of the DX station we worked
      qsoScoring.mult = theirDXCCCode ? `${band}|${theirDXCCCode}` : undefined
    } else {
      // We're DX, so our multiplier is the state/province the W/VE station sent us
      qsoScoring.mult = `${band}|${theirExchange}`
    }

    if (qsoScoring.mult && (!score?.mults || !score.mults[qsoScoring.mult])) {
      qsoScoring.notices.push('newMult')
    }

    const nearDupes = qsos.filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.key !== key)

    if (nearDupes.length !== 0) {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      if (sameBand) {
        qsoScoring.value = 0
        qsoScoring.mult = undefined
        qsoScoring.alerts.push('duplicate')
      } else {
        qsoScoring.notices.push('newBand')
      }
    }

    return qsoScoring
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, ref }) => {
    if (!qsoScore.value && !qsoScore.mult) return score

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

    if (qsoScore.mult) {
      score.mults[qsoScore.mult] = (score.mults[qsoScore.mult] || 0) + 1
      score.bandMults[qsoScore.band] = score.bandMults[qsoScore.band] || {}
      score.bandMults[qsoScore.band][qsoScore.mult] = (score.bandMults[qsoScore.band][qsoScore.mult] || 0) + 1
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
  const ref = findRef(operation, Info.key)
  const qsoRef = findRef(qso, Info.key)

  if ((!qsoRef || !qsoRef.theirExchange) && ref?.stationType !== 'wve') {
    qso.refs = replaceRef(qso.refs, Info.key, { ...qsoRef ?? {}, theirExchange: qso?.their?.state ?? qso?.their?.guess?.state })
  }

  return qso
}

function categoryForDXCCCode (dxccCode) {
  if (dxccCode === undefined || dxccCode === null) return undefined
  return WVE_DXCC_CODES.includes(dxccCode) ? 'wve' : 'dx'
}

function cabrilloMode (mode) {
  return mode === 'Phone' ? 'SSB' : 'CW'
}

function mainExchangeForOperation (props) {
  const { qso, operation, updateQSO, styles, disabled, refStack } = props
  const qsoRef = findRef(qso?.refs, Info.key) || { type: Info.key }
  const ref = findRef(operation?.refs, Info.key)

  const label = ref?.stationType === 'dx' ? 'Their State/Prov' : 'Their Power'

  const fields = []

  fields.push(
    <H2kEnhancedTextInput
      {...props}
      key={`${Info.key}/theirExchange`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 10, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={label}
      placeholder={qso?.their?.state ?? qso?.their?.guess?.state ?? ''}
      keyboard={'dumb'}
      uppercase={true}
      noSpaces={false}
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
