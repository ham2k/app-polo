// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'

import { fmtNumber, fmtTimestamp } from '@ham2k/lib-format-tools'

import { distanceForRegion1VHFContests } from '@ham2k/lib-geo-tools'
import { filterNearDupes, replaceRef, findRef } from '@ham2k/lib-qson-tools'

import { H2kGridInput, H2kEnhancedTextInput } from '../../../ui'
import { REG1TEST_BAND } from '../../../tools/qsonToReg1test'

import { Info } from './Region1VHFContestsInfo'
import { ActivityOptions } from './Region1VHFContestsOptions'
import RAW_VHF_CONTESTS_DATA from './all-events.js'
import { setOperationData } from '../../../store/operations/index.js'

export const VHF_CONTESTS_DATA = Object.fromEntries(RAW_VHF_CONTESTS_DATA.map(event => [event.key, event]))

export const BAND_MULTIPLIERS = {
  '6m': 1,
  '4m': 1,
  '2m': 1,
  '1.25m': 1,
  '70cm': 1,
  '23cm': 1,
  '13cm': 1,
  '9cm': 1,
  '6cm': 1,
  '1.25cm': 1,
  '6mm': 2,
  '4mm': 3,
  '2.5mm': 4,
  '2mm': 8,
  '1mm': 10,
  submm: 10
}

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

  standardExchangeFields: { state: true, grid: false },

  sampleOperations: ({ settings, callInfo }) => {
    return [
      { refs: [ReferenceHandler.decorateRef({ type: Info.key, ref: 'R1-VHF-145-SEPTEMBER' })] }
    ]
  },

  mainExchangeForOperation,

  prepareNewQSO,
  processQSOBeforeSaveWithDispatch
}

