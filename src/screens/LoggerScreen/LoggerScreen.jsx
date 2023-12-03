import React from 'react'

import {
  Text,
  View
} from 'react-native'
import { Button } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenView from '../components/ScreenView'

export default function LoggerScreen ({ navigation }) {
  const styles = useThemedStyles()

  setTimeout(() => {
    navigation.setOptions({ title: 'KI2D', subTitle: 'General Operation' })
  }, 0)

  return (
    <ScreenView styles={styles}>
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
    </ScreenView>
  )
}
