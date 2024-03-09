import React, { useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { List, Text } from 'react-native-paper'
import { setOperationData } from '../../../store/operations'
import { findRef, replaceRef } from '../../../tools/refTools'
import ThemedTextInput from '../../components/ThemedTextInput'
import { ListRow } from '../../components/ListComponents'

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

export function ThisActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const ref = useMemo(() => findRef(operation, ACTIVITY.key), [operation])

  const handleChange = useCallback((value) => {
    if (value?.class) value.class = value.class.toUpperCase()
    if (value?.location) value.location = value.location.toUpperCase()

    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, ACTIVITY.key, { ...ref, ...value }) }))
  }, [dispatch, operation, ref])

  return (
    <List.Section title={'Exchange Information'}>
      <ListRow>
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
          textStyle={styles.text.callsign}
          label={'Class'}
          mode={'flat'}
          uppercase={true}
          noSpaces={true}
          value={ref?.class || ''}
          onChangeText={(text) => handleChange({ class: text })}
        />
      </ListRow>
      <ListRow>
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
          textStyle={styles.text.callsign}
          label={'Location'}
          mode={'flat'}
          uppercase={true}
          noSpaces={true}
          value={ref?.location || ''}
          onChangeText={(text) => handleChange({ location: text })}
        />
      </ListRow>
    </List.Section>
  )
}

const ThisActivity = {
  ...ACTIVITY,
  MainExchangePanel: ThisActivityMainExchangePanel,
  OptionalExchangePanel: null,
  Options: ThisActivityOptions
}

export default ThisActivity
