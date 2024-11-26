/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { SectionList, View, useWindowDimensions } from 'react-native'
import { Text } from 'react-native-paper'
import QSOItem from './QSOItem'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { useUIState } from '../../../../store/ui'
import { fmtFreqInMHz } from '../../../../tools/frequencyFormats'
import { findHooks } from '../../../../extensions/registry'
import QSOHeader from './QSOHeader'
import getItemLayout from 'react-native-get-item-layout-section-list'
import { fmtShortTimeZulu, fmtTimeZulu } from '../../../../tools/timeFormats'

function prepareStyles (themeStyles, isDeleted, isOtherOperator, width) {
  const extendedWidth = width / themeStyles.oneSpace > 80
  const narrowWidth = width / themeStyles.oneSpace < 50

  const DEBUG = false

  let commonStyles = {
    fontSize: themeStyles.normalFontSize,
    lineHeight: themeStyles.normalFontSize * 1.4,
    borderWidth: DEBUG ? 1 : 0
  }

  if (isDeleted) {
    commonStyles = {
      ...commonStyles,
      textDecorationLine: 'line-through',
      textDecorationColor: themeStyles.colors.onBackground,
      color: themeStyles.colors.onBackgroundLighter
      // opacity: 0.6
    }
  }

  if (isOtherOperator) {
    commonStyles = {
      ...commonStyles,
      opacity: 0.7
    }
  }

  return {
    ...themeStyles,
    extendedWidth,
    narrowWidth,
    selectedRow: {
      backgroundColor: themeStyles.colors.secondaryContainer
    },
    unselectedRow: {
    },
    headerRow: {
      ...themeStyles.compactRow,
      backgroundColor: themeStyles.colors.surfaceVariant
    },
    fields: {
      header: {
        ...commonStyles,
        flex: 0,
        marginLeft: 0,
        textAlign: 'left'
      },
      number: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        flex: 0,
        marginLeft: 0,
        minWidth: extendedWidth ? themeStyles.oneSpace * 4 : themeStyles.oneSpace * 3,
        textAlign: 'right'
      },
      time: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        minWidth: extendedWidth ? themeStyles.oneSpace * 10 : themeStyles.oneSpace * 7,
        marginLeft: 0,
        textAlign: 'right'
      },
      freq: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        // fontFamily: 'Roboto',
        flex: 0,
        lineHeight: themeStyles.normalFontSize * (themeStyles.isIOS ? 1.5 : 1.4),
        minWidth: extendedWidth ? themeStyles.oneSpace * 10 : themeStyles.oneSpace * 8,
        marginLeft: themeStyles.oneSpace * (extendedWidth ? 2 : 1),
        textAlign: 'right'
      },
      freqMHz: {
        ...commonStyles,
        lineHeight: themeStyles.normalFontSize * (themeStyles.isIOS ? 1.5 : 1.4),
        fontWeight: '600',
        textAlign: 'right'
      },
      freqKHz: {
        ...commonStyles,
        lineHeight: themeStyles.normalFontSize * (themeStyles.isIOS ? 1.5 : 1.4),
        textAlign: 'right'
      },
      freqHz: {
        ...commonStyles,
        lineHeight: themeStyles.normalFontSize * (themeStyles.isIOS ? 1.5 : 1.4),
        textAlign: 'right',
        fontWeight: '400',
        fontSize: themeStyles.normalFontSize * 0.7
      },
      call: {
        ...commonStyles,
        ...themeStyles.text.callsign,
        ...themeStyles.text.callsignBold,
        flex: 0,
        marginLeft: themeStyles.oneSpace * (extendedWidth ? 2 : 1),
        minWidth: themeStyles.oneSpace * 8,
        textAlign: 'left'
      },
      name: {
        ...commonStyles,
        flex: 1,
        marginLeft: themeStyles.oneSpace * (extendedWidth ? 2 : 1),
        textAlign: 'left'
      },
      location: {
        ...commonStyles,
        lineHeight: themeStyles.normalFontSize * (themeStyles.isIOS ? 1.5 : 1.4),
        flex: 0,
        marginLeft: themeStyles.oneSpace * (extendedWidth ? 2 : 1),
        minWidth: themeStyles.oneSpace * 3.5,
        textAlign: 'center'
      },
      signal: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        minWidth: themeStyles.oneSpace * 3,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right'
      },
      exchange: {
        ...commonStyles,
        ...themeStyles.text.callsign,
        flex: 0,
        minWidth: themeStyles.oneSpace * 8.5,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'left'
      },
      icons: {
        ...commonStyles,
        flex: 0,
        flexDirection: 'row',
        textAlign: 'right',
        marginLeft: themeStyles.oneSpace,
        minWidth: themeStyles.oneSpace * 2,
        maxWidth: themeStyles.oneSpace * 9
      },
      icon: {
        ...commonStyles,
        flex: 0,
        marginTop: themeStyles.oneSpace * 0.45,
        width: themeStyles.oneSpace * 1.8
      }
    }
  }
}

