// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'

import { capitalizeFirstLetter, fmtNumber, fmtDateDynamicZulu } from '@ham2k/lib-format-tools'

import { H2kIcon, H2kPressable } from '../../../../../ui'
import { describeOperation } from '../../../../../store/operations'

const QSOHeader = React.memo(function QSOHeader ({ section, contextItem, operation, styles, settings, onHeaderPress }) {
  // NOTE: We're using onPresOut instead of onPress because of a bug in SectionList
  // See https://github.com/facebook/react-native/issues/51290
  const dateLabel = capitalizeFirstLetter(fmtDateDynamicZulu(section.day, { compact: true }))
  const summary = contextItem?.event?.segmentSummary ?? section
  const qsoCountLabel = qsoCountText(summary.count)
  const segmentLabel = segmentHeaderLabel(contextItem?.event?.operation)

  return (
    <H2kPressable
      onPressOut={onHeaderPress}
      style={styles.headerRow}
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel={[dateLabel, segmentLabel, qsoCountLabel].filter(Boolean).join(' - ')}
    >
      <View style={styles.rowInner}>
        <Text style={[styles.fields.header, styles.text.bold, { minWidth: styles.oneSpace * 8 }]}>
          {dateLabel}
        </Text>
        {segmentLabel ? (
          <Text numberOfLines={1} ellipsizeMode={'tail'} style={[styles.fields.header, { flex: 1, marginRight: styles.oneSpace }]}>
            {segmentLabel}
          </Text>
        ) : null}
        <Text style={[styles.fields.header, { flex: 0, textAlign: 'right', minWidth: styles.oneSpace * 8 }]}>
          {qsoCountLabel}
        </Text>

        <Text style={[styles.fields.header, { flex: segmentLabel ? 0 : 1 }]}>{' '}</Text>

        {Object.keys(summary.scores ?? {}).sort((a, b) => (summary.scores[a]?.weight ?? 0) - (summary.scores[b]?.weight ?? 0)).map(key => {
          const score = summary.scores[key] ?? {}
          const refKeys = Object.keys(score.refs ?? { one: true })

          if (score.summary && (score.icon || score.label)) {
            return (
              <Text key={key} style={[styles.fields.header, { marginLeft: styles.oneSpace, textAlign: 'right', opacity: score.activated === false ? 0.5 : 1 }]}>
                {score.icon ? (
                  <H2kIcon
                    name={score.icon}
                    color={score.activated === true ? styles.colors.important : undefined}
                    style={styles.fields.icon}
                    size={styles.normalFontSize * 0.95}
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

function qsoCountText (count) {
  if (count === 0) return 'No QSOs'
  if (count === 1) return '1 QSO'
  return `${fmtNumber(count ?? 0)} QSOs`
}

function segmentHeaderLabel (operation) {
  const description = describeOperation({ operation })
  return description.split(' • ')[0] || undefined
}

export default QSOHeader
