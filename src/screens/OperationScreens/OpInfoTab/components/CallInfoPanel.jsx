/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { Chip, Text } from 'react-native-paper'
import { View, Image, Linking } from 'react-native'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { capitalizeString } from '../../../../tools/capitalizeString'
import { fmtDateTimeDynamic } from '../../../../tools/timeFormats'
import { Ham2kMarkdown } from '../../../components/Ham2kMarkdown'

import { useQSOInfo } from './useQSOInfo'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler'

const HISTORY_QSOS_TO_SHOW = 3

function prepareStyles (baseStyles, themeColor) {
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  return {
    ...baseStyles,
    root: {
      padding: baseStyles.oneSpace * 2,
      flexDirection: 'column',
      gap: baseStyles.oneSpace * 2
    },
    section: {
      flexDirection: 'column'
    },
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
        fontWeight: 'normal',
        color: baseStyles.theme.colors[`on${upcasedThemeColor}Container`]
      },
      alert: {
        backgroundColor: 'red',
        color: 'white'
      },
      warning: {
        backgroundColor: 'green',
        color: 'white'
      },
      info: {
      }
    },
    markdown: {
      ...baseStyles.markdown,
      paragraph: { margin: 0, marginTop: baseStyles.halfSpace, marginBottom: 0 }
    },
    chipTheme: {
      colors: {
        primary: baseStyles.theme.colors[`on${upcasedThemeColor}Container`],
        onPrimary: baseStyles.theme.colors[themeColor],
        primaryContainer: baseStyles.theme.colors[`${themeColor}Container`],
        onPrimaryContainer: baseStyles.theme.colors[`on${upcasedThemeColor}Container`],
        secondaryContainer: baseStyles.theme.colors[`${themeColor}Light`],
        onSecondaryContainer: baseStyles.theme.colors[`on${upcasedThemeColor}`]
      }
    },
    chipTextStyle: {
      color: baseStyles.theme.colors[`on${upcasedThemeColor}Container`]
    }
  }
}

export function CallInfoPanel ({ qso, operation, sections, themeColor, style }) {
  const styles = useThemedStyles(prepareStyles, themeColor)

  const { guess, lookup, pota, qrz, callNotes, callHistory } = useQSOInfo({ qso, operation })

  const entity = DXCC_BY_PREFIX[guess.entityPrefix]

  const [thisOpTitle, thisOpQSOs, historyTitle, historyRecent, historyAndMore] = useMemo(() => {
    const thisQs = (callHistory || []).filter(q => operation && q.operation === operation?.uuid)
    const otherOps = (callHistory || []).filter(q => q.operation !== operation?.uuid)

    const recent = otherOps?.slice(0, HISTORY_QSOS_TO_SHOW) || []
    let thisTitle
    let title
    let andMore

    if (thisQs?.length === 1) {
      thisTitle = 'One QSO in this operation'
    } else if (thisQs?.length > 1) {
      thisTitle = `${thisQs.length} QSOs in this operation`
    } else {
      thisTitle = ''
    }

    if (otherOps?.length === 1) {
      title = 'One previous QSO'
    } else if (otherOps?.length > 1) {
      title = `${otherOps.length} previous QSOs`
    } else {
      title = ''
    }

    if (otherOps?.length <= HISTORY_QSOS_TO_SHOW) {
      andMore = ''
    } else if (otherOps?.length > HISTORY_QSOS_TO_SHOW) {
      andMore = `… and ${otherOps.length - HISTORY_QSOS_TO_SHOW} more`
    } else {
      andMore = ''
    }

    return [thisTitle, thisQs, title, recent, andMore]
  }, [callHistory, operation])

  return (
    <GestureHandlerRootView style={[style, styles.root]}>
      <ScrollView>
        {qso?.their?.call && (
          <>
            <View style={[styles.section, { flexDirection: 'row' }]}>
              <View style={{ flex: 1, flexDirection: 'column' }}>

                <View style={{ flexDirection: 'row' }}>
                  {/* <View>
                  <Icon source={'account'} size={styles.oneSpace * 4} />
                </View> */}
                  <View>
                    <Text variant="headlineSmall" style={styles.text.callsign}>
                      {qso?.their?.call}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
                    {capitalizeString(lookup?.name, { content: 'name', force: false })}
                  </Text>
                  {lookup?.city && (
                    <Text>
                      {[capitalizeString(lookup.city, { content: 'address', force: false }), lookup.state].filter(x => x).join(', ')}
                    </Text>
                  )}
                  {entity && (
                    <Text>{entity.flag} {entity.shortName}</Text>
                  )}
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: styles.oneSpace, maxWidth: '50%', alignItems: 'center' }}>
                {(lookup?.image ?? qrz?.image) && (
                  <Image source={{ uri: (lookup.image ?? qrz.image) }} style={{ width: '100%', height: styles.oneSpace * 20, borderWidth: styles.oneSpace * 0.7, borderColor: 'white', marginBottom: styles.oneSpace }} />
                )}
                <Chip
                  theme={styles.chipTheme} textStyle={styles.chipTextStyle}
                  icon="web"
                  mode="flat"
                  onPress={() => Linking.openURL(`https://qrz.com/db/${qso.their.call}`)}
                >
                  qrz.com
                </Chip>
              </View>
            </View>

            {pota?.name && (
              <View style={styles.section}>
                <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>Parks on The Air</Text>
                <Text variant="bodyLarge">
                  <Text style={styles.text.callsign}>{pota.reference} </Text>
                  {[pota.name, pota.locationName].filter(f => f).join(' • ')}
                </Text>
              </View>
            )}

            {callNotes && (
              <View style={styles.section}>
                <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>Notes</Text>
                {callNotes.map((note, i) => (
                  <Ham2kMarkdown key={i}>{note.note}</Ham2kMarkdown>
                ))}
              </View>
            )}

            {thisOpTitle && (
              <View style={styles.section}>
                <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
                  {thisOpTitle}
                </Text>
                {thisOpQSOs.map((q, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: styles.oneSpace }}>
                    <Text style={{}}>{q.band}</Text>
                    <Text style={{}}>{q.mode}</Text>
                    <Text style={{}}>{fmtDateTimeDynamic(q.startOnMillis)}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.section}>
              <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
                {historyTitle}
              </Text>
              {historyRecent.map((q, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: styles.oneSpace }}>
                  <Text style={{}}>{q.band}</Text>
                  <Text style={{}}>{q.mode}</Text>
                  <Text style={{}}>{fmtDateTimeDynamic(q.startOnMillis)}</Text>
                </View>
              ))}
              {historyAndMore && (
                <Text style={{}}>
                  {historyAndMore}
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </GestureHandlerRootView>
  )
}
