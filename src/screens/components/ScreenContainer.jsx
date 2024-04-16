/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { useHeaderHeight } from '@react-navigation/elements'

import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export default function ScreenContainer ({ children }) {
  const headerHeight = useHeaderHeight()
  const styles = useThemedStyles()

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        style={[styles.screenContainer, { flex: 1, flexDirection: 'column' }]}
        behavior={'padding'}
        keyboardVerticalOffset={headerHeight}
      >
        {children}
      </KeyboardAvoidingView>
    )
  } else {
    return (
      <View style={[styles.screenContainer, { flex: 1, flexDirection: 'column' }]}>
        {children}
      </View>
    )
  }
}
