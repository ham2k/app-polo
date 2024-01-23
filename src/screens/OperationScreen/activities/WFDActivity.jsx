/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { setOperationData } from '../../../store/operations'
import { ActivitySettingsDialog } from '../components/ActivitySettingsDialog'
import { findRef, removeRef, replaceRef } from '../../../tools/refTools'
import { View } from 'react-native'
import ThemedTextInput from '../../components/ThemedTextInput'
import { Text } from 'react-native-paper'

const ACTIVITY = {
  key: 'wfd',
  comingSoon: true,
  icon: 'snowflake',
  name: 'Winter Field Day',
  shortName: 'WFD',
  infoURL: 'https://www.winterfieldday.org/',
  description: (operation) => {
    let date
    if (operation?.qsos && operation.qsos[0]?.startOnMillis) date = Date.parse(operation.qsos[0].startOnMillis)
    else date = new Date()
    const ref = findRef(operation, 'wfd')
    return [`WFD ${date.getFullYear()}`, [ref?.class, ref?.location].filter(x => x).join(' ')].filter(x => x).join(' • ')
  },
  descriptionPlaceholder: '',
  defaultValue: { class: '', location: '' }
}

function fieldsForMainExchangePanel (props) {
  const { qso, setQSO, styles, refStack, onSubmitEditing, spaceKeyHandler, focusedRef } = props

  const ref = findRef(qso?.refs, ACTIVITY.key) || { type: ACTIVITY.key, class: '', location: '' }

  const fields = []

  fields.push(
    <ThemedTextInput
      key={`${ACTIVITY.key}_class`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 7, flex: 1 }]}
      textStyle={styles.nativeInput}
      label={'Class'}
      placeholder={''}
      mode={'flat'}
      uppercase={true}
      noSpaces={true}
      value={ref?.class || ''}
      onChangeText={(text) => setQSO({ ...qso, refs: replaceRef(qso?.refs, ACTIVITY.key, { ...ref, class: text }) })}
      onSubmitEditing={onSubmitEditing}
      onKeyPress={spaceKeyHandler}
      focusedRef={focusedRef}
    />
  )
  fields.push(
    <ThemedTextInput
      key={`${ACTIVITY.key}_location`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 7, flex: 1 }]}
      textStyle={styles.nativeInput}
      label={'Loc'}
      placeholder={''}
      mode={'flat'}
      uppercase={true}
      noSpaces={true}
      value={ref?.location || ''}
      onChangeText={(text) => setQSO({ ...qso, refs: replaceRef(qso?.refs, ACTIVITY.key, { ...ref, location: text }) })}
      onSubmitEditing={onSubmitEditing}
      onKeyPress={spaceKeyHandler}
      focusedRef={focusedRef}
    />
  )
  return fields
}

export function ThisActivitySettingsDialog (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const handleChange = useCallback((value) => {
    if (value === undefined) {
      dispatch(setOperationData({ uuid: operation.uuid, refs: removeRef(operation?.refs, ACTIVITY.key) }))
    } else {
      value.ref = ACTIVITY.key
      if (value.class) value.class = value.class.toUpperCase()
      if (value.location) value.location = value.location.toUpperCase()

      dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, ACTIVITY.key, value) }))
    }
  }, [dispatch, operation])

  return (
    <ActivitySettingsDialog
      {...props}
      icon={ACTIVITY.icon}
      title={ACTIVITY.name}
      info={ACTIVITY.infoURL}
      removeOption={true}
      value={findRef(operation, ACTIVITY.key)}
      onChange={handleChange}
      content={({ value, setValue }) => (
        <>
          <Text variant="bodyMedium">Enter the exchange information for Winter Field Day</Text>
          <View flexDirection="row" alignItems="center" justifyContent="space-between" style={{ gap: styles.oneSpace }}>
            <ThemedTextInput
              style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
              textStyle={styles.nativeInput}
              label={'Class'}
              mode={'flat'}
              uppercase={true}
              noSpaces={true}
              value={value?.class || ''}
              onChangeText={(text) => setValue({ ...value, class: text })}
            />
            <ThemedTextInput
              style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
              textStyle={styles.nativeInput}
              label={'Location'}
              mode={'flat'}
              uppercase={true}
              noSpaces={true}
              value={value?.location || ''}
              onChangeText={(text) => setValue({ ...value, location: text })}
            />
          </View>
        </>
      )}
    />
  )
}

const ThisActivity = {
  ...ACTIVITY,
  fieldsForMainExchangePanel,
  OptionalExchangePanel: null,
  SettingsDialog: ThisActivitySettingsDialog
}

export default ThisActivity
