/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { View } from 'react-native'
import { Text } from 'react-native-paper'
import { ScrollView } from 'react-native-gesture-handler'
import { fmtNumber } from '@ham2k/lib-format-tools'

import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { fmtDateZuluDynamic, fmtTimeBetween } from '../../../../tools/timeFormats'
import { selectSecondsTick } from '../../../../store/time'
import { Ham2kMarkdown } from '../../../components/Ham2kMarkdown'
import { Ham2KIcon } from '../../../components/Ham2KIcon'

function prepareStyles (baseStyles, themeColor, style) {
  return {
    ...baseStyles,
    root: {
      ...style,
      paddingTop: baseStyles.oneSpace * 2,
      paddingLeft: Math.max(style?.paddingLeft || 0, baseStyles.oneSpace * 2),
      paddingRight: Math.max(style?.paddingRight || 0, baseStyles.oneSpace * 2),
      paddingBottom: Math.max(style?.paddingBottom || 0, baseStyles.oneSpace * 2),
      flexDirection: 'column',
      gap: baseStyles.oneSpace * 2
    },
    section: {
      flexDirection: 'column',
      marginVertical: baseStyles.oneSpace
    },
    icon: {
      // maxWidth: baseStyles.oneSpace * 8
    },
    scoringMarkdown: {
      // For scoring summaries, we want most text to be small, monospaced, and light
      // And then we override blockquotes to be regular text
      // This allow for nice checklists
      s: {
        color: baseStyles.colors.onBackground,
        textDecorationLine: 'line-through'
      },
      blockquote: {
        ...baseStyles.markdown.body,
        ...baseStyles.text.callsign,
        backgroundColor: undefined,
        borderColor: undefined,
        borderLeftWidth: 0,
        marginLeft: 0,
        paddingHorizontal: 0,
        fontSize: baseStyles.smallFontSize,
        color: baseStyles.colors.onBackgroundLighter,
        opacity: 1
      }
    }
  }
}

