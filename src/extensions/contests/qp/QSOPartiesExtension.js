/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'

import { fmtNumber } from '@ham2k/lib-format-tools'
import { superModeForMode } from '@ham2k/lib-operation-data'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'
import { findRef, replaceRef } from '@ham2k/lib-qson-tools'

import { H2kTextInput, H2kTextInputWithSuggestions } from '../../../ui/index.js'
import { setOperationData } from '../../../store/operations'
import RAW_US_STATES from '../../../data/usStates.json'
import RAW_CANADIAN_PROVINCES from '../../../data/canadianProvinces.json'

import { Info } from './QSOPartiesInfo'
import { ActivityOptions } from './QSOPartiesActivityOptions'
import RAW_QSO_PARTY_DATA from './all-parties.js'
import { QSOPartiesPostSelfSpot, SpotsHook } from './QSOPartiesSpotting.js'

export const QSO_PARTY_DATA = Object.fromEntries(RAW_QSO_PARTY_DATA.map(party => [party.key, party]))

const INVALID_BANDS = ['60m', '30m', '17m', '12m']

const US_STATES = Object.fromEntries(Object.entries(RAW_US_STATES).map(([key, value]) => [key.toUpperCase(), value]))
const CANADIAN_PROVINCES = Object.fromEntries(Object.entries(RAW_CANADIAN_PROVINCES).map(([key, value]) => [key.toUpperCase(), value]))

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

// const QSOPartyDefs = { all: [], byKey: {} }

// function registerQPDefinitionsDataFile () {
//   registerDataFile({
//     key: 'qp-definitions',
//     name: 'QSO Parties',
//     description: 'Settings for each QSO Party',
//     infoURL: Info.infoURL,
//     icon: Info.icon,
//     maxAgeInDays: 30,
//     fetch: async (args) => {
//       return DEFAULT_QSO_PARTY_DATA
//       // return fetchAndProcessURL({
//       //   ...args,
//       //   url: 'https://ham2k.com/data/qso-parties.json',
//       //   process: (body) => JSON.parse(body)
//       // })
//     },
//     onLoad: (data) => {
//       const newData = {}
//       newData.all = data
//       newData.byKey = {}
//       data.forEach(def => {
//         newData.byKey[def.key] = def
//       })

//       Object.assign(QSOPartyDefs, newData)
//     },
//     onRemove: async () => {
//       Object.assign(QSOPartyDefs, { all: [], byKey: {} })
//     }
//   })
// }

const ActivityHook = {
  ...Info,
  Options: ActivityOptions,

  standardExchangeFields: { state: false, grid: false },

  mainExchangeForOperation,
  prepareNewQSO,
  processQSOBeforeSaveWithDispatch,

  sampleOperations: ({ settings, callInfo }) => {
    return [
      { refs: [ReferenceHandler.decorateRef({ type: Info.key, ref: 'NYQP', location: 'SUL' })] }
    ]
  },

  postSelfSpot: QSOPartiesPostSelfSpot

}

