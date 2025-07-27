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

import { Info, VALID_LOCATIONS, VALID_BANDS } from './NAQPInfo'
import { ActivityOptions } from './NAQPActivityOptions'

const Extension = {
  ...Info,
  category: 'contests',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler })
  },
  onDeactivationDispatch: () => async (dispatch) => {
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
    if (ref) {
      return ['NAQP']
    }
  },

  suggestOperationTitle: (ref) => {
    return { for: 'NAQP', subtitle: ref?.exchange }
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
      { CONTEST_ID: `NAQP-${ref.mode}` },
      { STX_STRING: `${ref?.name} ${ref?.location}` },
      { SRX_STRING: `${qsoRef?.name} ${qsoRef?.location}` }
    ]

    return fields
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)

    headers.push(['CONTEST', `NAQP-${ref.mode}`])
    headers.push(['CALLSIGN', operation.stationCall || settings.operatorCall])
    headers.push(['NAME', ref?.name || ''])
    headers.push(['LOCATION', ref?.location || ''])
    if (operation.local?.operatorCall) headers.push(['OPERATORS', operation.local.operatorCall])
    if (operation.grid) headers.push(['GRID-LOCATOR', operation.grid])
    return headers
  },

  qsoToCabrilloParts: ({ qso, ref, operation, settings }) => {
    const qsoRef = findRef(qso, Info.key)

    const ourCall = operation.stationCall || settings.operatorCall

    const rows = [
      [
        (ourCall ?? '').padEnd(15, ' '),
        (ref?.name || ' ').padEnd(10, ' '),
        (ref?.location || ' ').padEnd(3, ' '),
        (qso?.their?.call || ' ').padEnd(15, ' '),
        (qsoRef?.name || ' ').padEnd(10, ' '),
        (qsoRef?.location || ' ').padEnd(3, ' ')
      ]
    ]

    return rows
  },

  relevantInfoForQSOItem: ({ qso, operation }) => {
    const qsoRef = findRef(qso, Info.key)
    return [qsoRef?.name, qsoRef?.location]
  },

  scoringForQSO: ({ qso, qsos, operation, ref, score }) => {
    const { band, mode, key, startAtMillis } = qso
    const qsoRef = findRef(qso, Info.key)

    const superMode = superModeForMode(mode)

    const nearDupes = qsos.filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.key !== key)

    const value = 1

    const scoring = { value, mode: superMode, type: Info.key, band: qso.band, notices: [], infos: [] }

    if (VALID_LOCATIONS[qsoRef?.location] && qsoRef?.location !== 'DX') {
      scoring.location = qsoRef?.location
    }

    if (scoring.location && scoring.band && !score?.bands?.locations?.[scoring.location]) {
      scoring.notices.push(`Mult ${scoring.location} ${scoring.band}`)
    }

    if (nearDupes.length !== 0) {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => superModeForMode(q.mode) === superMode).length !== 0
      if (sameBand && sameMode) {
        scoring.value = 0
        scoring.alerts = ['duplicate']
      } else {
        if (!sameMode) scoring.notices.push('newMode')
        if (!sameBand) scoring.notices.push('newBand')
      }
    }
    return scoring
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
      multCount: 0,
      bands: {}
    }

    score.qsoCount = score.qsoCount + 1
    score.qsoPoints = score.qsoPoints + qsoScore.value
    if (qsoScore.band) {
      score.bands[qsoScore.band] ||= {}
      score.bands[qsoScore.band].qsoCount = (score.bands[qsoScore.band].qsoCount || 0) + 1
      if (qsoScore.location) {
        if (!score.bands[qsoScore.band][qsoScore.location]) {
          score.multCount += 1
          score.bands[qsoScore.band].multCount = (score.bands[qsoScore.band].multCount || 0) + 1
          score.bands[qsoScore.band][qsoScore.location] = 1
        } else {
          score.bands[qsoScore.band][qsoScore.location] += 1
        }
      }
    }

    score.total = score.qsoPoints * score.multCount

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
    parts.push(`**${fmtNumber(score.qsoPoints)} QSOs x ${score.multCount} Mults = ${fmtNumber(score.total)} Total Points**`)

    VALID_BANDS.forEach(band => {
      if (score.bands[band]) {
        parts.push(`**${band}**: ${fmtNumber(score.bands[band].qsoCount)} QSOs, ${fmtNumber(score.bands[band].multCount)} Mults`)
      }
    })

    score.longSummary = parts.join('\n')

    return score
  }
}