const QSOList = function QSOList ({ style, ourInfo, settings, qsos, sections, operation, vfo, onHeaderPress }) {
  const { width } = useWindowDimensions()

  const [componentWidth, setComponentWidth] = useUIState()
  const handleLayout = useCallback((event) => {
    setComponentWidth(event?.nativeEvent?.layout?.width)
  }, [setComponentWidth])

  const [loggingState, , updateLoggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  const styles = useThemedStyles(prepareStyles, false, false, componentWidth ?? width)
  const stylesForDeleted = useThemedStyles(prepareStyles, true, false, componentWidth ?? width)
  const stylesForOtherOperator = useThemedStyles(prepareStyles, false, true, componentWidth ?? width)

  const listRef = useRef()

  // When the lastQSO changes, scroll to it
  useEffect(() => {
    setTimeout(() => {
      if (!sections || !sections.length) return
      let sectionIndex = sections.length - 1
      let itemIndex = sections[sectionIndex].data.length - 1
      if (loggingState?.lastUUID) {
        sections.find((section, i) => {
          return section.data.find((qso, j) => {
            if (qso.uuid === loggingState?.lastUUID) {
              sectionIndex = i
              itemIndex = j
              return true
            }
            return false
          })
        })
      }

      listRef.current?.scrollToLocation({ sectionIndex, itemIndex, animated: true })
    }, 50)
  }, [listRef, loggingState?.lastUUID, sections])

  const refHandlers = useMemo(() => {
    const types = {}
    ;(operation?.refs || []).forEach((ref) => {
      types[ref.type] = true
    })
    qsos.forEach((qso) => {
      (qso.refs || []).forEach((ref) => {
        types[ref.type] = true
      })
    })
    let handlers = []
    Object.keys(types).forEach(key => {
      handlers = handlers.concat(findHooks(`ref:${key}`).filter(h => h.relevantInfoForQSOItem))
    })
    return handlers.filter(x => x)
  }, [qsos, operation])

  const handlePress = useCallback(({ qso }) => {
    if (qso.uuid === loggingState?.selectedUUID) {
      updateLoggingState({ selectedUUID: undefined })
    } else {
      updateLoggingState({ selectedUUID: qso.uuid })
    }
  }, [loggingState?.selectedUUID, updateLoggingState])

  const timeFormatFunction = useMemo(() => {
    if (styles.extendedWidth) {
      return fmtTimeZulu
    } else {
      return fmtShortTimeZulu
    }
  }, [styles])

  const renderRow = useCallback(({ item, index }) => {
    const qso = item

    let qsoStyles
    if (qso.deleted) {
      qsoStyles = stylesForDeleted
    } else if (qso.our?.operatorCall && qso.our?.operatorCall !== operation?.operatorCall) {
      qsoStyles = stylesForOtherOperator
    } else {
      qsoStyles = styles
    }

    return (
      <QSOItem
        qso={qso}
        settings={settings}
        selected={qso.uuid === loggingState?.selectedUUID}
        ourInfo={ourInfo}
        onPress={handlePress}
        timeFormatFunction={timeFormatFunction}
        styles={qsoStyles}
        refHandlers={refHandlers}
      />
    )
  }, [operation, settings, loggingState?.selectedUUID, ourInfo, handlePress, timeFormatFunction, refHandlers, stylesForDeleted, stylesForOtherOperator, styles])

  const renderHeader = useCallback(({ section, index }) => {
    return (
      <QSOHeader
        section={section}
        operation={operation}
        settings={settings}
        styles={styles}
        onHeaderPress={onHeaderPress}
      />
    )
  }, [operation, settings, styles, onHeaderPress])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- useCallback prefers to see an inline function
  const calculateLayout = useCallback(
    getItemLayout({
      getItemHeight: styles.compactRow.height + styles.compactRow.borderBottomWidth,
      getSectionHeaderHeight: styles.headerRow.height + styles.headerRow.borderBottomWidth
    }),
    [styles]
  )

  const extractKey = useCallback((item, index) => item.uuid, [])

  return (
    <SectionList
      style={style}
      ref={listRef}
      onLayout={handleLayout}
      sections={sections || []}
      renderItem={renderRow}
      renderSectionHeader={renderHeader}
      getItemLayout={calculateLayout}
      keyExtractor={extractKey}
      ListEmptyComponent={<ListEmptyComponent styles={styles} vfo={vfo} />}
      keyboardShouldPersistTaps={'handled'} // Otherwise android closes the keyboard inbetween fields
      initialNumToRender={20}
      windowSize={2}
      maxToRenderPerBatch={30}
      updateCellsBatchingPeriod={100}
      stickySectionHeadersEnabled={true}
      removeClippedSubviews={false} // Buggy on Android
    />
  )
}

const ListEmptyComponent = React.memo(function ListEmptyComponent ({ styles, vfo }) {
  return (
    <View style={{ flexDirection: 'column' }}>
      <Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>
        No QSOs yet!
      </Text>
      <Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>
        Currently set to
      </Text>
      <Text style={{ flex: 1, marginTop: styles.oneSpace * 1, textAlign: 'center', fontWeight: 'bold' }}>
        {[vfo.freq ? fmtFreqInMHz(vfo.freq) + ' MHz' : vfo.band, vfo.mode].filter(x => x).join(' • ')}
      </Text>
    </View>
  )
})

export default QSOList
