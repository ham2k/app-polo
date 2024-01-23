import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, ScrollView, View, findNodeHandle, useWindowDimensions } from 'react-native'
import { IconButton } from 'react-native-paper'

import LoggerChip from '../../components/LoggerChip'

import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'

import ThemedTextInput from '../../../components/ThemedTextInput'
import CallsignInput from '../../../components/CallsignInput'
import ThemedDropDown from '../../../components/ThemedDropDown'
import { parseCallsign } from '@ham2k/lib-callsigns'
import TimeChip from '../../components/TimeChip'
import FrequencyInput from '../../../components/FrequencyInput'
import { fmtFreqInMHz, parseFreqInMHz } from '../../../../tools/frequencyFormats'
import { NumberKeys } from './LoggingPanel/NumberKeys'
import activities from '../../activities'
import { stringOrFunction } from '../../../../tools/stringOrFunction'
import { CallInfo } from './LoggingPanel/CallInfo'
import { OpInfo } from './LoggingPanel/OpInfo'
import { TimeInput } from '../../../components/TimeInput'
import { DateInput } from '../../../components/DateInput'
import { findRef } from '../../../../tools/refTools'

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

function prepareStyles (themeStyles, themeColor) {
  return {
    ...themeStyles,
    root: {
      borderTopColor: themeStyles.theme.colors[`${themeColor}Light`],
      borderTopWidth: 1,
      backgroundColor: themeStyles.theme.colors[`${themeColor}Container`]
    }
  }
}