function mainExchangeForOperation (props) {
  const { qso, qsos, updateQSO, styles, refStack } = props

  const ref = findRef(qso?.refs, Info.key) || { type: Info.key, name: undefined, location: undefined }

  const refDefaults = {}
  if (ref?.name === undefined || ref?.guess) {
    const qsoName = _nameFromQSO(qso, qsos)
    if (qsoName && qsoName !== ref?.name) {
      refDefaults.name = qsoName
      ref.name = qsoName
      ref.guess = true
    }
  }
  if (ref?.location === undefined || ref?.guess) {
    const qsoLocation = _locationFromQSO(qso, qsos)
    if (qsoLocation && qsoLocation !== ref?.location) {
      refDefaults.location = qsoLocation
      ref.location = qsoLocation
      ref.guess = true
    }
  }

  if (Object.keys(refDefaults).length > 0) {
    setTimeout(() => {
      updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...ref, ...refDefaults, guess: true })
      })
    }, 1)
  }

  const fields = []

  fields.push(
    <H2kTextInput
      {...props}
      key={`${Info.key}/name`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 10, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Name'}
      placeholder={'Name'}
      keyboard="dumb"
      uppercase={true}
      noSpaces={true}
      value={ref?.name ?? ''}
      error={false}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...ref, name: text, guess: false })
      })}
    />
  )

  fields.push(
    <H2kTextInput
      {...props}
      key={`${Info.key}/location`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 5, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Locat.'}
      placeholder={'Loc'}
      keyboard="dumb"
      uppercase={true}
      noSpaces={true}
      value={ref?.location ?? ''}
      error={ref?.location && !VALID_LOCATIONS[ref.location]}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...ref, location: text, guess: false })
      })}
    />
  )

  return fields
}

function _nameFromQSO (qso, qsos) {
  if (qso?.their?.call?.length >= 3) {
    const prevQSOs = qsos.filter(q => q?.their?.call === qso?.their?.call && q.key !== qso.key && !q.deleted)
    if (prevQSOs.length > 0) {
      const prevQSO = prevQSOs[prevQSOs.length - 1]
      const qsoRef = findRef(prevQSO, Info.key)
      if (qsoRef?.name) return qsoRef.name
    }
  }

  const name = qso?.their?.name ?? qso?.their?.guess?.name ?? ''
  const parts = name.split(' ')

  return parts[0].toUpperCase()
}

function _locationFromQSO (qso, qsos) {
  if (qso?.their?.call?.length >= 3) {
    const prevQSOs = qsos.filter(q => q?.their?.call === qso?.their?.call && q.key !== qso.key && !q.deleted)
    if (prevQSOs.length > 0) {
      const prevQSO = prevQSOs[prevQSOs.length - 1]
      const qsoRef = findRef(prevQSO, Info.key)
      if (qsoRef?.location) return qsoRef.location
    }
  }

  const entity = qso?.their?.entityPrefix ?? qso?.their?.guess?.entityPrefix
  const continent = qso?.their?.continent ?? qso?.their?.guess?.continent

  if (entity === 'K' || entity === 'KL7' || entity === 'KH6' || entity === 'VE') {
    return qso?.their?.state ?? qso?.their?.guess?.state ?? ''
  } else if (continent === 'NA') {
    return entity ?? ''
  } else if (entity) {
    return 'DX'
  } else {
    return ''
  }
}
