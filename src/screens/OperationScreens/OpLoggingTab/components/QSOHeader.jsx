/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { Icon, Text } from 'react-native-paper'

import { fmtDateZuluDynamic } from '../../../../tools/timeFormats'
import { View } from 'react-native'

import { fmtNumber } from '@ham2k/lib-format-tools'

export function guessItemHeight (qso, styles) {
  return styles.compactRow.height + styles.compactRow.borderBottomWidth
}

const QSOHeader = React.memo(function QSOHeader ({ section, operation, styles, settings }) {
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.fields.header, styles.text.bold, { minWidth: styles.oneSpace * 8 }]}>
        {fmtDateZuluDynamic(section.day)}
      </Text>
      <Text style={[styles.fields.header, { flex: 0, textAlign: 'right', minWidth: styles.oneSpace * 11 }]}>
        {
            section.data.length === 0 ? (
              'No QSOs'
            ) : (
              section.data.length === 1 ? (
                '1 QSO'
              ) : (
                `${fmtNumber(section.data.length)} QSOs`
              )
            )
          }
      </Text>

      <Text style={[styles.fields.header, { flex: 1 }]}>{' '}</Text>

      {Object.keys(section.scores ?? {}).sort().map(key => {
        const score = section.scores[key]
        const refKeys = Object.keys(score.refs ?? { one: true })

        return (
          <Text key={key} style={[styles.fields.header, { marginLeft: styles.oneSpace, textAlign: 'right', opacity: score.activated === false ? 0.5 : 1 }]}>
            {score.icon ? (
              refKeys.map((refKey, index) => (
                <Icon
                  key={refKey}
                  source={score.icon}
                  size={styles.normalFontSize}
                  color={score.activated === true ? styles.colors.important : undefined }
                  style={styles.fields.icon}
                />
              ))
            ) : (
              `${score.label}${refKeys.length > 1 ? `×${refKeys.length}` : ' '}`
            )}
            {' '}{score.value ?? ''}{score.activated && ' ✓'}
          </Text>
        )
      })}
    </View>
  )
})
export default QSOHeader
