import React, { useCallback } from 'react'

import { Text, View } from 'react-native'

import { selectCall, setCall } from '../../store/settings'
import { useDispatch, useSelector } from 'react-redux'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import CallsignInput from '../components/CallsignInput'

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
          style={styles.title}
        >
          General Settings
        </Text>
        <View style={styles.paragraph}>
          <CallsignInput
            style={[styles.input]}
            value={call}
            label="Our Callsign"
            placeholder="Callsign"
            onChangeText={onChangeCall}
          />
        </View>
      </View>
    </ScreenContainer>
  )
}
