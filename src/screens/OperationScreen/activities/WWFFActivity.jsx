/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { setOperation } from '../../../store/operations'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from './ActivitySettingsDialog'

const ACTIVITY = {
  key: 'wwff',
  icon: 'flower',
  name: 'World Wide Flora & Fauna',
  shortName: 'WWFF',
  infoURL: 'https://wwff.co/',
  exchangeShortLabel: 'W2W',
  operationAttribute: 'wwwf',
  exchangeAttribute: 'theirWWWF',
  description: (operation) => operation.wwwf,
  descriptionPlaceholder: 'Enter WWWF reference'
}

function ThisActivityExchangePanel (props) {
  // const { qso, setQSO, handleChangeText } = props

  // const localHandleChangeText = useCallback((value) => {
  //   setQSO({ ...qso, [ACTIVITY.exchangeAttribute]: value })
  //   handleChangeText && handleChangeText(value)
  // }, [qso, setQSO, handleChangeText])

  return (
    <Text>WIP</Text>
  )
}

export function ThisActivitySettingsDialog (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const handleChange = useCallback((text) => {
    dispatch(setOperation({ uuid: operation.uuid, [ACTIVITY.operationAttribute]: text }))
  }, [dispatch, operation])

  return (
    <ActivitySettingsDialog
      {...props}
      icon={ACTIVITY.icon}
      title={ACTIVITY.name}
      info={ACTIVITY.infoURL}
      removeOption={true}
      value={operation[ACTIVITY.operationAttribute]}
      onChange={handleChange}
      content={({ value, setValue }) => (
        <>
          <Text variant="bodyMedium">Enter the reference for the location being activated in this operation</Text>
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={styles.nativeInput}
            label={'WWFF Reference'}
            placeholder={'...'}
            mode={'flat'}
            value={value}
            onChangeText={(text) => setValue(text)}
          />
        </>
      )}
    />
  )
}

const ThisActivity = {
  ...ACTIVITY,
  ExchangePanel: ThisActivityExchangePanel,
  SettingsDialog: ThisActivitySettingsDialog
}

export default ThisActivity
