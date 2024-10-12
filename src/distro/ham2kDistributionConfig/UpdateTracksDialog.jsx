import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, RadioButton, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { View } from 'react-native'

import { setSettings } from '../../store/settings'
import { Ham2kDialog } from '../../screens/components/Ham2kDialog'
import { UPDATE_TRACK_LABELS } from '../../screens/SettingsScreens/screens/VersionSettingsScreen'

export function UpdateTracksDialog ({ visible, settings, styles, onDialogDone, dismissable }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setValue(settings?.updateTrack || 'Production')
  }, [settings])

  const handleAccept = useCallback(() => {
    dispatch(setSettings({ updateTrack: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [value, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(settings.updateTrack)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone])

  return (
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel} dismissable={dismissable ?? true}>
      <Dialog.Icon icon={'glass-fragile'} />
      <Dialog.Title style={{ textAlign: 'center' }}>Update Track</Dialog.Title>
      <Dialog.Content>
        <RadioButton.Group
          onValueChange={(v) => setValue(v)}
          value={value}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="Production" />
            <Text onPress={() => setValue('Production')} style={styles.rowText}>{UPDATE_TRACK_LABELS.Production}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="Staging" />
            <Text onPress={() => setValue('Staging')} style={styles.rowText}>{UPDATE_TRACK_LABELS.Staging}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="Development" />
            <Text onPress={() => setValue('Development')} style={styles.rowText}>{UPDATE_TRACK_LABELS.Development}</Text>
          </View>
        </RadioButton.Group>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleCancel}>Cancel</Button>
        <Button onPress={handleAccept}>Ok</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
