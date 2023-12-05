import React, { useCallback } from 'react'
import { List } from 'react-native-paper'

export default function QSOItem
({ qso, onPress, styles }) {
  const pressHandler = useCallback(() => {
    onPress && onPress(qso)
  }, [onPress, qso])
  return (
    <List.Item title={qso.their?.call} onPress={pressHandler} />
  )
}
