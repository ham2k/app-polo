import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, ScrollView, View, findNodeHandle } from 'react-native'
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

function describeRadio (operation) {
  const parts = []
  if (operation.freq) {
    parts.push(`${fmtFreqInMHz(operation.freq)} MHz`)
  } else if (operation.band) {
    parts.push(`${operation.band}`)
  } else {
    parts.push('Band???')
  }

  parts.push(`${operation.mode ?? 'SSB'}`)
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

export default function LoggingPanel ({ qso, operation, settings, onLog, onOperationChange, themeColor, style }) {
  themeColor = themeColor || 'tertiary'
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  const styles = useThemedStyles((baseStyles) => prepareStyles(baseStyles, themeColor))
  const [localQSO, setLocalQSO] = useState({})

  const [pausedTime, setPausedTime] = useState()

  const [isValid, setIsValid] = useState(false)

  const [visibleFields, setVisibleFields] = useState({})

  const callFieldRef = useRef()
  const sentFieldRef = useRef()
  const rcvdFieldRef = useRef()
  const freqFieldRef = useRef()

  // Initialize the form with the QSO data
  useEffect(() => {
    const local = {
      their: {
        call: qso?.their?.call ?? '',
        sent: qso?.their?.sent ?? ''
      },
      our: {
        sent: qso?.our?.sent ?? ''
      },
      startOnMillis: qso?.startOnMillis ?? null,
      notes: qso?.notes ?? '',
      refs: qso?.activities ?? []
    }

    if (qso.startOnMillis) {
      setPausedTime(true)
      setVisibleFields({ time: true })
    } else {
      setPausedTime(false)
      setVisibleFields({})
    }
    setLocalQSO(local)
  }, [qso])

  // Focus the callsign field when the panel is opened
  useEffect(() => {
    setTimeout(() => {
      callFieldRef?.current?.focus()
    }, 100)
  }, [qso, callFieldRef])

  // Validate and analize the callsign
  useEffect(() => {
    const callInfo = parseCallsign(localQSO?.their?.call)

    if (callInfo?.baseCall) {
      setIsValid(true)
    } else {
      setIsValid(false)
    }
  }, [localQSO?.their?.call])

  // Handle form fields and update QSO info
  const handleFieldChange = useCallback((event) => {
    const { fieldId, nativeEvent: { text } } = event
    if (fieldId === 'theirCall') {
      let startOnMillis = localQSO?.startOnMillis
      if (!pausedTime) {
        if (text) {
          if (!startOnMillis) {
            startOnMillis = Date.now()
          }
        } else {
          startOnMillis = null
        }
      }
      setLocalQSO({ ...localQSO, their: { ...localQSO?.their, call: text }, startOnMillis })
    } else if (fieldId === 'theirSent') {
      setLocalQSO({ ...localQSO, their: { ...localQSO?.their, sent: text } })
    } else if (fieldId === 'ourSent') {
      setLocalQSO({ ...localQSO, our: { ...localQSO?.our, sent: text } })
    } else if (fieldId === 'notes') {
      setLocalQSO({ ...localQSO, notes: text })
    } else if (fieldId === 'freq') {
      onOperationChange && onOperationChange({ freq: parseFreqInMHz(text) })
    } else if (fieldId === 'band') {
      onOperationChange && onOperationChange({ band: text })
    } else if (fieldId === 'mode') {
      onOperationChange && onOperationChange({ mode: text })
    }
  }, [localQSO, onOperationChange, pausedTime])

  // Finally submit the QSO
  const handleSubmit = useCallback(() => {
    if (isValid) {
      setVisibleFields({})
      onLog(localQSO)
    }
  }, [localQSO, onLog, isValid])

  // Switch between fields with the space key
  const spaceKeyHander = useCallback((event) => {
    const { nativeEvent: { key, target } } = event
    if (key === ' ') {
      if (target === findNodeHandle(callFieldRef.current)) {
        sentFieldRef.current.focus()
      } else if (target === findNodeHandle(sentFieldRef.current)) {
        rcvdFieldRef.current.focus()
      } else if (target === findNodeHandle(rcvdFieldRef.current)) {
        callFieldRef.current.focus()
      }
    }
  }, [callFieldRef, sentFieldRef, rcvdFieldRef])

  const [currentField, setCurrentField] = useState('')
  const [currentFieldSelection, setCurrentFieldSelection] = useState(null)
  const [blurTimeout, setBlurTimeout] = useState(null)
  const handleBlur = useCallback((event) => {
    if (blurTimeout) {
      clearTimeout(blurTimeout)
      setBlurTimeout(null)
    }
    setBlurTimeout(setTimeout(() => {
      setCurrentField('')
    }, 500))
  }, [blurTimeout])

  const handleFocus = useCallback((event) => {
    if (blurTimeout) {
      clearTimeout(blurTimeout)
      setBlurTimeout(null)
    }
    const { nativeEvent: { target } } = event
    if (target === findNodeHandle(callFieldRef.current)) {
      setCurrentField('theirCall')
    } else if (target === findNodeHandle(sentFieldRef.current)) {
      setCurrentField('ourSent')
    } else if (target === findNodeHandle(rcvdFieldRef.current)) {
      setCurrentField('theirSent')
    }
  }, [blurTimeout])

  const handleSelectionChange = useCallback((event) => {
    const { nativeEvent: { selection: { start, end } } } = event
    setCurrentFieldSelection({ start, end })
  }, [])

  const handleNumberKey = useCallback((number) => {
    const { start, end } = currentFieldSelection ?? {}
    const replaceContents = (text) => {
      return text.substring(0, start) + number + text.substring(end)
    }
    if (currentField === 'theirCall') {
      setLocalQSO({ ...localQSO, their: { ...localQSO?.their, call: replaceContents(localQSO?.their?.call || '') } })
    } else if (currentField === 'theirSent') {
      setLocalQSO({ ...localQSO, their: { ...localQSO?.their, sent: replaceContents(localQSO?.their?.sent || '') } })
    } else if (currentField === 'ourSent') {
      setLocalQSO({ ...localQSO, our: { ...localQSO?.our, sent: replaceContents(localQSO?.our?.sent || '') } })
    }
    // callFieldRef.current.focus()
  }, [currentField, currentFieldSelection, localQSO])

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
                <TimeChip time={localQSO?.startOnMillis} icon="clock-outline" style={{ flex: 0 }} styles={styles} themeColor={themeColor}
                  selected={visibleFields.time}
                  onChange={(value) => setVisibleFields({ ...visibleFields, time: value })}
                />
                {visibleFields.time && (
                  <>
                    <View style={{ flex: 0, height: 3, marginTop: styles.halfSpace, marginBottom: styles.oneSpace, backgroundColor: styles.theme.colors[themeColor] } } />
                    <View style={{ flexDirection: 'row', paddingHorizontal: styles.oneSpace, gap: styles.oneSpace }}>
                      <ThemedTextInput
                        themeColor={themeColor}
                        value={'22:22:22'}
                        label="Time"
                        placeholder="00:00:00"
                        onChange={handleFieldChange}
                        onSubmitEditing={handleSubmit}
                        fieldId={'time'}
                        keyboard={'dumb'}
                      />
                      <ThemedTextInput
                        themeColor={themeColor}
                        value={'2023-12-01'}
                        label="Date"
                        placeholder="2023-12-01"
                        onChange={handleFieldChange}
                        onSubmitEditing={handleSubmit}
                        fieldId={'date'}
                        keyboard={'dumb'}
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
                  >{describeRadio(operation)}</LoggerChip>
                </View>
                {visibleFields.radio && (
                  <>
                    <View style={{ flex: 0, height: 3, marginTop: styles.halfSpace, marginBottom: styles.oneSpace, backgroundColor: styles.theme.colors[themeColor] } } />
                    <View style={{ flexDirection: 'row', paddingHorizontal: styles.oneSpace, gap: styles.oneSpace }}>
                      <ThemedDropDown
                        label="Band"
                        themeColor={themeColor}
                        value={operation.band}
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
                        innerRef={freqFieldRef}
                        themeColor={themeColor}
                        style={[styles.input, { width: styles.oneSpace * 11 }]}
                        value={operation.freq ?? ''}
                        label="Frequency"
                        placeholder=""
                        onChange={handleFieldChange}
                        onSubmitEditing={handleSubmit}
                        fieldId={'freq'}
                      />
                      <ThemedDropDown
                        label="Mode"
                        value={operation.mode}
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

              {activities.filter(activity => activity.exchangeShortLabel && operation[activity.operationAttribute]).map(activity => (
                <View key={activity.key} style={{ flex: 0, flexDirection: 'column' }}>
                  <LoggerChip icon={activity.icon} styles={styles} style={{ flex: 0 }} themeColor={themeColor}
                    selected={!!visibleFields[activity.key]}
                    onChange={(value) => setVisibleFields({ ...visibleFields, [activity.key]: value })}
                  >{stringOrFunction(activity.exchangeShortLabel, { operation, qso })}</LoggerChip>
                  {visibleFields[activity.key] && (
                    <>
                      <View style={{ flex: 0, height: 3, marginTop: styles.halfSpace, marginBottom: styles.oneSpace, backgroundColor: styles.theme.colors[themeColor] } } />
                      <View style={{ flexDirection: 'row', paddingHorizontal: styles.oneSpace, gap: styles.oneSpace }}>
                        <activity.ExchangePanel qso={localQSO} setQSO={setLocalQSO} operation={operation} settings={settings} styles={styles} />
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
                        value={localQSO?.notes ?? ''}
                        label="Notes"
                        placeholder=""
                        onChange={handleFieldChange}
                        onSubmitEditing={handleSubmit}
                        fieldId={'notes'}
                        keyboard={'dumb'}
                      />
                    </View>
                  </>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={{ flex: 0, flexDirection: 'row', paddingHorizontal: styles.oneSpace, paddingVertical: styles.halfSpace, gap: styles.oneSpace, minHeight: 5.1 * styles.oneSpace }}>
            {localQSO?.their?.call ? (
              <CallInfo qso={localQSO} styles={styles} />
            ) : (
              <OpInfo operation={operation} styles={styles} />
            )}
          </View>
        </View>

      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingLeft: styles.oneSpace, paddingTop: styles.halfSpace, paddingBottom: styles.oneSpace, gap: styles.oneSpace }}>
          <CallsignInput
            innerRef={callFieldRef}
            themeColor={themeColor}
            style={[styles.input, { flex: 5 }]}
            value={localQSO?.their?.call ?? ''}
            label="Their Call"
            placeholder=""
            onChange={handleFieldChange}
            onSubmitEditing={handleSubmit}
            fieldId={'theirCall'}
            onKeyPress={spaceKeyHander}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onSelectionChange={handleSelectionChange}
          />
          <ThemedTextInput
            innerRef={sentFieldRef}
            themeColor={themeColor}
            style={{ width: styles.oneSpace * 6 }}
            value={localQSO?.our?.sent ?? ''}
            label="Sent"
            placeholder={qso.mode === 'CW' ? '599' : '59'}
            noSpaces={true}
            onChange={handleFieldChange}
            onSubmitEditing={handleSubmit}
            fieldId={'ourSent'}
            onKeyPress={spaceKeyHander}
            keyboard={'numbers'}
            numeric={true}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onSelectionChange={handleSelectionChange}
          />
          <ThemedTextInput
            innerRef={rcvdFieldRef}
            themeColor={themeColor}
            style={[styles.input, { width: styles.oneSpace * 6 }]}
            value={localQSO?.their?.sent || ''}
            label="Rcvd"
            placeholder={qso.mode === 'CW' ? '599' : '59'}
            noSpaces={true}
            onChange={handleFieldChange}
            onSubmitEditing={handleSubmit}
            fieldId={'theirSent'}
            onKeyPress={spaceKeyHander}
            keyboard={'numbers'}
            numeric={true}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onSelectionChange={handleSelectionChange}
          />
        </View>
        <View style={{ justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: styles.oneSpace, paddingBottom: 0 }}>
          <IconButton
            icon="upload"
            size={styles.oneSpace * 4}
            mode="contained"
            disabled={!isValid}
            containerColor={styles.theme.colors[`${themeColor}ContainerVariant`]}
            iconColor={styles.theme.colors[`on${upcasedThemeColor}`]}
            onPress={handleSubmit}
          />
        </View>
      </View>

      {isKeyboardVisible && (
        <NumberKeys themeColor={themeColor} onNumberKeyPressed={handleNumberKey} enabled={!!currentField} />
      )}
    </View>
  )
}
