/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { View } from 'react-native'
import { Text, TouchableRipple } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'

import { fmtTimeBetween } from '../../../../../tools/timeFormats'
import { selectSecondsTick } from '../../../../../store/time'
import { useThemedStyles } from '../../../../../styles/tools/useThemedStyles'
import { H2kIcon, H2kMarkdown } from '../../../../../ui'

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
  const navigation = useNavigation()
  const now = useSelector(selectSecondsTick)

  const styles = useThemedStyles(prepareStyles, themeColor)

  const { markdownMessage, markdownStyle, icon } = useMemo(() => {
    if (message?.icon) {
      return { markdownMessage: message?.text || '', icon: message.icon }
    } else if (message?.startsWith && message.startsWith('ERROR:')) {
      return { markdownMessage: message.split('ERROR:')[1], markdownStyle: { color: styles.theme.colors.error }, icon: 'information' }
    } else if (message === true) {
      return { markdownMessage: '', icon: 'timer-outline' }
    } else if (message) {
      return { markdownMessage: message || '', icon: 'chevron-right-box' }
    } else if (qsos.length === 0) {
      return { markdownMessage: "No QSOs... Let's get on the air!", icon: undefined }
    } else {
      return { markdownMessage: '', icon: 'timer-outline' }
    }
  }, [message, qsos.length, styles.theme.colors.error])

  const line1 = useMemo(() => {
    const parts = []

    parts.push(`${qsos.length} ${qsos.length === 1 ? 'QSO' : 'QSOs'} in ${fmtTimeBetween(operation.startAtMillisMin, operation.startAtMillisMax)}`)

    if (now - operation.startAtMillisMax < 1000 * 60 * 60 * 4) {
      if (qsos.length > 0) {
        parts.push(`${fmtTimeBetween(operation.startAtMillisMax, now)} since last QSO`)
      }
    }
    return parts.filter(x => x).join(' • ')
  }, [qsos, operation, now])

  const line2 = useMemo(() => {
    const parts = []

    const last = qsos?.length - 1
    if (last > 9) {
      const rate = (10 / ((qsos[last].startAtMillis - qsos[last - 9].startAtMillis) / 1000 / 60)) * 60
      if (rate) parts.push(`${rate.toFixed(0)} Q/h for last 10`)
    }
    if (last > 99) {
      const rate = (100 / ((qsos[last].startAtMillis - qsos[last - 99].startAtMillis) / 1000 / 60)) * 60
      if (rate) parts.push(`${rate.toFixed(0)} Q/h for last 100`)
    }

    return parts.filter(x => x).join(' • ')
  }, [qsos])

  return (
    <TouchableRipple onPress={() => navigation.navigate('OpInfo', { operation, uuid: operation.uuid })} style={{ minHeight: styles.oneSpace * 6, flexDirection: 'column', alignItems: 'stretch' }}>

      <View style={[style, { flexDirection: 'row', justifyContent: 'flex-start', alignContent: 'flex-start', gap: styles.halfSpace }]}>
        {icon && (
          <View style={{ flex: 0, alignSelf: 'flex-start' }}>
            <H2kIcon
              source={icon}
              size={styles.oneSpace * 3}
              color={styles.theme.colors[`${themeColor}ContainerVariant`]}
            />
          </View>
        )}
        <View style={[style, { flex: 1, flexDirection: 'column', justifyContent: 'flex-start', paddingTop: styles.oneSpace * 0.3 }]}>
          {markdownMessage ? (
            <H2kMarkdown style={markdownStyle} styles={styles}>
              {markdownMessage}
            </H2kMarkdown>
          ) : (
            <>
              {line1 && <Text numberOfLines={2} ellipsizeMode={'tail'} style={styles.textLine}>{line1}</Text>}
              {line2 && <Text numberOfLines={2} ellipsizeMode={'tail'} style={styles.textLine}>{line2}</Text>}
            </>
          )}
        </View>
      </View>
    </TouchableRipple>
  )
}
