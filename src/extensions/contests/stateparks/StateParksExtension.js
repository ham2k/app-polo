/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber } from '@ham2k/lib-format-tools'
import { superModeForMode } from '@ham2k/lib-operation-data'
import { filterRefs, findRef, filterNearDupes } from '@ham2k/lib-qson-tools'

import { Info } from './StateParksInfo'
import { ActivityOptions } from './StateParksActivityOptions'
import RAW_STATE_PARKS_DATA from './all-events.js'

export const STATE_PARKS_DATA = Object.fromEntries(RAW_STATE_PARKS_DATA.map(state => [state.key, state]))

const INVALID_BANDS = ['60m', '30m', '17m', '12m']

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
      { refs: [ReferenceHandler.decorateRef({ type: Info.key, ref: 'TXSPOTA' })] }
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
    const sp = spData({ ref })

    return [sp?.name ? `${sp.name} ${date.getFullYear()}` : 'Select a State Park Event', ref?.location].filter(x => x).join(' • ')
  },

  decorateRef: (ref) => {
    const sp = spData({ ref })

    return {
      ...ref,
      label: sp.name,
      shortLabel: `${_spShortForSP(sp)}: ${ref?.location}`
    }
  },

  keyForRef: (ref) => {
    const sp = spData({ ref })
    return `${Info.key}-${sp.key}`
  },

  suggestOperationTitle: ({ ref }) => {
    if (ref?.ref) {
      const sp = spData({ ref })
      return { for: _spShortForSP(sp), description: _spShortForSP(sp) }
    } else {
      return { for: Info.shortName }
    }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    // Uses regular POTA exports
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const ref = findRef(operation, Info.key)
    const sp = spData({ ref })

    const fields = [
      { CONTEST_ID: sp.key }
    ]

    return fields
  },

  scoringForQSO: ({ qso, qsos, operation, ref: scoredRef, score }) => {
    const sp = spData({ ref: scoredRef })
    // console.log('scoringForQSO', qso.key, scoredRef)

    const { band, mode } = qso

    if (INVALID_BANDS.indexOf(band) >= 0 || (sp.options?.invalidBands || []).indexOf(band) >= 0) {
      return { value: 0, alerts: ['invalidBand'], type: Info.key }
    }

    if (sp?.options?.validBands && sp?.options?.validBands?.indexOf(band) === -1) {
      return { value: 0, alerts: ['invalidBand'], type: Info.key }
    }

    const superMode = superModeForMode(mode)

    const activationRefs = filterRefs(operation, 'potaActivation').map(r => r.ref)
    const activationStateParks = activationRefs.filter(r => sp.parks[r])
    const qsoRefs = filterRefs(qso, 'pota').map(r => r.ref)
    const qsoStateParks = qsoRefs.filter(r => sp.parks[r])

    const value = (sp?.points?.[superMode] || 1) * (activationRefs.length || 1)

    const scoring = {
      value,
      mode: superMode,
      band,
      type: Info.key,
      activatedParks: activationStateParks,
      huntedParks: qsoStateParks,
      infos: [],
      notices: [],
      alerts: [],
      mults: [],
      bonuses: []
    }

    const baseCall = qso?.their?.baseCall || qso?.their?.guess?.baseCall

    if (sp?.bonusStations?.[baseCall]) {
      let bonusPrefix = ''
      if (sp.options?.bonusStationPerBandMode) {
        bonusPrefix = `${band}:${superMode}:`
      } else if (sp.options?.bonusStationPerMode) {
        bonusPrefix = `${superMode}:`
      }
      scoring.bonusStation = baseCall
      scoring.bonusStations.push(bonusPrefix + baseCall)
      if (score?.bonusStations?.[bonusPrefix + baseCall]) {
        scoring.infos.push('Bonus station')
      } else {
        scoring.bonusStationPoints = sp?.bonusStations?.[scoring.bonusStation]
        scoring.notices.push('Bonus station!')
      }
    }

    const nearDupes = filterNearDupes({ qso, qsos, operation, withSectionRefs: [scoredRef] })

    if (nearDupes.length === 0) {
      scoring.value = scoring.value * (qsoRefs.length || 1)
      return scoring
    } else {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => superModeForMode(q.mode) === superMode).length !== 0
      const sameBandModeDupes = nearDupes.filter(q => q.band === band && superModeForMode(q.mode) === superMode)
      const sameBandMode = sameBandModeDupes.length !== 0

      const bandModeRefs = new Set(sameBandModeDupes.map(q => filterRefs(q, 'pota').map(r => r.ref)).flat())
      const newbandModeRefCount = qsoRefs.filter(r => !bandModeRefs.has(r)).length

      if (sameBandMode && !newbandModeRefCount) {
        return { ...scoring, value: 0, alerts: ['duplicate'] }
      } else {
        scoring.value = scoring.value * (newbandModeRefCount || 1)

        const notices = [...(scoring.notices || [])]
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')
        if (newbandModeRefCount) notices.push('newRef')

        return { ...scoring, notices }
      }
    }
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, ref }) => {
    const sp = spData({ ref })

    if (!score?.key) score = undefined // Reset if score doesn't have the right shape

    score = score ?? {
      key: ref?.type,
      icon: Info.icon,
      label: sp.name,
      activatedParks: {},
      huntedParks: {},
      activatedParksCount: 0,
      huntedParksCount: 0,
      modes: {},
      bands: {},
      total: 0,
      bonus: 0,
      bonusTotal: 0,
      qsoCount: 0,
      qsoPoints: 0,
      dupeCount: 0,
      bonusStationsHunted: {},
      bonusStations: {}
    }

    if (qsoScore.value === 0) {
      score.dupeCount = score.dupeCount + 1
      return score
    }

    score.qsoPoints = score.qsoPoints + qsoScore.value

    qsoScore?.activatedParks?.forEach(park => {
      score.activatedParks[park] = (score.activatedParks[park] || 0) + 1
    })
    score.activatedParksCount = Object.values(score.activatedParks).filter(v => v >= 10).length

    qsoScore?.huntedParks?.forEach(park => {
      score.huntedParks[park] = (score.huntedParks[park] || 0) + 1
    })
    score.huntedParksCount = Object.values(score.huntedParks).length

    if (qsoScore.bonusStations) {
      qsoScore.bonusStations?.forEach(b => {
        score.bonusStations[b] = score.bonusStationPoints
      })
    }

    if (qsoScore.bonusStation) {
      score.bonusStationsHunted[qsoScore.bonusStation] = (score.bonusStationsHunted[qsoScore.bonusStation] || 0) + 1
    }

    score.bonusPoints = Object.values(score.bonusStations).reduce((a, b) => a + b, 0)

    if (sp.options?.bonusPoints?.perParkActivated) {
      score.bonusPoints = score.bonusPoints + (qsoScore.huntedParks.length || 1) * sp.options.bonusPoints.perParkActivated
    }

    if (sp.options?.bonusPoints?.perParkActivated) {
      score.bonusPoints = score.bonusPoints + (qsoScore.activatedParksCount * sp.options.bonusPoints.perParkActivated)
    }

    if (sp.options?.multipliers === 'stateParksActivatedAndHunted') {
      score.mult = (score.activatedParksCount + score.huntedParksCount) || 1
    } else if (sp.options?.multipliers === 'stateParksActivated') {
      score.mult = score.activatedParksCount || 1
    } else {
      score.mult = 1
    }

    score.total = score.qsoPoints * score.mult
    score.total = score.total + score.bonus

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    const sp = spData({ ref })

    if (!score.total) {
      score.summary = '0 pts'
      score.longSummary = '0 pts\nNo valid QSOs yet!'
      return score
    }

    score.summary = `${fmtNumber(score.total)} pts`

    score.label = `${sp.name}: ${fmtNumber(score.total)} points`

    const parts = []
    parts.push(`**${fmtNumber(score.qsoPoints)} points x ${score.mult} mults** ${score.dupeCount > 0 ? `(${score.dupeCount} dupe${score.dupeCount > 1 ? 's' : ''})` : ''}`)

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

    const longestBonus = Math.max(...Object.keys(sp.bonusStations ?? {}).map(s => s.length))
    if (sp.bonusStations) {
      parts.push(`### ${Object.keys(score?.bonusStations ?? {}).length} Bonus Stations`)
      line = '> '
      Object.keys(sp.bonusStations).forEach(station => {
        station = station.toUpperCase()
        if (score.bonusStations[station]) {
          line += `**~~${station}~~**${station.length < longestBonus ? ' '.repeat(longestBonus - station.length) : ''} `
        } else {
          line += `${station}${station.length < longestBonus ? ' '.repeat(longestBonus - station.length) : ''} `
        }
      })
      parts.push(line)
    }

    parts.push(`### ${score.huntedParksCount} State Parks hunted`)
    line = '> '
    Object.keys(sp.parks).forEach(park => {
      if (score.huntedParks[park]) {
        line += `**~~${park}~~**${park.length < 8 ? ' '.repeat(8 - park.length) : ''} `
      } else {
        line += `${park}${park.length < 8 ? ' '.repeat(8 - park.length) : ''} `
      }
    })
    parts.push(line)

    score.longSummary = '\n' + parts.join('\n')

    return score
  }
}

export function spData ({ ref }) {
  return STATE_PARKS_DATA[ref?.ref] || { options: {}, parks: {}, points: {}, short: 'State Parks Event' }
}

function _spShortForSP (sp) {
  if (sp.short) return sp.short
  if (sp.key.endsWith('SP')) return sp.key.replace('SP', ' SP OTA')
  else return `${sp.key} SP OTA`
}
