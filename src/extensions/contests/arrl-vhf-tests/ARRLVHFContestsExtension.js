// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { fmtNumber } from '@ham2k/lib-format-tools'

import { distanceForQSON } from '@ham2k/lib-geo-tools'
import { replaceRef, findRef } from '@ham2k/lib-qson-tools'

import { Info } from './ARRLVHFContestsInfo'
import { ActivityOptions } from './ARRLVHFContestsOptions'
import RAW_VHF_CONTESTS_DATA from './all-events.js'

export const VHF_CONTESTS_DATA = Object.fromEntries(RAW_VHF_CONTESTS_DATA.map(event => [event.key, event]))

const Extension = {
  ...Info,
  category: 'contests',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook, priority: 200 }) // Contests get highest priority
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler, priority: 200 })
  }
}

export default Extension

const ActivityHook = {
  ...Info,
  Options: ActivityOptions,

  standardExchangeFields: { state: false, grid: true },

  sampleOperations: ({ settings, callInfo }) => {
    return [
      { refs: [ReferenceHandler.decorateRef({ type: Info.key, ref: 'ARRL-VHF-JAN' })] }
    ]
  },

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

  lookupCall: ({ call }, { operation, qsos, online, mode }) => {
    if (!qsos) return

    const callQSOs = qsos.filter(q => q.their?.call === call)
    const lastQSO = callQSOs[callQSOs.length - 1]
    if (!lastQSO || !lastQSO.their.grid) return

    const opRef = findRef(operation, Info.key)
    const test = vhfTestData({ ref: opRef })
    const grid = _trimmedGrid({ grid: lastQSO.their.grid ?? '', test })

    return { call, grid }
  },

  suggestOperationTitle: ({ ref, operation }) => {
    if (ref?.ref) {
      const test = vhfTestData({ ref })
      const grid = operation?.grid || ''

      return { for: test?.short ?? test?.name, subtitle: _trimmedGrid({ grid, test }) }
    } else {
      return { for: Info.shortName }
    }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref?.type === Info?.key) {
      const test = vhfTestData({ ref })
      return [{
        format: 'cabrillo',
        exportType: 'arrl-vhf-tests-cabrillo',
        exportName: `${test.short ?? 'ARRL VHF Tests'}`,
        refKey: test.key,
        templateData: { handlerShortName: test.short, handlerName: test.name },
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}'
      }]
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
    const test = vhfTestData({ ref })

    const ourCall = operation.stationCall || settings.operatorCall

    const rows = [
      [
        (ourCall ?? '-'),
        (qso?.mode === 'CW' || qso?.mode === 'RTTY' ? settings?.defaultReportCW || '599' : settings?.defaultReport || '59'),
        (_trimmedGrid({ grid: operation?.grid || '', test })),
        (qso?.their?.call || '-'),
        (qso?.mode === 'CW' || qso?.mode === 'RTTY' ? settings?.defaultReportCW || '599' : settings?.defaultReport || '59'),
        (_trimmedGrid({ grid: qso?.their?.grid ?? qso?.their?.guess?.grid ?? '', test }))
      ]
    ]

    return rows
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const ref = findRef(operation, Info.key)
    const test = vhfTestData({ ref })

    const fields = [
      { CONTEST_ID: test.cabrilloName ?? test.key },
      { STX_STRING: operation?.grid },
      { SRX_STRING: qso.their.grid ?? qso.their.guess?.grid }
    ]

    return fields
  },

  relevantInfoForQSOItem: ({ qso }) => {
    const qsoRef = findRef(qso, Info.key)

    if (qsoRef) {
      return [qsoRef.grid]
    }
  },

  scoringForQSO: ({ qso, qsos, operation, ref: scoredRef, score }) => {
    const test = vhfTestData({ ref: scoredRef })

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
    const ourGrid = _trimmedGrid({ grid: scoredRef?.grid || operation.grid || '', test })
    const theirGrid = _trimmedGrid({ grid: qso.their?.grid ?? qso.their?.guess?.grid ?? '', test })

    if (test?.options?.score === 'distance') {
      if (theirGrid && ourGrid) {
        if (theirGrid === ourGrid) {
          scoring.distance = 1
          scoring.value = 1 * test?.multipliers?.[band]
        } else {
          const distance = distanceForQSON({ our: { grid: ourGrid }, their: { grid: theirGrid } }, { units: 'km' })
          scoring.distance = Math.round(distance)
          scoring.value = Math.round(distance) * test?.multipliers?.[band]
        }

        if (test?.points?.qso) {
          scoring.value = scoring.value + test?.points?.qso
        }
      }
    } else if (test?.options?.score === 'points') {
      scoring.value = test?.points?.[band]
    }

    // let nearDupes = filterNearDupes({ qso, qsos, operation, withSectionRefs: [scoredRef] })
    let nearDupes = _nearDupesFor({ test, qso, qsos, operation, ourGrid, theirGrid })

    if (test?.options?.qsosPerBandAndLocation && theirGrid) {
      nearDupes = nearDupes.filter(q => {
        const qGrid = (q.their?.grid ?? q.their?.guess?.grid ?? '').substring(0, test?.exchange[0] === 'grid6' ? 6 : 4)
        return qGrid === theirGrid
      })
    }

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

    score.label = `${test.name}`

    const parts = []
    if (test?.options?.score === 'distance') {
      parts.push(`**${fmtNumber(score.total)} points** (${fmtNumber(score.distanceTotal)} km total) ${score.dupeCount > 0 ? `(${score.dupeCount} dupe${score.dupeCount > 1 ? 's' : ''})` : ''}`)
    } else {
      parts.push(`**${fmtNumber(score.total)} points** ${score.dupeCount > 0 ? `(${score.dupeCount} dupe${score.dupeCount > 1 ? 's' : ''})` : ''}`)
    }

    parts.push(
      Object.keys(score.bands ?? {}).sort().map(band => {
        if (score?.bands[band]) {
          if (test?.options?.score === 'distance') {
            return (`${fmtNumber(score.bands[band] ?? 0)} ${band} QSOs • Longest: ${fmtNumber(score.maxDistancePerBand[band])} km`)
          } else {
            return (`${fmtNumber(score.bands[band] ?? 0)} ${band} QSOs`)
          }
        } else {
          return null
        }
      }).filter(x => x).join('\n')
    )

    score.longSummary = '\n' + parts.join('\n')

    return score
  }
}

