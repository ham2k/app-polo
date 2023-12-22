/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, List, Portal } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { setOperation } from '../../../../store/operations'
import { ScrollView } from 'react-native'

export function AddActivityDialog ({ operation, visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  const addActivity = useCallback((activity) => {
    dispatch(setOperation({ uuid: operation.uuid, [activity]: '' }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [operation, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [onDialogDone])

  return (
    <Portal>
      <Dialog visible={dialogVisible} onDismiss={handleCancel}>
        <Dialog.Title style={{ textAlign: 'center' }}>Add an Activity</Dialog.Title>
        <Dialog.Content>

          <ScrollView style={{ height: 300 }}>
            <List.Section>
              <List.Item
                title="Parks On The Air"
                left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="tree" />}
                onPress={() => addActivity('pota')}
              />

              <List.Item
                title="World Wide Flora & Fauna"
                left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="flower" />}
                onPress={() => addActivity('wwff')}
              />

              <List.Item
                title="Summits On The Air"
                left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="image-filter-hdr" />}
                onPress={() => addActivity('sota')}
              />

              <List.Item
                title="Beaches On The Air"
                left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="umbrella-beach" />}
                onPress={() => addActivity('bota')}
              />

              <List.Item
                title="ARRL Field Day"
                left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="weather-sunny" />}
                onPress={() => addActivity('fd')}
              />

              <List.Item
                title="Winter Field Day"
                left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="snowflake" />}
                onPress={() => addActivity('wfd')}
              />
            </List.Section>
          </ScrollView>

        </Dialog.Content>
        <Dialog.Actions style={{ justifyContent: 'space-between' }}>
          <Button onPress={handleCancel}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}
