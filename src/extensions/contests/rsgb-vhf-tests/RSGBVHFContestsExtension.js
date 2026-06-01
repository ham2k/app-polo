/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber } from '@ham2k/lib-format-tools'

import { distanceForQSON } from '@ham2k/lib-geo-tools'

import { H2kGridInput, H2kTextInput, H2kTextInputWithSuggestions } from '../../../ui/index.js'
import { findRef, replaceRef } from '../../../tools/refTools.js'
import { filterNearDupes } from '../../../tools/qsonTools.js'

import { Info } from './RSGBVHFContestsInfo.js'
import { ActivityOptions } from './RSGBVHFContestsOptions.jsx'
import RAW_VHF_CONTESTS_DATA from './all-events.js'
import { RSGB_POSTCODE_DISTRICTS } from './RSGBDistricts.js'
import { setOperationData } from '../../../store/operations/index.js'

export const VHF_CONTESTS_DATA = Object.fromEntries(RAW_VHF_CONTESTS_DATA.map(state => [state.key, state]))

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
    registerHook('activity', { hook: ActivityHook, priority: 10 })
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler, priority: 10 })

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

  standardExchangeFields: { state: true, grid: false },

  sampleOperations: ({ settings, callInfo }) => {
    return [
      { refs: [ReferenceHandler.decorateRef({ type: Info.key, ref: 'RSGB-BACKPACKERS-3', district: 'AB', class: '5B' })] }
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
    if (operation?.qsos && operation.qsos[0]?.startAtMillis) date = Date.parse(operation.qsos[0].startAtMillis)
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
      if (test?.exchange === undefined || test?.exchange?.includes('grid')) {
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
        exportName: `${test.short} REG1TEST`,
        refKey: test.key,
        templateData: { handlerShortName: test.short, handlerName: test.name },
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}'
      }]
    }
  },

  reg1testHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)

    headers.PWWLo = operation.grid

    headers.PExch = ref?.exchange

    return headers
  },

  reg1testFieldsForOneQSO: ({ qso, operation }) => {
    const qsoRef = findRef(qso, Info.key)

    // Defaults are OK
    return {
      sequenceSent: qsoRef?.ourNumber,
      sequenceReceived: qsoRef?.theirNumber,
      exchangeReceived: qsoRef?.location,
      wwlReceived: qso.their?.grid ?? qso.their?.guess?.grid
    }
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

  relevantInfoForQSOItem: ({ qso, operation }) => {
    const qsoRef = findRef(qso, Info.key)
    if (qsoRef) {
      return [qso.their.exchange]
      // return [qsoRef?.ourNumber, qsoRef?.theirNumber, qso.their.grid, qsoRef.location].filter(x => x).join(' ')
    }
  },

  scoringForQSO: ({ qso, qsos, operation, ref: scoredRef, score }) => {
    const test = vhfTestData({ ref: scoredRef })
    // console.log('scoringForQSO', qso.key, scoredRef)

    const { band, mode } = qso
    const qsoRef = findRef(qso, Info.key)

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

    const theirGrid = qso.their?.grid ?? qso.their?.guess?.grid
    if (theirGrid && operation.grid) {
      if (theirGrid === operation.grid) {
        scoring.distance = 50
        scoring.value = 50 * BAND_MULTIPLIERS[band]
      } else {
        const distance = distanceForQSON({ our: { grid: operation.grid }, their: { grid: theirGrid } }, { units: 'km' })
        scoring.distance = Math.round(distance)
        scoring.value = Math.round(distance) * BAND_MULTIPLIERS[band]
      }
      scoring.gridBonus = `${band}-${theirGrid.slice(0, 4)}`
      if (test?.bonus?.newGrid && !score?.grids?.[scoring.gridBonus]) {
        scoring.notices.push('newGrid')
      }
    }

    if (test?.bonus?.newDistrict) {
      if (RSGB_POSTCODE_DISTRICTS[qsoRef?.location]) {
        scoring.districtBonus = `${band}-${qsoRef?.location}`
        if (!score?.districts?.[scoring.districtBonus]) {
          scoring.notices.push('newLocation')
        }
      }
    }

    if (test?.bonus?.newDXCC) {
      const theirDXCC = qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix
      scoring.entityBonus = `${band}-${theirDXCC}`
      if (!score?.entities?.[scoring.entityBonus]) {
        scoring.notices.push('newLocation')
      }
    }

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
      points: 0,
      distanceTotal: 0,
      maxDistance: 0,
      maxDistancePerBand: {},
      qsoCount: 0,
      dupeCount: 0,
      grids: {},
      districts: {},
      entities: {}
    }

    if (qsoScore.value === 0) {
      score.dupeCount = score.dupeCount + 1
      return score
    }

    score.modes[qsoScore.mode] = (score.modes[qsoScore.mode] || 0) + 1
    score.bands[qsoScore.band] = (score.bands[qsoScore.band] || 0) + 1

    if (qsoScore.gridBonus) score.grids[qsoScore.gridBonus] = (score.grids[qsoScore.gridBonus] || 0) + 1
    if (qsoScore.districtBonus) score.districts[qsoScore.districtBonus] = (score.districts[qsoScore.districtBonus] || 0) + 1
    if (qsoScore.entityBonus) score.entities[qsoScore.entityBonus] = (score.entities[qsoScore.entityBonus] || 0) + 1

    score.bonus = 0
    if (test?.bonus?.newGrid) {
      score.bonus = score.bonus + Object.keys(score.grids).length * test?.bonus?.newGrid
    }
    if (test?.bonus?.newDistrict) {
      score.bonus = score.bonus + Object.keys(score.districts).length * test?.bonus?.newDistrict
    }
    if (test?.bonus?.newDXCC) {
      score.bonus = score.bonus + Object.keys(score.entities).length * test?.bonus?.newDXCC
    }
    score.points = score.points + qsoScore.value

    score.total = score.points + score.bonus

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

    score.label = `RSGB ${test.name}`

    const parts = []
    parts.push(`${fmtNumber(score.points)} points + ${fmtNumber(score.bonus)} bonus = **${fmtNumber(score.total)} TOTAL**\n\n`)

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
  const test = vhfTestData({ ref: findRef(operation, Info.key) })

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

  if (test?.exchange?.includes('district') || test?.exchange?.includes('postcode')) {
    fields.push(
      <H2kTextInputWithSuggestions
        {...props}
        key={`${Info.key}/location`}
        fieldId={'refs[rsgbvhf].location'}
        innerRef={refStack.shift()}
        style={[styles.input, { minWidth: styles.oneSpace * 5, flex: 1 }]}
        textStyle={styles.text.callsign}
        label={'Post'}
        placeholder={''}
        keyboard={'dumb'}
        uppercase={true}
        noSpaces={true}
        periodToSlash={true}
        value={qsoRef?.location ?? ''}
        error={qsoRef?.location && !RSGB_POSTCODE_DISTRICTS[qsoRef?.location]}
        suggestions={Object.entries(RSGB_POSTCODE_DISTRICTS)}
        minimumLengthForSuggestions={3}
        onChangeText={(text) => updateQSO({
          refs: replaceRef(qso?.refs, Info.key, { ...qsoRef, location: text })
        })}
      />
    )
  }

  return fields
}

