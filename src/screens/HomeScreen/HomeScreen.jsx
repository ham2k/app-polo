import React from 'react'

import {
  Text,
  View
} from 'react-native'
import { Button, Chip } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenView from '../components/ScreenView'

export default function HomeScreen ({ navigation }) {
  const styles = useThemedStyles()
  return (
    <ScreenView styles={styles}>
      <View style={styles.sectionContainer}>
        <Text style={styles.title}>
          Ham2K Portable Logger
        </Text>
        <Text style={styles.paragraph}>
          A better way to log your contacts on the go.
        </Text>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('Logger')}
          style={styles.button}
        >
          Logger
        </Button>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('Settings')}
          style={styles.button}
        >
          Settings
        </Button>

        <Chip icon="information">Material Design</Chip>

      </View>
    </ScreenView>
  )
}
