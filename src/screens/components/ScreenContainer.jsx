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
