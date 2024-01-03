/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, List, Portal } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { setOperationData } from '../../../../store/operations'
import { ScrollView } from 'react-native'
import activities from '../../activities'
import { replaceRefs } from '../../../../tools/refTools'

export function AddActivityDialog ({ operation, visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  const addActivity = useCallback((activity) => {
    const type = activity.activationType || activity.refType || activity.key
    dispatch(setOperationData({
      uuid: operation.uuid,
      refs: replaceRefs(
        operation.refs,
        type,
        [{ type, ref: '', ...activity.defaultValue }]
      )
    }))
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
              {activities.map((activity) => (
                <List.Item
                  key={activity.key}
                  title={activity.name}
                  left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={activity.icon} />}
                  onPress={() => addActivity(activity)}
                />
              ))}
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