function prepareNewQSO ({ operation, qso }) {
  const opRef = findRef(operation, Info.key)
  if (!opRef) return qso

  const qsoRef = findRef(qso.refs, Info.key) || { type: Info.key }

  qsoRef.ourNumber = `${opRef?.nextNumber ?? 1}`
  qso.refs = replaceRef(qso.refs, Info.key, qsoRef)

  return qso
}

async function processQSOBeforeSaveWithDispatch ({ qso, qsos, operation, dispatch }) {
  const opRef = findRef(operation, Info.key)
  const test = vhfTestData({ ref: opRef })

  if (opRef) {
    const ref = findRef(qso?.refs, Info.key) || { type: Info.key }

    qso.their.grid = qso.their?.grid ?? qso.their?.guess?.grid

    if (ref.location || ref.ourNumber || ref.theirNumber) {
      qso.refs = replaceRef(qso.refs, Info.key, ref)
      const theirParts = [ref.theirNumber, qso.their?.grid]
      const ourParts = [ref.ourNumber, opRef.location]
      if (test?.exchange?.includes('district') || test?.exchange?.includes('postcode')) {
        theirParts.push(ref.location)
        ourParts.push(opRef.location)
      }

      qso.their.exchange = theirParts.filter(x => x).join(' ')
      qso.our.exchange = ourParts.filter(x => x).join(' ')
      console.log('processQSOBeforeSaveWithDispatch', { qso, ref })
      if (ref.ourNumber) {
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

export function vhfTestData ({ ref }) {
  return VHF_CONTESTS_DATA[ref?.ref] || { bands: [], name: 'Unknown VHF Contest', short: 'Unknown VHF Contest' }
}

function _testModeForMode (mode) {
  if (mode === 'CW') return 'CW'
  if (mode === 'SSB' || mode === 'USB' || mode === 'LSB') return 'PH'
  if (mode === 'FM') return 'FM'
  return 'DG'
}
