/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setOperation } from '../../../store/operations'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from './ActivitySettingsDialog'

const ACTIVITY = {
  key: 'sota',
  icon: 'image-filter-hdr',
  name: 'Summits on the Air',
  shortName: 'SOTA',
  infoURL: 'https://www.sota.org.uk/',
  exchangeShortLabel: 'S2S',
  operationAttribute: 'sota',
  exchangeAttribute: 'theirSOTA',
  description: (operation) => operation.sota,
  descriptionPlaceholder: 'Enter SOTA reference'
}

function ThisActivityExchangePanel (props) {
  const { qso, setQSO, handleChangeText } = props

  const [localValue, setLocalValue] = useState('')

  // Only initialize localValue once
  useEffect(() => {
    const refs = (qso?.refs || []).filter(ref => ref.type === 'sota')
    setLocalValue(refs.map(ref => ref.ref).join(', '))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const localHandleChangeText = useCallback((value) => {
    setLocalValue(value)
    const sotaRefs = value.split(',').map(ref => ref.trim()).filter(ref => ref).map(ref => ({ type: 'sota', ref }))
    const nonSotaRefs = (qso?.refs || []).filter(ref => ref.type !== 'sota')

    setQSO({ ...qso, refs: sotaRefs + nonSotaRefs })
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
          <Text variant="bodyMedium">Enter the reference for the Summit being activated in this operation</Text>
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={styles.nativeInput}
            label={'SOTA Reference'}
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
