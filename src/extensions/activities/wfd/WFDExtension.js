/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'

import { superModeForMode } from '@ham2k/lib-operation-data'
import { fmtNumber } from '@ham2k/lib-format-tools'

import { findRef, replaceRef } from '../../../tools/refTools'
import { H2kTextInput, H2kTextInputWithSuggestions } from '../../../ui'

import { WFDActivityOptions } from './WFDActivityOptions'
import { ABBREVIATED_SECTION_NAMES, ARRL_SECTIONS, RAC_SECTIONS } from '../fd/FDSections'

/*
 NOTES:

 ADIF
   <ARRL_SECT:3>ENY
   <CONTEST_ID:3>WFD
   <APP_N1MM_EXCHANGE1:2>1H

 Cabrillo
   QSO: 18072 CW 2024-01-24 0246 KI2D          1H     ENY KN2X          1H   ENY
   QSO: 18072 CW 2024-01-24 0246 KI2D          1H     ENY WC3W          2H   NFL

 */

export const Info = {
  key: 'wfd',
  icon: 'snowflake',
  name: 'Winter Field Day',
  shortName: 'WFD',
  infoURL: 'https://www.winterfieldday.org/'
}

const Extension = {
  ...Info,
  category: 'fieldOps',
  onActivation: ({ registerHook }) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler })
  }
}

export default Extension

const ActivityHook = {
  ...Info,

  hideStateField: true,

  Options: WFDActivityOptions,
  mainExchangeForOperation,
  processQSOBeforeSave,

  sampleOperations: ({ settings, callInfo }) => {
    return [
      { refs: [ReferenceHandler.decorateRef({ type: Info.key, class: '1O', location: 'ENY' })] }
    ]
  }

}

