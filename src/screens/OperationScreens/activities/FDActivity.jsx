/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from '../components/ActivitySettingsDialog'
import { setOperationData } from '../../../store/operations'
import { replaceRefs, stringToRefs } from '../../../tools/refTools'

const ACTIVITY = {
  key: 'arrl-fd',
  comingSoon: true,
  icon: 'weather-sunny',
  name: 'ARRL Field Day',
  shortName: 'FD',
  infoURL: 'https://field-day.arrl.org/',
  description: (operation) => 'COMING SOON!',
  descriptionPlaceholder: '',
  defaultValue: { class: '', location: '' }
}

function ThisActivityMainExchangePanel (props) {
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
      refs = stringToRefs(ACTIVITY.key, value, { regex: ACTIVITY.referenceRegex })
    } else {
      refs = []
    }

    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, ACTIVITY.key, refs) }))
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
          <Text variant="bodyMedium">Enter the exchange information for Field Day</Text>
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={[styles.nativeInput, styles.text.numbers]}
            label={'Class'}
            placeholder={'...'}
            mode={'flat'}
            value={value.class}
            onChangeText={(text) => setValue({ ...value, class: text })}
          />
          <TextInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            textStyle={[styles.nativeInput, styles.text.numbers]}
            label={'Location'}
            placeholder={'...'}
            mode={'flat'}
            value={value.location}
            onChangeText={(text) => setValue({ ...value, location: text })}
          />
          <Text variant="bodyMedium" style={{ color: styles.theme.colors.primary }}>NOT FUNCTIONAL YET, FOR TESTING PURPOSES ONLY</Text>
        </>
      )}
    />
  )
}

const ThisActivity = {
  ...ACTIVITY,
  MainExchangePanel: ThisActivityMainExchangePanel,
  OptionalExchangePanel: null,
  SettingsDialog: ThisActivitySettingsDialog
}

export default ThisActivity