export function OpInfoPanel ({ operation, qso, activeQSOs, sections, style, themeColor }) {
  const styles = useThemedStyles(prepareStyles, themeColor, style)

  const now = useSelector(selectSecondsTick)

  const lastSection = sections[sections.length - 1]

  const line1 = useMemo(() => {
    if (activeQSOs.length === 0) {
      return "No QSOs... Let's get on the air!"
    } else {
      const parts = []

      parts.push(`${activeQSOs.length} ${activeQSOs.length === 1 ? 'QSO' : 'QSOs'} in ${fmtTimeBetween(operation.startAtMillisMin, operation.startAtMillisMax)}`)

      if (now - operation.startAtMillisMax < 1000 * 60 * 60 * 4) {
        if (activeQSOs.length > 0) {
          parts.push(`${fmtTimeBetween(operation.startAtMillisMax, now)} since last QSO`)
        }
      }
      return parts.filter(x => x).join(' • ')
    }
  }, [activeQSOs, operation, now])

  const line2 = useMemo(() => {
    const parts = []

    const last = activeQSOs?.length - 1
    if (last > 9) {
      const rate = (10 / ((activeQSOs[last].startAtMillis - activeQSOs[last - 9].startAtMillis) / 1000 / 60)) * 60
      if (rate) parts.push(`${rate.toFixed(0)} Q/h for last 10`)
    }
    if (last > 99) {
      const rate = (100 / ((activeQSOs[last].startAtMillis - activeQSOs[last - 99].startAtMillis) / 1000 / 60)) * 60
      if (rate) parts.push(`${rate.toFixed(0)} Q/h for last 100`)
    }

    return parts.filter(x => x).join(' • ')
  }, [activeQSOs])

  return (
    <ScrollView style={styles.root}>
      <View style={styles.section}>
        <Text style={styles.markdown.heading2}>
          Operation Stats
        </Text>
        {line1 && <Text style={styles.markdown.body} numberOfLines={2} ellipsizeMode={'tail'}>{line1}</Text>}
        {line2 && <Text style={styles.markdown.body} numberOfLines={2} ellipsizeMode={'tail'}>{line2}</Text>}
      </View>
      {sections.map(section => (
        <View key={section.day} style={{ flexDirection: 'column', marginVertical: styles.oneSpace }}>
          <Text style={[styles.markdown.body, { marginBottom: styles.halfSpace }]}>
            <Text style={{ fontWeight: 'bold' }}>{fmtDateZuluDynamic(section.day)}: </Text>
            <Text>
              {section.count === 0 ? 'No QSOs' : section.count === 1 ? '1 QSO' : `${fmtNumber(section.count ?? 0)} QSOs`}
            </Text>
          </Text>
          {Object.keys(section.scores ?? {}).filter(key => section.scores[key].for === 'day').sort((a, b) => (section.scores[a].weight ?? 0) - (section.scores[b].weight ?? 0)).map(key => {
            const score = section.scores[key]

            const refKeys = Object.keys(score.refs ?? { one: true })

            if ((score.summary || score.longSummary) && (score.icon || score.label)) {
              return (
                <View key={key} style={{ maxWidth: '100%', flexDirection: 'row', alignItems: 'flex-start', marginBottom: styles.oneSpace }}>
                  <View style={{ width: styles.oneSpace * 3, marginTop: styles.oneSpace * 0.2 }}>
                    {score.icon && (
                      <Ham2KIcon
                        name={score.icon}
                        size={styles.normalFontSize}
                        color={score.activated === true ? styles.colors.important : undefined}
                        style={styles.icon}
                      />
                    )}
                  </View>
                  <Ham2kMarkdown style={{ width: '93%' }} styles={{ markdown: styles.scoringMarkdown }}>
                    {score.label && (
                      `### ${score.label}${refKeys.length > 1 ? `×${refKeys.length}:` : ':'}`
                    )}
                    {' '}{score.longSummary ?? score.summary}
                  </Ham2kMarkdown>
                </View>
              )
            } else {
              return null
            }
          })}
        </View>
      ))}

      <View style={{ flexDirection: 'column', marginTop: styles.oneSpace }}>
        <Text style={[styles.markdown.body, { marginBottom: styles.halfSpace }]}>
          <Text style={{ fontWeight: 'bold' }}>Operation Totals: </Text>
          <Text>
            {operation.qsoCount === 0 ? 'No QSOs' : operation.qsoCount === 1 ? '1 QSO' : `${fmtNumber(operation.qsoCount ?? 0)} QSOs`}
          </Text>
        </Text>
        {Object.keys(lastSection?.scores ?? {}).filter(key => lastSection.scores[key].for !== 'day').sort((a, b) => (lastSection.scores[a].weight ?? 0) - (lastSection.scores[b].weight ?? 0)).map(key => {
          const score = lastSection.scores[key]

          const refKeys = Object.keys(score.refs ?? { one: true })

          if ((score.summary || score.longSummary) && (score.icon || score.label)) {
            return (
              <View key={key} style={{ maxWidth: '100%', flexDirection: 'row', alignItems: 'flex-start', marginBottom: styles.oneSpace }}>
                <View style={{ width: styles.oneSpace * 3, marginTop: styles.oneSpace * 0.2 }}>
                  {score.icon && (
                    <Ham2KIcon
                      name={score.icon}
                      size={styles.normalFontSize}
                      color={score.activated === true ? styles.colors.important : undefined}
                      style={styles.icon}
                    />
                  )}
                </View>
                <Ham2kMarkdown style={{ width: '93%' }} styles={{ markdown: styles.scoringMarkdown }}>
                  {score.label && (
                    `### ${score.label}${refKeys.length > 1 ? `×${refKeys.length}` : ''}`
                  )}
                  {' '}{score.longSummary ?? score.summary}
                </Ham2kMarkdown>
              </View>
            )
          } else {
            return null
          }
        })}
      </View>
    </ScrollView>
  )
}
