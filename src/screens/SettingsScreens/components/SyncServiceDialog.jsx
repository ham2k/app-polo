/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { RadioButton, Text, TextInput } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { View } from 'react-native'

import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'

const SERVERS = {
  prod: 'https://lofi.ham2k.net',
  dev: 'https://dev.lofi.ham2k.net',
  local: 'http://localhost:3000'
}
const OPTION_FOR_SERVER = Object.keys(SERVERS).reduce((acc, key) => {
  acc[SERVERS[key]] = key
  return acc
}, {})

export function SyncServiceDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const lofiSettings = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))

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
      dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: false }))
    } else if (serverOption === 'other') {
      dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: true, server: otherServer }))
    } else {
      dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: true, server: SERVERS[serverOption] }))
    }
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [serverOption, onDialogDone, dispatch, otherServer])

  const handleCancel = useCallback(() => {
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>Ham2K Log Filer Sync Service</H2kDialogTitle>
      <H2kDialogContent>
        <RadioButton.Group
          onValueChange={(v) => setServerOption(v)}
          value={serverOption}
          style={{ width: '100%' }}
        >
          {Object.keys(SERVERS).map((key) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', height: styles.oneSpace * 6 }}>
              <RadioButton value={key} />
              <Text onPress={() => setServerOption(key)} style={styles.rowText}>{key.toUpperCase()}: {SERVERS[key]}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RadioButton value="other" />
            <Text onPress={() => setServerOption('other')} style={styles.rowText}>Custom</Text>
            <TextInput style={{ marginLeft: styles.oneSpace, flex: 1 }} value={otherServer} onChangeText={setOtherServer} />
          </View>
        </RadioButton.Group>
      </H2kDialogContent>
      <H2kDialogActions>
        <H2kButton onPress={handleCancel}>Cancel</H2kButton>
        <H2kButton onPress={handleAccept}>Ok</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
