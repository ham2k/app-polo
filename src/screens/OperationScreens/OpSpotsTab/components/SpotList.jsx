/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo, useRef } from 'react'
import { FlatList, useWindowDimensions } from 'react-native'
import { Text } from 'react-native-paper'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import SpotItem, { guessItemHeight } from './SpotItem'
import { RefreshControl } from 'react-native-gesture-handler'

function prepareStyles (themeStyles, themeColor) {
  return {
    ...themeStyles,
    fields: {
      freq: {
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        fontSize: themeStyles.normalFontSize * 0.9,
        minWidth: themeStyles.oneSpace * 13,
        marginLeft: 0,
        textAlign: 'right'
      },
      freqMHz: {
        fontWeight: '600',
        textAlign: 'right'
      },
      freqKHz: {
        textAlign: 'right'
      },
      freqHz: {
        fontWeight: '300',
        textAlign: 'right',
        fontSize: themeStyles.normalFontSize * 0.7
      },
      call: {
        ...themeStyles.text.callsign,
        flex: 1,
        fontSize: themeStyles.normalFontSize,
        fontWeight: 'bold',
        marginLeft: themeStyles.oneSpace * 2,
        minWidth: themeStyles.oneSpace * 5,
        lineHeight: themeStyles.oneSpace * 2.5,
        textAlign: 'left'
      },
      band: {
        flex: 0,
        fontSize: themeStyles.normalFontSize,
        marginLeft: themeStyles.oneSpace * 1,
        width: themeStyles.oneSpace * 7,
        textAlign: 'right'
      },
      mode: {
        flex: 0,
        fontSize: themeStyles.normalFontSize,
        marginLeft: themeStyles.oneSpace * 0.2,
        width: themeStyles.oneSpace * 5,
        textAlign: 'right'
      },
      name: {
        flex: 1,
        fontSize: themeStyles.normalFontSize * 0.8,
        minWidth: themeStyles.oneSpace * 5,
        paddingTop: themeStyles.oneSpace * 0.2,
        marginLeft: themeStyles.oneSpace * 1.4,
        textAlign: 'left'
      },
      time: {
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        fontSize: themeStyles.normalFontSize,
        minWidth: themeStyles.oneSpace * 6,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right'
      },
      icon: {
        flex: 0,
        fontSize: themeStyles.normalFontSize,
        width: themeStyles.oneSpace * 2
      }
    }
  }
}

export default function SpotList ({ spots, spotsQuery, style, onPress }) {
  const styles = useThemedStyles(prepareStyles)

  const { width } = useWindowDimensions()
  const extendedWidth = useMemo(() => width / styles.oneSpace > 60, [width, styles])

  const listRef = useRef()

  const renderRow = useCallback(({ item, index }) => {
    const spot = item
    return (
      <SpotItem spot={spot} onPress={onPress} styles={styles} extendedWidth={extendedWidth} />
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
        <RefreshControl refreshing={spotsQuery.status === 'pending'} onRefresh={() => spotsQuery.refetch()} />
      }
    />
  )
}
