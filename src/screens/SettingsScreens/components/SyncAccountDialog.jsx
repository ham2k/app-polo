/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kMarkdown } from '../../../ui'
import H2kEmailInput from '../../../ui/react-native/H2kEmailInput'
import { Alert, View } from 'react-native'
import { getSyncCounts } from '../../../store/operations'
import { selectFiveSecondsTick } from '../../../store/time'
import QRCode from 'react-native-qrcode-svg'

export function SyncAccountDialog ({ visible, settings, styles, syncHook, onDialogDone }) {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const callRef = useRef()
  const emailRef = useRef()

  useEffect(() => { setTimeout(() => callRef?.current?.focus(), 500) }, [])

  const lofiDataSelector = useCallback((state) => selectLocalExtensionData(state, 'ham2k-lofi'), [])
  const lofiData = useSelector(lofiDataSelector)

  const [dialogVisible, setDialogVisible] = useState(visible)
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [mode, setMode] = useState('email')
  const [qrCodeLinkInfo, setQrCodeLinkInfo] = useState(null)

  useEffect(() => {
    if (lofiData?.pending_link_email && lofiData?.pending_link_email !== lofiData?.account?.email) {
      // console.log('pending link: pending_link_email', lofiData?.pending_link_email)
      setEmail(lofiData?.pending_link_email)
      setMode('pending_link')
    } else if (lofiData?.account?.pending_email && lofiData?.account?.pending_email !== lofiData?.account?.email) {
      // console.log('pending email: account.pending_email', lofiData?.account?.pending_email)
      setEmail(lofiData?.account?.pending_email)
      setMode('pending_email')
    } else {
      // console.log('else email: account.email', lofiData.account.email)
      setEmail(lofiData?.account?.email)
      setMode('email')
    }

    setDialogVisible(visible)
  // We only want to run this once, when making the dialog visible
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  useEffect(() => {
    let close = false

    if (mode === 'pending_email') {
      if (!lofiData?.account?.pending_email) {
        close = true
      } else if (lofiData?.pending_email === lofiData?.account?.email) {
        close = true
      }
    } else if (mode === 'pending_link' || mode === 'pending_link_with_email') {
      if (!lofiData?.pending_link_email) {
        close = true
      } else if (lofiData?.pending_link_email === lofiData?.account?.email) {
        close = true
      }
    } else if (mode === 'link_via_qr') {
      if (qrCodeLinkInfo?.currentAccount && lofiData?.account?.uuid !== qrCodeLinkInfo?.currentAccount) {
        close = true
      }
    }

    if (close) {
      setEmail(lofiData.account?.email)
      dispatch(setLocalExtensionData({
        key: 'ham2k-lofi',
        pending_email: false,
        pending_link_email: false,
        pending_link_challenge: false,
        pending_permission: undefined
      }))
      setDialogVisible(false)
      onDialogDone && onDialogDone()
    }
  }, [
    mode,
    lofiData.account?.uuid, lofiData.account?.pending_email, lofiData.account?.email,
    lofiData?.pending_email, lofiData?.pending_link_email,
    qrCodeLinkInfo?.currentAccount,
    dispatch, onDialogDone
  ])

  const fiveSecondTick = useSelector(selectFiveSecondsTick)

  useEffect(() => { // Update account every 5 seconds to check for changes
    if (mode === 'pending_email' || mode === 'pending_link' || mode === 'pending_link_with_email' || mode === 'link_via_qr') {
      setImmediate(async () => {
        await dispatch(syncHook.getAccountData())
        // const account = await dispatch(syncHook.getAccountData())
        // console.log('account', account)
        // console.log('--', lofiData.pending_link_email)
        // console.log('--', lofiData.account?.email)
      })
    }
  }, [dispatch, fiveSecondTick, syncHook, t, mode, lofiData.pending_link_email, lofiData.account?.email])

  const handleDone = useCallback(() => {
    setEmail(lofiData.pending_link_email || lofiData.account?.email)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [lofiData, onDialogDone])

  const onChangeEmail = useCallback((text) => {
    setEmail(text)
    setErrors({})
  }, [setEmail])

  const handleRevertEmail = useCallback(() => {
    setEmail(lofiData?.account?.email)
    setErrors({})
    setMode('email')
  }, [lofiData?.account?.email])

  const handleRevertLink = useCallback(async () => {
    setMode('link')
    setErrors({})
    setQrCodeLinkInfo(null)
    await dispatch(setLocalExtensionData({
      key: 'ham2k-lofi',
      pending_email: undefined,
      pending_link_email: undefined,
      pending_link_challenge: undefined,
      pending_permission: undefined
    }))
  }, [dispatch])

  const handleEmailSubmit = useCallback(async () => {
    if (email === lofiData?.account?.email) {
      setDialogVisible(false)
      onDialogDone && onDialogDone()
      return
    }

    const result = await dispatch(syncHook.setAccountData({ pending_email: email }))
    console.log('set email result', result)
    if (result.ok) {
      dispatch(setLocalExtensionData({
        key: 'ham2k-lofi',
        account: result.json.account,
        pending_email: email,
        pending_link_email: undefined,
        pending_link_challenge: undefined,
        pending_permission: undefined
      }))
      setMode('pending_email')
    } else {
      const newErrors = {}
      if (result.json.error) {
        newErrors.default = [{ error: result.json.error }]
      }
      Object.keys(result.json?.account_errors || {}).forEach(key => {
        newErrors[key] = result.json.account_errors[key]
      })
      if (Object.keys(newErrors).length === 0) {
        newErrors.default = [{ error: t('general.errors.generic', 'Something went wrong. Please try again later.') }]
      }

      setErrors(newErrors)
    }
  }, [email, lofiData?.account?.email, dispatch, syncHook, onDialogDone, t])

  const handleLinkSubmit = useCallback(async () => {
    if (email === lofiData?.account?.email) {
      setDialogVisible(false)
      onDialogDone && onDialogDone()
      return
    }

    const linkResult = await dispatch(syncHook.linkClient(email))
    console.log('linkResult', linkResult)
    if (linkResult.ok) {
      if (linkResult.json?.permission?.status === 'active') {
        dispatch(setLocalExtensionData({
          key: 'ham2k-lofi',
          account: linkResult.json.account,
          pending_email: undefined,
          pending_link_email: undefined,
          pending_link_challenge: undefined,
          pending_permission: undefined
        }))
        setDialogVisible(false)
        onDialogDone && onDialogDone()
        return
      }
      dispatch(setLocalExtensionData({
        key: 'ham2k-lofi',
        account: linkResult.json.account,
        pending_email: undefined,
        pending_link_email: email,
        pending_link_challenge: linkResult.json?.permission?.challenge_token,
        pending_permission: linkResult.json?.permission
      }))
      setMode('pending_link')
    } else {
      const _errors = {}
      if (linkResult.json.error) {
        _errors.default = [{ error: linkResult.json.error }]
      }
      if (linkResult.status === 404) {
        _errors.linkEmail = [{ error: t('screens.syncSettings.syncAccountDialog.accountNotFound', 'Account not found.') }]
      } else if (Object.keys(_errors).length === 0) {
        _errors.default = [{ error: t('general.errors.generic', 'Something went wrong. Please try again later.') }]
      }
      setErrors(_errors)
    }
  }, [email, lofiData?.account?.email, dispatch, syncHook, onDialogDone, t])

  useEffect(() => {
    if (lofiData?.pending_permission?.status === 'pending' &&
      lofiData?.pending_permission?.challenge_expires_at &&
      new Date(lofiData?.pending_permission?.challenge_expires_at) < new Date() &&
      lofiData?.pending_link_email &&
      lofiData?.pending_link_email !== lofiData?.account?.email
    ) {
      handleLinkSubmit()
    }
  }, [
    fiveSecondTick,
    lofiData?.pending_permission?.status,
    lofiData?.pending_permission?.challenge_expires_at,
    lofiData.pending_email, lofiData?.account?.email, lofiData?.pending_link_email,
    handleLinkSubmit
  ])

  const handleLinkEmailSubmit = useCallback(async () => {
    if (email === lofiData?.account?.email) {
      setDialogVisible(false)
      onDialogDone && onDialogDone()
      return
    }

    const linkResult = await dispatch(syncHook.linkClientWithEmail(email))
    if (linkResult.ok) {
      dispatch(setLocalExtensionData({
        key: 'ham2k-lofi',
        account: linkResult.json.account,
        pending_email: undefined,
        pending_link_email: email,
        pending_link_challenge: linkResult.json?.permission?.challenge_token,
        pending_permission: linkResult.json?.permission
      }))
      setMode('pending_link_with_email')
    } else {
      const newErrors = {
        default: [linkResult.json.error]
      }
      Object.keys(linkResult.json?.account_errors || {}).forEach(key => {
        newErrors[key] = linkResult.json.account_errors[key].error
      })
      setErrors(newErrors)
    }
  }, [email, lofiData?.account?.email, dispatch, syncHook, onDialogDone])

  const handleResend = useCallback(async () => {
    if (mode === 'pending_email') {
      const resendResult = await dispatch(syncHook.resendEmail())

      if (!resendResult.ok) {
        const newErrors = {
          default: [resendResult.json.error]
        }
        Object.keys(resendResult.json?.account_errors || {}).forEach(key => {
          newErrors[key] = resendResult.json.account_errors[key]
        })

        setErrors(newErrors)
      }
    } else if (mode === 'pending_link' || mode === 'pending_link_with_email') {
      const linkResult = await dispatch(syncHook.linkClientWithEmail(lofiData?.pending_link_email))
      if (!linkResult.ok) {
        const newErrors = {
          default: [linkResult.json.error]
        }
        Object.keys(linkResult.json?.account_errors || {}).forEach(key => {
          newErrors[key] = linkResult.json.account_errors[key].error
        })
        setErrors(newErrors)
      }
      setMode('pending_link_with_email')
    }
  }, [dispatch, lofiData?.pending_link_email, mode, syncHook])

  const handleRevert = useCallback(async () => {
    await dispatch(syncHook.setAccountData({ pending_email: '' }))
    setQrCodeLinkInfo(null)
    dispatch(setLocalExtensionData({
      key: 'ham2k-lofi',
      pending_email: undefined,
      pending_link_email: undefined,
      pending_link_challenge: undefined,
      pending_permission: undefined
    }))
    if (mode === 'pending_link') {
      setMode('link')
    } else {
      setMode('email')
    }
  }, [dispatch, mode, syncHook])

  const handleSwitchToLinkViaQR = useCallback(async () => {
    const counts = await getSyncCounts()
    if (counts?.qsos?.pending > 0 || counts?.operations?.pending > 0) {
      const alertResponse = await new Promise((resolve) => {
        Alert.alert(
          t('screens.syncSettings.syncAccountDialog.potentialForDataLoss', 'Potential for data loss!!!'),
          t('screens.syncSettings.syncAccountDialog.potentialForDataLossDescription',
            'You have not synced all the data in this device.\n\n' +
            'If you link this device to a new account, ' +
            'you will be asked if you want to replace its data with that from the new account.\n\n' +
            'If this is the case, you might not be able to recover any existing activity ' +
            'that has not been synced yet.\n\n' +
            'We suggest you complete syncing this device first!'),
          [
            { text: t('screens.syncSettings.syncAccountDialog.syncFirstButton', 'Go back and complete syncing first'), style: 'cancel', onPress: () => resolve('cancel') },
            { text: t('screens.syncSettings.syncAccountDialog.continueAnywayButton', 'I know what I\'m doing! Continue Anyway'), style: 'destructive', onPress: () => resolve('replace') }
          ]
        )
      })
      if (alertResponse === 'cancel') {
        return
      }
    }
    setEmail('')
    setMode('link_via_qr')
    setQrCodeLinkInfo(null)
  }, [t])

  const handleSwitchToLink = useCallback(async () => {
    const counts = await getSyncCounts()
    if (counts?.qsos?.pending > 0 || counts?.operations?.pending > 0) {
      const alertResponse = await new Promise((resolve) => {
        Alert.alert(
          t('screens.syncSettings.syncAccountDialog.potentialForDataLoss', 'Potential for data loss!!!'),
          t('screens.syncSettings.syncAccountDialog.potentialForDataLossDescription',
            'You have not synced all the data in this device.\n\n' +
            'If you link this device to a new account, ' +
            'you will be asked if you want to replace its data with that from the new account.\n\n' +
            'If this is the case, you might not be able to recover any existing activity ' +
            'that has not been synced yet.\n\n' +
            'We suggest you complete syncing this device first!'),
          [
            { text: t('screens.syncSettings.syncAccountDialog.syncFirstButton', 'Go back and complete syncing first'), style: 'cancel', onPress: () => resolve('cancel') },
            { text: t('screens.syncSettings.syncAccountDialog.continueAnywayButton', 'I know what I\'m doing! Continue Anyway'), style: 'destructive', onPress: () => resolve('replace') }
          ]
        )
      })
      if (alertResponse === 'cancel') {
        return
      }
    }
    setEmail('')
    setMode('link')
    setQrCodeLinkInfo(null)
  }, [t])

  useEffect(() => {
    if (mode === 'link_via_qr' && (!qrCodeLinkInfo?.expiresAtMillis || qrCodeLinkInfo?.expiresAtMillis < new Date().getTime())) {
      setImmediate(async () => {
        const permissionRequest = await dispatch(syncHook.prepareBlankPermission())
        console.log('permissionRequest', permissionRequest)
        if (permissionRequest.ok) {
          const url = `com.ham2k:///link_client?id=${permissionRequest.json.permission.client}&token=${permissionRequest.json.permission.challenge_token}`
          setQrCodeLinkInfo({
            ...permissionRequest.json.permission,
            expiresAtMillis: new Date(permissionRequest.json.permission.challenge_expires_at).getTime(),
            url,
            currentAccount: lofiData?.account?.uuid
          })
          console.log('QR code link', url)
        }
      })
    }
  }, [dispatch, mode, qrCodeLinkInfo, syncHook, lofiData?.account?.uuid])

  const handleSwitchToEmail = useCallback(() => {
    setEmail(lofiData?.account?.email)
    setMode('email')
    setQrCodeLinkInfo(null)
  }, [lofiData?.account?.email])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleDone}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.syncSettings.syncAccountDialog.title', 'Ham2K LoFi Account')}</H2kDialogTitle>

      {errors?.default?.filter(e => e?.error).length > 0 && (
        <H2kDialogContent>
          <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
            {errors.default.map(e => e?.error || e).join('\n')}
          </Text>
        </H2kDialogContent>
      )}

      {mode === 'email' && (
        <>
          <H2kDialogContent>
            <Text variant="bodyMedium">
              {lofiData?.account?.email ? (
                t('screens.syncSettings.syncAccountDialog.changeEmailText', 'Change the recovery email for this account:')
              ) : (
                t('screens.syncSettings.syncAccountDialog.setEmailText', 'Set an email for your account. It can be used to identify it and make it easier to recover later.')
              )}
            </Text>
            <H2kEmailInput
              innerRef={emailRef}
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={email ?? ''}
              label={t('screens.syncSettings.syncAccountDialog.emailAddressLabel', 'Email Address')}
              placeholder="you@example.com"
              onChangeText={onChangeEmail}
              onSubmitEditing={handleEmailSubmit}
            />
            {errors?.pending_email?.length > 0 && (
              <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
                Email {errors.pending_email.map(e => e?.error || e).join(', ')}
              </Text>
            )}
            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: styles.oneSpace * 2, marginTop: styles.oneSpace * 2 }}>
              <H2kButton style={{ flex: 0 }} onPress={handleRevertEmail} disabled={email === lofiData?.account?.email}>{t('general.buttons.revert', 'Revert')}</H2kButton>
              <H2kButton style={{ flex: 0 }} onPress={handleEmailSubmit} disabled={email === lofiData?.account?.email}>{t('general.buttons.apply', 'Apply')}</H2kButton>
            </View>
            <H2kButton onPress={handleSwitchToLinkViaQR} style={{ alignSelf: 'flex-end', marginTop: styles.oneSpace * 2 }}>{t('screens.syncSettings.syncAccountDialog.linkWithOtherButton', 'Or… connect with an existing account')}</H2kButton>
            <H2kButton style={{ alignSelf: 'flex-end' }} onPress={handleDone}>{t('general.buttons.done', 'Done')}</H2kButton>
          </H2kDialogContent>
        </>
      )}

      {mode === 'pending_email' && (
        <>
          <H2kDialogContent>
            <Text variant="bodyLarge" style={{ textAlign: 'left', marginBottom: styles.oneSpace }}>
              {t('screens.syncSettings.syncAccountDialog.pendingEmailTextPre', 'An email has been sent to')}
            </Text>
            <Text variant="bodyLarge" style={{ fontWeight: 'bold', textAlign: 'left', marginBottom: styles.oneSpace }}>{lofiData?.account?.pending_email}</Text>
            <Text variant="bodyLarge" style={{ textAlign: 'left', marginBottom: styles.oneSpace }}>
              {t('screens.syncSettings.syncAccountDialog.pendingEmailTextPost', 'Please look for it and follow the instructions.')}
            </Text>
            <View style={{ display: 'flex', flexDirection: 'column', marginTop: styles.oneSpace }}>
              <H2kButton onPress={handleResend} style={{ alignSelf: 'flex-start' }}>{t('screens.syncSettings.syncAccountDialog.resendButton', 'Send email again')}</H2kButton>
              <H2kButton onPress={handleRevert} style={{ alignSelf: 'flex-start' }}>{t('screens.syncSettings.syncAccountDialog.revertButton', 'Change Email')}</H2kButton>
            </View>
          </H2kDialogContent>
          <H2kDialogActions>
            <View style={{ flex: 0, width: styles.oneSpace }} />
            <H2kButton style={{ flex: 0 }} onPress={handleDone}>{t('general.buttons.done', 'Done')}</H2kButton>
          </H2kDialogActions>
        </>
      )}

      {mode === 'link_via_qr' && (
        <>
          <H2kDialogContent>
            <View style={{ alignItems: 'center', marginBottom: styles.oneSpace }}>
              {qrCodeLinkInfo?.url ? (
                <QRCode
                  value={qrCodeLinkInfo.url}
                  size={200}
                  backgroundColor={styles.colors.elevation.level3}
                />
              ) : (
                <View style={{ height: 200, width: 200, backgroundColor: styles.colors.elevation.level3 }}>
                  <Text>Preparing QR code...</Text>
                </View>
              )}
            </View>
            <Text variant="bodyMedium" style={{ textAlign: 'center', marginTop: styles.oneSpace }}>
              {t('screens.syncSettings.syncAccountDialog.linkViaQRAccountText', 'Scan this QR code from a device with an existing Ham2K LoFi Account')}
            </Text>
            <H2kButton onPress={handleSwitchToLink} style={{ alignSelf: 'flex-end', marginTop: styles.oneSpace * 2 }}>{t('screens.syncSettings.syncAccountDialog.connectViaEmailButton', 'Or… connect via email')}</H2kButton>
            <H2kButton onPress={handleSwitchToEmail} style={{ alignSelf: 'flex-end' }}>{t('screens.syncSettings.syncAccountDialog.keepExistingAccountButton', 'Or… keep existing account')}</H2kButton>
            <H2kButton style={{ alignSelf: 'flex-end' }} onPress={handleDone}>{t('general.buttons.done', 'Done')}</H2kButton>
          </H2kDialogContent>
        </>
      )}

      {mode === 'link' && (
        <>
          <H2kDialogContent>
            <Text variant="bodyMedium">
              {t('screens.syncSettings.syncAccountDialog.linkAccountText', 'Connect with an existing account:')}
            </Text>
            <H2kEmailInput
              innerRef={emailRef}
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={email ?? ''}
              label={t('screens.syncSettings.syncAccountDialog.emailAddressLabel', 'Email Address')}
              placeholder="you@example.com"
              onChangeText={onChangeEmail}
              onSubmitEditing={handleLinkSubmit}
            />
            {errors?.linkEmail?.length > 0 && (
              <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
                {errors.linkEmail.map(e => e?.error || e).join(', ')}
              </Text>
            )}
            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: styles.oneSpace * 2, marginTop: styles.oneSpace * 2 }}>
              <H2kButton style={{ flex: 0 }} onPress={handleLinkSubmit} disabled={!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)}>{t('general.buttons.connect', 'Connect')}</H2kButton>
            </View>
            <H2kButton onPress={handleSwitchToLinkViaQR} style={{ alignSelf: 'flex-end', marginTop: styles.oneSpace * 2 }}>{t('screens.syncSettings.syncAccountDialog.linkViaQRButton', 'Or… connect via QR code')}</H2kButton>
            <H2kButton onPress={handleSwitchToEmail} style={{ alignSelf: 'flex-end' }}>{t('screens.syncSettings.syncAccountDialog.keepExistingAccountButton', 'Or… keep existing account')}</H2kButton>
            <H2kButton style={{ alignSelf: 'flex-end' }} onPress={handleDone}>{t('general.buttons.done', 'Done')}</H2kButton>
          </H2kDialogContent>
        </>
      )}

      {mode === 'pending_link' && (
        <>
          <H2kDialogContent>
            <H2kMarkdown variant="bodyLarge" style={{ textAlign: 'left', marginBottom: styles.oneSpace }}>
              {t(
                'screens.syncSettings.syncAccountDialog.confirmLink-md',
                'Open the app on a device already linked with **{{email}}** and confirm this request by entering the following code:',
                { email: lofiData?.pending_link_email }
              )}
            </H2kMarkdown>
            <Text variant="displayMedium" style={{ ...styles.text.numbers, fontWeight: 'bold', textAlign: 'center', marginBottom: styles.oneSpace }}>
              {lofiData?.pending_link_challenge}
            </Text>
            <H2kMarkdown variant="bodyLarge" style={{ textAlign: 'left', marginTop: styles.oneSpace }}>
              {t(
                'screens.syncSettings.syncAccountDialog.confirmLinkPost-md',
                "If you don't have access to another device linked to this account, you can:"
              )}
            </H2kMarkdown>
            <View style={{ display: 'flex', flexDirection: 'column', marginTop: styles.oneSpace }}>
              <H2kButton onPress={handleLinkEmailSubmit} style={{ alignSelf: 'flex-start' }}>{t('screens.syncSettings.syncAccountDialog.confirmViaEmailButton', 'Confirm via email')}</H2kButton>
              <H2kButton onPress={handleRevertLink} style={{ alignSelf: 'flex-start' }}>{t('screens.syncSettings.syncAccountDialog.changeAccountButton', 'Change Account')}</H2kButton>
            </View>
          </H2kDialogContent>
          <H2kDialogActions>
            <View style={{ flex: 0, width: styles.oneSpace }} />
            <H2kButton style={{ flex: 0 }} onPress={handleDone}>{t('general.buttons.done', 'Done')}</H2kButton>
          </H2kDialogActions>
        </>
      )}

      {mode === 'pending_link_with_email' && (
        <>
          <H2kDialogContent>
            <Text variant="bodyLarge" style={{ textAlign: 'left', marginBottom: styles.oneSpace }}>
              {t('screens.syncSettings.syncAccountDialog.pendingEmailTextPre', 'An email has been sent to')}
            </Text>
            <Text variant="bodyLarge" style={{ fontWeight: 'bold', textAlign: 'left', marginBottom: styles.oneSpace }}>{lofiData?.pending_link_email}</Text>
            <Text variant="bodyLarge" style={{ textAlign: 'left', marginBottom: styles.oneSpace }}>
              {t('screens.syncSettings.syncAccountDialog.pendingEmailTextPost', 'Please look for it and follow the instructions.')}
            </Text>
            <View style={{ display: 'flex', flexDirection: 'column' }}>
              <H2kButton onPress={handleLinkEmailSubmit} style={{ alignSelf: 'flex-start' }}>{t('screens.syncSettings.syncAccountDialog.resendButton', 'Send email again')}</H2kButton>
              <H2kButton onPress={handleRevertLink} style={{ alignSelf: 'flex-start' }}>{t('screens.syncSettings.syncAccountDialog.changeAccountButton', 'Change Account')}</H2kButton>
            </View>
          </H2kDialogContent>
          <H2kDialogActions>
            <View style={{ flex: 0, width: styles.oneSpace }} />
            <H2kButton style={{ flex: 0 }} onPress={handleDone}>{t('general.buttons.done', 'Done')}</H2kButton>
          </H2kDialogActions>
        </>
      )}
    </H2kDialog>
  )
}
