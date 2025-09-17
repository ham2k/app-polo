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

import { findRef, replaceRef } from '../../../tools/refTools'
import { H2kTextInput, H2kTextInputWithSuggestions } from '../../../ui/index.js'
import { setOperationData } from '../../../store/operations'

import RAW_US_STATES from '../../../data/usStates.json'
import RAW_CANADIAN_PROVINCES from '../../../data/canadianProvinces.json'

import { Info } from './QSOPartiesInfo'
import { ActivityOptions } from './QSOPartiesActivityOptions'

import RAW_QSO_PARTY_DATA from './all-parties.js'

export const QSO_PARTY_DATA = Object.fromEntries(RAW_QSO_PARTY_DATA.map(party => [party.key, party]))

const INVALID_BANDS = ['60m', '30m', '17m', '12m']

const US_STATES = Object.fromEntries(Object.entries(RAW_US_STATES).map(([key, value]) => [key.toUpperCase(), value]))
const CANADIAN_PROVINCES = Object.fromEntries(Object.entries(RAW_CANADIAN_PROVINCES).map(([key, value]) => [key.toUpperCase(), value]))

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

// const QSOPartyDefs = { all: [], byKey: {} }

// function registerQPDefinitionsDataFile () {
//   registerDataFile({
//     key: 'qp-definitions',
//     name: 'QSO Parties',
//     description: 'Settings for each QSO Party',
//     infoURL: Info.infoURL,
//     icon: Info.icon,
//     maxAgeInDays: 30,
//     enabledByDefault: true,
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

  hideStateField: true,

  mainExchangeForOperation,
  prepareNewQSO,
  processQSOBeforeSaveWithDispatch,

  sampleOperations: ({ settings, callInfo }) => {
    return [
      { refs: [ReferenceHandler.decorateRef({ type: Info.key, ref: 'NYQP', location: 'SUL' })] }
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

  suggestOperationTitle: (ref) => {
    if (ref?.ref) {
      const qp = qpData({ ref })
      return { for: _qpShortForQP(qp), subtitle: ref?.location }
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
        exportName: `${qp.name ?? 'QSO Party'} ADIF`,
        templateData: { handlerShortName: _qpShortForQP(qp), handlerName: qp.name },
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}'
      },
      {
        format: 'cabrillo',
        exportType: 'qp-cabrillo',
        exportName: `${qp.name ?? 'QSO Party'} Cabrillo`,
        templateData: { handlerShortName: _qpShortForQP(qp), handlerName: qp.name },
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}'
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const ref = findRef(operation, Info.key)
    const qsoRef = findRef(qso, Info.key)
    const qp = qpData({ ref })

    const hasNumbers = (qp?.exchange?.[0] === 'Number')

    const fields = [
      { CONTEST_ID: qp.cabrilloName },
      { STX_STRING: ref?.location }
    ]

    if (hasNumbers) {
      fields[1] = { STX_STRING: `${qsoRef.ourNumber} ${fields[1]?.STX_STRING}` }
      fields.push({ STX: qsoRef.ourNumber })
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
      fields[3] = { SRX_STRING: `${qsoRef.theirNumber} ${fields[3]?.SRX_STRING}` }
      fields.push({ SRX: qsoRef.theirNumber })
    }

    return fields
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)
    const qp = qpData({ ref })

    let ourLocations = ref?.location
    if (ref?.location?.match(SLASH_OR_COMMA_REGEX)) {
      ourLocations = ref.location.split(SLASH_OR_COMMA_REGEX, 2)
    } else {
      ourLocations = [ref?.location]
    }

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

    const hasNumbers = (qp?.exchange?.[0] === 'Number')

    let ourLocations = ref?.location
    let weAreInState
    if (ref?.location?.match(SLASH_OR_COMMA_REGEX) && qp.options?.countyLine) {
      ourLocations = ref.location.split(SLASH_OR_COMMA_REGEX, 2)
      weAreInState = ref.location.split(SLASH_OR_COMMA_REGEX).every(c => qp.counties[c])
    } else {
      ourLocations = [ref?.location]
      weAreInState = !!qp.counties[ref?.location]
    }

    const qsoRef = findRef(qso, Info.key)

    let theirLocations
    let theyAreInState
    if (qsoRef?.location?.match(SLASH_OR_COMMA_REGEX) && qp.options?.countyLine) {
      theirLocations = qsoRef?.location.split(SLASH_OR_COMMA_REGEX, 2)
      theyAreInState = theirLocations.every(c => qp.counties[c])
    } else if (qsoRef?.location) {
      theirLocations = [qsoRef?.location]
      theyAreInState = !!qp.counties[qsoRef?.location]
    } else {
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
        row.push((ourCall ?? ' ').padEnd(13, ' '))
        row.push((qso?.mode === 'CW' || qso?.mode === 'RTTY' ? '599' : '59').padEnd(3, ' '))
        if (hasNumbers) row.push((qsoRef.ourNumber ?? ' ').padEnd(6, ' '))
        row.push((ourLocation ?? ' ').padEnd(6, ' '))
        row.push((qso?.their?.call ?? '').padEnd(13, ' '))
        row.push((qso?.mode === 'CW' || qso?.mode === 'RTTY' ? '599' : '59').padEnd(3, ' '))
        if (hasNumbers) row.push((qsoRef.theirNumber ?? ' ').padEnd(6, ' '))
        row.push((theirLocation ?? ' ').padEnd(6, ' '))
        rows.push(row)
      }
    }
    return rows
  },

  relevantInfoForQSOItem: ({ qso, operation }) => {
    return [qso.their.exchange]
  },

  scoringForQSO: ({ qso, qsos, operation, ref, score }) => {
    const qp = qpData({ ref })

    let ourLocations = ref?.location
    let weAreInState
    if (ref?.location?.match(SLASH_OR_COMMA_REGEX) && qp.options?.countyLine) {
      ourLocations = ref.location.split(SLASH_OR_COMMA_REGEX, 2)
      if (!qp.options?.countyLine) ourLocations = ourLocations.slice(0, 1)
      weAreInState = ref.location.split(SLASH_OR_COMMA_REGEX).every(c => qp.counties[c])
    } else {
      ourLocations = [ref?.location]
      weAreInState = !!qp.counties[ref?.location]
    }

    const qsoRef = findRef(qso, Info.key)

    let theirLocations = []
    let theyAreInState
    if (qsoRef?.location?.match(SLASH_OR_COMMA_REGEX) && qp.options?.countyLine) {
      theirLocations = qsoRef?.location.split(SLASH_OR_COMMA_REGEX, 2)
      if (!qp?.options?.countyLine) theirLocations = theirLocations.slice(0, 1)
      theyAreInState = theirLocations.every(c => qp.counties[c])
    } else if (qsoRef?.location) {
      theirLocations = [qsoRef?.location]
      theyAreInState = !!qp.counties[qsoRef?.location]
    } else {
      if (qso?.their?.guess?.entityCode === 'K' || qso?.their?.guess?.entityCode === 'VE') {
        theirLocations = [qso?.their?.state ?? qso?.their?.guess?.state]
      } else {
        theirLocations = ['DX']
      }
      theyAreInState = false
    }

    if (!weAreInState && !theyAreInState) {
      theirLocations = []
    }

    const { band, mode, key, startAtMillis } = qso

    if (INVALID_BANDS.indexOf(band) >= 0 || (qp.options?.invalidBands || []).indexOf(band) >= 0) {
      return { value: 0, alerts: ['invalidBand'], type: Info.key, weAreInState }
    }

    const superMode = superModeForMode(mode)

    const nearDupes = qsos.filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.key !== key)

    const locationMultiplier = ourLocations.length * theirLocations.length // For county line operations

    let value = (qp?.points?.[superMode] || 1) * locationMultiplier

    if (qp?.inStateToOutOfStatePointsDouble && weAreInState && !theyAreInState) {
      value = value * 2
    }

    const multPrefix = qpMultPrefix({ qp, band, mode: superMode, weAreInState, theyAreInState })

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
      errors: [],
      mults: [],
      bonuses: []
    }

    theirLocations.forEach(loc => {
      loc = qpNormalizeLocation({ qp, qso, location: loc, weAreInState, theyAreInState })
      let mult
      if (loc) {
        if (qp?.counties?.[loc]) {
          mult = multPrefix + loc
          scoring.counties = scoring.counties ?? []
          scoring.counties.push(loc)
        } else if (US_STATES[loc]) {
          mult = multPrefix + loc
          scoring.state = loc
        } else if (CANADIAN_PROVINCES[loc]) {
          mult = multPrefix + loc
          scoring.province = loc
        } else {
          if (qp.options.dxIsMultiplier !== false) {
            if (!qp.options.dxEntityMultiplierMax || scoring.entities.length < qp.options.dxEntityMultiplierMax) {
              if (qp.options.dxEntityIsMultiplier) {
                const dxcc = qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix
                loc = dxcc
              }
              mult = multPrefix + loc
              scoring.entity = loc
            } else {
              // Don't count as multiplier if we're over max
              scoring.entity = loc
            }
          }
        }

        if (mult) scoring.mults.push(mult)

        if (score?.mults?.[mult]) {
          scoring.infos.push(`${qpNameForLocation({ qp, location: loc })}`)
        } else if (loc) {
          scoring.notices.push(`${qpNameForLocation({ qp, location: loc })}`)
        }
      }
    })

    const baseCall = qso?.their?.baseCall || qso?.their?.guess?.baseCall
    if (qp?.bonusStations?.[baseCall]) {
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
        scoring.bonus = qp?.bonusStations?.[scoring.bonusStation]
        scoring.notices.push('Bonus station!')
      }
    }

    if (nearDupes.length === 0) {
      return scoring
    } else {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => superModeForMode(q.mode) === superMode).length !== 0
      const sameBandMode = nearDupes.filter(q => q.band === band && superModeForMode(q.mode) === superMode).length !== 0
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
    const qp = qpData({ ref })
    if (!qsoScore.value) return score

    if (!score?.key) score = undefined // Reset if score doesn't have the right shape
    score = score ?? {
      key: ref?.type,
      icon: Info.icon,
      label: qp.name,
      weAreInState: qsoScore.weAreInState,
      total: 0,
      bonus: 0,
      qsoCount: 0,
      qsoPoints: 0,
      modes: {},
      mults: {},
      bonuses: {},
      states: {},
      provinces: {},
      counties: {},
      entities: {},
      bonusStations: {}
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

    score.mult = Object.keys(score.mults).length

    if (qp.options.bonusPostMultiplier) {
      score.total = (score.qsoPoints * score.mult) + score.bonus
    } else {
      score.total = (score.qsoPoints + score.bonus) * score.mult
    }

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    const qp = qpData({ ref })

    let weAreInState = false
    if (ref?.location?.match(SLASH_OR_COMMA_REGEX)) {
      weAreInState = ref?.location?.split(SLASH_OR_COMMA_REGEX).every(c => qp.counties[c])
    } else if (qp.counties[ref?.location]) {
      weAreInState = true
    }

    if (!score.total) {
      score.summary = '0 pts'
      score.longSummary = '0 pts\nNo valid QSOs yet!'
      return score
    }

    score.summary = `${fmtNumber(score.total)} pts`

    score.label = `${qp.name}: ${fmtNumber(score.total)} points`

    const parts = []
    if (score.bonus) {
      if (qp.options.bonusPostMultiplier) {
        parts.push(`**${fmtNumber(score.qsoPoints)} points x ${score.mult} mults + ${fmtNumber(score.bonus)} bonus**`)
      } else {
        parts.push(`**${fmtNumber(score.qsoPoints)} points + ${fmtNumber(score.bonus)} bonus x ${score.mult} mults**`)
      }
    } else {
      parts.push(`**${fmtNumber(score.qsoPoints)} points x ${score.mult} mults**`)
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
      if (!qp.dcCountsAsMaryland) {
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

      if (qp.options.dxIsMultiplier !== false && Object.keys(score.entities).length > 0) {
        parts.push('### Other Multipliers')
        line = '> '
        Object.keys(score.entities).sort().forEach(entity => {
          if (score.entities[entity]) {
            line += `**~~${entity}~~** `
          } else {
            line += `${entity} `
          }
        })
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
  }
}

function mainExchangeForOperation (props) {
  const { qso, qsos, operation, updateQSO, styles, refStack } = props

  const ref = findRef(qso?.refs, Info.key) || { type: Info.key, class: undefined, location: undefined }
  const opRef = findRef(operation, Info.key)
  const qp = qpData({ ref: opRef })

  const fields = []
  if (qp?.exchange?.[0] === 'Number') {
    fields.push(
      <H2kTextInput
        {...props}
        key={`${Info.key}/ourNumber`}
        // innerRef={refStack.shift()}   // Don't use a `ref` so that this input cannot be focused using the space key
        skipFocus={true}
        style={[styles?.text?.numbers, { minWidth: styles.oneSpace * 5.7, flex: 1 }]}
        textStyle={styles.text.callsign}
        label={'Our #'}
        placeholder={ref?.ourNumber ?? operation?.nextNumber ?? '1'}
        keyboard={'numbers'}
        numeric={true}
        noSpaces={true}
        value={ref?.ourNumber ?? operation?.nextNumber ?? '1'}
        onChangeText={(text) => updateQSO({
          refs: replaceRef(qso?.refs, Info.key, { ...ref, ourNumber: text })
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
        placeholder={ref?.theirNumber ?? ''}
        keyboard={'numbers'}
        numeric={true}
        noSpaces={true}
        value={ref?.theirNumber ?? ''}
        onChangeText={(text) => updateQSO({
          refs: replaceRef(qso?.refs, Info.key, { ...ref, theirNumber: text })
        })}
      />
    )
  }

  fields.push(
    <H2kTextInputWithSuggestions
      {...props}
      key={`${Info.key}/location`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * (qp.options?.countyLine ? 9 : 7), flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Location'}
      placeholder={''}
      mode={'flat'}
      keyboard={'dumb'}
      uppercase={true}
      noSpaces={true}
      value={ref?.location ?? _defaultLocationFor({ qp, qso, qsos, operation }) ?? ''}
      error={ref?.location && !qpNormalizeLocation({ qp, qso, location: ref.location })}
      suggestions={_suggestionsFor({ qso, qp })}
      minimumLengthForSuggestions={3}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...ref, location: text })
      })}
    />
  )
  return fields
}

function prepareNewQSO ({ operation, qso }) {
  const ref = findRef(qso.refs, Info.key) || { type: Info.refType }
  ref.ourNumber = `${operation.nextNumber || 1}`
  qso.refs = replaceRef(qso.refs, Info.refType, ref)
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
      console.log('processQSOBeforeSaveWithDispatch', { ref, ourNumber: ref.ourNumber, nextNumber: operation.nextNumber })
      if (ref.ourNumber) {
        qso.our.exchange = [ref.ourNumber, opRef.location].filter(x => x).join(' ')
        const num = parseInt(ref.ourNumber, 10)
        if (!isNaN(num)) {
          await dispatch(setOperationData({ uuid: operation.uuid, nextNumber: Math.max(num, (operation.nextNumber || 0)) + 1 }))
          console.log('set nextNumber', { nextNumber: Math.max(num, (operation.nextNumber || 0)) + 1 })
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
      return Object.entries({ ...qp.counties, ...US_STATES })
    } else {
      return Object.entries({ ...US_STATES })
    }
  } else if (prefix === 'VE') {
    if (qp.options.entity === 'VE') {
      return Object.entries({ ...qp.counties, ...CANADIAN_PROVINCES })
    } else {
      return Object.entries({ ...CANADIAN_PROVINCES })
    }
  } else if (prefix) return []
  else return Object.entries({ ...qp.counties, ...US_STATES, ...CANADIAN_PROVINCES })
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

const SLASH_OR_COMMA_REGEX = /[/,]/

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
  } else if (location === 'DC' && qp.options.dcCountsAsMaryland) {
    return 'MD'
  } else if (location === 'MD' && qp.options.dcCountsAsMaryland) {
    return 'DC'
  } else if (location === 'DC' && !qp.options.dcCountsAsMaryland) {
    return 'DC'
  } else if (US_STATES[location]) {
    return location
  } else if (CANADIAN_PROVINCES[location]) {
    return location
  } else if (qp.options.dxEntityIsMultiplier) {
    return qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix
  } else {
    return location
  }
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

export function qpNameForLocation ({ qp, location }) {
  location = location?.toUpperCase() || ''
  if (qp.counties[location]) {
    return qp.counties[location]
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
    return 'DX Entity'
  } else {
    if (DXCC_BY_PREFIX[location]) {
      return `${location}: ${DXCC_BY_PREFIX[location]?.name}`
    } else {
      return location
    }
  }
}

export function qpIsInState ({ qp, location }) {
  location = location?.toUpperCase() || ''
  return !!qp.counties[location]
}

export function qpLabelForLocation ({ qp, location }) {
  location = location?.toUpperCase() || ''
  if (qp.counties[location]) {
    return `In-state: *${location}* ${qp.counties[location]}`
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
