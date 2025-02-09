/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo } from 'react'
import { Icon, Text, TouchableRipple } from 'react-native-paper'
import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

import { useThemedStyles } from '../../../../../styles/tools/useThemedStyles'

import { scoringHandlersForOperation } from '../../../../../extensions/scoring'
import { bearingForQSON, distanceForQSON, fmtDistance } from '../../../../../tools/geoTools'
import { startOfDayInMillis, yesterdayInMillis } from '../../../../../tools/timeTools'
import { Ham2kMarkdown } from '../../../../components/Ham2kMarkdown'
import { useCallLookup } from './useCallLookup'
import { useSelector } from 'react-redux'
import { selectOperationCallInfo } from '../../../../../store/operations'
import { selectRuntimeOnline } from '../../../../../store/runtime'

export const MESSAGES_FOR_SCORING = {
  duplicate: 'Dupe!!!',
  invalidBand: 'Invalid Band',
  newBand: 'New Band',
  newMode: 'New Mode',
  newRef: 'New Reference',
  newDay: 'New Day',
  'potaActivation.newDay': 'New POTA Day',
  'potaActivation.newRef': 'New Park',
  'sotaActivation.newDay': 'New SOTA Day',
  'sotaActivation.newRef': 'New Summit',
  'wwbotaActivation.newDay': 'New WWBOTA Day',
  'wwbotaActivation.newRef': 'New Bunker'
}

const DEBUG = false

function prepareStyles (baseStyles, themeColor) {
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  return {
    ...baseStyles,
    history: {
      pill: {
        marginRight: baseStyles.halfSpace,
        borderRadius: 3,
        // marginTop: baseStyles.oneSpace * 0.25,
        paddingHorizontal: baseStyles.oneSpace * 0.5,
        backgroundColor: baseStyles.theme.colors[`${themeColor}Light`]
      },
      text: {
        fontSize: baseStyles.smallFontSize,
        lineHeight: baseStyles.normalFontSize * 1.3,
        marginTop: baseStyles.oneSpace * 0.3,
        fontWeight: 'normal',
        color: baseStyles.theme.colors[`on${upcasedThemeColor}Container`]
      },
      alert: {
        backgroundColor: 'red',
        color: 'white'
      },
      notice: {
        backgroundColor: 'green',
        color: 'white'
      },
      info: {
        backgroundColor: '#666',
        color: 'white'
      }
    },
    markdown: {
      ...baseStyles.markdown,
      paragraph: {
        margin: 0,
        marginTop: baseStyles.halfSpace,
        marginBottom: 0,
        lineHeight: baseStyles.normalFontSize * 1.3
      }
    }
  }
}

