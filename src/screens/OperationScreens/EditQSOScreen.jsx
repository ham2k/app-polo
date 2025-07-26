/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { ScrollView, View } from 'react-native'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { useUIState } from '../../store/ui'
import { selectOperation } from '../../store/operations'
import { parseFreqInMHz } from '../../tools/frequencyFormats'
import { H2kCallsignInput, H2kDateInput, H2kFrequencyInput, H2kGridInput, H2kListSection, H2kRSTInput, H2kTextInput, H2kTimeInput } from '../../ui'
import ScreenContainer from '../components/ScreenContainer'

const QSO_SECTIONS = [
  {
    section: 'QSO Details',
    key: 'qso',
    data: '',
    fields: [
      { key: 'time', setKey: 'startAtMillis', label: 'Time', type: 'time', getter: ({ qso }) => qso.startAtMillis },
      { key: 'date', setKey: 'startAtMillis', label: 'Date', type: 'date', getter: ({ qso }) => qso.startAtMillis },
      { key: 'freq', label: 'Frequency', type: 'freq', setter: frequencySetter, getter: ({ qso }) => qso.freq },
      { key: 'mode', label: 'Mode', type: 'mode' },
      { key: 'band', label: 'Band', type: 'band' },
      { key: 'power', label: 'Power', type: 'number' }
    ]
  },
  {
    section: 'Their Info',
    key: 'their',
    data: 'their',
    fields: [
      { key: 'call', label: 'Station Call', type: 'callsign', setter: callParsingSetter, minSpaces: 14, style: { flex: 1 } },
      { key: 'sent', label: 'RST', type: 'rst' },
      { key: 'exchange', label: 'Exchange', type: 'upcasedText' },
      { key: 'name', label: 'Name', type: 'text', guess: true, minSpaces: 16, style: { flex: 1 } },
      // { key: 'qth', label: 'QTH', type: 'text', guess: true, minSpaces: 16, breakBefore: true },
      { key: 'city', label: 'City', type: 'text', guess: true, minSpaces: 16, style: { flex: 1 } },
      { key: 'state', label: 'State', type: 'upcasedText', guess: true },
      { key: 'county', label: 'County', type: 'text', guess: true, minSpaces: 16, style: { flex: 1 }, includeIf: ({ qso }) => qso?.their?.entityPrefix === 'K' || qso?.their?.guess?.entityPrefix === 'K' },
      { key: 'entity', label: 'Entity', type: 'text', guess: true, disabled: true, minSpaces: 16, style: { flex: 1 }, getter: ({ qso }) => qso?.their?.entityName ? `${qso?.their?.entityName || qso?.their?.guess?.entityName} (${qso?.their?.entityPrefix || qso?.their?.guess?.entityPrefix})` : undefined },
      { key: 'cqZone', label: 'CQ Zone', type: 'number', guess: true },
      { key: 'ituZone', label: 'ITU Zone', type: 'number', guess: true },
      { key: 'arrlSection', label: 'ARRL Section', type: 'upcasedText', minSpaces: 14, includeIf: ({ qso }) => qso?.their?.entityPrefix === 'K' || qso?.their?.guess?.entityPrefix === 'K' },
      { key: 'grid', label: 'Grid', type: 'grid', guess: true, breakBefore: true },
      { key: 'latitude', label: 'Latitude', type: 'float', guess: true },
      { key: 'longitude', label: 'Longitude', type: 'float', guess: true }
    ]
  },
  {
    section: 'Our Info',
    key: 'our',
    data: 'our',
    fields: [
      { key: 'call', label: 'Station Call', type: 'callsign', setter: callParsingSetter, minSpaces: 11, style: { flex: 1 } },
      { key: 'operatorCall', label: 'Operator Call', type: 'callsign', minSpaces: 11, style: { flex: 1 } },
      { key: 'sent', label: 'RST', type: 'rst', minSpaces: 4, style: { flex: 1 } },
      { key: 'exchange', label: 'Exchange', type: 'upcasedText', minSpaces: 8, style: { flex: 1 } }
      // { key: 'grid', label: 'Grid', type: 'grid' },
      // { key: 'latitude', label: 'Latitude', type: 'number' },
      // { key: 'longitude', label: 'Longitude', type: 'number' }
    ]
  },
  {
    section: 'More',
    key: 'more',
    data: '',
    fields: [
      { key: 'notes', label: 'Notes', type: 'text', style: { flex: 1 } }
    ]
  }
]