export default function LoggingPanel ({
  qso, setQSO,
  operation, settings,
  onAccept, onOperationChange,
  mainFieldRef,
  themeColor, style
}) {
  themeColor = themeColor || 'tertiary'
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  const styles = useThemedStyles((baseStyles) => prepareStyles(baseStyles, themeColor))

  const [visibleFields, setVisibleFields] = useState({})

  const [pausedTime, setPausedTime] = useState()

  const [isValid, setIsValid] = useState(false)

  // Initialize the form with the QSO data
  useEffect(() => {
    if (!qso?._is_new && qso?.startOnMillis) {
      setPausedTime(true)
      // setVisibleFields({ time: true })
    } else {
      setPausedTime(false)
      // setVisibleFields({})
    }
  }, [qso])

  // Validate and analize the callsign
  useEffect(() => {
    const callInfo = parseCallsign(qso?.their?.call)

    if (callInfo?.baseCall) {
      setIsValid(true)
    } else {
      setIsValid(false)
    }
  }, [qso?.their?.call])

  // Handle form fields and update QSO info
  const handleFieldChange = useCallback((event) => {
    const { fieldId } = event
    const value = event?.value || event?.nativeEvent?.text

    if (fieldId === 'theirCall') {
      let startOnMillis = qso?.startOnMillis
      if (!pausedTime) {
        if (value) {
          if (!startOnMillis) {
            startOnMillis = Date.now()
          }
        } else {
          startOnMillis = null
        }
      }
      setQSO({ ...qso, their: { ...qso?.their, call: value }, startOnMillis })
    } else if (fieldId === 'theirSent') {
      setQSO({ ...qso, their: { ...qso?.their, sent: value } })
    } else if (fieldId === 'ourSent') {
      setQSO({ ...qso, our: { ...qso?.our, sent: value } })
    } else if (fieldId === 'notes') {
      setQSO({ ...qso, notes: value })
    } else if (fieldId === 'freq') {
      setQSO({ ...qso, freq: parseFreqInMHz(value) })
      onOperationChange && onOperationChange({ freq: parseFreqInMHz(value) })
    } else if (fieldId === 'band') {
      setQSO({ ...qso, band: value })
      onOperationChange && onOperationChange({ band: value })
    } else if (fieldId === 'mode') {
      setQSO({ ...qso, mode: value })
      onOperationChange && onOperationChange({ mode: value })
    } else if (fieldId === 'time' || fieldId === 'date') {
      setQSO({ ...qso, startOnMillis: value })
    }
  }, [qso, setQSO, onOperationChange, pausedTime])

  // Finally submit the QSO
  const handleSubmit = useCallback(() => {
    // Ensure the focused component has a change to update values
    //   NOTE: This is a hack that can break on newer versions of React Native
    const component = focusedRef?.current?._internalFiberInstanceHandleDEV
    component?.memoizedProps?.onBlur()

    // Run inside a setTimeout to allow the state to update
    setTimeout(() => {
      if (isValid) {
        setVisibleFields({})
        onAccept(qso)
      }
    }, 10)
  }, [qso, onAccept, isValid])

  const focusedRef = useRef()

  const handleNumberKey = useCallback((number) => {
    if (!focusedRef.current) return
    // NOTE: This is a hack that can break on newer versions of React Native
    const component = focusedRef.current._internalFiberInstanceHandleDEV
    component?.memoizedProps?.handleNumberKey(number)
  }, [focusedRef])

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  useEffect(() => {
    setIsKeyboardVisible(Keyboard.isVisible())
    const willShowSubscription = Keyboard.addListener('keyboardWillShow', () => {
      setIsKeyboardVisible(true)
    })
    const willHideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      setIsKeyboardVisible(false)
    })
    const didShowSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true)
    })
    const didHideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false)
    })

    return () => {
      willShowSubscription.remove()
      willHideSubscription.remove()
      didShowSubscription.remove()
      didHideSubscription.remove()
    }
  }, [])

  return (
    <View style={[styles.root, style, { flexDirection: 'column', justifyContent: 'flex-end', width: '100%', minHeight: 100 }]}>
      <View style={{ width: '100%', flexDirection: 'row', minHeight: 20 }}>
        <View style={{ flex: 1, flexDirection: 'column' }}>

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
                    <View style={{ flexDirection: 'row', paddingHorizontal: styles.oneSpace, gap: styles.oneSpace }}>
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
                    <View style={{ flexDirection: 'row', paddingHorizontal: styles.oneSpace, gap: styles.oneSpace }}>
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
                      <View style={{ flexDirection: 'row', paddingHorizontal: styles.oneSpace, gap: styles.oneSpace }}>
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
                    <View style={{ flexDirection: 'row', paddingHorizontal: styles.oneSpace, gap: styles.oneSpace }}>
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

          <View style={{ flex: 0, flexDirection: 'row', paddingHorizontal: styles.oneSpace, paddingVertical: styles.halfSpace, gap: styles.oneSpace, minHeight: 5.1 * styles.oneSpace }}>
            {qso?.their?.call ? (
              <CallInfo qso={qso} styles={styles} />
            ) : (
              <OpInfo operation={operation} styles={styles} />
            )}
          </View>
        </View>

      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <MainExchangePanel
          qso={qso}
          operation={operation}
          settings={settings}
          styles={styles}
          themeColor={themeColor}
          handleSubmit={handleSubmit}
          handleFieldChange={handleFieldChange}
          setQSO={setQSO}
          mainFieldRef={mainFieldRef}
          focusedRef={focusedRef}
        />
        <View style={{ justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: styles.oneSpace, paddingBottom: 0 }}>
          <IconButton
            icon={qso?._is_new ? 'upload' : 'content-save'}
            size={styles.oneSpace * 4}
            mode="contained"
            disabled={!isValid}
            containerColor={styles.theme.colors[`${themeColor}ContainerVariant`]}
            iconColor={styles.theme.colors[`on${upcasedThemeColor}`]}
            onPress={handleSubmit}
          />
        </View>
      </View>

      {isKeyboardVisible && settings.showNumbersRow && (
        <NumberKeys themeColor={themeColor} onNumberKeyPressed={handleNumberKey} enabled={!!focusedRef?.current} />
      )}
    </View>
  )
}

