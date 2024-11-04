/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'

import { setOperationData } from '../../../store/operations'
import { findRef, replaceRef } from '../../../tools/refTools'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'
import { ListRow } from '../../../screens/components/ListComponents'
import { Ham2kListSection } from '../../../screens/components/Ham2kListSection'
import { superModeForMode } from '@ham2k/lib-operation-data'
import { CANADIAN_PROVINCES, NY_COUNTIES, NYQP_LOCATIONS, US_STATES } from './NYQPLocations'
import { Text } from 'react-native-paper'
import { fmtNumber } from '@ham2k/lib-format-tools'

const INVALID_BANDS = ['60m', '30m', '17m', '12m']

const Info = {
  key: 'nyqp',
  icon: 'flag-checkered',
  name: 'NY QSO Party (Experimental)',
  shortName: 'NYQP',
  infoURL: 'https://https://nyqp.org/',
  defaultValue: { qth: '' }
}

const Extension = {
  ...Info,
  category: 'contests',
  onActivation: ({ registerHook }) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler })
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
    let date
    if (operation?.qsos && operation.qsos[0]?.startAtMillis) date = Date.parse(operation.qsos[0].startAtMillis)
    else date = new Date()
    const ref = findRef(operation, Info.key)
    return [`NYQP ${date.getFullYear()}`, ref?.location].filter(x => x).join(' • ')
  },

  suggestOperationTitle: (ref) => {
    return { for: Info.shortName, subtitle: ref?.location }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref?.type === Info?.key) {
      return [{
        format: 'adif',
        nameTemplate: settings.useCompactFileNames ? `{call}-${Info.shortName}-{compactDate}` : `{date} {call} for ${Info.shortName}`,
        exportType: 'nyqp-adif',
        titleTemplate: `{call}: ${Info.name} on {date}`
      },
      {
        format: 'cabrillo',
        nameTemplate: settings.useCompactFileNames ? `{call}-${Info.shortName}-{compactDate}` : `{date} {call} for ${Info.shortName}`,
        exportType: 'nyqp-cabrillo',
        titleTemplate: `{call}: ${Info.name} on {date}`
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const ref = findRef(operation, Info.key)
    const qsoRef = findRef(qso, Info.key)

    const fields = [
      { CONTEST_ID: 'NY-QSO-PARTY' },
      { STX_STRING: ref?.location }
    ]

    if (qsoRef?.location) {
      fields.push({ SRX_STRING: qsoRef.location })
    } else {
      if (qso?.their?.guess?.entityCode === 'K' || qso?.their?.guess?.entityCode === 'VE') {
        fields.push({ SRX_STRING: qso?.their?.state ?? qso?.their?.guess?.state })
      } else {
        fields.push({ SRX_STRING: 'DX' })
      }
    }

    return fields
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)

    let ourLocations = ref.location
    if (ref?.location?.match(SLASH_OR_COMMA_REGEX)) {
      ourLocations = ref.location.split(SLASH_OR_COMMA_REGEX, 2)
    } else {
      ourLocations = [ref.location]
    }

    headers.push(['CONTEST', 'NY-QSO-PARTY'])
    headers.push(['CALLSIGN', operation.stationCall || settings.operatorCall])
    headers.push(['LOCATION', ourLocations.join('/')])
    headers.push(['NAME', ''])
    if (operation.operatorCall) headers.push(['OPERATORS', operation.operatorCall])
    if (operation.grid) headers.push(['GRID-LOCATOR', operation.grid])
    return headers
  },

  qsoToCabrilloParts: ({ qso, ref, operation, settings }) => {
    let ourLocations = ref.location
    let weAreInState
    if (ref?.location?.match(SLASH_OR_COMMA_REGEX)) {
      ourLocations = ref.location.split(SLASH_OR_COMMA_REGEX, 2)
      weAreInState = ref.location.split(SLASH_OR_COMMA_REGEX).every(c => NY_COUNTIES[c])
    } else {
      ourLocations = [ref.location]
      weAreInState = !!NY_COUNTIES[ref.location]
    }

    const qsoRef = findRef(qso, Info.key)

    let theirLocations
    let theyAreInState
    if (qsoRef?.location?.match(SLASH_OR_COMMA_REGEX)) {
      theirLocations = qsoRef?.location.split(SLASH_OR_COMMA_REGEX, 2)
      theyAreInState = theirLocations.every(c => NY_COUNTIES[c])
    } else if (qsoRef?.location) {
      theirLocations = [qsoRef?.location]
      theyAreInState = !!NY_COUNTIES[qsoRef?.location]
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
        rows.push([
          (ourCall ?? ' ').padEnd(13, ' '),
          (qso?.mode === 'CW' || qso?.mode === 'RTTY' ? '599' : '59').padEnd(3, ' '),
          (ourLocation ?? ' ').padEnd(6, ' '),
          (qso?.their?.call ?? '').padEnd(13, ' '),
          (qso?.mode === 'CW' || qso?.mode === 'RTTY' ? '599' : '59').padEnd(3, ' '),
          (theirLocation ?? ' ').padEnd(6, ' ')
        ])
      }
    }
    return rows
  },

  relevantInfoForQSOItem: ({ qso, operation }) => {
    return [qso.their.exchange]
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    let ourLocations = ref.location
    let weAreInState
    if (ref?.location?.match(SLASH_OR_COMMA_REGEX)) {
      ourLocations = ref.location.split(SLASH_OR_COMMA_REGEX, 2)
      weAreInState = ref.location.split(SLASH_OR_COMMA_REGEX).every(c => NY_COUNTIES[c])
    } else {
      ourLocations = [ref.location]
      weAreInState = !!NY_COUNTIES[ref.location]
    }

    const qsoRef = findRef(qso, Info.key)

    let theirLocations
    let theyAreInState
    if (qsoRef?.location?.match(SLASH_OR_COMMA_REGEX)) {
      theirLocations = qsoRef?.location.split(SLASH_OR_COMMA_REGEX, 2)
      theyAreInState = theirLocations.every(c => NY_COUNTIES[c])
    } else if (qsoRef?.location) {
      theirLocations = [qsoRef?.location]
      theyAreInState = !!NY_COUNTIES[qsoRef?.location]
    } else {
      theirLocations = [qso?.their?.state ?? qso?.their?.guess?.state]
      theyAreInState = false
    }

    if (!weAreInState && !theyAreInState) {
      theirLocations = []
    }

    const { band, mode, key, startAtMillis } = qso

    if (INVALID_BANDS.indexOf(band) >= 0) {
      return { value: 0, alerts: ['invalidBand'], type: Info.key }
    }

    const superMode = superModeForMode(mode)

    const nearDupes = qsos.filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.key !== key)

    const locationMultiplier = ourLocations.length * theirLocations.length
    const value = ({ CW: 2, SSB: 1, DATA: 3 }[superMode] || 1) * locationMultiplier

    if (nearDupes.length === 0) {
      return { value, mode: superMode, theirLocations, type: Info.key }
    } else {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => superModeForMode(q.mode) === superMode).length !== 0
      if (sameBand && sameMode) {
        return { value: 0, alerts: ['duplicate'], type: Info.key }
      } else {
        const notices = []
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')

        return { value, mode: superMode, notices, theirLocations, type: Info.key }
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
      mults: 0,
      modes: {},
      states: {},
      provinces: {},
      counties: {}
    }

    score.qsoCount = score.qsoCount + 1
    score.qsoPoints = score.qsoPoints + qsoScore.value

    qsoScore?.theirLocations?.forEach(location => {
      score.modes[qsoScore.mode] = (score.modes[qsoScore.mode] || 0) + 1

      if (NY_COUNTIES[location]) {
        score.counties[location] = (score.counties[location] || 0) + 1
      } else if (US_STATES[location]) {
        score.states[location] = (score.states[location] || 0) + 1
      } else if (CANADIAN_PROVINCES[location]) {
        score.provinces[location] = (score.provinces[location] || 0) + 1
      }
    })
    score.mults = Object.keys(score.counties).length + Object.keys(score.states).length + Object.keys(score.provinces).length
    score.total = score.qsoPoints * score.mults

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    let weAreInState = false
    if (ref?.location?.match(SLASH_OR_COMMA_REGEX)) {
      weAreInState = ref?.location?.split(SLASH_OR_COMMA_REGEX).every(c => NY_COUNTIES[c])
    } else if (NY_COUNTIES[ref?.location]) {
      weAreInState = true
    }

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

    parts.push(`### ${Object.keys(score?.counties ?? {}).length} NY Counties`)
    line = ''
    Object.keys(NY_COUNTIES).forEach(county => {
      county = county.toUpperCase()
      if (score.counties[county]) {
        line += `**~~${county}~~**  `
      } else {
        line += `${county}  `
      }
    })
    parts.push(line)

    if (weAreInState) {
      parts.push(`### ${Object.keys(score?.states ?? {}).length} US States`)
      line = ''
      Object.keys(US_STATES).forEach(state => {
        state = state.toUpperCase()
        if (score.states[state]) {
          line += `**~~${state}~~**  `
        } else {
          line += `${state}  `
        }
      })
      parts.push(line)

      parts.push(`### ${Object.keys(score?.provinces ?? {}).length} Canadian Provinces`)
      line = ''
      Object.keys(CANADIAN_PROVINCES).forEach(province => {
        province = province.toUpperCase()
        if (score.provinces[province]) {
          line += `**~~${province}~~**  `
        } else {
          line += `${province}  `
        }
      })
      parts.push(line)
    }

    score.longSummary = '\n' + parts.join('\n')

    return score
  }
}

