/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { setOperationData } from '../../../store/operations'
import { Text, TextInput } from 'react-native-paper'
import { ActivitySettingsDialog } from '../components/ActivitySettingsDialog'
import { replaceRefs, stringToRefs } from '../../../tools/refTools'

const ACTIVITY = {
  key: 'wfd',
  comingSoon: true,
  icon: 'snowflake',
  name: 'Winter Field Day',
  shortName: 'WFD',
  infoURL: 'https://www.winterfieldday.org/',
  description: (operation) => 'COMING SOON!',
  descriptionPlaceholder: '',
  defaultValue: { class: '', location: '' }
}

function ThisActivityExchangePanel (props) {
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
      value={operation[ACTIVITY.operationAttribute]}
      onChange={handleChange}
      content={({ value, setValue }) => (
        <>
          <Text variant="bodyMedium">Enter the exchange information for Winter Field Day</Text>
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
