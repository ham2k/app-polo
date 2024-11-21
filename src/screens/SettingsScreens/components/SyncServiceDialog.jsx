/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, RadioButton, Text, TextInput } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { selectExtensionSettings, setExtensionSettings } from '../../../store/settings'
import { View } from 'react-native'
import { Ham2kDialog } from '../../components/Ham2kDialog'

const SERVERS = {
  dev: 'https://dev.lofi.ham2k.net',
  // prod: 'https://lofi.ham2k.net',
  local: 'http://localhost:3000'
}
const OPTION_FOR_SERVER = Object.keys(SERVERS).reduce((acc, key) => {
  acc[SERVERS[key]] = key
  return acc
}, {})

export function SyncServiceDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const lofiSettings = useSelector(state => selectExtensionSettings(state, 'ham2k-lofi'))

  const [dialogVisible, setDialogVisible] = useState(false)

  const [serverOption, setServerOption] = useState(undefined)
  const [otherServer, setOtherServer] = useState()

  useEffect(() => {
    setServerOption(undefined)
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    if (serverOption === undefined) {
      setServerOption(lofiSettings.enabled ? OPTION_FOR_SERVER[lofiSettings.server] || 'other' : 'disabled')
      setOtherServer(OPTION_FOR_SERVER[lofiSettings.server] || !lofiSettings.server ? 'https://' : lofiSettings.server)
    }
  }, [lofiSettings, serverOption])

  const handleAccept = useCallback(() => {
    if (serverOption === 'disabled') {
      dispatch(setExtensionSettings({ key: 'ham2k-lofi', enabled: false }))
    } else if (serverOption === 'other') {
      dispatch(setExtensionSettings({ key: 'ham2k-lofi', enabled: true, server: otherServer }))
    } else {
      dispatch(setExtensionSettings({ key: 'ham2k-lofi', enabled: true, server: SERVERS[serverOption] }))
    }
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [serverOption, onDialogDone, dispatch, otherServer])

  const handleCancel = useCallback(() => {
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [onDialogDone])

  return (
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <Dialog.Title style={{ textAlign: 'center' }}>Ham2K Log Filer Sync Service</Dialog.Title>
      <Dialog.Content>
        <RadioButton.Group
          onValueChange={(v) => setServerOption(v)}
          value={serverOption}
          style={{ width: '100%' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: styles.oneSpace * 6 }}>
            <RadioButton value="disabled" />
            <Text onPress={() => setServerOption('disabled')} style={styles.rowText}>Disabled</Text>
          </View>
          {Object.keys(SERVERS).map((key) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', height: styles.oneSpace * 6 }}>
              <RadioButton value={key} />
              <Text onPress={() => setServerOption(key)} style={styles.rowText}>{key.toUpperCase()}: {SERVERS[key]}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="other" />
            <Text onPress={() => setServerOption('other')} style={styles.rowText}>Other</Text>
            <TextInput style={{ marginLeft: styles.oneSpace, flex: 1 }} value={otherServer} onChangeText={setOtherServer} />
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
