import React from 'react'

import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View
} from 'react-native'

const Colors = {
  primary: '#1292B4',
  white: '#FFF',
  lighter: '#F3F3F3',
  light: '#DAE1E7',
  dark: '#444',
  darker: '#222',
  black: '#000'
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600'
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400'
  },
  highlight: {
    fontWeight: '700'
  }
})

export default function SettingsScreen ({ navigation }) {
  const isDarkMode = useColorScheme() === 'dark'

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white
          }}>
          <View style={styles.sectionContainer}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: isDarkMode ? Colors.white : Colors.black
                }
              ]}>
              Settings
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                {
                  color: isDarkMode ? Colors.light : Colors.dark
                }
              ]}>
              This is the settings screen
            </Text>
            <Button
              title="Home"
              onPress={() => navigation.navigate('Home')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
