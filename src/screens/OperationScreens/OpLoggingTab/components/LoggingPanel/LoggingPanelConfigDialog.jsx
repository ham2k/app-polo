/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Dialog, List } from 'react-native-paper'
import { ScrollView } from 'react-native'
import { stringOrFunction } from '../../../../../tools/stringOrFunction'
import { timeControl } from './SecondaryExchangePanel/TimeControl'
import { radioControl } from './SecondaryExchangePanel/RadioControl'
import { notesControl } from './SecondaryExchangePanel/NotesControl'
import { findHooks } from '../../../../../extensions/registry'
import { Ham2kListItem } from '../../../../components/Ham2kListItem'
import { Ham2kListSection } from '../../../../components/Ham2kListSection'
import { Ham2kDialog } from '../../../../components/Ham2kDialog'

export function LoggingPanelConfigDialog ({ visible, operation, vfo, settings, styles, onDialogDone }) {
  const [dialogVisible, setDialogVisible] = useState(false)
  const [setValue] = useState('')

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

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setValue(settings?.theme || 'auto')
  }, [settings, setValue])

  const handleAccept = useCallback(() => {
    // dispatch(setSettings({ theme: value }))
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [onDialogDone])

  const handleCancel = useCallback(() => {
    setValue(settings.theme)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [settings, onDialogDone, setValue])

  return (
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel} >
      <Dialog.Title style={{ textAlign: 'center' }}>Logging Options</Dialog.Title>
      <Dialog.ScrollArea style={{ padding: 0, paddingHorizontal: styles.oneSpace, maxHeight: '80%' }}>

        <ScrollView>
          <Ham2kListSection>
            {sortedControls.map(control => (
              <Ham2kListItem
                style={{ paddingTop: 20, margin: 0 }}
                title={stringOrFunction(control.optionLabel ?? control.label ?? control.key, { operation, vfo, settings })}
                description={stringOrFunction(control.optionDescription, { operation, vfo, settings })}
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
          </Ham2kListSection>
        </ScrollView>
      </Dialog.ScrollArea>

      <Dialog.Actions>
        <Button onPress={handleCancel}>Cancel</Button>
        <Button onPress={handleAccept}>Ok</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
