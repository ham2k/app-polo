/* eslint-disable react/no-unstable-nested-components */
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

export function ThisActivitySettingsDialog (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const handleChange = useCallback((value) => {
    let refs
    if (value) {
      refs = stringToRefs(ACTIVITY.activationType, value, { regex: ACTIVITY.referenceRegex })
    } else {
      refs = []
    }

    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, ACTIVITY.activationType, refs) }))
  }, [dispatch, operation])

  return (
    <ActivitySettingsDialog
      {...props}
      icon={ACTIVITY.icon}
      title={ACTIVITY.name}
      info={ACTIVITY.infoURL}
      removeOption={true}
      onChange={handleChange}
      content={({ value, setValue }) => (
        <>
          <Text variant="bodyMedium">Enter the reference and activation code for the Beach being activated in this operation</Text>
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={[styles.nativeInput, styles.text.callsign]}
            label={'BOTA Reference'}
            placeholder={'...'}
            mode={'flat'}
            value={value.ref}
            onChangeText={(text) => setValue({ ...value, ref: text })}
          />
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={[styles.nativeInput, styles.text.callsign]}
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
  MainExchangePanel: null,
  OptionalExchangePanel: ThisActivityOptionalExchangePanel,
  SettingsDialog: ThisActivitySettingsDialog
}

export default ThisActivity
