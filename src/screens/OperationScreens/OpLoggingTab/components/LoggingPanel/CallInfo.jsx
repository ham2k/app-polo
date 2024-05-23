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

import { findBestHook } from '../../../../../extensions/registry'
import { distanceForQSON, fmtDistance } from '../../../../../tools/geoTools'
import { Ham2kMarkdown } from '../../../../components/Ham2kMarkdown'
import { useQSOInfo } from '../../../OpInfoTab/components/useQSOInfo'
import { startOfDayInMillis, yesterdayInMillis } from '../../../../../tools/timeTools'

const MESSAGES_FOR_SCORING = {
  duplicate: 'Dupe!!!',
  newBand: 'New Band',
  newMode: 'New Mode',
  newRef: 'New Reference',
  newDay: 'New Day',
  'potaActivation.newDay': 'New POTA Day',
  'potaActivation.newRef': 'New Park',
  'sotaActivation.newDay': 'New SOTA Day',
  'sotaActivation.newRef': 'New Summit',
  'ukbotaActivation.newDay': 'New UKBOTA Day',
  'ukbotaActivation.newRef': 'New Bunker'
}

function prepareStyles (baseStyles, themeColor) {
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  return {
    ...baseStyles,
    history: {
      pill: {
        marginRight: baseStyles.halfSpace,
        borderRadius: 3,
        padding: baseStyles.oneSpace * 0.3,
        paddingHorizontal: baseStyles.oneSpace * 0.5,
        backgroundColor: baseStyles.theme.colors[`${themeColor}Light`]
      },
      text: {
        fontSize: baseStyles.smallFontSize,
        lineHeight: baseStyles.normalFontSize * 1.3,
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
      paragraph: { margin: 0, marginTop: baseStyles.halfSpace, marginBottom: 0 }
    }
  }
}

export function CallInfo ({ qso, qsos, operation, style, themeColor, updateQSO, settings }) {
  const navigation = useNavigation()
  const styles = useThemedStyles(prepareStyles, themeColor)

  const { online, ourInfo, guess, lookup, pota, qrz, callNotes, callHistory } = useQSOInfo({ qso, operation })

  useEffect(() => { // Merge all data sources and update guesses and QSO
    if (guess) { updateQSO && updateQSO({ their: { ...qso.their, guess, lookup } }) }
  }, [guess, lookup, qso.their, updateQSO])

  const [locationInfo, flag] = useMemo(() => {
    let isOnTheGo = (lookup?.dxccCode && lookup?.dxccCode !== guess?.dxccCode)

    const leftParts = []
    const rightParts = []

    const entity = DXCC_BY_PREFIX[guess?.entityPrefix]

    if (guess.indicators && guess.indicators.find(ind => ['P', 'M', 'AM', 'MM'].indexOf(ind) >= 0)) {
      isOnTheGo = true
      if (guess.indicators.indexOf('P') >= 0) leftParts.push('[Portable]')
      else if (guess.indicators.indexOf('M') >= 0) leftParts.push('[Mobile]')
      else if (guess.indicators.indexOf('MM') >= 0) leftParts.push('[ 🚢 ]')
      else if (guess.indicators.indexOf('AM') >= 0) leftParts.push('[ ✈️ ]')
    }

    if (operation.grid && guess?.grid) {
      const dist = distanceForQSON({ our: { ...ourInfo, grid: operation.grid }, their: { grid: qso?.their?.grid, guess } }, { units: settings.distanceUnits })
      if (dist) leftParts.push(`${fmtDistance(dist, { units: settings.distanceUnits })} to`)
    }

    if (entity && entity.entityPrefix !== ourInfo.entityPrefix) {
      leftParts.push(entity.shortName)
    }

    if (pota.name) {
      isOnTheGo = true
      leftParts.push(
        [
          ['POTA', pota.reference, pota.shortName ?? pota.name].filter(x => x).join(' '),
          pota.locationName
        ].filter(x => x).join(' – ')
      )
    } else if (pota.error) {
      leftParts.push(`POTA ${pota.reference} ${pota.error}`)
    }

    if (qso?.their?.city || qso?.their?.state) {
      rightParts.push([qso?.their?.city, qso?.their?.state].filter(x => x).join(', '))
    } else if (!isOnTheGo && (guess?.city || guess?.state)) {
      rightParts.push([guess?.city, guess?.state].filter(x => x).join(', '))
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
  }, [
    operation.grid, pota,
    lookup, guess, qso?.their?.city, qso?.their?.state, qso?.their?.grid,
    ourInfo, settings.distanceUnits
  ])

  const stationInfo = useMemo(() => {
    const parts = []
    if (callNotes && callNotes[0]) {
      parts.push(callNotes[0].note)
    } else {
      if (qrz?.error) parts.push(qrz.error)
      parts.push(qso?.their?.name ?? guess?.name)
    }

    return parts.filter(x => x).join(' • ')
  }, [qrz?.error, qso?.their?.name, guess?.name, callNotes])

  const scoreInfo = useMemo(() => {
    const exportHandlers = (operation?.refs || []).map(ref => ({ handler: findBestHook(`ref:${ref.type}`), ref }))?.filter(x => x?.handler && x.handler.scoringForQSO)
    const scores = exportHandlers.map(({ handler, ref }) => handler.scoringForQSO({ qso, qsos, operation, ref })).filter(x => x)
    return scores
  }, [operation, qso, qsos])

  const [historyMessage, historyLevel] = useMemo(() => {
    if (scoreInfo?.length > 0) {
      const [message, level] = scoreInfo.map(score => {
        if (score?.notices && score?.notices[0]) return [MESSAGES_FOR_SCORING[`${score.type}.${score?.notices[0]}`] ?? MESSAGES_FOR_SCORING[score?.notices[0]] ?? score?.notices[0], 'notice']
        if (score?.alerts && score?.alerts[0]) return [MESSAGES_FOR_SCORING[`${score.type}.${score?.alerts[0]}`] ?? MESSAGES_FOR_SCORING[score?.alerts[0]] ?? score?.alerts[0], 'alert']
        return []
      }).filter(x => x)[0]

      if (message && level) return [message, level]
    }

    if (callHistory?.length > 0) {
      const parts = []
      const today = startOfDayInMillis()
      const yesterday = yesterdayInMillis()
      let count = callHistory.length
      const countToday = callHistory.filter(x => x.startOnMillis >= today).length
      const countYesterday = callHistory.filter(x => x.startOnMillis >= yesterday).length - countToday

      if (countToday) {
        parts.push(`+ ${countToday} today`)
        count -= countToday
      } else if (countYesterday) {
        parts.push(`+ ${countYesterday} yesterday`)
        count -= countYesterday
      }
      if (count) {
        parts.push(`+ ${count} QSOs`)
      }

      return [parts.join(' ').replace(' 1 QSOs', ' 1 QSO'), 'info']
    }
    return []
  }, [scoreInfo, callHistory])

  return (
    <>
      <TouchableRipple onPress={() => navigation.navigate('CallInfo', { operation, qso, uuid: operation.uuid, call: qso?.their?.call, qsoKey: qso?.key })} style={{ minHeight: styles.oneSpace * 5 }}>

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
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                {historyMessage && (
                  <View style={[{ flex: 0 }, styles.history.pill, historyLevel && styles.history[historyLevel]]}>
                    <Text style={[styles.history.text, historyLevel && styles.history[historyLevel]]}>{historyMessage}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {/* numberOfLines={2} ellipsizeMode={'tail'} */}
                  <Ham2kMarkdown style={{ lineHeight: styles.normalFontSize * 1.3, fontWeight: 'bold', fontFamily: stationInfo.length > 40 ? styles.maybeCondensedFontFamily : styles.normalFontFamily }} styles={styles}>{stationInfo}</Ham2kMarkdown>
                </View>
              </View>
            )}
          </View>
        </View>
      </TouchableRipple>
    </>
  )
}
