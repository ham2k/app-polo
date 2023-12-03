import React from 'react'

import { SafeAreaView, ScrollView } from 'react-native'

export default function ScreenView ({ children, styles }) {
  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.screen}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}