const ReferenceHandler = {
  ...Info,

  descriptionPlaceholder: '',
  description: (operation) => {
    let date
    if (operation?.qsos && operation.qsos[0]?.startAtMillis) date = Date.parse(operation.qsos[0].startAtMillis)
    else date = new Date()
    const ref = findRef(operation, Info.key)
    return [`WFD ${date.getFullYear()}`, [ref?.class, ref?.location].filter(x => x).join(' ')].filter(x => x).join(' • ')
  },

  decorateRef: (ref) => {
    return {
      ...ref,
      label: `${Info.name}: ${ref.class} ${ref.location}`,
      shortLabel: `${Info.shortName}: ${ref.class} ${ref.location}`
    }
  },

  suggestOperationTitle: (ref) => {
    return { for: Info.shortName, subtitle: [ref?.class, ref?.location].filter(x => x).join(' ') }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref?.type === Info?.key) {
      return [{
        format: 'adif',
        exportName: 'Winter Field Day (ADIF)',
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}'
      },
      {
        format: 'cabrillo',
        exportName: 'Winter Field Day (Cabrillo)',
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}'
      }]
    }
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)
    headers.push(['CONTEST', Info.cabrilloName ?? Info.shortName])
    headers.push(['CALLSIGN', operation.stationCall || settings.operatorCall])
    headers.push(['LOCATION', ref.location])
    headers.push(['NAME', ''])
    if (operation.local?.operatorCall) headers.push(['OPERATORS', operation.local.operatorCall])
    if (operation.grid) headers.push(['GRID-LOCATOR', operation.grid])
    return headers
  },

  qsoToCabrilloParts: ({ qso, ref, operation, settings, parts }) => {
    parts = parts || []

    const ourCall = operation.stationCall || settings.operatorCall
    const qsoRef = findRef(qso, Info.key)

    parts.push((ourCall ?? '').padEnd(13, ' '))
    parts.push((ref?.class ?? '').padEnd(6, ' '))
    parts.push((ref?.location ?? '').padEnd(3, ' '))
    parts.push((qso?.their?.call ?? '').padEnd(13, ' '))
    parts.push((qsoRef?.class ?? '').padEnd(4, ' '))
    parts.push((qsoRef?.location ?? '').padEnd(3, ' '))
    return parts
  },

  adifFieldsForOneQSO: ({ qso, operation, common, ref, mainHandler }) => {
    // Include `CONTEST_ID` even if we're not the main handler, if the Operation is a WFD operation
    if (findRef(common, Info.key)) {
      return ([{ CONTEST_ID: 'WFD' }])
    }
  },

  relevantInfoForQSOItem: ({ qso, operation }) => {
    return [qso.their.exchange]
  },

  scoringForQSO: ({ qso, qsos, operation, ref, score }) => {
    const { band, mode, uuid, startAtMillis } = qso
    const superMode = superModeForMode(mode)

    const qsoRef = findRef(qso, Info.key)

    const nearDupes = qsos.filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.uuid !== uuid)

    const value = superMode === 'PHONE' ? 1 : 2
    const scoring = { value, theirSection: qsoRef?.location, mode: superMode, band }

    if (WFD_LOCATION_VALUES[qsoRef?.location]) {
      if (score?.arrlSections?.[qsoRef?.location] || score?.racSections?.[qsoRef?.location] || score?.otherSections?.[qsoRef?.location]) {
        scoring.infos = [`${ABBREVIATED_SECTION_NAMES[qsoRef?.location] || WFD_LOCATION_VALUES[qsoRef?.location]}`]
      } else {
        scoring.notices = [`${ABBREVIATED_SECTION_NAMES[qsoRef?.location] || WFD_LOCATION_VALUES[qsoRef?.location]}`]
      }
    }

    if (nearDupes.length === 0) {
      return scoring
    } else {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => superModeForMode(q.mode) === superMode).length !== 0
      const sameBandMode = nearDupes.filter(q => q.band === band && q.mode === mode).length !== 0
      if (sameBandMode) {
        return { ...scoring, value: 0, alerts: ['duplicate'] }
      } else {
        const notices = [...(scoring.notices || [])]
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')

        return { ...scoring, notices }
      }
    }
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, ref }) => {
    if (!qsoScore.value) return score

    if (!score?.key) score = undefined // Reset if score doesn't have the right shape
    score = score ?? {
      key: ref?.type,
      icon: Info.icon,
      label: Info.name,
      total: 0,
      qsoCount: 0,
      qsoPoints: 0,
      mults: 0,
      modes: {},
      arrlSections: {},
      racSections: {},
      otherSections: {}
    }

    score.qsoCount = score.qsoCount + 1
    score.qsoPoints = score.qsoPoints + qsoScore.value

    score.modes[qsoScore.mode] = (score.modes[qsoScore.mode] || 0) + 1
    if (ARRL_SECTIONS[qsoScore.theirSection]) {
      score.arrlSections[qsoScore.theirSection] = (score.arrlSections[qsoScore.theirSection] || 0) + 1
    } else if (RAC_SECTIONS[qsoScore.theirSection]) {
      score.racSections[qsoScore.theirSection] = (score.racSections[qsoScore.theirSection] || 0) + 1
    } else if (qsoScore.theirSection === 'MX' || qsoScore.theirSection === 'DX') {
      score.otherSections[qsoScore.theirSection] = (score.otherSections[qsoScore.theirSection] || 0) + 1
    }

    score.mults = Object.keys(score.arrlSections).length + Object.keys(score.racSections).length + Object.keys(score.otherSections).length
    score.total = score.qsoPoints * score.mults

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

    let line

    parts.push(`### ${Object.keys(score?.arrlSections ?? {}).length} ARRL Sections`)
    line = '> '
    Object.keys(ARRL_SECTIONS).forEach(s => {
      s = s.toUpperCase()
      if (score.arrlSections[s]) {
        line += `**~~${s}~~**${s.length === 2 ? ' ' : ''} `
      } else {
        line += `${s}${s.length === 2 ? ' ' : ''} `
      }
    })
    parts.push(line)

    parts.push(`### ${Object.keys(score?.racSections ?? {}).length} RAC Sections`)
    line = '> '
    Object.keys(RAC_SECTIONS).forEach(s => {
      s = s.toUpperCase()
      if (score.racSections[s]) {
        line += `**~~${s}~~**${s.length === 2 ? ' ' : ''} `
      } else {
        line += `${s}${s.length === 2 ? ' ' : ''} `
      }
    })
    parts.push(line)

    parts.push(`### ${Object.keys(score?.otherSections ?? {}).length} Other`)
    line = '> '
    ;['MX', 'DX'].forEach(s => {
      if (score.otherSections[s]) {
        line += `**~~${s}~~**  `
      } else {
        line += `${s}  `
      }
    })

    parts.push(line)

    score.longSummary = '\n' + parts.join('\n')

    return score
  }
}