function prepareNewQSO ({ operation, qso }) {
  const opRef = findRef(operation, Info.key)
  if (!opRef) return qso

  const qsoRef = findRef(qso.refs, Info.key) || { type: Info.key }

  qso.refs = replaceRef(qso.refs, Info.key, qsoRef)

  return qso
}

async function processQSOBeforeSaveWithDispatch ({ qso, qsos, operation, dispatch }) {
  const opRef = findRef(operation, Info.key)
  const test = vhfTestData({ ref: opRef })

  if (opRef) {
    const ref = findRef(qso?.refs, Info.key) || { type: Info.key }

    qso.their.grid = _trimmedGrid({ grid: qso.their?.grid ?? qso.their?.guess?.grid, test })
    const ourGrid = _trimmedGrid({ grid: operation.grid ?? '', test })

    qso.refs = replaceRef(qso.refs, Info.key, { ...ref, grid: qso.their.grid })

    const theirParts = [qso.their.grid]
    const ourParts = [ourGrid]

    qso.their.exchange = theirParts.filter(x => x).join(' ')
    qso.our.exchange = ourParts.filter(x => x).join(' ')
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

function _trimmedGrid ({ grid, test }) {
  return grid?.substring(0, test?.exchange?.[0] === 'grid6' ? 6 : 4)
}

function _nearDupesFor ({ test, qso, qsos, operation, ourGrid, theirGrid }) {
  let ourRollingGrid = _trimmedGrid({ grid: operation.grid, test })

  const nearDupes = qsos.filter(q => {
    if (!q.deleted && (q.event?.event === 'break' || q.event?.event === 'start')) {
      ourRollingGrid = _trimmedGrid({ grid: q?.event?.operation?.grid ?? '', test })
    }

    if (q.event || q.deleted || q.their?.call !== qso.their?.call || q.uuid === qso?.uuid) {
      return false
    }
    if (qso?.startAtMillis && q.startAtMillis > qso?.startAtMillis) {
      return false
    }

    if (ourRollingGrid === ourGrid) {
      const qsoGrid = _trimmedGrid({ grid: q.their?.grid ?? q.their?.guess?.grid ?? '', test })

      if (qsoGrid === theirGrid || !qsoGrid) {
        return true
      }
    }
    return false
  })
  return nearDupes
}
