import React, { useCallback, useMemo, useRef } from 'react'
import { FlatList, useWindowDimensions } from 'react-native'
import { Text } from 'react-native-paper'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import SpotItem, { guessItemHeight } from './SpotItem'
import { useNavigation } from '@react-navigation/native'

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
        fontWeight: 'bold',
        textAlign: 'right'
      },
      freqKHz: {
        textAlign: 'right'
      },
      freqHz: {
        textAlign: 'right',
        fontSize: themeStyles.normalFontSize * 0.7
      },
      call: {
        ...themeStyles.text.callsign,
        flex: 1,
        fontSize: themeStyles.normalFontSize * 0.9,
        fontWeight: 'bold',
        marginLeft: themeStyles.oneSpace * 2,
        minWidth: themeStyles.oneSpace * 5,
        textAlign: 'left'
      },
      mode: {
        flex: 0,
        fontSize: themeStyles.normalFontSize * 0.9,
        marginLeft: themeStyles.oneSpace * 9,
        minWidth: themeStyles.oneSpace * 3.5,
        textAlign: 'right'
      },
      name: {
        flex: 1,
        fontSize: themeStyles.normalFontSize * 0.8,
        minWidth: themeStyles.oneSpace * 5,
        marginLeft: themeStyles.oneSpace * 2,
        textAlign: 'left'
      },
      time: {
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        fontSize: themeStyles.normalFontSize * 0.9,
        minWidth: themeStyles.oneSpace * 6,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right'
      },
      icon: {
        flex: 0,
        fontSize: themeStyles.normalFontSize * 0.9,
        width: themeStyles.oneSpace * 2
      }
    }
  }
}

export default function SpotList ({ spots, style }) {
  const navigation = useNavigation()
  const styles = useThemedStyles((baseStyles) => prepareStyles(baseStyles))

  const { width } = useWindowDimensions()
  const extendedWidth = useMemo(() => width / styles.oneSpace > 60, [width, styles])
  // const { qsos, selectedKey, setSelectedKey, lastKey } = useContext(OperationContext)

  const listRef = useRef()

  const handlePress = useCallback(({ spot }) => {
    navigation.navigate('QSOs', {
      qso: {
        their: { call: spot.activator },
        freq: spot.frequency,
        mode: spot.mode,
        refs: [{ type: 'pota', ref: spot.reference }]
      }
    })
  }, [navigation])

  const renderRow = useCallback(({ item, index }) => {
    const spot = item
    return (
      <SpotItem spot={spot} onPress={handlePress} styles={styles} extendedWidth={extendedWidth} />
    )
  }, [styles, handlePress, extendedWidth])

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
      // initialScrollIndex={100}
    />
  )
}
