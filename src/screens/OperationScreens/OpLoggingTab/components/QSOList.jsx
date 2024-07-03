/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { FlatList, View, useWindowDimensions } from 'react-native'
import { Text } from 'react-native-paper'
import QSOItem, { guessItemHeight } from './QSOItem'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { useUIState } from '../../../../store/ui'
import { fmtFreqInMHz } from '../../../../tools/frequencyFormats'
import { findHooks } from '../../../../extensions/registry'

function prepareStyles (themeStyles, isDeleted, isOtherOperator, width) {
  const extendedWidth = width / themeStyles.oneSpace > 80

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
    ...extendedWidth,
    selectedRow: {
      backgroundColor: themeStyles.colors.secondaryContainer
    },
    unselectedRow: {
    },
    fields: {
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
        marginLeft: themeStyles.oneSpace,
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
      icon: {
        ...commonStyles,
        flex: 0,
        textAlign: 'right',
        maxWidth: themeStyles.oneSpace * 8
      }
    }
  }
}

const QSOList = function QSOList ({ style, ourInfo, settings, qsos, operation, vfo }) {
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
      if (loggingState?.lastKey) {
        const i = qsos.findIndex((qso) => qso.key === loggingState?.lastKey)
        if (i > -1) {
          listRef.current?.scrollToIndex({ index: i, animated: true })
        } else {
          listRef.current?.scrollToEnd()
        }
      } else {
        listRef.current?.scrollToEnd()
      }
    }, 50)
  }, [listRef, qsos, loggingState?.lastKey])

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
    if (qso.key === loggingState?.selectedKey) {
      updateLoggingState({ selectedKey: undefined })
    } else {
      updateLoggingState({ selectedKey: qso.key })
    }
  }, [loggingState?.selectedKey, updateLoggingState])

  const renderRow = useCallback(({ item, index }) => {
    const qso = item

    let qsoStyles
    if (qso.deleted) qsoStyles = stylesForDeleted
    else if (qso.our?.operatorCall !== operation?.operatorCall) qsoStyles = stylesForOtherOperator
    else qsoStyles = styles

    return (
      <QSOItem
        qso={qso}
        operation={operation}
        settings={settings}
        selected={qso.key === loggingState?.selectedKey}
        ourInfo={ourInfo}
        onPress={handlePress}
        styles={qsoStyles}
        refHandlers={refHandlers}
      />
    )
  }, [stylesForDeleted, operation, stylesForOtherOperator, styles, settings, loggingState?.selectedKey, ourInfo, handlePress, refHandlers])

  const calculateLayout = useCallback((data, index) => {
    const height = guessItemHeight(qsos[index], styles)
    return { length: height, offset: height * index, index }
  }, [styles, qsos])

  return (
    <FlatList
      style={style}
      ref={listRef}
      onLayout={handleLayout}
      data={qsos}
      renderItem={renderRow}
      getItemLayout={calculateLayout}
      ListEmptyComponent={
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
      }
      keyboardShouldPersistTaps={'handled'} // Otherwise android closes the keyboard inbetween fields
      initialNumToRender={20}
      windowSize={2}
      maxToRenderPerBatch={30}
      updateCellsBatchingPeriod={100}
      removeClippedSubviews={true}
      // initialScrollIndex={100}
    />
  )
}
export default QSOList
