import React, { useCallback } from 'react'

import {
  Text,
  View
} from 'react-native'
import { Button, TextInput } from 'react-native-paper'

import { selectCall, setCall } from '../../store/settings'
import { useDispatch, useSelector } from 'react-redux'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'

export default function SettingsScreen ({ navigation }) {
  const styles = useThemedStyles()
  const dispatch = useDispatch()
  const call = useSelector(selectCall)

  const onChangeCall = useCallback((text) => {
    dispatch(setCall(text))
  }, [dispatch])

  return (
    <ScreenContainer>
      <View style={styles.sectionContainer}>
        <Text
          style={styles.title}>
          Settings
        </Text>
        <Text style={styles.paragraph}>
          This is the settings screen
        </Text>
        <View style={styles.paragraph}>
          <TextInput
            style={styles.input}
            onChangeText={onChangeCall}
            value={call}
            label="Callsign"
            placeholder="Callsign"
          />
        </View>
        <Button
          mode="contained"
          styles={styles.button}
          onPress={() => navigation.navigate('Home')}
        >
          Home
        </Button>
      </View>
    </ScreenContainer>
  )
}
