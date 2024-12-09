/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo, useRef } from 'react'
import { FlatList, useWindowDimensions, View } from 'react-native'
import { Text } from 'react-native-paper'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import SpotItem, { guessItemHeight } from './SpotItem'
import { RefreshControl } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function prepareStyles (themeStyles, themeColor) {
  const DEBUG = false

  const commonStyles = {
    fontSize: themeStyles.normalFontSize,
    lineHeight: themeStyles.normalFontSize * 1.3,
    borderWidth: DEBUG ? 1 : 0
  }

  return {
    ...themeStyles,
    fields: {
      freq: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        width: themeStyles.oneSpace * 11.15,
        marginLeft: 0,
        textAlign: 'right'
      },
      freqMHz: {
        ...commonStyles,
        fontWeight: '600',
        textAlign: 'right'
      },
      freqKHz: {
        ...commonStyles,
        textAlign: 'right'
      },
      freqHz: {
        ...commonStyles,
        fontWeight: '400',
        textAlign: 'right',
        fontSize: themeStyles.normalFontSize * 0.7
      },
      callAndEmoji: {
        ...commonStyles,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: themeStyles.oneSpace * 1.45,
        minWidth: themeStyles.oneSpace * 5
      },
      call: {
        ...commonStyles,
        ...themeStyles.text.callsign,
        fontWeight: 'bold',
        textAlign: 'left'
      },
      emoji: {
        ...commonStyles,
        flex: 0,
        textAlign: 'left',
        marginRight: 0,
        paddingLeft: themeStyles.oneSpace * 1,
        marginTop: themeStyles.isIOS ? 0 : themeStyles.oneSpace * -0.5,
        textShadowColor: themeStyles.isDarkMode ? 'rgb(200, 200, 200)' : 'rgb(90, 90, 90)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 3
      },
      band: {
        ...commonStyles,
        flex: 0,
        marginLeft: themeStyles.oneSpace * 1,
        width: themeStyles.oneSpace * 5,
        textAlign: 'right'
      },
      mode: {
        ...commonStyles,
        flex: 0,
        marginLeft: themeStyles.oneSpace * 0.2,
        width: themeStyles.oneSpace * 5,
        textAlign: 'right',
        marginRight: themeStyles.oneSpace * 1.4
      },
      icon: {
        ...commonStyles,
        flex: 0,
        textAlign: 'left',
        marginRight: themeStyles.oneSpace * 0.3,
        marginLeft: themeStyles.oneSpace * -0.5,
        marginTop: themeStyles.oneSpace * 0.2
      },
      label: {
        ...commonStyles,
        flex: 1,
        textAlign: 'left'
      },
      time: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        minWidth: themeStyles.oneSpace * 6,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right'
      }
    }
  }
}

export default function SpotList ({ spots, loading, refresh, style, onPress }) {
  const styles = useThemedStyles(prepareStyles)

  const safeArea = useSafeAreaInsets()

  const { width } = useWindowDimensions()
  const extendedWidth = useMemo(() => width / styles.oneSpace > 60, [width, styles])

  const listRef = useRef()

  const renderRow = useCallback(({ item, index }) => {
    const spot = item
    return (
      <SpotItem key={spot.key} spot={spot} onPress={onPress} styles={styles} extendedWidth={extendedWidth} />
    )
  }, [styles, onPress, extendedWidth])

  const calculateLayout = useCallback((data, index) => {
    const height = guessItemHeight(spots[index], styles)
    return { length: height, offset: height * index, index }
  }, [styles, spots])

  return (
    <FlatList
      style={style}
      ref={listRef}
      data={spots}
      renderItem={renderRow}
      getItemLayout={calculateLayout}
      ListEmptyComponent={<Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>No Spots!</Text>}
      keyboardShouldPersistTaps={'handled'} // Otherwise android closes the keyboard inbetween fields
      initialNumToRender={20}
      windowSize={2}
      maxToRenderPerBatch={30}
      updateCellsBatchingPeriod={100}
      removeClippedSubviews={true}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
      ListFooterComponent={<View style={{ height: safeArea.bottom }}/>}
    />
  )
}
