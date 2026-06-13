// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { fmtNumber } from '@ham2k/lib-format-tools'
import { superModeForMode } from '@ham2k/lib-operation-data'
import { filterRefs, findRef, filterNearDupes, replaceRef, replaceRefs } from '@ham2k/lib-qson-tools'

import { H2kTextInputWithSuggestions } from '../../../ui'

import { Info } from './StateParksInfo'
import { ActivityOptions } from './StateParksActivityOptions'
import RAW_STATE_PARKS_DATA from './all-events.js'

export const STATE_PARKS_DATA = Object.fromEntries(RAW_STATE_PARKS_DATA.map(state => [state.key, state]))

const INVALID_BANDS = ['60m', '30m', '17m', '12m']

const Extension = {
  ...Info,
  category: 'contests',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook, priority: 200 }) // Contests get highest priority
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler, priority: 200 }) // Contests get highest priority
  },
  onDeactivationDispatch: () => async (dispatch) => {
  }
}
export default Extension

const ActivityHook = {
  ...Info,
  Options: ActivityOptions,

  standardExchangeFields: { state: true, grid: false },
  mainExchangeForOperation,

  processQSOBeforeSaveWithDispatch,

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
    if (operation?.startAtMillisMax) date = new Date(operation.startAtMillisMax)
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

  suggestOperationTitle: ({ ref, operation }) => {
    if (ref?.ref) {
      const sp = spData({ ref })
      if (sp.parkAbbreviations) {
        let location = ref?.location
        if (!location) {
          const potaRefs = filterRefs(operation, 'potaActivation')
          location = potaRefs.map(r => sp.parks[r.ref]).filter(Boolean)[0]
        }
        return { for: _spShortForSP(sp), subtitle: location }
      } else {
        return { for: _spShortForSP(sp) }
      }
    } else {
      return { for: Info.shortName }
    }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    const sp = spData({ ref })

    if (sp.options?.exportCabrillo) {
      return [{
        format: 'cabrillo',
        exportType: 'state-parks-cabrillo',
        exportName: sp.name,
        refKey: sp.key,
        templateData: { handlerShortName: sp.short, handlerName: sp.name }
      }]
    } else {
      // Uses regular POTA exports
    }
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const ref = findRef(operation, Info.key)
    const sp = spData({ ref })
    const qsoRef = findRef(qso, Info.key)

    const fields = [
      { CONTEST_ID: sp.key },
      { STX_STRING: ref?.location },
      { SRX_STRING: qsoRef?.location }
    ]

    return fields
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)
    const sp = spData({ ref })

    let ourLocation = ref?.location || filterRefs(operation, 'potaActivation').filter(r => sp?.parks[r.ref]).map(r => r.ref)[0]

    if (sp.parkAbbreviations) {
      ourLocation = sp.parks[ourLocation] || ourLocation
    }

    if (!ourLocation) {
      ourLocation = 'NOT' // At least for Ohio SP, this is what they expect
    }

    headers.push(['CONTEST', sp.cabrilloName])
    headers.push(['CALLSIGN', operation.stationCall || settings.operatorCall])
    headers.push(['LOCATION', ourLocation])
    headers.push(['EMAIL', ref?.email])
    headers.push(['NAME', ''])
    if (operation.local?.operatorCall) headers.push(['OPERATORS', operation.local.operatorCall])
    if (operation.grid) headers.push(['GRID-LOCATOR', operation.grid])
    return headers
  },

  qsoToCabrilloParts: ({ qso, ref, operation, settings }) => {
    const sp = spData({ ref })

    let ourLocation = ref.location || filterRefs(operation, 'potaActivation').filter(r => sp?.parks[r.ref]).map(r => r.ref)[0]

    const qsoRef = findRef(qso, Info.key)

    let theirLocation = qsoRef?.location || filterRefs(qso, 'pota').filter(r => sp?.parks[r.ref]).map(r => r.ref)[0]

    if (sp.parkAbbreviations) {
      ourLocation = sp.parks[ourLocation] || ourLocation
      theirLocation = sp.parks[theirLocation] || theirLocation
    }

    if (!ourLocation) {
      ourLocation = 'NOT' // At least for Ohio SP, this is what they expect
    }

    if (!theirLocation) {
      const entity = qso?.their?.entityPrefix ?? qso?.their?.guess?.entityPrefix
      if (entity === 'K' || entity === 'VE') {
        theirLocation = qso?.their?.state ?? qso?.their?.guess?.state ?? 'NOT'
      } else {
        theirLocation = entity ?? 'DX'
      }
    }

    const ourCall = operation.stationCall || settings.operatorCall

    const row = []
    row.push((ourCall ?? '-').padEnd(13, ' '))
    row.push((qso?.mode === 'CW' || qso?.mode === 'RTTY' ? settings?.defaultReportCW || '599' : settings?.defaultReport || '59').padEnd(3, ' '))
    row.push((ourLocation ?? '-').padEnd(6, ' '))
    row.push((qso?.their?.call ?? '-').padEnd(13, ' '))
    row.push((qso?.mode === 'CW' || qso?.mode === 'RTTY' ? settings?.defaultReportCW || '599' : settings?.defaultReport || '59').padEnd(3, ' '))
    row.push((theirLocation ?? '-').padEnd(6, ' '))

    return [row]
  },

  relevantInfoForQSOItem: ({ qso }) => {
    const qsoRef = findRef(qso, Info.key)
    if (qsoRef) {
      return [qso.their.exchange]
    }
  },

  scoringForQSO: ({ qso, qsos, operation, ref: scoredRef, score }) => {
    const sp = spData({ ref: scoredRef })

    const { band, mode } = qso

    if (INVALID_BANDS.indexOf(band) >= 0 || (sp.options?.invalidBands || []).indexOf(band) >= 0) {
      return { value: 0, alerts: ['invalidBand'], type: Info.key }
    }

    if (sp?.options?.validBands && sp?.options?.validBands?.indexOf(band) === -1) {
      return { value: 0, alerts: ['invalidBand'], type: Info.key }
    }

    const superMode = superModeForMode(mode)

    const activationRefs = filterRefs(operation, 'potaActivation').map(r => r.ref)
    const activationStateParks = activationRefs.filter(r => sp.parks[r.ref])

    const potaRefs = filterRefs(qso, 'pota').map(r => r.ref)
    let stateParkRefs = potaRefs.filter(r => sp.parks[r.ref]).map(r => r.ref)

    if (sp?.parkAbbreviations && stateParkRefs.length === 0) {
      const qsoRef = findRef(qso, Info.key)
      if (qsoRef?.location && sp.parkReferences[qsoRef?.location]) {
        stateParkRefs = [sp.parkReferences[qsoRef?.location]]
      }
    }

    const value = (sp?.points?.[superMode] || 1) * (activationRefs.length || 1)

    const scoring = {
      value,
      mode: superMode,
      band,
      type: Info.key,
      activatedParks: activationStateParks,
      huntedParks: stateParkRefs,
      infos: [],
      notices: [],
      alerts: [],
      mults: [],
      bonuses: []
    }

    if (stateParkRefs.length > 0) {
      let label = stateParkRefs[0]

      if (sp.parkAbbreviations && sp.parks[label]) {
        label = sp.parkAbbreviations[sp.parks[label]]
      }

      if (score?.huntedParks?.[stateParkRefs[0]]) {
        scoring.infos.push(`${label}`)
      } else {
        scoring.notices.push(`${label}`)
      }
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
      scoring.value = scoring.value * (stateParkRefs.length || 1)
      return scoring
    } else {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => superModeForMode(q.mode) === superMode).length !== 0
      const sameBandModeDupes = nearDupes.filter(q => q.band === band && superModeForMode(q.mode) === superMode)
      const sameBandMode = sameBandModeDupes.length !== 0

      const bandModeRefs = new Set(sameBandModeDupes.map(q => filterRefs(q, 'pota').map(r => r.ref)).flat())
      const newbandModeRefCount = stateParkRefs.filter(r => !bandModeRefs.has(r)).length

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
      let parkLabel = park
      if (sp.parkReferences) {
        parkLabel = Object.keys(sp.parkReferences).find(key => sp.parkReferences[key] === park) || park
      }
      if (score.huntedParks[park]) {
        line += `**~~${parkLabel}~~**${parkLabel.length < 8 ? ' '.repeat(8 - parkLabel.length) : ''} `
      } else {
        line += `${parkLabel}${parkLabel.length < 8 ? ' '.repeat(8 - parkLabel.length) : ''} `
      }
    })
    parts.push(line)

    score.longSummary = '\n' + parts.join('\n')

    return score
  }
}

