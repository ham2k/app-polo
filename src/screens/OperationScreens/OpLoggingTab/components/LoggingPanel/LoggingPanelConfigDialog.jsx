/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useMemo } from 'react'
import { Button, Checkbox, Dialog, List, Portal } from 'react-native-paper'
import { KeyboardAvoidingView, ScrollView } from 'react-native'
import { stringOrFunction } from '../../../../../tools/stringOrFunction'
import { timeControl } from './SecondaryExchangePanel/TimeControl'
import { radioControl } from './SecondaryExchangePanel/RadioControl'
import { notesControl } from './SecondaryExchangePanel/NotesControl'
import { findHooks } from '../../../../../extensions/registry'
import { useUIState } from '../../../../../store/ui'

export function LoggingPanelConfigDialog ({ visible, operation, settings, styles, onDialogDone }) {
  const [dialogVisible, setDialogVisible] = useUIState('LoggingPanelConfigDialog', 'dialogVisible', true)

  const loggingControlSettings = settings?.logging?.controls || {}

  const allControls = useMemo(() => {
    const newControls = {
      time: timeControl,
      radio: radioControl,
      notes: notesControl
    }
    findHooks('activity').forEach(activity => {
      const activityControls = activity.loggingControls ? activity.loggingControls({ operation, settings }) : []
      for (const control of activityControls) {
        newControls[control.key] = control
      }
    })
    return newControls
  }, [operation, settings])

  const sortedControls = useMemo(() => {
    const keys = Object.keys(allControls)

    return keys.map(key => allControls[key]).sort((a, b) => a.order - b.order)
  }, [allControls])

  const handleAccept = useCallback(() => {
    // dispatch(setSettings({ theme: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [onDialogDone, setDialogVisible])

  const handleCancel = useCallback(() => {
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [setDialogVisible, onDialogDone])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={dialogVisible} onDismiss={handleCancel} >
          <Dialog.Title style={{ textAlign: 'center' }}>Logging Options</Dialog.Title>
          <Dialog.ScrollArea style={{ padding: 0, paddingHorizontal: styles.oneSpace, maxHeight: '80%' }}>

            <ScrollView>
              <List.Section>
                {sortedControls.map(control => (
                  <List.Item
                    style={{ paddingTop: 20, margin: 0 }}
                    title={stringOrFunction(control.optionLabel ?? control.label ?? control.key, { operation, settings })}
                    description={stringOrFunction(control.optionDescription, { operation, settings })}
                    left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={control.icon} />}
                    right={() => {
                      if (control.optionType === 'mandatory') {
                        return <Checkbox status={'checked'} disabled={true} />
                      } else {
                        return <Checkbox status={loggingControlSettings[control.key] ? 'checked' : 'unchecked'}/>
                      }
                    }}
                    onPress={() => 1}
                  />
                ))}
              </List.Section>
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions>
            <Button onPress={handleCancel}>Cancel</Button>
            <Button onPress={handleAccept}>Ok</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}
