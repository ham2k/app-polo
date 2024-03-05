import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { FlatList, useWindowDimensions } from 'react-native'
import { Text } from 'react-native-paper'
import QSOItem, { guessItemHeight } from './QSOItem'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { useSelector } from 'react-redux'
import { selectOperationCallInfo } from '../../../../store/operations'

function prepareStyles (themeStyles, isDeleted) {
  let commonStylesForStatus

  if (isDeleted) {
    commonStylesForStatus = {
      textDecorationLine: 'line-through',
      textDecorationColor: themeStyles.colors.onBackground,
      color: themeStyles.colors.onBackgroundLighter
      // opacity: 0.6
    }
  }

  return {
    ...themeStyles,
    fields: {
      number: {
        ...themeStyles.text.numbers,
        ...commonStylesForStatus,
        flex: 0,
        marginLeft: 0,
        minWidth: themeStyles.oneSpace * 2,
        textAlign: 'right'
      },
      time: {
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        ...commonStylesForStatus,
        flex: 0,
        minWidth: themeStyles.oneSpace * 6,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right'
      },
      freq: {
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        ...commonStylesForStatus,
        flex: 0,
        minWidth: themeStyles.oneSpace * 7,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right'
      },
      call: {
        ...themeStyles.text.callsign,
        ...commonStylesForStatus,
        fontWeight: 'bold',
        flex: 1,
        marginLeft: themeStyles.oneSpace,
        minWidth: themeStyles.oneSpace * 7,
        textAlign: 'left'
      },
      signal: {
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        ...commonStylesForStatus,
        flex: 0,
        minWidth: themeStyles.oneSpace * 3,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right'
      },
      exchange: {
        ...themeStyles.text.callsign,
        ...commonStylesForStatus,
        flex: 0,
        minWidth: themeStyles.oneSpace * 3,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right'
      },
      icon: {
        ...commonStylesForStatus,
        flex: 0,
        width: themeStyles.oneSpace * 2
      }
    }
  }
}

export default function QSOList ({ style, operation, qsos, selectedKey, setSelectedKey, lastKey }) {
  const styles = useThemedStyles((baseStyles) => prepareStyles(baseStyles, false))
  const stylesForDeleted = useThemedStyles((baseStyles) => prepareStyles(baseStyles, true))

  const { width } = useWindowDimensions()
  const extendedWidth = useMemo(() => width / styles.oneSpace > 60, [width, styles])
  // const { qsos, selectedKey, setSelectedKey, lastKey } = useContext(OperationContext)

  const ourInfo = useSelector(selectOperationCallInfo(operation?.uuid))

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
      setSelectedKey && setSelectedKey(undefined)
    } else {
      setSelectedKey && setSelectedKey(qso.key)
    }
  }, [selectedKey, setSelectedKey])

  const renderRow = useCallback(({ item, index }) => {
    const qso = item
    return (
      <QSOItem qso={qso} selected={qso.key === selectedKey} ourInfo={ourInfo} onPress={handlePress} styles={qso.deleted ? stylesForDeleted : styles} extendedWidth={extendedWidth} />
    )
  }, [styles, stylesForDeleted, ourInfo, handlePress, extendedWidth, selectedKey])

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
