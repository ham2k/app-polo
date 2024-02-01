import React, { useCallback, useMemo } from 'react'
import { FlatList, View, useWindowDimensions } from 'react-native'
import { Text } from 'react-native-paper'
import QSOItem from './QSOItem'

export default function QSOList ({ qsos, selected, onSelect, styles, style, listRef }) {
  const { width } = useWindowDimensions()
  const extendedWidth = useMemo(() => width / styles.oneSpace > 60, [width, styles])

  const handlePress = useCallback(({ item, index }) => {
    if (item.key === selected.key) {
      onSelect && onSelect(undefined)
    } else {
      onSelect && onSelect(item)
    }
  }, [selected, onSelect])

  const renderRow = useCallback(({ item, index }) => {
    return (
      <QSOItem qso={item} selected={item?.key === selected?.key} onPress={() => handlePress({ item, index })} styles={styles} extendedWidth={extendedWidth} />
    )
  }, [styles, handlePress, selected, extendedWidth])

  return (
    <View style={[styles.listContainer, style, { width: '100%', padding: 0, margin: 0 }]}>
      <FlatList
        ref={listRef}
        data={qsos}
        renderItem={renderRow}
        keyExtractor={(qso) => qso.key}
        ListEmptyComponent={<Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>No QSOs yet!</Text>}
        keyboardShouldPersistTaps={'handled'} // Otherwise android closes the keyboard inbetween fields
        initialNumToRender={20}
      />
    </View>
  )
}
