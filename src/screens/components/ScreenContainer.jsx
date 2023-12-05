import React from 'react'
import { useHeaderHeight } from '@react-navigation/elements'

import { KeyboardAvoidingView, Platform, SafeAreaView, View } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export default function ScreenContainer ({ children }) {
  const headerHeight = useHeaderHeight()
  const styles = useThemedStyles()

  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView style={{ flex: 1, flexDirection: 'column' }}>
        <KeyboardAvoidingView
          style={[styles.screenContainer, { flex: 1, flexDirection: 'column' }]}
          behavior={'padding'}
          keyboardVerticalOffset={headerHeight}
        >
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  } else {
    return (
      <View style={[styles.screenContainer, { flex: 1, flexDirection: 'column' }]}>
        {children}
      </View>
    )
  }
}
