import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { FlatList, useWindowDimensions } from 'react-native'
import { Text } from 'react-native-paper'
import QSOItem, { guessItemHeight } from './QSOItem'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { useSelector } from 'react-redux'
import { selectOperationCallInfo } from '../../../../store/operations'

function prepareStyles (themeStyles, isDeleted, width) {
  const extendedWidth = width / themeStyles.oneSpace > 60

  let commonStylesForStatus

  if (isDeleted) {
    commonStylesForStatus = {
      textDecorationLine: 'line-through',
      textDecorationColor: themeStyles.colors.onBackground,
      color: themeStyles.colors.onBackgroundLighter
      // opacity: 0.6
    }
  }

  const DEBUG = false

  return {
    ...themeStyles,
    fields: {
      number: {
        ...themeStyles.text.numbers,
        ...commonStylesForStatus,
        flex: 0,
        marginLeft: 0,
        minWidth: extendedWidth ? themeStyles.oneSpace * 4 : themeStyles.oneSpace * 2,
        textAlign: 'right',
        lineHeight: themeStyles.oneSpace * 2.5,
        borderWidth: DEBUG ? 1 : 0
      },
      time: {
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        ...commonStylesForStatus,
        flex: 0,
        minWidth: extendedWidth ? themeStyles.oneSpace * 14 : themeStyles.oneSpace * 7,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right',
        lineHeight: themeStyles.oneSpace * 2.5,
        borderWidth: DEBUG ? 1 : 0
      },
      freq: {
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        ...commonStylesForStatus,
        fontFamily: 'Roboto',
        flex: 0,
        minWidth: extendedWidth ? themeStyles.oneSpace * 11 : themeStyles.oneSpace * 8,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right',
        lineHeight: themeStyles.oneSpace * 2.5,
        borderWidth: DEBUG ? 1 : 0
      },
      freqMHz: {
        fontWeight: '600',
        lineHeight: themeStyles.oneSpace * 2.5,
        textAlign: 'right'
      },
      freqKHz: {
        lineHeight: themeStyles.oneSpace * 2.5,
        textAlign: 'right'
      },
      freqHz: {
        textAlign: 'right',
        fontWeight: '300',
        lineHeight: themeStyles.oneSpace * 2.5,
        fontSize: themeStyles.normalFontSize * 0.7
      },
      call: {
        ...themeStyles.text.callsign,
        ...commonStylesForStatus,
        fontWeight: 'bold',
        flex: 0,
        marginLeft: themeStyles.oneSpace,
        minWidth: themeStyles.oneSpace * 8,
        textAlign: 'left',
        lineHeight: themeStyles.oneSpace * 2.5,
        borderWidth: DEBUG ? 1 : 0
      },
      name: {
        ...commonStylesForStatus,
        flex: 1,
        marginLeft: themeStyles.halfSpace,
        textAlign: 'left',
        lineHeight: themeStyles.oneSpace * 2.5,
        borderWidth: DEBUG ? 1 : 0
      },
      location: {
        ...commonStylesForStatus,
        flex: 0,
        marginLeft: themeStyles.halfSpace,
        minWidth: themeStyles.oneSpace * 3.5,
        textAlign: 'center',
        lineHeight: themeStyles.oneSpace * 2.5,
        borderWidth: DEBUG ? 1 : 0
      },
      signal: {
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        ...commonStylesForStatus,
        flex: 0,
        minWidth: themeStyles.oneSpace * 3,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right',
        lineHeight: themeStyles.oneSpace * 2.5,
        borderWidth: DEBUG ? 1 : 0
      },
      exchange: {
        ...themeStyles.text.callsign,
        ...commonStylesForStatus,
        flex: 0,
        minWidth: themeStyles.oneSpace * 3,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right',
        lineHeight: themeStyles.oneSpace * 2.5,
        borderWidth: DEBUG ? 1 : 0
      },
      icon: {
        ...commonStylesForStatus,
        flex: 0,
        maxWidth: themeStyles.oneSpace * 4,
        lineHeight: themeStyles.oneSpace * 2.5,
        borderWidth: DEBUG ? 1 : 0
      }
    }
  }
}

export default function QSOList ({ style, operation, settings, qsos, selectedKey, setLoggingState, lastKey }) {
  const { width } = useWindowDimensions()

  const styles = useThemedStyles((baseStyles) => prepareStyles(baseStyles, false, width))
  const stylesForDeleted = useThemedStyles((baseStyles) => prepareStyles(baseStyles, true, width))

  const extendedWidth = useMemo(() => width / styles.oneSpace > 60, [width, styles])

  // const { qsos, selectedKey, setSelectedKey, lastKey } = useContext(OperationContext)

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const listRef = useRef()

  // When the lastQSO changes, scroll to it
  useEffect(() => {
    setTimeout(() => {
      if (lastKey) {
        const i = qsos.findIndex((qso) => qso.key === lastKey)
        if (i > -1) {
          listRef.current?.scrollToIndex({ index: i, animated: true })
        } else {
          listRef.current?.scrollToEnd()
        }
      } else {
        listRef.current?.scrollToEnd()
      }
    }, 50)
  }, [listRef, qsos, lastKey])

  const handlePress = useCallback(({ qso }) => {
    if (qso.key === selectedKey) {
      setLoggingState && setLoggingState({ selectedKey: undefined })
    } else {
      setLoggingState && setLoggingState({ selectedKey: qso.key })
    }
  }, [selectedKey, setLoggingState])

  const renderRow = useCallback(({ item, index }) => {
    const qso = item
    return (
      <QSOItem qso={qso} settings={settings} selected={qso.key === selectedKey} ourInfo={ourInfo} onPress={handlePress} styles={qso.deleted ? stylesForDeleted : styles} extendedWidth={extendedWidth} />
    )
  }, [styles, settings, stylesForDeleted, ourInfo, handlePress, extendedWidth, selectedKey])

  const calculateLayout = useCallback((data, index) => {
    const height = guessItemHeight(qsos[index], styles)
    return { length: height, offset: height * index, index }
  }, [styles, qsos])

  return (
    <FlatList
      style={style}
      ref={listRef}
      data={qsos}
      renderItem={renderRow}
      getItemLayout={calculateLayout}
      ListEmptyComponent={<Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>No QSOs yet!</Text>}
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
