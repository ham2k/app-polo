/*
 * Copyright ©️ 2025 Emma Ruby <k0uwu@0xem.ma>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'

import { selectSettings } from '../../../../store/settings'
import { qsonToWavelog } from '../../../../tools/qsonToWavelog'

export function ExportWavelogDialog ({ operation, qsos, visible, onDialogDone }) {
  const { t } = useTranslation()

  const settings = useSelector(selectSettings)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  // Reset status when dialog opens
  useEffect(() => {
    if (visible) {
      setStatus('')
      setExportSuccess(false)
    }
  }, [visible])

  const handleExport = async () => {
    const wavelog = settings?.wavelog
    console.log('Wavelog config:', wavelog, 'Types:', {
      apiUrl: typeof wavelog?.apiUrl,
      apiKey: typeof wavelog?.apiKey,
      stationId: typeof wavelog?.stationId,
      stationIdValue: wavelog?.stationId
    })

    setLoading(true)
    setStatus(t('screens.operationData.wavelogDialog.exporting', 'Exporting to Wavelog...'))
    const result = await qsonToWavelog({ operation, qsos, settings })
    setStatus(result.message)
    if (result.success) {
      setExportSuccess(true)
    }
    setLoading(false)
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDialogDone}>
        <Dialog.Title>{t('screens.operationData.wavelogDialog.title', 'Export QSOs to Wavelog')}</Dialog.Title>
        <Dialog.Content>
          <Text>{status || t('screens.operationData.wavelogDialog.status', 'Export all QSOs for this operation to Wavelog.')}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          {exportSuccess ? (
            <Button onPress={onDialogDone}>{t('general.buttons.done', 'Done')}</Button>
          ) : (
            <>
              <Button onPress={onDialogDone} disabled={loading}>{t('general.buttons.cancel', 'Cancel')}</Button>
              <Button onPress={handleExport} loading={loading} disabled={loading}>{t('general.buttons.export', 'Export')}</Button>
            </>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}
