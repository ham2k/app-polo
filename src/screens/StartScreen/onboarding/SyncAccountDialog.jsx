/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect } from 'react'
import { Switch, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'

import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import { View } from 'react-native'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'

export function SyncAccountDialog ({ inputMode, settings, styles, onDialogNext, onDialogPrevious, nextLabel, previousLabel }) {
  const dispatch = useDispatch()

  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))

  useEffect(() => {
    if (lofiData?.enabled === undefined) {
      // Default to enabled, if there are no previous settings
      dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: true }))
    }
  }, [dispatch, lofiData?.enabled])

  const handleNext = useCallback(async () => {
    onDialogNext && onDialogNext()
  }, [onDialogNext])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  return (
    <H2kDialog visible={true} dismissable={false}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>Ham2K Log Filer</H2kDialogTitle>
      <H2kDialogContent>
        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center', marginBottom: styles.oneSpace * 2 }}>
          We provide a basic sync and backup service for free, and more for a fee.
        </Text>
        <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center', marginBottom: styles.oneSpace * 2 }}>
          Find more details in the Settings.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }}>
          <Switch value={!!lofiData?.enabled} onValueChange={(v) => {
            // Workaround for Switch component not updating immediately inside Portal.
            // See https://github.com/callstack/react-native-paper/issues/4789
            setTimeout(() => {
              dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: v }))
            }, 10)
          }
          }
          />
          <Text style={{ fontSize: styles.normalFontSize }} onPress={() => dispatch(setLocalExtensionData({ key: 'ham2k-lofi', enabled: !lofiData?.enabled }))}>
            Enable Cloud Sync and Backups
          </Text>
        </View>
      </H2kDialogContent>
      <H2kDialogActions style={{ justifyContent: 'space-between' }}>
        <H2kButton onPress={handlePrevious}>{previousLabel ?? 'Back'}</H2kButton>
        <H2kButton onPress={handleNext}>{nextLabel ?? 'Continue'}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
