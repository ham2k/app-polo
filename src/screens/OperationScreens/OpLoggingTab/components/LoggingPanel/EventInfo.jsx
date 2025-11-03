/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'

import { H2kIcon, H2kPressable } from '../../../../../ui'

export function EventInfo ({ qso, operation, qsos, style, styles, themeColor }) {
  const navigation = useNavigation()
  const { event } = qso

  styles = prepareStyles(styles, { style })

  return (
    <H2kPressable
      onPress={() => navigation.navigate('OpInfo', { operation, uuid: operation.uuid })}
      style={styles.eventInfoPanel.root}
    >

      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignContent: 'flex-start', gap: styles.halfSpace }}>
        <View style={{ flex: 0, alignSelf: 'flex-start' }}>
          <H2kIcon
            source={event?.icon ?? 'information-outline'}
            size={styles.oneSpace * 3}
            color={styles.theme.colors[`${themeColor}ContainerVariant`]}
          />
        </View>

        <View style={[style, { flex: 1, flexDirection: 'column', justifyContent: 'flex-start' }]}>
          <Text numberOfLines={1} ellipsizeMode={'tail'} style={styles.textLine}>{event?.event.toUpperCase()}</Text>
        </View>
      </View>
    </H2kPressable>
  )
}

function prepareStyles (themeStyles, { style }) {
  return {
    ...themeStyles,

    eventInfoPanel: {
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
