import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { setOperationData } from '../../../store/operations'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from '../components/ActivitySettingsDialog'
import { replaceRefs, stringToRefs } from '../../../tools/refTools'

const ACTIVITY = {
  key: 'wwff',
  comingSoon: true,
  icon: 'flower',
  name: 'World Wide Flora & Fauna',
  shortName: 'WWFF',
  infoURL: 'https://wwff.co/',
  exchangeShortLabel: 'W2W',
  huntingType: 'wwff',
  activationType: 'wwffActivation',
  description: (operation) => 'COMING SOON!',
  descriptionPlaceholder: 'Enter WWWF reference'
}

const ThisActivity = {
  ...ACTIVITY,
  MainExchangePanel: null,
  OptionalExchangePanel: null
}

export default ThisActivity