const ReferenceHandler = {
  ...Info,

  descriptionPlaceholder: '',
  description: (operation) => {
    let date
    if (operation?.startAtMillisMax) date = new Date(operation.startAtMillisMax)
    else date = new Date()

    const ref = findRef(operation, Info.key)
    const test = vhfTestData({ ref })

    return [test?.name ? `${test.name} ${date.getFullYear()}` : 'Select a Contest', ref?.location].filter(x => x).join(' • ')
  },

  decorateRef: (ref) => {
    const test = vhfTestData({ ref })

    return {
      ...ref,
      label: test.name,
      shortLabel: test.short
    }
  },

  keyForRef: (ref) => {
    const test = vhfTestData({ ref })
    return `${Info.key}-${test.key}`
  },

  suggestOperationTitle: ({ ref, operation }) => {
    if (ref?.ref) {
      const test = vhfTestData({ ref })
      const subtitleParts = []
      if (_hasGridExchange(test)) {
        subtitleParts.push(operation?.grid)
      }
      subtitleParts.push(ref?.exchange)

      return { for: test?.short ?? test?.name, subtitle: subtitleParts.filter(x => x).join(' • ') }
    } else {
      return { for: Info.shortName }
    }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref?.type === Info?.key) {
      const test = vhfTestData({ ref })
      return [{
        format: 'reg1test',
        exportType: 'r1-vhf-tests-reg1test',
        exportName: `${test.short ?? 'REG1TEST'}`,
        refKey: test.key,
        templateData: { handlerShortName: test.shortName, handlerName: test.name },
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}'
      }]
    }
  },

  reg1testHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)
    const test = vhfTestData({ ref: ref.ref })

    headers.PWWLo = operation.grid
    headers.TDate = [
      fmtTimestamp(test.start).substring(2, 8),
      fmtTimestamp(test.end).substring(2, 8)
    ].join(';')
    headers.PSect = ref?.class
    headers.PExch = ref?.exchange

    if (test.bands.length === 1) {
      headers.PBand = REG1TEST_BAND[test.bands[0]]
    }

    return headers
  },

  reg1testFieldsForOneQSO: ({ qso, operation }) => {
    const qsoRef = findRef(qso, Info.key)
    const test = vhfTestData({ ref: findRef(operation, Info.key) })
    const fields = {}

    if (_hasNumberExchange(test)) {
      fields.sequenceSent = qsoRef?.ourNumber
      fields.sequenceReceived = qsoRef?.theirNumber
    }
    if (_hasGridExchange(test)) {
      fields.wwlReceived = qso.their?.grid ?? qso.their?.guess?.grid
    }

    return fields
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const ref = findRef(operation, Info.key)
    const test = vhfTestData({ ref })

    const fields = [
      { CONTEST_ID: test.cabrilloName ?? test.key },
      { STX_STRING: qso.our.exchange },
      { SRX_STRING: qso.their.exchange }
    ]

    return fields
  },

  relevantInfoForQSOItem: ({ qso }) => {
    const qsoRef = findRef(qso, Info.key)
    if (qsoRef) {
      return [qso.their.exchange]
    }
  },

  scoringForQSO: ({ qso, qsos, operation, ref: scoredRef, score }) => {
    const test = vhfTestData({ ref: scoredRef })
    // console.log('scoringForQSO', qso.key, scoredRef)

    const { band, mode } = qso

    if (test.bands.indexOf(band) < 0) {
      return { value: 0, alerts: ['invalidBand'], type: Info.key }
    }

    const superMode = _testModeForMode(mode)

    const scoring = {
      value: undefined,
      mode: superMode,
      band,
      type: Info.key,
      infos: [],
      notices: [],
      alerts: [],
      mults: [],
      bonuses: []
    }

    if (!operation.grid) {
      scoring.alerts.push('ourGrid')
    }

    const theirGrid = _trimmedGrid({ grid: qso.their?.grid ?? qso.their?.guess?.grid, test })
    console.log('-- theirGrid', theirGrid)
    console.log('-- operation.grid', operation.grid)
    if (theirGrid && operation.grid && _hasGridExchange(test)) {
      const distance = distanceForRegion1VHFContests(operation.grid, theirGrid)
      scoring.distance = distance
      scoring.value = distance * BAND_MULTIPLIERS[band]
    }
    console.log('-- scoring after distance', { ...scoring })

    const nearDupes = filterNearDupes({ qso, qsos, operation, withSectionRefs: [scoredRef] })

    if (nearDupes.length === 0) {
      return scoring
    } else {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0

      if (sameBand) {
        return { ...scoring, value: 0, alerts: ['duplicate'] }
      } else {
        const notices = [...(scoring.notices || [])]
        if (!sameBand) notices.push('newBand')

        return { ...scoring, notices }
      }
    }
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, ref }) => {
    const test = vhfTestData({ ref })

    if (!score?.key) score = undefined // Reset if score doesn't have the right shape

    score = score ?? {
      key: ref?.type,
      icon: Info.icon,
      label: test.name,
      modes: {},
      bands: {},
      total: 0,
      distanceTotal: 0,
      maxDistance: 0,
      maxDistancePerBand: {},
      qsoCount: 0,
      dupeCount: 0
    }

    if (qsoScore.value === 0) {
      score.dupeCount = score.dupeCount + 1
      return score
    }

    score.modes[qsoScore.mode] = (score.modes[qsoScore.mode] || 0) + 1
    score.bands[qsoScore.band] = (score.bands[qsoScore.band] || 0) + 1

    score.total = score.total + qsoScore.value

    score.distanceTotal = score.distanceTotal + qsoScore.distance
    score.maxDistance = Math.max(score.maxDistance, qsoScore.distance)
    score.maxDistancePerBand[qsoScore.band] = Math.max(score.maxDistancePerBand[qsoScore.band] || 0, qsoScore.distance)

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    const test = vhfTestData({ ref })

    if (!score.total) {
      score.summary = '0 pts'
      score.longSummary = '0 pts\nNo valid QSOs yet!'
      return score
    }

    score.summary = `${fmtNumber(score.total)} pts`

    score.label = `IARU Region 1 ${test.name}`

    const parts = []
    parts.push(`**${fmtNumber(score.total)} points** (${fmtNumber(score.distanceTotal)} km total) ${score.dupeCount > 0 ? `(${score.dupeCount} dupe${score.dupeCount > 1 ? 's' : ''})` : ''}`)

    parts.push(
      Object.keys(score.bands ?? {}).sort().map(band => {
        if (score?.bands[band]) {
          return (`${fmtNumber(score.bands[band] ?? 0)} ${band} QSOs • Longest: ${fmtNumber(score.maxDistancePerBand[band])} km`)
        } else {
          return null
        }
      }).filter(x => x).join('\n')
    )

    score.longSummary = '\n' + parts.join('\n')

    return score
  }
}

