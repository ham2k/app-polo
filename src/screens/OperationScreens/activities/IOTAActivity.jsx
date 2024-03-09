/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { setOperationData } from '../../../store/operations'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from '../components/ActivitySettingsDialog'
import { replaceRefs, stringToRefs } from '../../../tools/refTools'

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
  OptionalExchangePanel: ThisActivityOptionalExchangePanel,


export default ThisActivity