function mainExchangeForOperation (props) {
  const { qso, qsos, operation, updateQSO, styles, disabled, refStack, settings, suggestions, vfo, ...moreProps } = props

  const qsoRef = findRef(qso?.refs, Info.key) || { type: Info.key, class: undefined, location: undefined }
  const opRef = findRef(operation, Info.key)
  const sp = spData({ ref: opRef })

  const fields = []
  if (sp?.options?.exchange === 'parkAbbreviation') {
    fields.push(
      <H2kTextInputWithSuggestions
        {...moreProps}
        key={`${Info.key}/location`}
        fieldId={'refs[sp].location'}
        innerRef={refStack.shift()}
        style={[styles.input, { minWidth: styles.oneSpace * 7, flex: 1 }]}
        textStyle={styles.text.callsign}
        label={'SP Location'}
        placeholder={''}
        keyboard={'dumb'}
        uppercase={true}
        noSpaces={true}
        periodToSlash={true}
        value={qsoRef?.location ?? _defaultLocationFor({ sp, qso, qsoRef, qsos, operation }) ?? ''}
        error={qsoRef?.location && sp?.parkAbbreviations && !sp.parkAbbreviations[qsoRef.location] ? 'Invalid location' : false}
        suggestions={_suggestionsFor({ qso, sp })}
        minimumLengthForSuggestions={3}
        onChangeText={(text) => _changeLocationAndParkRef({ location: text, qso, qsoRef, sp, updateQSO })}
      />
    )
  }
  return fields
}