function mainExchangeForOperation (props) {
  const { qso, updateQSO, styles, disabled, refStack, operation } = props

  const qsoRef = findRef(qso, Info.key)
  const opRef = findRef(operation, Info.key)
  const test = vhfTestData({ ref: opRef })

  const fields = []

  if (_hasNumberExchange(test)) {
    fields.push(
      <H2kEnhancedTextInput
        {...props}
        key={`${Info.key}/ourNumber`}
        skipFocus={true}
        style={[styles?.text?.numbers, { minWidth: styles.oneSpace * 5.7, flex: 1 }]}
        textStyle={styles.text.callsign}
        label={'Our #'}
        placeholder={qsoRef?.ourNumber ?? opRef?.nextNumber ?? '1'}
        keyboard={'numbers'}
        numeric={true}
        noSpaces={true}
        value={qsoRef?.ourNumber ?? opRef?.nextNumber ?? '1'}
        disabled={disabled}
        onChangeText={(text) => updateQSO({
          refs: replaceRef(qso?.refs, Info.key, { ...qsoRef, ourNumber: text })
        })}
      />
    )

    fields.push(
      <H2kEnhancedTextInput
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
  }

  if (_hasGridExchange(test)) {
    fields.push(
      <H2kGridInput
        {...props}
        key={`${Info.key}/grid`}
        innerRef={refStack.shift()}
        style={[styles.input, { minWidth: styles.oneSpace * 9, flex: 1 }]}
        textStyle={styles.text.callsign}
        label={'Grid'}
        keyboard="dumb"
        uppercase={true}
        noSpaces={true}
        value={qso?.their?.grid ?? ''}
        placeholder={qso?.their?.guess?.grid ?? ''}
        disabled={disabled}
        error={false}
        onChangeText={(text) => updateQSO({
          their: { grid: text }
        })}
      />
    )
  }

  return fields
}

function prepareNewQSO ({ operation, qso }) {
  const opRef = findRef(operation, Info.key)
  if (!opRef) return qso

  const test = vhfTestData({ ref: opRef })
  const qsoRef = findRef(qso.refs, Info.key) || { type: Info.key }

  if (_hasNumberExchange(test)) {
    qsoRef.ourNumber = `${opRef?.nextNumber ?? 1}`
  }
  qso.refs = replaceRef(qso.refs, Info.key, qsoRef)

  return qso
}

async function processQSOBeforeSaveWithDispatch ({ qso, qsos, operation, dispatch }) {
  const opRef = findRef(operation, Info.key)
  const test = vhfTestData({ ref: opRef })

  if (opRef) {
    const ref = findRef(qso?.refs, Info.key) || { type: Info.key }

    if (_hasGridExchange(test)) {
      qso.their.grid = _trimmedGrid({ grid: qso.their?.grid ?? qso.their?.guess?.grid, test })
    }

    if (_hasExchangeData(test, ref, qso)) {
      qso.refs = replaceRef(qso.refs, Info.key, { ...ref, grid: qso.their.grid })

      qso.their.exchange = _buildExchange({ test, ourOrTheir: 'their', ref, opRef, operation, qso })
      qso.our.exchange = _buildExchange({ test, ourOrTheir: 'our', ref, opRef, operation, qso })

      if (_hasNumberExchange(test) && ref.ourNumber) {
        const num = parseInt(ref.ourNumber, 10)
        if (!isNaN(num)) {
          await dispatch(setOperationData({
            uuid: operation.uuid,
            refs: replaceRef(operation.refs, Info.key, {
              ...opRef,
              nextNumber: Math.max(num, (opRef.nextNumber || 0)) + 1
            })
          }))
        }
      }
    }
  }
  return qso
}

export function vhfTestData ({ ref }) {
  return VHF_CONTESTS_DATA[ref?.ref] || { bands: [], name: 'Unknown VHF Contest', short: 'Unknown VHF Contest' }
}

function _hasExchange (test, type) {
  return test?.exchange?.includes(type) ?? false
}

function _hasNumberExchange (test) {
  return _hasExchange(test, 'number')
}

function _hasGridExchange (test) {
  return test?.exchange?.some(t => t === 'grid' || t === 'grid4' || t === 'grid6') ?? false
}

function _gridLength (test) {
  if (_hasExchange(test, 'grid6')) return 6
  if (_hasExchange(test, 'grid4')) return 4
  return 6
}

function _trimmedGrid ({ grid, test }) {
  if (!_hasGridExchange(test)) return grid
  return grid?.substring(0, _gridLength(test))
}

function _exchangePart ({ type, ourOrTheir, ref, opRef, operation, qso, test }) {
  switch (type) {
    case 'number':
      return ourOrTheir === 'our' ? ref.ourNumber : ref.theirNumber
    case 'grid6':
    case 'grid4':
    case 'grid':
      if (ourOrTheir === 'our') {
        return _trimmedGrid({ grid: opRef.grid ?? operation.grid, test })
      }
      return qso.their?.grid
    case 'district':
    case 'postcode':
      return ourOrTheir === 'our' ? opRef.exchange : ref.location
    default:
      return undefined
  }
}

function _buildExchange ({ test, ourOrTheir, ref, opRef, operation, qso }) {
  if (!test?.exchange) return ''
  return test.exchange
    .map(type => _exchangePart({ type, ourOrTheir, ref, opRef, operation, qso, test }))
    .filter(x => x)
    .join(' ')
}

function _hasExchangeData (test, ref, qso) {
  if (!test?.exchange) return false
  return test.exchange.some(type => {
    if (type === 'number') return ref.ourNumber || ref.theirNumber
    if (type === 'grid6' || type === 'grid4' || type === 'grid') {
      return qso.their?.grid || qso.their?.guess?.grid
    }
    if (type === 'district' || type === 'postcode') return ref.location
    return false
  })
}

function _testModeForMode (mode) {
  if (mode === 'CW') return 'CW'
  if (mode === 'SSB' || mode === 'USB' || mode === 'LSB') return 'PH'
  if (mode === 'FM') return 'FM'
  return 'DG'
}
