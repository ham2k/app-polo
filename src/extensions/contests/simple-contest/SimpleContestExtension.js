/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { findRef, replaceRef } from '../../../tools/refTools'

import { superModeForMode } from '@ham2k/lib-operation-data'
import { fmtNumber } from '@ham2k/lib-format-tools'

import { H2kTextInput } from '../../../ui'

import { ActivityOptions } from './SimpleContestActivityOptions'

export const Info = {
  key: 'simple-contest',
  icon: 'flag-checkered',
  name: 'Generic Simple Contest',
  shortName: 'Simple Contest'
}

const Extension = {
  ...Info,
  category: 'contests',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler })

    // registerQPDefinitionsDataFile()
    // dispatch(loadDataFile('qp-definitions'))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    // await dispatch(removeDataFile('qp-definitions'))
  }
}
export default Extension

const ActivityHook = {
  ...Info,
  Options: ActivityOptions,

  hideStateField: true,

  mainExchangeForOperation
}

const ReferenceHandler = {
  ...Info,

  descriptionPlaceholder: '',
  description: (operation) => {
    const ref = findRef(operation, Info.key)
    return [ref?.contestIdentifier ?? 'TEST']
  },

  suggestOperationTitle: (ref) => {
    return { for: ref?.contestIdentifier ?? 'TEST', subtitle: ref?.exchange }
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

    const fields = [
      { CONTEST_ID: ref?.contestIdentifier },
      { STX_STRING: ref?.exchange },
      { SRX_STRING: qsoRef?.exchange }
    ]

    return fields
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)

    headers.push(['CONTEST', ref?.contestIdentifier])
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
        (ourCall ?? ' '),
        (qso?.mode === 'CW' || qso?.mode === 'RTTY' ? '599' : '59'),
        (ref?.exchange || ' '),
        (qso?.their?.call || ' '),
        (qso?.mode === 'CW' || qso?.mode === 'RTTY' ? '599' : '59'),
        (qsoRef?.exchange || ' ')
      ]
    ]

    return rows
  },

  relevantInfoForQSOItem: ({ qso, operation }) => {
    return [qso.their.exchange]
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    const { band, mode, key, startAtMillis } = qso

    const superMode = superModeForMode(mode)

    const nearDupes = qsos.filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.key !== key)

    const value = 1

    if (nearDupes.length === 0) {
      return { value, mode: superMode, type: Info.key }
    } else {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => superModeForMode(q.mode) === superMode).length !== 0
      if (sameBand && sameMode) {
        return { value: 0, alerts: ['duplicate'], type: Info.key }
      } else {
        const notices = []
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')

        return { value, mode: superMode, notices, type: Info.key }
      }
    }
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
      modes: {}
    }

    score.qsoCount = score.qsoCount + 1
    score.qsoPoints = score.qsoPoints + qsoScore.value
    score.modes[qsoScore.mode] = (score.modes[qsoScore.mode] || 0) + 1

    score.total = score.qsoPoints

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    if (!score.total) {
      score.summary = '0 pts'
      score.longSummary = '0 pts\nNo valid QSOs yet!'
      return score
    }

    score.summary = `${fmtNumber(score.total)} pts`

    const parts = []
    parts.push(`**${fmtNumber(score.qsoPoints)} Points x ${score.mults} Mults = ${fmtNumber(score.total)} Total Points**`)
    parts.push(
      Object.keys(score.modes ?? {}).sort().map(mode => {
        if (score?.modes[mode]) {
          return (`${fmtNumber(score.modes[mode])} ${mode} QSOs`)
        } else {
          return null
        }
      }).filter(x => x).join(' • ')
    )

    score.longSummary = score.summary
    return score
  }
}

function mainExchangeForOperation (props) {
  const { qso, updateQSO, styles, refStack } = props

  const ref = findRef(qso?.refs, Info.key) || { type: Info.key, location: '' }

  const fields = []

  fields.push(
    <H2kTextInput
      {...props}
      key={`${Info.key}/location`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 10, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Exchange'}
      placeholder={qso?.their?.state ?? qso?.their?.guess?.state}
      keyboard="dumb"
      uppercase={true}
      noSpaces={false}
      value={ref?.exchange || ''}
      error={false}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...ref, exchange: text }),
        their: { exchange: text }
      })}
    />
  )
  return fields
}