const WFD_CLASS_REGEX = /^[1-9]+[HIMO]$/

export const WFD_LOCATION_VALUES = { ...ARRL_SECTIONS, ...RAC_SECTIONS, MX: 'Mexico', DX: 'Other DX' }
export const WFD_LOCATIONS = Object.keys(WFD_LOCATION_VALUES)

export const K_LOCATION_SUGGESTIONS = Object.entries(ARRL_SECTIONS)
export const VE_LOCATION_SUGGESTIONS = Object.entries(RAC_SECTIONS)
export const OTHER_LOCATION_SUGGESTIONS = [['MX', 'Mexico'], ['DX', 'Other DX']]
export const ALL_LOCATION_SUGGESTIONS = Object.entries(WFD_LOCATION_VALUES)

function mainExchangeForOperation (props) {
  const { qso, qsos, operation, updateQSO, styles, refStack, disabled } = props

  const ref = findRef(qso?.refs, Info.key) || { type: Info.key, class: undefined, location: undefined }

  const fields = []

  fields.push(
    <H2kTextInput
      {...props}
      key={`${Info.key}/class`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 7, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Class'}
      placeholder={''}
      mode={'flat'}
      keyboard={'dumb'}
      uppercase={true}
      noSpaces={true}
      disabled={disabled}
      value={ref?.class ?? _defaultClassFor({ qso, qsos, operation }) ?? ''}
      error={ref?.class && !ref.class.match(WFD_CLASS_REGEX)}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...ref, class: text })
      })}
    />
  )
  fields.push(
    <H2kTextInputWithSuggestions
      {...props}
      key={`${Info.key}/location`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 7, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Loc'}
      placeholder={''}
      mode={'flat'}
      keyboard={'dumb'}
      uppercase={true}
      noSpaces={true}
      disabled={disabled}
      value={ref?.location ?? _defaultLocationFor({ qso, qsos, operation }) ?? ''}
      error={ref?.location && !WFD_LOCATIONS.includes(ref.location)}
      suggestions={_suggestionsFor(qso)}
      minimumLengthForSuggestions={3}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...ref, location: text })
      })}
    />
  )
  return fields
}

function processQSOBeforeSave ({ qso, qsos, operation }) {
  if (findRef(operation, Info.key)) {
    const ref = findRef(qso?.refs, Info.key) || { type: Info.key, class: undefined, location: undefined }
    ref.class = ref.class ?? _defaultClassFor({ qso, qsos, operation })
    ref.location = ref.location ?? _defaultLocationFor({ qso, qsos, operation })
    if (ref.class || ref.location) {
      qso.refs = replaceRef(qso.refs, Info.key, ref)
      qso.their.exchange = [ref.class, ref.location].join(' ')
    }
  }
  return qso
}

function _suggestionsFor (qso) {
  const prefix = qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix
  if (prefix === 'K') return K_LOCATION_SUGGESTIONS
  else if (prefix === 'VE') return VE_LOCATION_SUGGESTIONS
  else if (prefix) return OTHER_LOCATION_SUGGESTIONS
  else return ALL_LOCATION_SUGGESTIONS
}

function _defaultClassFor ({ qso, qsos, operation }) {
  const matching = qsos.filter(q => q.their?.call === qso?.their?.call)
  if (matching.length > 0) return matching[matching.length - 1].refs?.find(r => r.type === Info.key)?.class
  else return undefined
}

function _defaultLocationFor ({ qso, qsos, operation }) {
  const matching = qsos.filter(q => q.their?.call === qso?.their?.call)
  if (matching.length > 0) return matching[matching.length - 1].refs?.find(r => r.type === Info.key)?.location

  const prefix = qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix
  if (prefix === 'K' || prefix === 'VE') return undefined
  else if (prefix === 'XE') return 'MX'
  else if (prefix) return 'DX'
  else return undefined
}