const ReferenceHandler = {
  ...Info,

  descriptionPlaceholder: '',
  description: (operation) => {
    let date
    if (operation?.qsos && operation.qsos[0]?.startAtMillis) date = Date.parse(operation.qsos[0].startAtMillis)
    else date = new Date()

    const ref = findRef(operation, Info.key)
    const qp = qpData({ ref })

    return [qp?.name ? `${qp.name} ${date.getFullYear()}` : 'Select a QSO Party', ref?.location].filter(x => x).join(' • ')
  },

  decorateRef: (ref) => {
    const qp = qpData({ ref })

    return {
      ...ref,
      label: `${qp.name}: ${ref?.location}`,
      shortLabel: `${_qpShortForQP(qp)}: ${ref?.location}`
    }
  },

  keyForRef: (ref) => {
    const qp = qpData({ ref })
    return `${Info.key}-${qp.short ?? qp.key}`
  },

  suggestOperationTitle: ({ ref }) => {
    if (ref?.ref) {
      const qp = qpData({ ref })
      return { for: _qpShortForQP(qp), subtitle: ref?.location, description: `${_qpShortForQP(qp)}: ${ref?.location}` }
    } else {
      return { for: Info.shortName }
    }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref?.type === Info?.key) {
      const qp = qpData({ ref })
      return [{
        format: 'adif',
        exportType: 'qp-adif',
        exportName: `${qp.name ?? 'QSO Party'}`,
        templateData: { handlerShortName: _qpShortForQP(qp), handlerName: qp.name },
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}'
      },
      {
        format: 'cabrillo',
        exportType: 'qp-cabrillo',
        exportName: `${qp.name ?? 'QSO Party'}`,
        refKey: qp.short,
        templateData: { handlerShortName: _qpShortForQP(qp), handlerName: qp.name },
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}'
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const ref = findRef(operation, Info.key)
    const qsoRef = findRef(qso, Info.key) || {}
    const qp = qpData({ ref })

    const hasNumbers = (qp?.exchange?.find(field => field === 'Number') !== undefined)
    const hasNames = (qp?.exchange?.find(field => field.startsWith('Name')) !== undefined)

    const fields = [
      { CONTEST_ID: qp.cabrilloName },
      { STX_STRING: ref?.location }
    ]

    if (hasNumbers) {
      const stxIndex = fields.findIndex(field => field.STX_STRING)
      fields[stxIndex] = { STX_STRING: `${qsoRef.ourNumber} ${fields[stxIndex]?.STX_STRING}`.trim() }
      fields.push({ STX: qsoRef.ourNumber })
    }

    if (hasNames) {
      const stxIndex = fields.findIndex(field => field.STX_STRING)
      fields[stxIndex] = { STX_STRING: `${ref.ourName} ${fields[stxIndex]?.STX_STRING}`.trim() }
      fields.push({ MY_NAME: ref.ourName })
    }

    if (qsoRef?.location) {
      fields.push({ SRX_STRING: qsoRef.location })
    } else {
      if (qso?.their?.guess?.entityCode === 'K' || qso?.their?.guess?.entityCode === 'VE') {
        fields.push({ SRX_STRING: qso?.their?.state ?? qso?.their?.guess?.state })
      } else {
        fields.push({ SRX_STRING: 'DX' })
      }
    }

    if (hasNumbers) {
      const srxIndex = fields.findIndex(field => field.SRX_STRING)
      fields[srxIndex] = { SRX_STRING: `${qsoRef.theirNumber} ${fields[srxIndex]?.SRX_STRING}`.trim() }
      fields.push({ SRX: qsoRef.theirNumber })
    }

    if (hasNames) {
      const srxIndex = fields.findIndex(field => field.SRX_STRING)
      fields[srxIndex] = { SRX_STRING: `${qsoRef.theirName} ${fields[srxIndex]?.SRX_STRING}`.trim() }
      fields.push({ NAME: qsoRef.theirName })
    }

    return fields
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)
    const qp = qpData({ ref })

    const ourLocations = qpSplitLocation(ref?.location)

    headers.push(['CONTEST', qp.cabrilloName])
    headers.push(['CALLSIGN', operation.stationCall || settings.operatorCall])
    headers.push(['LOCATION', ourLocations.join('/')])
    headers.push(['EMAIL', ref?.email])
    headers.push(['NAME', ''])
    if (operation.local?.operatorCall) headers.push(['OPERATORS', operation.local.operatorCall])
    if (operation.grid) headers.push(['GRID-LOCATOR', operation.grid])
    return headers
  },

  qsoToCabrilloParts: ({ qso, ref, operation, settings }) => {
    const qp = qpData({ ref })

    const hasNumbers = (qp?.exchange?.find(field => field === 'Number') !== undefined)
    const hasNames = (qp?.exchange?.find(field => field.startsWith('Name')) !== undefined)

    const ourLocations = qpSplitLocation(ref?.location)
    const weAreInState = ourLocations.find(loc => qpIsInState({ qp, location: loc }))

    const qsoRef = findRef(qso, Info.key)

    let theirLocations = qpSplitLocation(qsoRef?.location)
    let theyAreInState = theirLocations.find(c => qp.counties[c])

    if (theirLocations.length === 0) {
      if (qso?.their?.guess?.entityCode === 'K' || qso?.their?.guess?.entityCode === 'VE') {
        theirLocations = [qso?.their?.state ?? qso?.their?.guess?.state]
      } else {
        theirLocations = 'DX'
      }
      theyAreInState = false
    }

    if (!weAreInState && !theyAreInState) {
      return []
    }

    const ourCall = operation.stationCall || settings.operatorCall

    const rows = []
    for (const ourLocation of ourLocations) {
      for (const theirLocation of theirLocations) {
        const row = []
        row.push((ourCall ?? '-').padEnd(13, ' '))
        row.push((qso?.mode === 'CW' || qso?.mode === 'RTTY' ? settings?.defaultReportCW || '599' : settings?.defaultReport || '59').padEnd(3, ' '))
        if (hasNumbers) row.push((qsoRef.ourNumber ?? '0').padEnd(6, ' '))
        if (hasNames) row.push((ref.ourName ?? '-').padEnd(10, ' '))
        row.push((ourLocation ?? '-').padEnd(6, ' '))
        row.push((qso?.their?.call ?? '-').padEnd(13, ' '))
        row.push((qso?.mode === 'CW' || qso?.mode === 'RTTY' ? settings?.defaultReportCW || '599' : settings?.defaultReport || '59').padEnd(3, ' '))
        if (hasNumbers) row.push((qsoRef.theirNumber ?? '-').padEnd(6, ' '))
        if (hasNames) row.push((qsoRef.theirName ?? '-').padEnd(10, ' '))
        row.push((theirLocation ?? '-').padEnd(6, ' '))
        rows.push(row)
      }
    }
    return rows
  },

  relevantInfoForQSOItem: ({ qso, operation }) => {
    const qsoRef = findRef(qso, Info.key)
    if (qsoRef) {
      return [qso.their.exchange]
    }
  },

  scoringForQSO: ({ qso, qsos, operation, ref: scoredRef, score }) => {
    const qp = qpData({ ref: scoredRef })
    // console.log('scoringForQSO', qso.key, scoredRef)

    const ourLocations = qpParseLocations({ qp, location: scoredRef?.location })
    // console.log('-- ourLocations', ourLocations)
    const weAreInState = ourLocations?.every(loc => loc.inState)

    const qsoRef = findRef(qso, Info.key)

    let theirLocations = qpParseLocations({ qp, qso, location: qsoRef?.location || _defaultLocationFor({ qp, qso, qsos, operation }), weAreInState })
    const theyAreInState = theirLocations?.every(loc => loc.inState)
    // console.log('-- theirLocations', theirLocations)

    // const locationGuess = qsoRef?.location ?? _defaultLocationFor({ qso, qp, qsos, operation })

    if (!weAreInState && !theyAreInState) {
      theirLocations = []
    }

    const { band, mode } = qso

    if (INVALID_BANDS.indexOf(band) >= 0 || (qp.options?.invalidBands || []).indexOf(band) >= 0) {
      return { value: 0, alerts: ['invalidBand'], type: Info.key, weAreInState }
    }

    const superMode = superModeForMode(mode)

    const nearDupes = _nearDupesFor({ qp, qso, qsos, operation, ourLocations, theirLocations, weAreInState, theyAreInState })

    const locationMultiplier = ourLocations.length * theirLocations.length // For county line operations

    let value = (qp?.points?.[superMode] || 1) * locationMultiplier

    if (qp?.inStateToOutOfStatePointsDouble && weAreInState && !theyAreInState) {
      value = value * 2
    }

    const multPrefix = qpMultPrefix({ qp, band, mode: superMode, ourLocations, weAreInState, theyAreInState })

    const scoring = {
      value,
      theirLocations,
      weAreInState,
      theyAreInState,
      multPrefix,
      mode: superMode,
      band,
      type: Info.key,
      infos: [],
      notices: [],
      alerts: [],
      mults: [],
      bonuses: []
    }

    if (qp?.rareCountyQSOMultiplier) {
      scoring.rareCounties = scoring.rareCounties ?? []
      theirLocations.forEach(location => {
        const mult = qp?.rareCountyQSOMultiplier?.[location?.location]
        if (mult) {
          scoring.rareCounties.push(location?.location)
          scoring.value = scoring.value * mult
        }
      })
      if (scoring.rareCounties?.length >= 1) {
        scoring.notices.push('Rare!')
      }
      if (qp.bonus?.rareCountySweep) {
        const minimumCount = qp.bonus.rareCountySweepMinimumCount ?? qp.bonus.rareCountyQSOMultiplier?.length ?? 1
        if (Object.keys(score?.rareCounties ?? {}).length === minimumCount - 1) {
          if (scoring.rareCounties.find(c => !scoring.rareCounties[c])) {
            // If we're one short, and this QSO has a new one, replace notice with Sweep!
            scoring.notices[scoring.notices.length - 1] = 'Rare County Sweep!'
          }
        }
      }
    }
    theirLocations.forEach(location => {
      let loc = location.location
      let mult
      if (loc) {
        if (qp?.counties?.[loc]) {
          mult = multPrefix + loc
          scoring.counties = scoring.counties ?? []
          scoring.counties.push(loc)
          if (qp.options.countiesAreMultForInState === false) {
            mult = loc.substring(0, 2)
          }
        } else if (US_STATES[loc] || loc === 'DC') {
          mult = multPrefix + loc
          scoring.state = loc
        } else if (CANADIAN_PROVINCES[loc]) {
          mult = multPrefix + loc
          scoring.province = loc
        } else {
          if (!!qp.options.dxIsMultiplier || qp.options.dxEntityIsMultiplier) {
            if (qp.options.dxEntityIsMultiplier) {
              const dxcc = qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix
              loc = dxcc
              if (!qp.options.dxEntityMultiplierMax || scoring.entities?.length < qp.options.dxEntityMultiplierMax) {
                mult = multPrefix + 'DX' + loc
                scoring.entity = loc
              } else {
                // Don't count as multiplier if we're over max
                loc = ''
              }
            } else {
              loc = 'DX'
              mult = multPrefix + loc
              scoring.entity = loc
            }
          }
        }

        if (mult) scoring.mults.push(mult)

        if (score?.mults?.[mult]) {
          scoring.infos.push(`${location.name}`)
        } else if (loc) {
          scoring.newMult = true
          scoring.notices.push(`${location.name}`)
        }
      }
    })

    const baseCall = qso?.their?.baseCall || qso?.their?.guess?.baseCall
    if (qp?.bonusStations?.[baseCall]) {
      let mult = 1
      if (qp?.options?.bonusStationInStateMult && weAreInState) {
        mult = qp?.options?.bonusStationInStateMult
      } else if (qp?.options?.bonusStationOutOfStateMult && !weAreInState) {
        mult = qp?.options?.bonusStationOutOfStateMult
      }

      if (mult > 0) {
        let bonusPrefix = ''
        if (qp.options?.bonusPerBandMode) {
          bonusPrefix = `${band}:${superMode}:`
        } else if (qp.options?.bonusPerMode) {
          bonusPrefix = `${superMode}:`
        }
        scoring.bonusStation = baseCall
        scoring.bonuses.push(bonusPrefix + baseCall)
        if (score?.bonuses?.[bonusPrefix + baseCall]) {
          scoring.infos.push('Bonus')
        } else {
          scoring.bonus = qp?.bonusStations?.[scoring.bonusStation] * mult
          scoring.notices.push('Bonus station!')
        }
      }
    }

    if (nearDupes.length === 0) {
      return scoring
    } else {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => superModeForMode(q.mode) === superMode).length !== 0
      const sameBandMode = nearDupes.filter(q => q.band === band && superModeForMode(q.mode) === superMode).length !== 0

      const sameLocation = nearDupes.filter(q => {
        const dupeRef = findRef(q, Info.key)
        const dupeLocations = qpParseLocations({ qp, qso, location: dupeRef?.location, weAreInState, theyAreInState })

        return theirLocations.some(location => dupeLocations?.some(dupeLocation => dupeLocation.location === location.location))
      }).length !== 0

      if (sameBandMode && sameLocation) {
        return { ...scoring, value: 0, alerts: ['duplicate'] }
      } else {
        const notices = [...(scoring.notices || [])]
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')
        if (!sameLocation && theirLocations.length > 0) notices.push('newRef')

        return { ...scoring, notices }
      }
    }
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, ref }) => {
    const qp = qpData({ ref })

    if (!score?.key) score = undefined // Reset if score doesn't have the right shape

    score = score ?? {
      key: ref?.type,
      icon: Info.icon,
      label: qp.name,
      weAreInState: qsoScore.weAreInState,
      total: 0,
      bonus: 0,
      bonusTotal: 0,
      qsoCount: 0,
      qsoPoints: 0,
      dupeCount: 0,
      modes: {},
      mults: {},
      bonuses: {},
      states: {},
      provinces: {},
      counties: {},
      entities: {},
      bonusStations: {},
      rareCounties: {}
    }

    if (qsoScore.value === 0) {
      score.dupeCount = score.dupeCount + 1
      return score
    }

    if (qp.options.selfCountsForCounty && !score.counties[ref?.location]) {
      if (qp.counties[ref.location]) {
        score.counties[ref.location] = 1
        score.mults[`${qsoScore.multPrefix}${ref.location}`] = 1
      }
    }

    score.qsoPoints = score.qsoPoints + qsoScore.value

    if (qsoScore?.counties) {
      qsoScore.counties.forEach(location => {
        score.counties[location] = (score.counties[location] || 0) + 1
        if (qp.options.countiesAreMultForInState === false) {
          const state = location.substring(0, 2)
          score.states[state] = (score.states[state] || 0) + 1
        }
      })
    } else if (qsoScore?.state) {
      score.states[qsoScore.state] = (score.states[qsoScore.state] || 0) + 1
    } else if (qsoScore?.province) {
      score.provinces[qsoScore.province] = (score.provinces[qsoScore.province] || 0) + 1
    } else if (qsoScore?.entity) {
      score.entities[qsoScore.entity] = (score.entities[qsoScore.entity] || 0) + 1
    }

    qsoScore?.mults?.forEach(mult => {
      score.mults[mult] = (score.mults[mult] || 0) + 1
    })

    let oneTimeBonuses = 0

    if (qsoScore.bonus) {
      score.bonus = score.bonus + qsoScore.bonus
    }
    if (qsoScore.bonuses) {
      qsoScore.bonuses?.forEach(b => {
        score.bonuses[b] = (score.bonuses[b] || 0) + score.bonus
      })
    }
    if (qsoScore.bonusStation) {
      score.bonusStations[qsoScore.bonusStation] = score.bonus
    }
    if (qp.bonus?.rareCountySweep && qsoScore.rareCounties) {
      qsoScore.rareCounties.forEach(county => {
        score.rareCounties[county] = (score.rareCounties[county] || 0) + 1
      })
      const minimumCount = qp.bonus.rareCountySweepMinimumCount ?? qp.bonus.rareCountyQSOMultiplier?.length ?? 1
      if (Object.keys(score.rareCounties).length >= minimumCount) {
        oneTimeBonuses = oneTimeBonuses + qp.bonus.rareCountySweep
      }
    }

    score.mult = Object.keys(score.mults).length

    score.bonusTotal = score.bonus + oneTimeBonuses

    if (qp.options.bonusPostMultiplier) {
      score.total = (score.qsoPoints * score.mult) + score.bonusTotal
    } else {
      score.total = (score.qsoPoints + score.bonusTotal) * score.mult
    }

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    const qp = qpData({ ref })

    const ourLocations = qpSplitLocation(ref?.location)
    const weAreInState = ourLocations.every(loc => qp.counties[loc])

    if (!score.total) {
      score.summary = '0 pts'
      score.longSummary = '0 pts\nNo valid QSOs yet!'
      return score
    }

    score.summary = `${fmtNumber(score.total)} pts`

    score.label = `${qp.name}: ${fmtNumber(score.total)} points`

    const parts = []
    if (score.bonusTotal > 0) {
      if (qp.options.bonusPostMultiplier) {
        parts.push(`**${fmtNumber(score.qsoPoints)} points x ${score.mult} mults + ${fmtNumber(score.bonusTotal)} bonus**`)
      } else {
        parts.push(`**${fmtNumber(score.qsoPoints)} points + ${fmtNumber(score.bonusTotal)} bonus x ${score.mult} mults**`)
      }
    } else {
      parts.push(`**${fmtNumber(score.qsoPoints)} points x ${score.mult} mults** ${score.dupeCount > 0 ? `(${score.dupeCount} dupe${score.dupeCount > 1 ? 's' : ''})` : ''}`)
    }

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

    if (qp.options.countiesCountForInState !== false || !weAreInState) {
      const longestCounty = Math.max(...Object.keys(qp.counties ?? {}).map(c => c.length))

      parts.push(`### ${Object.keys(score?.counties ?? {}).length} ${_qpShortForQP(qp)} ${qp.options?.labelForCounties ?? 'Counties'}`)
      line = '> '
      Object.keys(qp.counties).forEach(county => {
        county = county.toUpperCase()
        if (score.counties[county]) {
          line += `**~~${county}~~**${county.length < longestCounty ? ' '.repeat(longestCounty - county.length) : ''} `
        } else {
          line += `${county}${county.length < longestCounty ? ' '.repeat(longestCounty - county.length) : ''} `
        }
      })
      parts.push(line)
    }

    if (qp.rareCountyQSOMultiplier) {
      parts.push(`### ${Object.keys(score?.rareCounties ?? {}).length} Rare Counties`)

      if (qp.bonus?.rareCountySweep) {
        const minimumCount = qp.bonus.rareCountySweepMinimumCount ?? qp.bonus.rareCountyQSOMultiplier?.length ?? 1
        if (Object.keys(score?.rareCounties ?? {}).length >= minimumCount) {
          parts[parts.length - 1] = parts[parts.length - 1] + ` • **Sweep! +${fmtNumber(qp.bonus.rareCountySweep)} points**`
        }
      }

      line = '> '
      Object.keys(qp.rareCountyQSOMultiplier).sort().forEach(county => {
        if (score.rareCounties[county]) {
          line += `**~~${county}~~** `
        } else {
          line += `${county} `
        }
      })
      parts.push(line)
    }

    if (weAreInState) {
      parts.push(`### ${Object.keys(score?.states ?? {}).length} US States`)
      line = '> '
      Object.keys(US_STATES).forEach(state => {
        state = state.toUpperCase()
        if (score.states[state]) {
          line += `**~~${state}~~** `
        } else {
          line += `${state} `
        }
      })
      if (!qp.options.dcCountsAsMaryland) {
        if (score.states.DC) {
          line += '**~~DC~~** '
        } else {
          line += 'DC '
        }
      }
      parts.push(line)

      parts.push(`### ${Object.keys(score?.provinces ?? {}).length} Canadian Provinces`)
      line = '> '
      Object.keys(CANADIAN_PROVINCES).forEach(province => {
        province = province.toUpperCase()
        if (score.provinces[province]) {
          line += `**~~${province}~~** `
        } else {
          line += `${province} `
        }
      })
      parts.push(line)

      if (qp.options.dxEntityIsMultiplier) {
        const count = Object.keys(score?.entities ?? {}).length
        if (count === 1) {
          parts.push(`### ${count} DX Entity`)
        } else {
          parts.push(`### ${count} DX Entities`)
        }
        line = '> '
        Object.keys(score.entities).sort().forEach(entity => {
          line += `**~~${entity}~~** `
        })
        parts.push(line)
      } else if (qp.options.dxIsMultiplier) {
        const count = Object.keys(score?.entities ?? {}).length
        if (count === 1) {
          parts.push(`### ${count} Other Multiplier`)
        } else {
          parts.push(`### ${count} Other Multipliers`)
        }
        line = '> '
        if (score.entities.DX) {
          line += '**~~DX~~** '
        } else {
          line += 'DX '
        }
        parts.push(line)
      }
    }
    const longestBonus = Math.max(...Object.keys(qp.bonusStations ?? {}).map(s => s.length))
    if (qp.bonusStations) {
      parts.push(`### ${Object.keys(score?.bonusStations ?? {}).length} Bonus Stations`)
      line = '> '
      Object.keys(qp.bonusStations).forEach(station => {
        station = station.toUpperCase()
        if (score.bonusStations[station]) {
          line += `**~~${station}~~**${station.length < longestBonus ? ' '.repeat(longestBonus - station.length) : ''} `
        } else {
          line += `${station}${station.length < longestBonus ? ' '.repeat(longestBonus - station.length) : ''} `
        }
      })
      parts.push(line)
    }

    score.longSummary = '\n' + parts.join('\n')

    return score
  },

  activitySpecificSpots: SpotsHook
}