export default function EditQSOScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const operation = useSelector(state => selectOperation(state, route.params.operation?.uuid ?? route.params.operation))

  const [loggingState, , updateLoggingState] = useUIState('OpLoggingTab', 'loggingState', {})
  const [qso, updateQSO] = useMemo(() => {
    const qsoValue = loggingState?.qso
    const updateQSOFunction = (changes, more) => {
      const updatedQSO = { ...qsoValue, ...changes }

      updateLoggingState({
        qso: changes,
        hasChanges: !!qsoValue?._isSuggested || JSON.stringify(updatedQSO) !== JSON.stringify(loggingState?.originalQSO),
        ...more?.otherStateChanges
      })
    }

    return [qsoValue, updateQSOFunction]
  }, [loggingState, updateLoggingState])

  const handleChanges = useCallback(event => {
    const { fieldId } = event

    const value = event?.value || event?.nativeEvent?.text

    const [sectionKey, fieldKey] = fieldId.split('.')

    const section = QSO_SECTIONS.find(s => s.key === sectionKey)
    const field = section && section.fields.find(f => f.key === fieldKey)
    if (field && section) {
      let changes = {}
      if (field?.setter) {
        changes = field.setter({ qso, field, section, value, changes })
      } else if (section.data) {
        changes[section.data] = { [field.setKey || field.key]: value }
      } else {
        changes[field.setKey || field.key] = value
      }
      updateQSO(changes)
    }
  }, [qso, updateQSO])

  useEffect(() => {
    if (!operation || !qso) {
      navigation.goBack()
    }
  }, [navigation, operation, qso])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        {QSO_SECTIONS.map((section) => (
          <QSOSection key={section.section} qso={qso} section={section} styles={styles} onChange={handleChanges} />
        ))}
      </ScrollView>
    </ScreenContainer>
  )
}

function QSOSection ({ qso, section, styles, onChange }) {
  return (
    <H2kListSection title={section.section}>
      <View
        style={{
          paddingVertical: styles.oneSpace,
          paddingHorizontal: styles.oneSpace * 2,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: styles.oneSpace * 2
        }}
      >
        {section.fields.filter(f => f.includeIf ? f.includeIf({ qso }) : true).map((field) => (
          <React.Fragment key={field.key}>
            {field.breakBefore && (
              <View style={{ width: '100%', height: 0 }} />
            )}
            <QSOField field={field} qso={qso} section={section} styles={styles} onChange={onChange} />
            {field.breakAfter && (
              <View style={{ width: '100%', height: 0 }} />
            )}
          </React.Fragment>
        ))}
      </View>
    </H2kListSection>
  )
}

function getValueForField ({ qso, field, section }) {
  const sectionData = (section.data ? qso[section.data] : qso) || {}
  if (field.getter) {
    return field.getter({ qso, field, section, sectionData })
  } else if (field.key) {
    return sectionData[field.key] ?? (field.guess ? sectionData?.guess && sectionData?.guess[field.key] : undefined)
  } else {
    return undefined
  }
}

function QSOField ({ qso, field, section, styles, onChange }) {
  const value = getValueForField({ qso, field, section })

  const props = {
    onChange,
    value: value || '',
    label: field.label,
    fieldId: [section.key, field.key].join('.'),
    disabled: field.disabled,
    style: {
      ...field.style,
      opacity: field.disabled ? 0.5 : 1,
      minWidth: field.minSpaces ? field.minSpaces * styles.oneSpace : undefined
    }
  }
  if (field.type === 'text') {
    return (
      <H2kTextInput
        {...props}
      />
    )
  } else if (field.type === 'upcasedText') {
    return (
      <H2kTextInput
        {...props}
        uppercase={true}
      />
    )
  } else if (field.type === 'number') {
    return (
      <H2kTextInput
        {...props}
      />
    )
  } else if (field.type === 'callsign') {
    return (
      <H2kCallsignInput
        {...props}
      />
    )
  } else if (field.type === 'time') {
    return (
      <H2kTimeInput
        {...props}
        valueInMillis={value}
      />
    )
  } else if (field.type === 'date') {
    return (
      <H2kDateInput
        {...props}
        valueInMillis={value}
      />
    )
  } else if (field.type === 'freq') {
    return (
      <H2kFrequencyInput
        {...props}
      />
    )
  } else if (field.type === 'mode') {
    return (
      <H2kTextInput
        {...props}
      />
    )
  } else if (field.type === 'band') {
    return (
      <H2kTextInput
        {...props}
      />
    )
  } else if (field.type === 'rst') {
    return (
      <H2kRSTInput
        {...props}
        radioMode={qso?.mode ?? 'SSB'}
      />
    )
  } else if (field.type === 'grid') {
    return (
      <H2kGridInput
        {...props}
      />
    )
  } else {
    return (
      <H2kTextInput
        {...props}
      />
    )
  }
}

export const editQSOControl = {
  key: 'edit',
  icon: 'pencil',
  order: 99,
  label: 'More',
  onSelect: ({ dispatch, navigation, operation, qso }) => {
    navigation.navigate('EditQSO', { operation, qso })
  },
  optionType: 'mandatory'
}

function callParsingSetter ({ qso, field, section, value, changes }) {
  let guess = parseCallsign(value)
  if (guess?.baseCall) {
    annotateFromCountryFile(guess)
  } else if (value) {
    guess = annotateFromCountryFile({ prefix: value, baseCall: value })
  }
  return { ...changes, [section.key]: { call: value, guess } }
}

function frequencySetter ({ qso, field, section, value, changes, vfo }) {
  const freq = value ? parseFreqInMHz(value) : undefined
  const band = freq ? bandForFrequency(freq) : undefined
  const mode = freq ? (modeForFrequency(freq, qso.our) ?? qso?.mode ?? 'SSB') : qso?.mode

  return { ...changes, freq, band, mode }
}
