import React, { useCallback } from 'react'
import { List } from 'react-native-paper'

export default function OperationItem
({ operation, onPress, styles }) {
  const pressHandler = useCallback(() => {
    onPress && onPress(operation)
  }, [onPress, operation])
  return (
    <List.Item title={operation.name} onPress={pressHandler} />
  )
}
