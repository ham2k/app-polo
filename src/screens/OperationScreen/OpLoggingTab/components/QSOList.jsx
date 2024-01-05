import React, { useCallback } from 'react'
import { FlatList, View } from 'react-native'
import { Text } from 'react-native-paper'
import QSOItem from './QSOItem'

export default function QSOList ({ qsos, selected, onSelect, styles, style, listRef }) {
  const handlePress = useCallback(({ item, index }) => {
    if (item.key === selected.key) {
      onSelect && onSelect(undefined)
    } else {
      onSelect && onSelect(item)
    }
  }, [selected, onSelect])

  const renderRow = useCallback(({ item, index }) => {
    return (
      <QSOItem qso={item} selected={item?.key === selected?.key} onPress={() => handlePress({ item, index })} styles={styles} />
    )
  }, [styles, handlePress, selected])

  return (
    <View style={[styles.listContainer, style, { width: '100%', padding: 0, margin: 0 }]}>
      <FlatList
        ref={listRef}
        data={qsos}
        renderItem={renderRow}
        ListEmptyComponent={<Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>No QSOs yet!</Text>}
        keyboardShouldPersistTaps={'handled'} // Otherwise android closes the keyboard inbetween fields
      />
    </View>
  )
}
