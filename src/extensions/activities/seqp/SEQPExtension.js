import React, { useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { List } from 'react-native-paper'

import { setOperationData } from '../../../store/operations'
import { findRef, replaceRef } from '../../../tools/refTools'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'
import { ListRow } from '../../../screens/components/ListComponents'

const Info = {
  key: 'seqp',
  icon: 'emoticon-cool-outline',
  name: 'Solar Eclipse QSO Party',
  shortName: 'SEQP',
  cabrilloName: 'ECLIPSE-QSO',
  infoURL: 'https://hamsci.org/seqp-rules',
  defaultValue: { grid: '' }
}

const Extension = {
  ...Info,
  category: 'fieldOps',
  onActivation: ({ registerHook }) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler })
  }
}
export default Extension

const ActivityHook = {
  ...Info,
  Options: ActivityOptions,
  fieldsForMainExchangePanel
}

const ReferenceHandler = {
  ...Info,

  descriptionPlaceholder: '',
  description: (operation) => {
    const ref = findRef(operation, Info.key)
    return ['SEQP', ref?.ourGrid].filter(x => x).join(' • ')
  },

  suggestOperationTitle: (ref) => {
    return { for: Info.shortName, subtitle: ref?.ourGrid }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref.type === Info.key) {
      return [{
        format: 'adif',
        nameTemplate: settings.useCompactFileNames ? `{call}-${Info.shortName}-{compactDate}` : `{date} {call} for ${Info.shortName}`,
        titleTemplate: `{call}: ${Info.name} on {date}`
      },
      {
        format: 'cabrillo',
        nameTemplate: settings.useCompactFileNames ? `{call}-${Info.shortName}-{compactDate}` : `{date} {call} for ${Info.shortName}`,
        titleTemplate: `{call}: ${Info.name} on {date}`
      }]
    }
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)
    headers.push(['CONTEST', Info.cabrilloName ?? Info.shortName])
    headers.push(['CALLSIGN', operation.stationCall || settings.operatorCall])
    headers.push(['LOCATION', ref.location])
    headers.push(['NAME', ''])
    headers.push(['OPERATORS', settings.operatorCall])
    if (operation.grid) headers.push(['GRID-LOCATOR', operation.grid])
    return headers
  },

  qsoToCabrilloParts: ({ qso, ref, operation, settings, parts }) => {
    const ourCall = operation.stationCall || settings.operatorCall
    const qsoRef = findRef(qso, Info.key)

    parts.push((ourCall ?? '').padEnd(17, ' '))
    parts.push((qso?.our?.sent ?? '').padEnd(4, ' '))
    parts.push((ref?.ourGrid ?? '').padEnd(4, ' '))
    parts.push((qso?.their?.call ?? '').padEnd(17, ' '))
    parts.push((qso?.their?.sent ?? '').padEnd(4, ' '))
    parts.push((qsoRef?.theirGrid ?? '').padEnd(4, ' '))

    return parts
  }
}

function fieldsForMainExchangePanel (props) {
  const { qso, updateQSO, styles, disabled, refStack, onSubmitEditing, keyHandler, focusedRef } = props

  const ref = findRef(qso?.refs, Info.key) || { type: Info.key, class: '', location: '' }

  const fields = []

  fields.push(
    <ThemedTextInput
      key={`${Info.key}/grid`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 7, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Location'}
      placeholder={''}
      mode={'flat'}
      uppercase={true}
      noSpaces={true}
      value={ref?.theirGrid === undefined ? (qso?.their?.guess?.grid && qso.their.guess.grid.substring(0, 4)) || '' : ref?.theirGrid}
      disabled={disabled}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...ref, theirGrid: text }),
        their: { grid: text }
      })}
      onSubmitEditing={onSubmitEditing}
      onKeyPress={keyHandler}
      focusedRef={focusedRef}
    />
  )
  return fields
}

export function ActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const ref = useMemo(() => findRef(operation, Info.key), [operation])

  const handleChange = useCallback((value) => {
    if (value?.class) value.class = value.class.toUpperCase()
    if (value?.location) value.location = value.location.toUpperCase()

    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, ...value }) }))
  }, [dispatch, operation, ref])

  return (
    <List.Section title={'Exchange Information'}>
      <ListRow>
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
          textStyle={styles.text.callsign}
          label={'Our Grid'}
          mode={'flat'}
          uppercase={true}
          noSpaces={true}
          value={ref?.ourGrid === undefined ? (operation?.grid && operation.grid.substring(0, 4)) || '' : ref?.ourGrid}
          onChangeText={(text) => handleChange({ ourGrid: text })}
        />
      </ListRow>
    </List.Section>
  )
}
