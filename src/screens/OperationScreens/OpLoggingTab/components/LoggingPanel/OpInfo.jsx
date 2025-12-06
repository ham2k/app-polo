/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'

import { fmtTimeBetween } from '../../../../../tools/timeFormats'
import { selectSecondsTick } from '../../../../../store/time'
import { H2kIcon, H2kMarkdown, H2kPressable } from '../../../../../ui'
import { fmtNumber } from '@ham2k/lib-format-tools'

export function OpInfo ({ message, clearMessage, operation, activeQSOs, style, styles, themeColor }) {
  const { t } = useTranslation()

  const navigation = useNavigation()
  const now = useSelector(selectSecondsTick)
  styles = prepareStyles(styles, { style })

  activeQSOs = activeQSOs ?? []

  const { markdownMessage, markdownStyle, icon } = useMemo(() => {
    if (message?.icon) {
      return { markdownMessage: message?.text || '', icon: message.icon }
    } else if (message?.startsWith && message.startsWith('ERROR:')) {
      return { markdownMessage: message.split('ERROR:')[1], markdownStyle: { color: styles.theme.colors.error }, icon: 'information' }
    } else if (message === true) {
      return { markdownMessage: '', icon: 'timer-outline' }
    } else if (message) {
      return { markdownMessage: message || '', icon: 'chevron-right-box' }
    } else if (activeQSOs.length === 0) {
      return { markdownMessage: t('screens.opLoggingTab.noQSOsYet-md', 'No QSOs... Let\'s get on the air!'), icon: undefined }
    } else {
      return { markdownMessage: '', icon: 'timer-outline' }
    }
  }, [message, activeQSOs.length, styles.theme.colors.error, t])

  const ourQSOs = useMemo(() => {
    if (operation?.local?.operatorCall) {
      return activeQSOs.filter(q => q?.our?.operatorCall === operation?.local?.operatorCall)
    }
    return activeQSOs
  }, [activeQSOs, operation?.local?.operatorCall])

  const line1 = useMemo(() => {
    const parts = []

    if (ourQSOs.length === 0) {
      if (operation?.local?.operatorCall) {
        return t('screens.opLoggingTab.noQSOsBy-md', 'No QSOs by {{callsign}} yet... Let\'s get on the air!', { callsign: operation?.local?.operatorCall })
      } else {
        return t('screens.opLoggingTab.noQSOsYet-md', 'No QSOs yet... Let\'s get on the air!')
      }
    }

    const countText = t('screens.opLoggingTab.qsoCount', '{{count}} QSOs', { count: ourQSOs.length, fmtCount: fmtNumber(ourQSOs.length) })
    const timeText = fmtTimeBetween(ourQSOs[0].startAtMillis, ourQSOs[ourQSOs.length - 1].startAtMillis)
    parts.push(t('screens.opLoggingTab.qsosInTime', '{{countText}} in {{timeText}}', { countText, timeText }))

    if (now - ourQSOs[ourQSOs.length - 1].startAtMillis < 1000 * 60 * 60 * 4) {
      if (ourQSOs.length > 0) {
        parts.push(
          t('screens.opLoggingTab.timeSinceLast', '{{time}} since last', { time: fmtTimeBetween(ourQSOs[ourQSOs.length - 1].startAtMillis, now) })
        )
      }
    }
    return parts.filter(x => x).join(' • ')
  }, [ourQSOs, now, operation?.local?.operatorCall, t])

  const line2 = useMemo(() => {
    const parts = []

    const last = ourQSOs?.length - 1
    if (last > 9) {
      const rate = (10 / ((ourQSOs[last].startAtMillis - ourQSOs[last - 9].startAtMillis) / 1000 / 60)) * 60
      if (rate) parts.push(t('screens.opLoggingTab.last10QSOs', '{{rate}} Q/h for last 10', { rate: rate.toFixed(0) }))
    }
    if (last > 99) {
      const rate = (100 / ((ourQSOs[last].startAtMillis - ourQSOs[last - 99].startAtMillis) / 1000 / 60)) * 60
      if (rate) parts.push(t('screens.opLoggingTab.last100QSOs', '{{rate}} Q/h for last 100', { rate: rate.toFixed(0) }))
    }

    return parts.filter(x => x).join(' • ')
  }, [ourQSOs, t])

  return (
    <H2kPressable
      onPress={() => navigation.navigate('OpInfo', { operation, uuid: operation.uuid })}
      style={styles.opInfoPanel.root}
    >

      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignContent: 'flex-start', gap: styles.halfSpace }}>
        {icon && (
          <View style={{ flex: 0, alignSelf: 'flex-start', marginTop: styles.oneSpace * 0.3 }}>
            <H2kIcon
              source={icon}
              color={styles.theme.colors[`${themeColor}ContainerVariant`]}
              size={styles.normalFontSize * 1.3}
            />
          </View>
        )}
        <View style={[style, { flex: 1, flexDirection: 'column', justifyContent: 'flex-start', paddingTop: styles.oneSpace * 0.3 }]}>
          {markdownMessage ? (
            <H2kMarkdown style={[markdownStyle, { marginTop: styles.oneSpace * -0.6 }]} styles={styles}>
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
    </H2kPressable>
  )
}

function prepareStyles (themeStyles, { style }) {
  return {
    ...themeStyles,

    opInfoPanel: {
      root: {
        ...style
      }
    },

    textLine: {
      lineHeight: themeStyles.normalFontSize * 1.3,
      marginBottom: themeStyles.oneSpace * 0.5
    },
    markdown: {
      ...themeStyles.markdown,
      paragraph: {
        margin: 0,
        marginTop: themeStyles.halfSpace,
        marginBottom: 0,
        lineHeight: themeStyles.normalFontSize * 1.3
      }
    }
  }
}
