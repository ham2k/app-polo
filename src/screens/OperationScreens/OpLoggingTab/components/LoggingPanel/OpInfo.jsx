/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo } from 'react'
import { Icon, Text, TouchableRipple } from 'react-native-paper'

import { View } from 'react-native'
import { fmtTimeBetween } from '../../../../../tools/timeFormats'
import { useSelector } from 'react-redux'
import { selectSecondsTick } from '../../../../../store/time'
import { Ham2kMarkdown } from '../../../../components/Ham2kMarkdown'
import { useThemedStyles } from '../../../../../styles/tools/useThemedStyles'

function prepareStyles (baseStyles, themeColor) {
  return {
    ...baseStyles,
    textLine: {
      lineHeight: baseStyles.normalFontSize * 1.3,
      marginBottom: baseStyles.oneSpace * 0.5
    },
    markdown: {
      ...baseStyles.markdown,
      paragraph: {
        margin: 0,
        marginTop: 0,
        marginBottom: 0,
        lineHeight: baseStyles.normalFontSize * 1.3
      }
    }
  }
}

export function OpInfo ({ message, clearMessage, operation, qsos, style, themeColor }) {
  const now = useSelector(selectSecondsTick)

  const styles = useThemedStyles(prepareStyles, themeColor)

  const { markdownMessage, markdownStyle, icon } = useMemo(() => {
    if (message?.startsWith && message.startsWith('ERROR:')) {
      return { markdownMessage: message.split('ERROR:')[1], markdownStyle: { color: styles.theme.colors.error }, icon: 'information' }
    } else if (message) {
      return { markdownMessage: message, icon: 'chevron-right-box' }
    } else {
      return { markdownMessage: '', icon: 'timer-outline' }
    }
  }, [message, styles])

  useEffect(() => {
    const timer = setTimeout(() => {
      clearMessage()
    }, 3000)
    return () => clearTimeout(timer)
  }, [message, clearMessage])

  const line1 = useMemo(() => {
    if (qsos.length === 0) {
      return "No QSOs... Let's get on the air!"
    } else {
      const parts = []

      parts.push(`${qsos.length} ${qsos.length === 1 ? 'QSO' : 'QSOs'} in ${fmtTimeBetween(operation.startOnMillisMin, operation.startOnMillisMax)}`)

      if (now - operation.startOnMillisMax < 1000 * 60 * 60 * 4) {
        if (qsos.length > 0) {
          parts.push(`${fmtTimeBetween(operation.startOnMillisMax, now)} since last QSO`)
        }
      }
      return parts.filter(x => x).join(' • ')
    }
  }, [qsos, operation, now])

  const line2 = useMemo(() => {
    const parts = []

    const last = qsos?.length - 1
    if (last > 9) {
      const rate = (10 / ((qsos[last].startOnMillis - qsos[last - 9].startOnMillis) / 1000 / 60)) * 60
      if (rate) parts.push(`${rate.toFixed(0)} Q/h for last 10`)
    }
    if (last > 99) {
      const rate = (100 / ((qsos[last].startOnMillis - qsos[last - 99].startOnMillis) / 1000 / 60)) * 60
      if (rate) parts.push(`${rate.toFixed(0)} Q/h for last 100`)
    }

    return parts.filter(x => x).join(' • ')
  }, [qsos])

  return (
    <TouchableRipple onPress={() => true} style={{ minHeight: styles.oneSpace * 6 }}>

      <View style={[style, { flexDirection: 'row', justifyContent: 'flex-start', alignContent: 'flex-start', gap: styles.halfSpace }]}>
        <View style={{ flex: 0, alignSelf: 'flex-start' }}>
          <Icon
            source={icon}
            size={styles.oneSpace * 3}
            color={styles.theme.colors[`${themeColor}ContainerVariant`]}
          />
        </View>
        <View style={[style, { flex: 1, flexDirection: 'column', justifyContent: 'flex-start', paddingTop: styles.oneSpace * 0.3 }]}>
          {markdownMessage ? (
            <Ham2kMarkdown style={{ ...markdownStyle, borderWidth: 0, borderColor: 'red', fontWeight: 'bold' }} styles={styles}>
              {markdownMessage}
            </Ham2kMarkdown>
          ) : (
            <>
              {line1 && <Text numberOfLines={2} ellipsizeMode={'tail'} style={styles.textLine}>{line1}</Text>}
              {line2 && <Text numberOfLines={2} ellipsizeMode={'tail'} styles={styles.textLine}>{line2}</Text>}
            </>
          )}
        </View>
      </View>
    </TouchableRipple>
  )
}
