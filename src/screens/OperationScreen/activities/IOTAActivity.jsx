/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setOperation } from '../../../store/operations'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from '../components/ActivitySettingsDialog'

const ACTIVITY = {
  key: 'iota',
  comingSoon: true,
  icon: 'island',
  name: 'Islands on the Air',
  shortName: 'IOTA',
  infoURL: 'https://www.iota-world.org/',
  exchangeShortLabel: 'IOTA',
  operationAttribute: 'iota',
  description: (operation) => operation.iota + ' - NOT FUNCTIONAL YET',
  descriptionPlaceholder: 'Enter IOTA reference'
}

function ThisActivityExchangePanel (props) {
  const { qso, setQSO, handleChangeText } = props

  const [localValue, setLocalValue] = useState('')

  // Only initialize localValue once
  useEffect(() => {
    const refs = (qso?.refs || []).filter(ref => ref.type === 'iota')
    setLocalValue(refs.map(ref => ref.ref).join(', '))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const localHandleChangeText = useCallback((value) => {
    setLocalValue(value)
    const iotaRefs = value.split(',').map(ref => ref.trim()).filter(ref => ref).map(ref => ({ type: 'iota', ref }))
    const nonIotaRefs = (qso?.refs || []).filter(ref => ref.type !== 'iota')

    setQSO({ ...qso, refs: iotaRefs + nonIotaRefs })
    handleChangeText && handleChangeText(value)
  }, [qso, setQSO, handleChangeText])

  return (
    <TextInput
      {...props}
      value={localValue}
      label="SOTA Reference"
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
          <Text variant="bodyMedium">Enter the reference for the Island being activated in this operation</Text>
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={styles.nativeInput}
            label={'IOTA Reference'}
            placeholder={'...'}
            mode={'flat'}
            value={value}
            onChangeText={(text) => setValue(text)}
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
