/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, List, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { setAccountInfo } from '../../../store/settings'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'
import CallsignInput from '../../../screens/components/CallsignInput'
import { Ham2kListItem } from '../../../screens/components/Ham2kListItem'
import { Ham2kDialog } from '../../../screens/components/Ham2kDialog'
import { apiHamQTH } from '../../../store/apis/apiHamQTH'
import { View } from 'react-native'
import { Ham2kMarkdown } from '../../../screens/components/Ham2kMarkdown'
import { resetCallLookupCache } from '../../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/useCallLookup'
import { parseCallsign } from '@ham2k/lib-callsigns'

export function HamQTHAccountSetting ({ settings, styles }) {
  const [currentDialog, setCurrentDialog] = useState()
  return (
    <React.Fragment>
      <Ham2kListItem
        title="HamQTH (for callsign lookups)"
        description={settings?.accounts?.hamqth ? `Login: ${settings.accounts.hamqth.login}` : 'No account'}
        left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="web" />}
        onPress={() => setCurrentDialog('accountsHamQTH')}
      />
      {currentDialog === 'accountsHamQTH' && (
        <AccountsHamQTHDialog
          settings={settings}
          styles={styles}
          visible={true}
          onDialogDone={() => setCurrentDialog('')}
        />
      )}
    </React.Fragment>
  )
}

function AccountsHamQTHDialog ({ visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [originalValues] = useState({
    login: settings?.accounts?.hamqth?.login || '',
    password: settings?.accounts?.hamqth?.password || ''
  })

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setLogin(settings?.accounts?.hamqth?.login || '')
    setPassword(settings?.accounts?.hamqth?.password || '')
  }, [settings])

  const onChangeLogin = useCallback((text) => {
    setLogin(text)
    setTestResult(null)
  }, [setLogin])

  const onChangePassword = useCallback((text) => {
    setPassword(text)
    setTestResult(null)
  }, [setPassword])

  const handleTest = useCallback(async () => {
    const callInfo = parseCallsign(settings?.operatorCall)
    await dispatch(setAccountInfo({ hamqth: { login, password, session: undefined } }))

    const hamQTHPromise = await dispatch(apiHamQTH.endpoints.lookupCall.initiate({ call: callInfo.baseCall }, { forceRefetch: true }))
    await Promise.all(dispatch(apiHamQTH.util.getRunningQueriesThunk()))
    const hamQTHLookup = await dispatch((_dispatch, getState) => apiHamQTH.endpoints.lookupCall.select({ call: callInfo.baseCall })(getState()))
    hamQTHPromise.unsubscribe && hamQTHPromise.unsubscribe()

    if (hamQTHLookup?.error) {
      setTestResult(`‼️ ${hamQTHLookup?.error}`)
    } else {
      setTestResult(`✅ ${settings?.operatorCall}: ${hamQTHLookup?.data?.name}`)
    }
  }, [dispatch, login, password, settings?.operatorCall])

  const handleAccept = useCallback(() => {
    dispatch(setAccountInfo({ hamqth: { login, password, session: undefined } }))
    dispatch(resetCallLookupCache())
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [login, password, dispatch, onDialogDone])

  const handleCancel = useCallback(() => {
    dispatch(setAccountInfo({ hamqth: originalValues }))
    setLogin(originalValues.login || '')
    setPassword(originalValues.password || '')
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [originalValues, dispatch, onDialogDone])

  return (
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <Dialog.Title style={{ textAlign: 'center' }}>HamQTH Account</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium">Please enter the details for your HamQTH account:</Text>
        <CallsignInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={login}
          label="Callsign"
          placeholder="your account callsign"
          onChangeText={onChangeLogin}
        />
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={password}
          label="Password"
          autoComplete="current-password"
          keyboardType="default"
          textContentType="password"
          secureTextEntry={true}
          autoCapitalize={'none'}
          placeholder="your password"
          onChangeText={onChangePassword}
        />
        <View style={{ marginTop: styles.oneSpace, flexDirection: 'row' }}>
          {!testResult && <Button onPress={handleTest}>{'Check Credentials'}</Button>}
          {testResult && <Ham2kMarkdown style={{ flex: 1, marginTop: styles.oneSpace * 0.6 }}>{testResult}</Ham2kMarkdown>}
        </View>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleCancel}>Cancel</Button>
        <Button onPress={handleAccept}>Ok</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
