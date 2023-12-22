/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useState } from 'react'
import POTAInput from '../../components/POTAInput'
import { useDispatch } from 'react-redux'
import { setOperation } from '../../../store/operations'
import { Text } from 'react-native-paper'
import { ActivitySettingsDialog } from './ActivitySettingsDialog'

const ACTIVITY = {
  key: 'pota',
  icon: 'pine-tree',
  name: 'Parks on the Air',
  shortName: 'POTA',
  infoURL: 'https://parksontheair.com/',
  exchangeShortLabel: 'P2P',
  operationAttribute: 'pota',
  description: (operation) => operation.pota,
  descriptionPlaceholder: 'Enter POTA references'
}

function ThisActivityExchangePanel (props) {
  const { qso, setQSO, handleChangeText, styles } = props

  const [localValue, setLocalValue] = useState('')

  // Only initialize localValue once
  useEffect(() => {
    const refs = (qso?.refs || []).filter(ref => ref.type === 'pota')

    console.log('pota localvalue', refs)
    setLocalValue(refs.map(ref => ref.ref).join(', '))
  }, [qso])

  const localHandleChangeText = useCallback((value) => {
    setLocalValue(value)
    console.log('pota change', value)
    const potaRefs = value.split(',').map(ref => ref.trim()).filter(ref => ref).map(ref => ({ type: 'pota', ref }))
    if (qso?.constructor === Array) {
      setQSO({ ...qso, refs: potaRefs + qso.refs.filter(ref => ref.type !== 'pota') })
    } else {
      setQSO({ ...qso, refs: potaRefs })
    }
    handleChangeText && handleChangeText(value)
  }, [qso, setQSO, handleChangeText])

  return (
    <POTAInput
      {...props}
      style={{ minWidth: 8 * styles.rem }}
      value={localValue}
      label="Their POTA"
      placeholder="K-..."
      onChangeText={localHandleChangeText}
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
          <Text variant="bodyMedium">Enter one or more park references being activated in this operation</Text>
          <POTAInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={styles.nativeInput}
            label={'POTA References'}
            placeholder={''}
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
