import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from '../components/ActivitySettingsDialog'
import { setOperationData } from '../../../store/operations'
import { replaceRefs, stringToRefs } from '../../../tools/refTools'

const ACTIVITY = {
  key: 'bota',
  comingSoon: true,
  icon: 'umbrella-beach',
  name: 'Beaches on the Air',
  shortName: 'BOTA',
  infoURL: 'https://www.beachesontheair.com/',
  exchangeShortLabel: 'B2B',
  huntingType: 'bota',
  activationType: 'botaActivation',
  description: (operation) => 'COMING SOON!',
  descriptionPlaceholder: 'Enter BOTA reference',
  defaultValue: { code: '' }
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
