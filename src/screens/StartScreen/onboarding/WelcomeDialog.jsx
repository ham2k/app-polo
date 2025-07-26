/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { Text } from 'react-native-paper'

import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle } from '../../../ui'

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
    <H2kDialog visible={true} dismissable={false}>
      <H2kDialogTitle style={{ textAlign: 'center' }}>Welcome to PoLo!</H2kDialogTitle>
      {settings.devMode ? (
        <H2kDialogContent>
          <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
            Do you have an existing account?
          </Text>
          <H2kButton onPress={handleConnect}>Connect with Ham2K Log Filer</H2kButton>
          <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center', paddingTop: styles.oneSpace * 2 }}>
            Otherwise, we'll help you set up on this device.
          </Text>
        </H2kDialogContent>
      ) : (
        <H2kDialogContent>
          <Text style={{ fontSize: styles.normalFontSize, textAlign: 'center' }}>
            We have a few questions to help us better suit your needs.
          </Text>
        </H2kDialogContent>
      )}
      <H2kDialogActions style={{ justifyContent: 'space-between' }}>
        <H2kButton onPress={handlePrevious}>{previousLabel ?? 'Skip'}</H2kButton>
        <H2kButton onPress={handleNext}>{nextLabel ?? 'Continue'}</H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}