function mainExchangeForOperation (props) {
  const { qso, qsos, operation, updateQSO, styles, disabled, refStack, settings, suggestions, vfo, ...moreProps } = props

  const qsoRef = findRef(qso?.refs, Info.key) || { type: Info.key, class: undefined, location: undefined }
  const opRef = findRef(operation, Info.key)
  const qp = qpData({ ref: opRef })

  const hasNumbers = (qp?.exchange?.find(field => field === 'Number') !== undefined)
  const hasNames = (qp?.exchange?.find(field => field.startsWith('Name')) !== undefined)

  const fields = []
  if (hasNumbers) {
    fields.push(
      <H2kTextInput
        {...moreProps}
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
        {...moreProps}
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

  if (hasNames) {
    fields.push(
      <H2kTextInput
        {...moreProps}
        key={`${Info.key}/theirName`}
        innerRef={refStack.shift()}
        style={[styles.input, { minWidth: styles.oneSpace * 10, flex: 1 }]}
        textStyle={styles.text.callsign}
        label={'QP Name'}
        placeholder={'Name'}
        keyboard="dumb"
        uppercase={true}
        noSpaces={true}
        value={qsoRef?.theirName ?? ''}
        disabled={disabled}
        error={false}
        onChangeText={(text) => updateQSO({
          refs: replaceRef(qso?.refs, Info.key, { ...qsoRef, theirName: text, guess: false })
        })}
      />
    )
  }

  fields.push(
    <H2kTextInputWithSuggestions
      {...moreProps}
      key={`${Info.key}/location`}
      fieldId={'refs[qp].location'}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * (qp.options?.countyLine ? 9 : 7), flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'QP Location'}
      placeholder={''}
      keyboard={'dumb'}
      uppercase={true}
      noSpaces={true}
      periodToSlash={true}
      value={qsoRef?.location ?? _defaultLocationFor({ qp, qso, qsos, operation }) ?? ''}
      error={qsoRef?.location && !qpNormalizeLocation({ qp, qso, location: qsoRef.location })}
      suggestions={_suggestionsFor({ qso, qp })}
      minimumLengthForSuggestions={3}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...qsoRef, location: text })
      })}
    />
  )
  return fields
}

