import React from 'react'
import { ScrollView, View } from 'react-native'
import TimeChip from '../../../components/TimeChip'
import { TimeInput } from '../../../../components/TimeInput'
import { DateInput } from '../../../../components/DateInput'
import LoggerChip from '../../../components/LoggerChip'
import ThemedDropDown from '../../../../components/ThemedDropDown'
import FrequencyInput from '../../../../components/FrequencyInput'
import { stringOrFunction } from '../../../../../tools/stringOrFunction'
import activities from '../../../activities'
import { fmtFreqInMHz } from '../../../../../tools/frequencyFormats'
import ThemedTextInput from '../../../../components/ThemedTextInput'

function describeRadio (qso, operation) {
  const parts = []
  if (qso?.freq ?? operation.freq) {
    parts.push(`${fmtFreqInMHz(qso?.freq ?? operation.freq)} MHz`)
  } else if (qso?.band ?? operation.band) {
    parts.push(`${qso?.band ?? operation.band}`)
  } else {
    parts.push('Band???')
  }

  parts.push(`${qso?.mode ?? operation.mode ?? 'SSB'}`)
  return parts.join(' • ')
}

export const SecondaryExchangePanel = ({ qso, operation, settings, setQSO, handleFieldChange, handleSubmit, focusedRef, styles, themeColor, visibleFields, setVisibleFields }) => {
  return (
    <ScrollView keyboardShouldPersistTaps={'handled'} horizontal={true} style={{ width: '100%' }}>
      <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.oneSpace, gap: styles.halfSpace }}>

        <View style={{ flex: 0, flexDirection: 'column' }}>
          <TimeChip time={qso?.startOnMillis} icon="clock-outline" style={{ flex: 0 }} styles={styles} themeColor={themeColor}
            selected={visibleFields.time}
            onChange={(value) => setVisibleFields({ ...visibleFields, time: value })}
          />
          {visibleFields.time && (
            <>
              <View style={{ flex: 0, height: 3, marginTop: styles.halfSpace, marginBottom: styles.oneSpace, backgroundColor: styles.theme.colors[themeColor] } } />
              <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
                <TimeInput
                  themeColor={themeColor}
                  style={{ minWidth: styles.oneSpace * 11 }}
                  valueInMillis={qso?.startOnMillis}
                  label="Time"
                  onChange={handleFieldChange}
                  onSubmitEditing={handleSubmit}
                  fieldId={'time'}
                  focusedRef={focusedRef}
                />
                <DateInput
                  themeColor={themeColor}
                  style={{ minWidth: styles.oneSpace * 11 }}
                  valueInMillis={qso?.startOnMillis}
                  label="Date"
                  onChange={handleFieldChange}
                  onSubmitEditing={handleSubmit}
                  fieldId={'date'}
                  focusedRef={focusedRef}
                />
              </View>
            </>
          )}
        </View>

        <View style={{ flex: 0, flexDirection: 'column' }}>
          <View style={{ flex: 0, flexDirection: 'row' }}>
            <LoggerChip icon="radio" styles={styles} style={{ flex: 0 }} themeColor={themeColor}
              selected={visibleFields.radio}
              onChange={(value) => setVisibleFields({ ...visibleFields, radio: value })}
            >{describeRadio(qso, operation)}</LoggerChip>
          </View>
          {visibleFields.radio && (
            <>
              <View style={{ flex: 0, height: 3, marginTop: styles.halfSpace, marginBottom: styles.oneSpace, backgroundColor: styles.theme.colors[themeColor] } } />
              <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
                <ThemedDropDown
                  label="Band"
                  themeColor={themeColor}
                  value={qso.band ?? operation.band}
                  onChange={handleFieldChange}
                  fieldId={'band'}
                  style={{ width: styles.oneSpace * 8 }}
                  list={[
                    { value: '160m', label: '160m' },
                    { value: '80m', label: '80m' },
                    { value: '60m', label: '60m' },
                    { value: '40m', label: '40m' },
                    { value: '30m', label: '30m' },
                    { value: '20m', label: '20m' },
                    { value: '17m', label: '17m' },
                    { value: '15m', label: '15m' },
                    { value: '12m', label: '12m' },
                    { value: '10m', label: '10m' },
                    { value: '6m', label: '6m' },
                    { value: '4m', label: '4m' },
                    { value: '2m', label: '2m' },
                    { value: '1.25m', label: '1.25m' },
                    { value: '70cm', label: '70cm' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
                <FrequencyInput
                  themeColor={themeColor}
                  style={[styles.input, { width: styles.oneSpace * 11 }]}
                  value={qso.freq ?? operation.freq ?? ''}
                  label="Frequency"
                  placeholder=""
                  onChange={handleFieldChange}
                  onSubmitEditing={handleSubmit}
                  fieldId={'freq'}
                  focusedRef={focusedRef}
                />
                <ThemedDropDown
                  label="Mode"
                  value={qso.mode ?? operation.mode}
                  onChange={handleFieldChange}
                  fieldId={'mode'}
                  style={[styles.input, { width: styles.oneSpace * 8 }]}
                  list={[
                    { value: 'SSB', label: 'SSB' },
                    { value: 'CW', label: 'CW' },
                    { value: 'FM', label: 'FM' },
                    { value: 'AM', label: 'AM' },
                    { value: 'FT8', label: 'FT8' },
                    { value: 'FT4', label: 'FT4' },
                    { value: 'RTTY', label: 'RTTY' }
                  ]}
                />
              </View>
            </>
          )}
        </View>

        {activities.filter(activity => activity.includeOptionalExchange && activity.includeOptionalExchange({ operation, qso }) && activity.OptionalExchangePanel).map(activity => (
          <View key={activity.key} style={{ flex: 0, flexDirection: 'column' }}>
            <LoggerChip icon={activity.icon} styles={styles} style={{ flex: 0 }} themeColor={themeColor}
              selected={!!visibleFields[activity.key]}
              onChange={(value) => setVisibleFields({ ...visibleFields, [activity.key]: value })}
            >{stringOrFunction(activity.exchangeShortLabel, { operation, qso })}</LoggerChip>
            {visibleFields[activity.key] && (
              <>
                <View style={{ flex: 0, height: 3, marginTop: styles.halfSpace, marginBottom: styles.oneSpace, backgroundColor: styles.theme.colors[themeColor] } } />
                <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
                  <activity.OptionalExchangePanel qso={qso} setQSO={setQSO} operation={operation} settings={settings} styles={styles} focusedRef={focusedRef} />
                </View>
              </>
            )}
          </View>
        ))}

        <View style={{ flex: 0, flexDirection: 'column' }}>
          <View style={{ flex: 0, flexDirection: 'row' }}>
            <LoggerChip icon="note-outline" styles={styles} style={{ flex: 0 }} themeColor={themeColor}
              selected={visibleFields.notes}
              onChange={(value) => setVisibleFields({ ...visibleFields, notes: value })}
            >Notes</LoggerChip>
          </View>
          {visibleFields.notes && (
            <>
              <View style={{ flex: 0, height: 3, marginTop: styles.halfSpace, marginBottom: styles.oneSpace, backgroundColor: styles.theme.colors[themeColor] } } />
              <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
                <ThemedTextInput
                  themeColor={themeColor}
                  style={[styles.input, { minWidth: styles.oneSpace * 20 }]}
                  value={qso?.notes ?? ''}
                  label="Notes"
                  placeholder=""
                  onChange={handleFieldChange}
                  onSubmitEditing={handleSubmit}
                  fieldId={'notes'}
                  keyboard={'dumb'}
                  focusedRef={focusedRef}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
