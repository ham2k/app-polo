/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { setOperation } from '../../../store/operations'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from '../components/ActivitySettingsDialog'

const ACTIVITY = {
  key: 'bota',
  comingSoon: true,
  icon: 'umbrella-beach',
  name: 'Beaches on the Air',
  shortName: 'BOTA',
  infoURL: 'https://www.beachesontheair.com/',
  exchangeShortLabel: 'B2B',
  operationAttribute: 'bota',
  description: (operation) => operation.bota?.ref + ' - NOT FUNCTIONAL YET',
  descriptionPlaceholder: 'Enter BOTA reference',
  defaultValue: { ref: '', code: '' }
}

function ThisActivityExchangePanel (props) {
  const { qso, setQSO, handleChangeText } = props

  const localHandleChangeText = useCallback((value) => {
    setQSO({ ...qso, [ACTIVITY.exchangeAttribute]: value })
    handleChangeText && handleChangeText(value)
  }, [qso, setQSO, handleChangeText])

  return (
    <TextInput
      {...props}
      value={qso[ACTIVITY.exchangeAttribute]}
      label="BOTA Reference"
      placeholder="..."
      onTextChange={localHandleChangeText}
    />
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
          <Text variant="bodyMedium">Enter the reference and activation code for the Beach being activated in this operation</Text>
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={styles.nativeInput}
            label={'BOTA Reference'}
            placeholder={'...'}
            mode={'flat'}
            value={value.ref}
            onChangeText={(text) => setValue({ ...value, ref: text })}
          />
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={styles.nativeInput}
            label={'Activation Code'}
            placeholder={'...'}
            mode={'flat'}
            value={value.code}
            onChangeText={(text) => setValue({ ...value, code: text })}
          />
          <Text variant="bodyMedium" style={{ color: styles.theme.colors.primary }}>NOT FUNCTIONAL YET, FOR TESTING PURPOSES ONLY</Text>
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
