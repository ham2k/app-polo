// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useState } from 'react'
import { Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kMarkdown, H2kTextInput } from '../../../ui'

export function SyncLinkingDialog ({ visible, settings, styles, syncHook, onDialogDone, linkClientId, linkToken }) {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [code, setCode] = useState('')
  const [permission, setPermission] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    if (linkClientId && linkToken) {
      setImmediate(async () => {
        const result = await dispatch(syncHook.getPermission({ id: linkClientId, challenge_token: linkToken }))
        if (result.ok) {
          setPermission(result.json.permission)
          setErrors({})
        } else {
          setPermission(null)
          setErrors({
            default: [{ error: t('screens.syncSettings.syncLinkingDialog.linkExpired', 'The link you provide has expired. Please try again.') }]
          })
        }
      })
    }
  }, [dispatch, linkClientId, linkToken, syncHook, t])

  const handleChallenge = useCallback(async () => {
    const result = await dispatch(syncHook.getPermissions({ challenge_token: code }))

    if (result.ok) {
      if (result.json.permissions[0]?.status === 'pending') {
        setPermission(result.json.permissions[0])
        setErrors({})
      } else {
        setPermission(null)
        setErrors({
          default: [{ error: t('screens.syncSettings.syncLinkingDialog.requestNotFound', 'Request not found. Please try again.') }]
        })
      }
    } else {
      setPermission(null)

      const newErrors = {}
      if (result.json.error) {
        newErrors.default = [{ error: result.json.error }]
      }
      Object.keys(result.json?.permission_errors || {}).forEach(key => {
        newErrors[key] = result.json.permission_errors[key]
      })
      if (Object.keys(newErrors).length === 0) {
        newErrors.default = [{ error: t('general.errors.generic', 'Something went wrong. Please try again later.') }]
      }

      setErrors(newErrors)
    }
  }, [code, dispatch, syncHook, t])

  const handleAcceptLink = useCallback(async () => {
    const params = { status: 'active' }
    if (linkToken) {
      params.challenge_token = linkToken
    }
    const result = await dispatch(syncHook.updatePermission(permission?.client || linkClientId, params))

    if (result.ok) {
      if (result.json.permission?.status === 'active') {
        setPermission(undefined)
        setErrors({})
        setDialogVisible(false)
        onDialogDone && onDialogDone()
      } else {
        setErrors({
          default: [{ error: t('general.errors.generic', 'Something went wrong. Please try again later.') }]
        })
      }
    } else {
      const newErrors = {}

      if (result.json.error) {
        if (result.json.error.includes('not found')) {
          newErrors.default = [{ error: t('screens.syncSettings.syncLinkingDialog.requestNotFound', 'Request not found. Please try again.') }]
        } else {
          newErrors.default = [{ error: result.json.error }]
        }
        newErrors.default = [{ error: result.json.error }]
      }
      Object.keys(result.json?.permission_errors || {}).forEach(key => {
        newErrors[key] = result.json.permission_errors[key]
      })
      if (Object.keys(newErrors).length === 0) {
        newErrors.default = [{ error: t('general.errors.generic', 'Something went wrong. Please try again later.') }]
      }

      setErrors(newErrors)
    }
  }, [dispatch, linkClientId, linkToken, onDialogDone, permission?.client, syncHook, t])

  const handleCancel = useCallback(() => {
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.syncSettings.syncLinkingDialog.title', 'Ham2K Log Filer Sync Service')}</H2kDialogTitle>

      {permission ? (
        <>
          <H2kDialogContent>
            <H2kMarkdown style={{ textAlign: 'left', marginBottom: styles.oneSpace }}>
              {t(
                'screens.syncSettings.syncLinkingDialog.areYouSure-md',
                'Are you sure you want to link "**{{device}}**" with this account?',
                { device: permission.client_name }
              )}
            </H2kMarkdown>
          </H2kDialogContent>

          {errors?.default?.filter(e => e?.error).length > 0 && (
            <H2kDialogContent>
              <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
                {errors.default.map(e => e?.error || e).join('\n')}
              </Text>
            </H2kDialogContent>
          )}

          <H2kDialogActions>
            <H2kButton onPress={handleCancel}>{t('screens.syncSettings.syncLinkingDialog.buttonCancel', 'No, cancel')}</H2kButton>
            <H2kButton onPress={handleAcceptLink}>{t('screens.syncSettings.syncLinkingDialog.buttonProcees', 'Yes, link it!')}</H2kButton>
          </H2kDialogActions>
        </>
      ) : (
        <>
          <H2kDialogContent>
            <Text variant="bodyLarge" style={{ textAlign: 'left', marginBottom: styles.oneSpace }}>
              {t('screens.syncSettings.syncLinkingDialog.enterCode', 'Enter the code displayed on the other device to link it to this account.')}
            </Text>
            <H2kTextInput
              keyboard="dumb"
              uppercase={true}
              style={{ marginTop: styles.oneSpace }}
              value={code}
              onChangeText={setCode}
              onSubmitEditing={handleChallenge}
            />
          </H2kDialogContent>

          {errors?.default?.filter(e => e?.error).length > 0 && (
            <H2kDialogContent>
              <Text style={{ color: 'red', textAlign: 'center', marginTop: styles.oneSpace }}>
                {errors.default.map(e => e?.error || e).join('\n')}
              </Text>
            </H2kDialogContent>
          )}

          <H2kDialogActions>
            <H2kButton onPress={handleCancel}>{t('general.buttons.cancel', 'Cancel')}</H2kButton>
            <H2kButton onPress={handleChallenge}>{t('general.buttons.ok', 'Ok')}</H2kButton>
          </H2kDialogActions>
        </>
      )}
    </H2kDialog>
  )
}
