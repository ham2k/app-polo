import React, { useCallback } from 'react'
import { FlatList, View } from 'react-native'
import { Text } from 'react-native-paper'
import QSOItem from './QSOItem'

export default function QSOList ({ qsos, onPress, styles, style, listRef }) {
  // const pressHandler = useCallback(() => {
  //   onPress && onPress(qso)
  // }, [onPress, qsos])

  const renderRow = useCallback(({ item }) => {
    return (
      <QSOItem qso={item} onPress={onPress} styles={styles} />
    )
  }, [onPress, styles])

  return (
    <View style={[styles.listContainer, style, { width: '100%', padding: 0, margin: 0 }]}>
      <FlatList
        ref={listRef}
        data={qsos}
        renderItem={renderRow}
        ListEmptyComponent={<Text>No QSOs Yet!</Text>}
        keyboardShouldPersistTaps={'handled'} // Otherwise android closes the keyboard inbetween fields
      />
    </View>
  )
}
