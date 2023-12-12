import React, { useCallback } from 'react'
import { View } from 'react-native'
import { List, Text, TouchableRipple } from 'react-native-paper'

export default function OperationItem
({ operation, onPress, styles }) {
  const pressHandler = useCallback(() => {
    onPress && onPress(operation)
  }, [onPress, operation])
  return (
    <TouchableRipple onPress={pressHandler}>
      <View style={[styles.row, { flexDirection: 'row', width: '100%' }]}>
        <View style={{ flex: 0, marginLeft: 0, minWidth: styles.rem * 1 }}>
          <Text style={[]}>{operation.call}</Text>
        </View>
        <View style={{ flex: 0, marginLeft: styles.oneSpace, minWidth: styles.rem * 1 }}>
          <Text style={[{ fontWeight: 'bold' }]}>{operation.name}</Text>
        </View>
      </View>
    </TouchableRipple>
  )
}
