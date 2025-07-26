/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Checkbox, Dialog } from 'react-native-paper'
import { ScrollView } from 'react-native'

import { stringOrFunction } from '../../../../../tools/stringOrFunction'
import { findHooks } from '../../../../../extensions/registry'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogTitle, H2kListItem, H2kListSection } from '../../../../../ui'

import { timeControl } from './SecondaryExchangePanel/TimeControl'
import { radioControl } from './SecondaryExchangePanel/RadioControl'
import { notesControl } from './SecondaryExchangePanel/NotesControl'
import { powerControl } from './SecondaryExchangePanel/TxPowerControl'

export function LoggingPanelConfigDialog ({ visible, operation, vfo, settings, styles, onDialogDone }) {
  const [dialogVisible, setDialogVisible] = useState(false)
  const [setValue] = useState('')

  const loggingControlSettings = settings?.logging?.controls || {}

  const allControls = useMemo(() => {
    const newControls = {
      time: timeControl,
      radio: radioControl,
      notes: notesControl,
      power: powerControl
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
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel} >
      <H2kDialogTitle style={{ textAlign: 'center' }}>Logging Options</H2kDialogTitle>
      <Dialog.ScrollArea style={{ padding: 0, paddingHorizontal: styles.oneSpace, maxHeight: '80%' }}>

        <ScrollView>
          <H2kListSection>
            {sortedControls.map(control => (
              <H2kListItem
                style={{ paddingTop: 20, margin: 0 }}
                title={stringOrFunction(control.optionLabel ?? control.label ?? control.key, { operation, vfo, settings })}
                description={stringOrFunction(control.optionDescription, { operation, vfo, settings })}
                leftIcon={control.icon}
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
          </H2kListSection>
        </ScrollView>
      </Dialog.ScrollArea>

      <H2kDialogActions>
        <H2kButton onPress={handleCancel}>Cancel</H2kButton>
        <H2kButton onPress={handleAccept}>Ok</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
