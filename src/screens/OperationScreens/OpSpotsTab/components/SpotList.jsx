/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo, useRef } from 'react'
import { SectionList, View } from 'react-native'
import { Text } from 'react-native-paper'
import { RefreshControl } from 'react-native-gesture-handler'
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context'
import getItemLayout from 'react-native-get-item-layout-section-list'

import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import SpotItem from './SpotItem'
import SpotHeader from './SpotHeader'

export default function SpotList ({ sections, loading, refresh, style, onPress }) {
  const styles = useThemedStyles(_prepareStyles, style)

  const safeArea = useSafeAreaInsets()

  const { width } = useSafeAreaFrame()
  // const { width } = useWindowDimensions() <-- broken on iOS, no rotation

  const extendedWidth = useMemo(() => width / styles.oneSpace > 60, [width, styles])

  const listRef = useRef()

  const { paddingRight, paddingLeft, ...restOfStyle } = useMemo(() => style, [style])

  const renderHeader = useCallback(({ section, index }) => {
    return (
      <SpotHeader
        section={section}
        styles={styles}
      />
    )
  }, [styles])

  const renderRow = useCallback(({ item, index }) => {
    const spot = item
    return (
      <SpotItem key={spot.key} spot={spot} onPress={onPress} styles={styles} style={{ paddingRight, paddingLeft }} extendedWidth={extendedWidth} />
    )
  }, [styles, onPress, extendedWidth, paddingRight, paddingLeft])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calculateLayout = useCallback(
    getItemLayout({
      getItemHeight: styles.doubleRow.height + styles.doubleRow.borderBottomWidth,
      getSectionHeaderHeight: styles.headerRow.height + styles.headerRow.borderBottomWidth
    }),
    [styles]
  )

  return (
    <SectionList
      style={restOfStyle}
      ref={listRef}
      sections={sections || []}
      renderItem={renderRow}
      renderSectionHeader={renderHeader}
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

function _prepareStyles (themeStyles, style) {
  const DEBUG = false

  const commonStyles = {
    fontSize: themeStyles.normalFontSize,
    lineHeight: themeStyles.normalFontSize * 1.3,
    borderWidth: DEBUG ? 1 : 0
  }

  return {
    ...themeStyles,
    doubleRow: {
      ...themeStyles.doubleRow,
      paddingRight: Math.max(style?.paddingRight ?? 0, themeStyles.oneSpace * 2),
      paddingLeft: Math.max(style?.paddingLeft ?? 0, themeStyles.oneSpace * 2)
    },
    headerRow: {
      ...themeStyles.compactRow,
      backgroundColor: themeStyles.colors.surfaceVariant,
      paddingTop: themeStyles.oneSpace * 0.8,
      paddingLeft: 0,
      paddingRight: 0,
      justifyContent: 'center'
    },
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
