import React from 'react'

import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View
} from 'react-native'
import { Button } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export default function LoggerScreen ({ navigation }) {
  const styles = useThemedStyles()

  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar
        barStyle={styles.isDarkMode ? 'dark-content' : 'light-content'}
        backgroundColor={styles.theme.colors.primary}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.screen}
      >
        <View style={styles.sectionContainer}>
          <Text style={styles.title}>
            Logger
          </Text>
          <Text style={styles.paragraph}>
            This is the logging screen
          </Text>
          <Button
            mode="contained"
            styles={styles.button}
            onPress={() => navigation.navigate('Settings')}
          >
            Settings
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
