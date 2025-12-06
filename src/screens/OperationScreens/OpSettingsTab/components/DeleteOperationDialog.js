/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'

import { deleteOperation } from '../../../../store/operations'
import { trackEvent } from '../../../../distro'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../../ui'

export function DeleteOperationDialog({ operation, visible, settings, styles, onDialogDone }) {
  const { t } = useTranslation()

  const navigation = useNavigation()
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  const handleAccept = useCallback(() => {
    setDialogVisible(false)
    dispatch(deleteOperation(operation.uuid)).then(() => {
      navigation.popTo('Home')
    })
    trackEvent('delete_operation', {})
    onDialogDone && onDialogDone()
  }, [operation, dispatch, onDialogDone, navigation])

  const handleCancel = useCallback(() => {
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [onDialogDone])

  return (
    <H2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <H2kDialogTitle style={{ textAlign: 'center', color: styles.theme.colors.error }}>{t('screens.operationData.deleteOperationDialog.title', 'Delete operation?')}</H2kDialogTitle>
      <H2kDialogContent>
        <Text variant="bodyMedium">{t('screens.operationData.deleteOperationDialog.description', 'Are you sure you want to delete this operation?')}</Text>
      </H2kDialogContent>
      <H2kDialogActions>
        <H2kButton onPress={handleCancel}>{t('general.buttons.cancel', 'Cancel')}</H2kButton>
        <H2kButton onPress={handleAccept} textColor={styles.theme.colors.error}>{t('general.buttons.delete', 'Yes, Delete')}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