export function CallInfo ({ qso, qsos, sections, operation, style, themeColor, updateQSO, settings }) {
  const navigation = useNavigation()
  const styles = useThemedStyles(prepareStyles, themeColor)
  const online = useSelector(selectRuntimeOnline)
  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const { call, guess, lookup, refs, status, when } = useCallLookup(qso)

  useEffect(() => { // Merge all data sources and update guesses and QSO
    // console.log('CallInfo effect', { qsoCall: qso?.their?.call, qsoName: qso?.their?.guess?.name, qsoStatus: qso?.their?.lookup?.status, lookupCall: call, lookupName: guess?.name, lookupStatus: status })
    if (qso?.their?.call === call && status && qso?.their?.lookup?.status !== status) {
      // console.log('-- updateQSO!')
      // We need to first clear the guess and lookup, otherwise the new values will be merged with the old ones
      updateQSO && updateQSO({ their: { guess: undefined, lookup: undefined } })
      // Then we update the QSO with the new values
      updateQSO && updateQSO({ their: { guess, lookup: { ...lookup, status } } })
    }
  }, [updateQSO, guess, lookup, call, qso?.their?.call, qso?.their?.lookup?.status, status, qso?.their?.guess?.state, qso?.their?.guess?.name, when])

  const [locationInfo, flag] = useMemo(() => {
    let isOnTheGo = (lookup?.dxccCode && lookup?.dxccCode !== guess.dxccCode)

    let leftParts = []
    let rightParts = []

    const entity = DXCC_BY_PREFIX[guess.entityPrefix]

    if (guess.postindicators && guess.postindicators.find(ind => ['P', 'M', 'AM', 'MM', 'PM'].indexOf(ind) >= 0)) {
      isOnTheGo = true
      if (guess.postindicators.indexOf('P') >= 0) leftParts.push('[Portable]')
      else if (guess.postindicators.indexOf('M') >= 0) leftParts.push('[Mobile]')
      else if (guess.postindicators.indexOf('MM') >= 0) leftParts.push('[ 🚢 ]')
      else if (guess.postindicators.indexOf('AM') >= 0) leftParts.push('[ ✈️ ]')
      else if (guess.postindicators.indexOf('PM') >= 0) leftParts.push('[ 🪂 ]')
    }

    if (operation.grid && guess.grid) {
      const dist = distanceForQSON({ our: { ...ourInfo, grid: operation.grid }, their: { grid: qso?.their?.grid, guess } }, { units: settings.distanceUnits })
      let bearing
      if (settings.showBearing) {
        bearing = bearingForQSON({ our: { ...ourInfo, grid: operation.grid }, their: { grid: qso?.their?.grid, guess } })
      }
      const str = [
        dist && fmtDistance(dist, { units: settings.distanceUnits }),
        bearing && `(${Math.round(bearing)}°)`
      ].filter(x => x).join(' ')
      if (str) leftParts.push(`${str} to`)
    }

    if (entity && entity.entityPrefix !== ourInfo.entityPrefix) {
      leftParts.push(entity.shortName)
    }

    for (const ref of (refs ?? [])) {
      if (ref.grid) isOnTheGo = true
      if (refs.error) {
        leftParts.push(`${ref.reference} ${ref.error}`)
      }
    }

    if (qso?.their?.city || qso?.their?.state) {
      rightParts.push([qso?.their?.city, qso?.their?.state].filter(x => x).join(', '))
    } else if (guess.locationLabel) {
      rightParts.push(guess.locationLabel)
    } else if (!isOnTheGo && (guess.city || guess.state)) {
      rightParts.push([guess.city, guess.state].filter(x => x).join(', '))
    }
    if (entity && entity.entityPrefix === ourInfo.entityPrefix) {
      leftParts = [...leftParts, ...rightParts]
      rightParts = []
    }

    const locationText = [leftParts.filter(x => x).join(' '), rightParts.filter(x => x).join(' ')].filter(x => x).join(' – ')

    // if (isOnTheGo) {
    //   if (lookup?.city || lookup?.state || lookup?.country) {
    //     parts.push(
    //       'From ' + [
    //         [lookup.city, lookup.state].filter(x => x).join(', '),
    //         lookup.dxccCode !== guess.dxccCode ? lookup.country : ''
    //       ].filter(x => x).join(' ')
    //     )
    //   }
    // }

    return [locationText, entity?.flag ? entity.flag : '']
  }, [lookup?.dxccCode, guess, operation.grid, ourInfo, qso?.their?.city, qso?.their?.state, qso?.their?.grid, settings.distanceUnits, settings.showBearing, refs])

  const stationInfo = useMemo(() => {
    const parts = []
    if (guess.note) {
      parts.push(guess.note)
    } else {
      if (lookup?.error && call?.length > 3) parts.push(lookup.error)
      parts.push(qso?.their?.name ?? guess.name)
    }

    return parts.filter(x => x).join(' • ')
  }, [guess.note, guess.name, lookup.error, call?.length, qso?.their?.name])

  const scoreInfo = useMemo(() => {
    const scoringHandlers = scoringHandlersForOperation(operation, settings)

    const lastSection = sections && sections[sections.length - 1]
    const scores = scoringHandlers.map(({ handler, ref }) => handler.scoringForQSO({ qso, qsos, score: lastSection?.scores?.[ref.type || ref.key], operation, ref })).filter(x => x)

    return scores
  }, [operation, qso, qsos, sections, settings])

  const [historyMessage, historyLevel] = useMemo(() => {
    if (scoreInfo?.length > 0) {
      // Order by value, as those that provide points/QSOs/etc. more important
      const messageLevelPair = scoreInfo.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).map(score => {
        if (score?.notices && score?.notices[0]) return [MESSAGES_FOR_SCORING[`${score.type}.${score?.notices[0]}`] ?? MESSAGES_FOR_SCORING[score?.notices[0]] ?? score?.notices[0], 'notice']
        if (score?.alerts && score?.alerts[0]) return [MESSAGES_FOR_SCORING[`${score.type}.${score?.alerts[0]}`] ?? MESSAGES_FOR_SCORING[score?.alerts[0]] ?? score?.alerts[0], 'alert']
        if (score?.infos && score?.infos[0]) return [score?.infos[0], 'info']
        return []
      }).filter(x => x.length)[0]

      if (messageLevelPair) return messageLevelPair
    }

    if (lookup?.history?.length > 0) {
      const parts = []
      const today = startOfDayInMillis()
      const yesterday = yesterdayInMillis()
      const lastWeek = startOfDayInMillis() - 6 * 24 * 60 * 60 * 1000
      let count = lookup?.history.length
      const countToday = lookup?.history.filter(x => x.startAtMillis >= today).length
      const countYesterday = lookup?.history.filter(x => x.startAtMillis >= yesterday).length - countToday
      const countLastWeek = lookup?.history.filter(x => x.startAtMillis >= lastWeek).length

      if (qso?.startAtMillis) {
        parts.push('') // add an empty element to force a join that includes a "+"
      }

      if (countLastWeek > countToday || countLastWeek > countYesterday) {
        // parts.push(`${countLastWeek} since ${fmtDateWeekDay(lastWeek)}`)
        parts.push(`${countLastWeek} in last 7 days`)
        count -= countLastWeek
      } else if (countToday) {
        parts.push(`${countToday} today`)
        count -= countToday
      } else if (countYesterday) {
        parts.push(`${countYesterday} yesterday`)
        count -= countYesterday
      }
      if (count) {
        parts.push(`${count} QSOs`)
      }

      return [parts.join(' + ').replace(' 1 QSOs', ' 1 QSO'), 'info']
    }
    return []
  }, [scoreInfo, lookup?.history, qso?.startAtMillis])

  if (DEBUG) console.log('CallInfo render with', { call, locationInfo, stationInfo })
  return (
    <TouchableRipple onPress={() => navigation.navigate('CallInfo', { operation, qso, uuid: operation.uuid, call, qsoUUID: qso?.uuid, qsoKey: qso?.key })} style={{ minHeight: styles.oneSpace * 6 }}>

      <View style={[style, { flexDirection: 'row', justifyContent: 'flex-start', alignContent: 'flex-start', alignItems: 'stretch', gap: styles.halfSpace }]}>
        <View style={{ alignSelf: 'flex-start', flex: 0 }}>
          {online ? (
            <Icon
              source={'account-outline'}
              size={styles.oneSpace * 3}
              color={styles.theme.colors[`${themeColor}ContainerVariant`]}
            />
          ) : (
            <Icon
              source={'cloud-off-outline'}
              size={styles.oneSpace * 3}
              color={styles.theme.colors[`${themeColor}ContainerVariant`]}
            />
          )}
        </View>
        <View style={[style, { flex: 1, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', paddingTop: styles.oneSpace * 0.3 }]}>
          <View style={{ flexDirection: 'row' }}>
            {flag && (
              <Text style={{ flex: 0, fontFamily: styles.normalFontFamily, lineHeight: styles.normalFontSize * 1.3 }} numberOfLines={1} ellipsizeMode={'tail'}>
                {flag}{' '}
              </Text>

            )}
            {locationInfo && (
              <Text style={{ flex: 1, fontFamily: locationInfo.length > 40 ? styles.maybeCondensedFontFamily : styles.normalFontFamily, lineHeight: styles.normalFontSize * 1.3 }} numberOfLines={2} ellipsizeMode={'tail'}>
                {locationInfo}
              </Text>
            )}
          </View>
          {(stationInfo || historyMessage) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
              <View style={{ flex: 1, minWidth: stationInfo.length > 25 ? '80%' : undefined }}>
                <Ham2kMarkdown style={{ numberOfLines: 1, lineHeight: styles.normalFontSize * 1.3, fontWeight: 'bold', fontFamily: stationInfo.length > 40 ? styles.maybeCondensedFontFamily : styles.normalFontFamily }} styles={styles}>{stationInfo}</Ham2kMarkdown>
              </View>
              {historyMessage && (
                <View style={{ flex: 0 }}>
                  <View style={[styles.history.pill, historyLevel && styles.history[historyLevel]]}>
                    <Text style={[styles.history.text, historyLevel && styles.history[historyLevel]]}>{historyMessage}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableRipple>
  )
}
