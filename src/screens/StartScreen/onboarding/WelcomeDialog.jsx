/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { Button, Dialog, Text } from 'react-native-paper'
import { Ham2kDialog } from '../../components/Ham2kDialog'

export function WelcomeDialog ({ settings, styles, onDialogNext, onDialogPrevious, onAccountConnect, nextLabel, previousLabel }) {
  const handleNext = useCallback(() => {
    onDialogNext && onDialogNext()
  }, [onDialogNext])

  const handlePrevious = useCallback(() => {
    onDialogPrevious && onDialogPrevious()
  }, [onDialogPrevious])

  const handleConnect = useCallback(() => {
    onAccountConnect && onAccountConnect()
  }, [onAccountConnect])

  return (
    <Ham2kDialog visible={true} dismissable={false}>
      <Dialog.Title style={{ textAlign: 'center' }}>Welcome to PoLo!</Dialog.Title>
      {settings.devMode ? (
        <Dialog.Content>
          <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
            Do you have an existing account?
          </Text>
          <Button onPress={handleConnect}>Connect with Ham2K Log Filer</Button>
          <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center', paddingTop: styles.oneSpace * 2 }}>
            Otherwise, we'll help you set up on this device.
          </Text>
        </Dialog.Content>
      ) : (
        <Dialog.Content>
          <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
            We have a few questions to help us better suit your needs.
          </Text>
        </Dialog.Content>
      )}
      <Dialog.Actions style={{ justifyContent: 'space-between' }}>
        <Button onPress={handlePrevious}>{previousLabel ?? 'Skip'}</Button>
        <Button onPress={handleNext}>{nextLabel ?? 'Continue'}</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
