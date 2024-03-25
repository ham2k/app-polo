import React from 'react'
import { Text } from 'react-native-paper'

const ACTIVITY = {
  key: 'iota',
  comingSoon: true,
  icon: 'island',
  name: 'Islands on the Air',
  shortName: 'IOTA',
  infoURL: 'https://www.iota-world.org/',
  huntingType: 'iota',
  activationType: 'iotaActivation',
  exchangeShortLabel: 'IOTA',
  description: (operation) => 'COMING SOON!',
  descriptionPlaceholder: 'Enter IOTA reference'
}

function ThisActivityOptionalExchangePanel (props) {
  return (
    <Text>WIP</Text>
  )
}

const ThisActivity = {
  ...ACTIVITY,
  MainExchangePanel: null,
  OptionalExchangePanel: ThisActivityOptionalExchangePanel
}

export default ThisActivity
