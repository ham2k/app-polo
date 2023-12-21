import React, { useCallback } from 'react'
import { View } from 'react-native'
import { Text, TouchableRipple } from 'react-native-paper'
import { fmtDateTimeDynamic } from '../../../tools/timeFormats'

export default function OperationItem ({ operation, settings, onPress, styles }) {
  const pressHandler = useCallback(() => {
    onPress && onPress(operation)
  }, [onPress, operation])

  return (
    <TouchableRipple onPress={pressHandler}>
      <View style={[styles.row, { flexDirection: 'column', width: '100%' }]}>
        <View style={[{ flexDirection: 'row', width: '100%' }]}>
          <View style={{ flex: 0, marginLeft: 0, minWidth: styles.rem * 1 }}>
            <Text style={[styles.rowText]}>{operation.stationCall || settings.operatorCall}</Text>
          </View>
          <View style={{ flex: 0, marginLeft: styles.oneSpace, minWidth: styles.rem * 1 }}>
            <Text style={[styles.rowText, { fontWeight: 'bold' }]}>{operation.name}</Text>
          </View>
        </View>
        <View style={[{ flexDirection: 'row', width: '100%' }]}>
          {operation.qsoCount > 0 ? (
            <>
              <Text style={[styles.rowText, { marginLeft: styles.oneSpace }]}>{operation.qsoCount} qsos</Text>
              <Text style={[styles.rowText, { marginLeft: styles.oneSpace }]}>{fmtDateTimeDynamic(operation.startOnMillisMax)}</Text>
            </>
          ) : (
            <Text style={[styles.rowText, { marginLeft: styles.oneSpace }]}>No qsos</Text>

          )}
        </View>
      </View>
    </TouchableRipple>
  )
}