const _changeLocationAndParkRef = ({ location, qso, sp, qsoRef, updateQSO }) => {
  const potaRefs = filterRefs(qso, 'pota')
  const regularPotaRefs = potaRefs.filter(r => !r._spLocation)
  if (sp.parkAbbreviations && sp.parkAbbreviations[location]) {
    regularPotaRefs.push({ type: 'pota', ref: sp.parkReferences[location], _spLocation: location })
  }

  let newRefs = replaceRefs(qso?.refs, 'pota', regularPotaRefs)
  newRefs = replaceRef(newRefs, Info.key, { ...qsoRef, location })

  updateQSO({ refs: newRefs })
}

async function processQSOBeforeSaveWithDispatch ({ qso, qsos, operation, dispatch }) {
  const opRef = findRef(operation, Info.key)

  if (opRef) {
    const ref = findRef(qso?.refs, Info.key) || { type: Info.key, location: undefined }

    if (ref.location) {
      qso.their.exchange = ref.location
    }
  }
  return qso
}

export function spData ({ ref }) {
  return STATE_PARKS_DATA[ref?.ref] || { options: {}, parks: {}, points: {}, short: 'State Parks Event' }
}

function _suggestionsFor ({ qso, sp }) {
  if (sp.parkAbbreviations) {
    return Object.entries(sp.parkAbbreviations)
  } else {
    return []
  }
}

function _defaultLocationFor ({ qso, sp, qsoRef, qsos, operation }) {
  const matching = qsos.filter(q => q.their?.call === qso?.their?.call)
  if (matching.length > 0) return matching[matching.length - 1].refs?.find(r => r.type === Info.key)?.location

  return sp.parks[qsoRef?.location] || qsoRef?.location
}

function _spShortForSP (sp) {
  if (sp.short) return sp.short
  if (sp.key.endsWith('SP')) return sp.key.replace('SP', ' SP OTA')
  else return `${sp.key} SP OTA`
}
