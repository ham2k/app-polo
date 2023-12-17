import React, { useCallback } from 'react'
import { View } from 'react-native'
import { Text, TouchableRipple } from 'react-native-paper'
import { fmtTimeNice } from '../../../tools/timeFormats'

export default function OperationItem ({ operation, onPress, styles }) {
  const pressHandler = useCallback(() => {
    onPress && onPress(operation)
  }, [onPress, operation])

  return (
    <TouchableRipple onPress={pressHandler}>
      <View style={[styles.row, { flexDirection: 'column', width: '100%' }]}>
        <View style={[{ flexDirection: 'row', width: '100%' }]}>
          <View style={{ flex: 0, marginLeft: 0, minWidth: styles.rem * 1 }}>
            <Text style={[styles.rowText]}>{operation.call}</Text>
          </View>
          <View style={{ flex: 0, marginLeft: styles.oneSpace, minWidth: styles.rem * 1 }}>
            <Text style={[styles.rowText, { fontWeight: 'bold' }]}>{operation.name}</Text>
          </View>
        </View>
        <View style={[{ flexDirection: 'row', width: '100%' }]}>
          <Text style={[styles.rowText, { marginLeft: styles.oneSpace }]}>{fmtTimeNice(operation.startOnMillisMin)}</Text>
          <Text style={[styles.rowText, { marginLeft: styles.oneSpace }]}>{operation.qsoCount} qsos</Text>
        </View>
      </View>
    </TouchableRipple>
  )
}
