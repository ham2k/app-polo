/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'

import { fmtNumber } from '@ham2k/lib-format-tools'

import { fmtDateZuluDynamic } from '../../../../../tools/timeFormats'
import { H2kIcon, H2kPressable } from '../../../../../ui'

const QSOHeader = React.memo(function QSOHeader ({ section, operation, styles, settings, onHeaderPress }) {
  // NOTE: We're using onPresOut instead of onPress because of a bug in SectionList
  // See https://github.com/facebook/react-native/issues/51290

  return (
    <H2kPressable onPressOut={onHeaderPress} style={styles.headerRow}>
      <View style={styles.rowInner}>
        <Text style={[styles.fields.header, styles.text.bold, { minWidth: styles.oneSpace * 8 }]}>
          {fmtDateZuluDynamic(section.day)}
        </Text>
        <Text style={[styles.fields.header, { flex: 0, textAlign: 'right', minWidth: styles.oneSpace * 8 }]}>
          {
            section.count === 0 ? (
              'No QSOs'
            ) : (
              section.count === 1 ? (
                '1 QSO'
              ) : (
                `${fmtNumber(section.count ?? 0)} QSOs`
              )
            )
          }
        </Text>

        <Text style={[styles.fields.header, { flex: 1 }]}>{' '}</Text>

        {Object.keys(section.scores ?? {}).sort((a, b) => (section.scores[a]?.weight ?? 0) - (section.scores[b]?.weight ?? 0)).map(key => {
          const score = section.scores[key] ?? {}
          const refKeys = Object.keys(score.refs ?? { one: true })

          if (score.summary && (score.icon || score.label)) {
            return (
              <Text key={key} style={[styles.fields.header, { marginLeft: styles.oneSpace, textAlign: 'right', opacity: score.activated === false ? 0.5 : 1 }]}>
                {score.icon ? (
                  <H2kIcon
                    name={score.icon}
                    color={score.activated === true ? styles.colors.important : undefined}
                    style={styles.fields.icon}
                    size={styles.normalFontSize * 1.1}
                  />
                ) : (
                  `${score.label}${refKeys.length > 1 ? `×${refKeys.length}` : ' '}`
                )}
                {' '}{score.summary}
              </Text>
            )
          } else {
            return null
          }
        })}
      </View>
    </H2kPressable>
  )
})
export default QSOHeader