function mainExchangeForOperation (props) {
  const { qso, updateQSO, styles, refStack } = props

  const ref = findRef(qso?.refs, Info.key) || { type: Info.key, location: '' }

  const fields = []

  let isValid
  if (NY_COUNTIES[ref?.location]) {
    isValid = true
  } else if (ref?.location?.match(SLASH_OR_COMMA_REGEX)) {
    const counties = ref.location.split(SLASH_OR_COMMA_REGEX, 2)
    isValid = counties.every(c => NY_COUNTIES[c])
  } else if (NYQP_LOCATIONS[ref?.location]) {
    isValid = true
  } else if (ref?.location?.length >= 2) {
    isValid = false
  } else {
    isValid = true
  }

  fields.push(
    <ThemedTextInput
      {...props}
      key={`${Info.key}/location`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 10, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'NYQP Loc'}
      placeholder={qso?.their?.state ?? qso?.their?.guess?.state}
      mode={'flat'}
      uppercase={true}
      noSpaces={true}
      value={ref?.location || ''}
      error={!isValid}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...ref, location: text }),
        their: { exchange: text }
      })}
    />
  )
  return fields
}

const SLASH_OR_COMMA_REGEX = /[/,]/

export function ActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const ref = useMemo(() => findRef(operation, Info.key), [operation])

  const handleChange = useCallback((value) => {
    if (value?.location) value.location = value.location.toUpperCase()

    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, ...value }) }))
  }, [dispatch, operation, ref])

  const [locationDesc, isValid] = useMemo(() => {
    if (NY_COUNTIES[ref?.location]) {
      return [`In-state: ${NY_COUNTIES[ref?.location]} County`, true]
    } else if (ref?.location?.match(SLASH_OR_COMMA_REGEX)) {
      const counties = ref.location.split(SLASH_OR_COMMA_REGEX)
      return [`In-state: ${counties.map(c => NY_COUNTIES[c]).join(' & ')} Counties`, true]
    } else if (NYQP_LOCATIONS[ref?.location]) {
      return [`Out-of-state: ${ref.location}: ${NYQP_LOCATIONS[ref?.location]}`, true]
    } else if (ref?.location?.length >= 2) {
      return [`${ref?.location} not valid!. Please enter a NY County, US State, Canadian Province or "DX"`, false]
    } else {
      return ['Please enter a NY County, US State, Canadian Province or "DX"', false]
    }
  }, [ref?.location])

  return (
    <Ham2kListSection title={'Location'}>
      <ListRow>
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
          textStyle={styles.text.callsign}
          label={'Location'}
          mode={'flat'}
          uppercase={true}
          noSpaces={true}
          error={!isValid}
          value={ref?.location || ''}
          onChangeText={(text) => handleChange({ location: text })}
        />
      </ListRow>
      <Text style={{ paddingHorizontal: styles.oneSpace * 2.5, marginTop: styles.oneSpace * 2, marginBottom: styles.oneSpace * 3 }}>
        {locationDesc}
      </Text>
    </Ham2kListSection>
  )
}
