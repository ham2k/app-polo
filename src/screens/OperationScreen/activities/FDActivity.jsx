/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { setOperation } from '../../../store/operations'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from './ActivitySettingsDialog'

const ACTIVITY = {
  key: 'arrl-fd',
  icon: 'weather-sunny',
  name: 'ARRL Field Day',
  shortName: 'FD',
  infoURL: 'https://field-day.arrl.org/',
  operationAttribute: 'fd',
  exchangeAttribute: '',
  description: (operation) => operation.fd ? `${operation.fd.class} ${operation.fd.location}` : '',
  descriptionPlaceholder: '',
  defaultValue: { class: '', location: '' }
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
          <Text variant="bodyMedium">Enter the exchange information for Field Day</Text>
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={styles.nativeInput}
            label={'Class'}
            placeholder={'...'}
            mode={'flat'}
            value={value.class}
            onChangeText={(text) => setValue({ ...value, class: text })}
          />
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={styles.nativeInput}
            label={'Location'}
            placeholder={'...'}
            mode={'flat'}
            value={value.location}
            onChangeText={(text) => setValue({ ...value, location: text })}
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
