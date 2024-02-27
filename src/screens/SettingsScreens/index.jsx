import React from 'react'

import DataFilesSettingsScreen from './screens/DataFilesSettingsScreen'
import MainSettingsScreen from './screens/MainSettingsScreen'

const SettingsScreens = ({ Stack }) => {
  return (
    <Stack.Group>
      <Stack.Screen name="MainSettings" options={{ title: 'Settings' }} component={MainSettingsScreen} />
      <Stack.Screen name="DataFiles" options={{ title: 'Data Files', headerBackTitle: 'MainSettings' }} component={DataFilesSettingsScreen} />
    </Stack.Group>
  )
}

export default SettingsScreens