const MainExchangePanel = ({
  qso, operation, settings, styles, themeColor, handleSubmit, handleFieldChange, setQSO, mainFieldRef, focusedRef
}) => {
  const { width } = useWindowDimensions()

  // We need to pre-allocate a ref for the main field, in case `mainFieldRef` is not provided
  // but since hooks cannot be called conditionally, we just need to create it whether we need it or not
  const alternateCallFieldRef = useRef()

  const refStack = []
  // the first ref will correspond to the call field
  refStack.push(mainFieldRef || alternateCallFieldRef)
  // Add enough refs for whatever fields might get added
  refStack.push(useRef())
  refStack.push(useRef())
  refStack.push(useRef())
  refStack.push(useRef())
  refStack.push(useRef())
  refStack.push(useRef())

  // Make a copy since `refStack` will be used to distribute refs to each component
  let refs = [...refStack]

  // Switch between fields with the space key
  // We would have used a `useCallback` hook, but it depends on an array of refs that will change each render anyways
  const spaceKeyHandler = (event) => {
    const { nativeEvent: { key, target } } = event
    if (key === ' ') {
      const pos = refs.map(r => findNodeHandle(r.current)).indexOf(target)
      if (pos >= 0) {
        const next = (pos + 1) % refs.filter(r => r.current).length
        refs[next]?.current?.focus()
      }
    }
  }

  let fields = []
  fields.push(
    <CallsignInput
      key="call"
      innerRef={refStack.shift()}
      themeColor={themeColor}
      style={[styles.input, { minWidth: styles.oneSpace * 12, flex: 10 }]}
      value={qso?.their?.call ?? ''}
      label="Their Call"
      placeholder=""
      onChange={handleFieldChange}
      onSubmitEditing={handleSubmit}
      fieldId={'theirCall'}
      onKeyPress={spaceKeyHandler}
      focusedRef={focusedRef}
    />
  )
  fields.push(
    <ThemedTextInput
      key="sent"
      innerRef={refStack.shift()}
      themeColor={themeColor}
      style={{ minWidth: styles.oneSpace * 6, flex: 1 }}
      value={qso?.our?.sent ?? ''}
      label="Sent"
      placeholder={qso?.mode === 'CW' ? '599' : '59'}
      noSpaces={true}
      onChange={handleFieldChange}
      onSubmitEditing={handleSubmit}
      fieldId={'ourSent'}
      onKeyPress={spaceKeyHandler}
      keyboard={'numbers'}
      numeric={true}
      focusedRef={focusedRef}
    />
  )
  fields.push(
    <ThemedTextInput
      key="received"
      innerRef={refStack.shift()}
      themeColor={themeColor}
      style={[styles.input, { minWidth: styles.oneSpace * 6, flex: 1 }]}
      value={qso?.their?.sent || ''}
      label="Rcvd"
      placeholder={qso?.mode === 'CW' ? '599' : '59'}
      noSpaces={true}
      onChange={handleFieldChange}
      onSubmitEditing={handleSubmit}
      fieldId={'theirSent'}
      onKeyPress={spaceKeyHandler}
      keyboard={'numbers'}
      numeric={true}
      focusedRef={focusedRef}
    />
  )

  activities.filter(activity => findRef(operation, activity.key) && activity.fieldsForMainExchangePanel).forEach(activity => {
    fields = fields.concat(
      activity.fieldsForMainExchangePanel(
        { qso, operation, settings, styles, themeColor, handleSubmit, setQSO, spaceKeyHandler, refStack, focusedRef }
      )
    )
  })

  console.log('fields', fields.length, width, width / styles.oneSpace)
  if (fields.length > 4 && width / styles.oneSpace < 60) {
    fields = [fields[0], ...fields.slice(3)]
    refs = [refs[0], ...refs.slice(3)]
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingLeft: styles.oneSpace, paddingTop: styles.halfSpace, paddingBottom: styles.oneSpace, gap: styles.oneSpace }}>
      {fields}
    </View>
  )
}