function prepareNewQSO ({ operation, qso }) {
  const opRef = findRef(operation, Info.key)
  if (!opRef) return qso

  const qsoRef = findRef(qso.refs, Info.key) || { type: Info.key }
  const qp = qpData({ ref: opRef })
  const hasNumbers = (qp?.exchange?.find(field => field === 'Number') !== undefined)

  if (hasNumbers) {
    qsoRef.ourNumber = `${opRef.nextNumber || 1}`
    qso.refs = replaceRef(qso.refs, Info.key, qsoRef)
  }

  return qso
}

async function processQSOBeforeSaveWithDispatch ({ qso, qsos, operation, dispatch }) {
  const opRef = findRef(operation, Info.key)
  const qp = qpData({ ref: opRef })

  if (opRef) {
    const ref = findRef(qso?.refs, Info.key) || { type: Info.key, class: undefined, location: undefined }
    ref.location = ref.location ?? _defaultLocationFor({ qp, qso, qsos, operation })

    if (ref.location || ref.ourNumber || ref.theirNumber) {
      qso.refs = replaceRef(qso.refs, Info.key, ref)
      qso.their.exchange = [ref.theirNumber, ref.location].filter(x => x).join(' ')
      if (ref.ourNumber) {
        qso.our.exchange = [ref.ourNumber, opRef.location].filter(x => x).join(' ')
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

function _suggestionsFor ({ qso, qp }) {
  const prefix = qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix
  if (prefix === 'K') {
    if (qp.options.entity !== 'VE') {
      return Object.entries({ ...qp.counties, ...US_STATES, ...(qp.otherQPCounties ?? {}) })
    } else {
      return Object.entries({ ...US_STATES })
    }
  } else if (prefix === 'VE') {
    if (qp.options.entity === 'VE') {
      return Object.entries({ ...qp.counties, ...CANADIAN_PROVINCES, ...(qp.otherQPCounties ?? {}) })
    } else {
      return Object.entries({ ...CANADIAN_PROVINCES })
    }
  } else if (prefix) return []
  else return Object.entries({ ...qp.counties, ...US_STATES, ...CANADIAN_PROVINCES, ...(qp.otherQPCounties ?? {}) })
}

function _defaultLocationFor ({ qso, qp, qsos, operation }) {
  const matching = qsos.filter(q => q.their?.call === qso?.their?.call)
  if (matching.length > 0) return matching[matching.length - 1].refs?.find(r => r.type === Info.key)?.location

  const prefix = qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix
  if (prefix === 'K' || prefix === 'VE') {
    return undefined
  } else if (prefix) {
    if (qp?.options?.dxLocationIsPrefix) {
      return qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix
    } else {
      return 'DX'
    }
  } else {
    return undefined
  }
}

function _nearDupesFor ({ qp, qso, qsos, operation, ourLocations, theirLocations, weAreInState, theyAreInState }) {
  let ourRollingLocations = qpParseLocations({ qp, qso, location: findRef(operation, Info.key)?.location, weAreInState, theyAreInState })

  const nearDupes = qsos.filter(q => {
    if (!q.deleted && (q.event?.event === 'break' || q.event?.event === 'start')) {
      ourRollingLocations = qpParseLocations({ qp, qso, location: findRef(q.event.operation, Info.key)?.location, weAreInState, theyAreInState })
    }

    if (q.event || q.deleted || q.their?.call !== qso.their?.call || q.uuid === qso?.uuid) {
      return false
    }
    if (qso?.startAtMillis && q.startAtMillis > qso?.startAtMillis) {
      return false
    }

    if (ourRollingLocations.some(rollLoc => ourLocations.some(ourLoc => ourLoc.location === rollLoc.location))) {
      return true
    }
    return false
  })
  return nearDupes
}

const SLASH_OR_COMMA_REGEX = /[/,]/

export function qpSplitLocation (location) {
  let locations = location?.split(SLASH_OR_COMMA_REGEX) ?? []

  if (locations.length > 1 && locations[0].length > 4) {
    const state = locations[0].substring(0, 2)
    locations = locations.map(loc => loc.length < 4 ? state + loc : loc)
  }

  return locations
}

export function qpParseLocations ({ qp, location, qso, weAreInState, theyAreInState }) {
  return qpSplitLocation(location)
    .map(loc => qpNormalizeLocation({ qp, qso, location: loc, weAreInState, theyAreInState }))
    .filter(loc => loc)
    .map(loc => {
      if (qp.options.countiesAreMultForInState === false && weAreInState && theyAreInState) {
        // In the New England QSO Party, counties are not multipliers for in-state QSOs, only as states
        return {
          location: loc,
          multLocation: loc.substring(0, 2),
          name: qpNameForLocation({ qp, qso, location: loc }),
          inState: qpIsInState({ qp, location: loc })
        }
      } else if (qp.options.dxIsMultiplier && qp.options.dxEntityIsMultiplier && loc === 'DX') {
        return {
          location: loc,
          multLocation: `DX:${qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix}`,
          name: qpNameForLocation({ qp, qso, location: loc }),
          inState: qpIsInState({ qp, location: loc })
        }
      } else {
        return {
          location: loc,
          multLocation: loc,
          name: qpNameForLocation({ qp, qso, location: loc }),
          inState: qpIsInState({ qp, location: loc })
        }
      }
    })
}

export function qpNormalizeLocation ({ qp, qso, location, weAreInState, theyAreInState }) {
  location = location?.toUpperCase() || ''
  if (qp.counties[location]) {
    if (qp.options.countiesCountForInState === false) {
      if (weAreInState && theyAreInState) {
        if (qp.countyToState && qp.countyToState[location]) {
          return qp.countyToState[location]
        } else {
          // Assume the county abbreviation includes the state as the first two characters
          return location.substring(0, 2)
        }
      } else {
        return location
      }
    } else {
      return location
    }
  } else {
    // For long locations, assume the state is the first two characters
    if (location.length > 4) {
      location = location.substring(0, 2)
    }

    if (location === 'DC' && qp.options.dcCountsAsMaryland) {
      return 'MD'
    } else if (location === 'MD' && qp.options.dcCountsAsMaryland) {
      return 'DC'
    } else if (location === 'DC' && !qp.options.dcCountsAsMaryland) {
      return 'DC'
    } else if (US_STATES[location]) {
      return location
    } else if (CANADIAN_PROVINCES[location]) {
      return location
    } else if ((qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix) === 'KL7') {
      return 'AK'
    } else if ((qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix) === 'KH6') {
      return 'HI'
    } else if (qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix) {
      return 'DX'
    }
  }
  return ''
}

export function qpData ({ ref }) {
  return QSO_PARTY_DATA[ref?.ref] || { options: {}, counties: {}, points: {}, short: 'QSO Party' }
}

export function qpMultPrefix ({ qp, band, mode, weAreInState }) {
  if (qp.options.multsPerBandMode || (qp.options.inStateMultsPerBand && weAreInState) || (qp.options.outOfStateMultsPerBand && !weAreInState)) {
    return `${band}:${mode}:`
  } else if (qp.options.multsPerBand || (qp.options.inStateMultsPerBand && weAreInState) || (qp.options.outOfStateMultsPerBand && !weAreInState)) {
    return `${band}:`
  } else if (qp.options.multsPerMode || (qp.options.inStateMultsPerBand && weAreInState) || (qp.options.outOfStateMultsPerBand && !weAreInState)) {
    return `${mode}:`
  } else {
    return ''
  }
}

export function qpNameForLocation ({ qp, qso, location }) {
  location = location?.toUpperCase() || ''
  const county = qp.counties[location] || qp.otherQPCounties?.[location]

  if (county) {
    return county
  } else if (location === 'DC' && qp.options.dcCountsAsMaryland) {
    return 'Maryland & DC'
  } else if (location === 'MD' && qp.options.dcCountsAsMaryland) {
    return 'Maryland & DC'
  } else if (location === 'DC' && !qp.options.dcCountsAsMaryland) {
    return 'District of Columbia'
  } else if (US_STATES[location]) {
    return `${US_STATES[location]}`
  } else if (CANADIAN_PROVINCES[location]) {
    return `${CANADIAN_PROVINCES[location]}`
  } else if (location === 'DX') {
    if (qp.options.dxEntityIsMultiplier) {
      const prefix = qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix
      if (DXCC_BY_PREFIX[prefix]) {
        return `DX: ${DXCC_BY_PREFIX[prefix]?.name}`
      } else {
        return `DX: ${prefix}`
      }
    } else {
      return 'DX'
    }
  } else {
    return location
  }
}

export function qpIsInState ({ qp, location }) {
  location = location?.toUpperCase() || ''
  return !!qp.counties[location]
}

export function qpLabelForLocation ({ qp, location }) {
  location = location?.toUpperCase() || ''
  const county = qp.counties[location] || qp.otherQPCounties?.[location]
  if (county) {
    return `In-state: *${location}* ${county}`
  } else if (location === 'DC' && qp.options.dcCountsAsMaryland) {
    return 'Out-of-state: *DC* Maryland & DC'
  } else if (location === 'MD' && qp.options.dcCountsAsMaryland) {
    return 'Out-of-state: *MD* Maryland & DC'
  } else if (location === 'DC' && !qp.options.dcCountsAsMaryland) {
    return 'Out-of-state: *DC* District of Columbia'
  } else if (US_STATES[location]) {
    return `Out-of-state: *${location}* ${US_STATES[location]}`
  } else if (CANADIAN_PROVINCES[location]) {
    return `Out-of-state: *${location}* ${CANADIAN_PROVINCES[location]}`
  } else if (location === 'DX') {
    return 'Out-of-state: *DX* Other country'
  }
}

function _qpShortForQP (qp) {
  if (qp.short) return qp.short
  if (qp.key.endsWith('QP')) return qp.key
  else return `${qp.key}QP`
}
