import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// eslint-disable-next-line camelcase
import { Keyboard, View, unstable_batchedUpdates } from 'react-native'
import { IconButton } from 'react-native-paper'
import cloneDeep from 'clone-deep'
import { useDispatch } from 'react-redux'

import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { parseFreqInMHz } from '../../../../tools/frequencyFormats'
import { NumberKeys } from './LoggingPanel/NumberKeys'
import { CallInfo } from './LoggingPanel/CallInfo'
import { OpInfo } from './LoggingPanel/OpInfo'
import { findRef } from '../../../../tools/refTools'
import { setOperationData } from '../../../../store/operations'
import { qsoKey } from '@ham2k/lib-qson-tools'
import { addQSO } from '../../../../store/qsos'
import { MainExchangePanel } from './LoggingPanel/MainExchangePanel'
import { SecondaryExchangePanel } from './LoggingPanel/SecondaryExchangePanel'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { prepareCountryFilesData } from '../../../../data/CountryFiles'
import { bandForFrequency } from '@ham2k/lib-operation-data'

prepareCountryFilesData()

function prepareStyles (themeStyles, themeColor) {
  return {
    ...themeStyles,
    root: {
      borderTopColor: themeStyles.theme.colors[`${themeColor}Light`],
      borderTopWidth: 1,
      backgroundColor: themeStyles.theme.colors[`${themeColor}Container`]
    },
    input: {
      backgroundColor: themeStyles.theme.colors.background,
      color: themeStyles.theme.colors.onBackground
      // paddingRight: themeStyles.oneSpace
    }
  }
}

function prepareNewQSO (operation, settings) {
  return {
    band: operation.band,
    freq: operation.freq,
    mode: operation.mode,
    _is_new: true,
    key: 'new-qso'
  }
}

function prepareExistingQSO (qso) {
  const clone = cloneDeep(qso || {})
  clone._originalKey = qso?.key
  clone._is_new = false
  return clone
}

function prepareSuggestedQSO (qso) {
  const clone = cloneDeep(qso || {})
  clone._is_new = true
  clone.key = 'new-qso'
  if (clone.freq) {
    clone.band = bandForFrequency(clone.freq)
  }
  return clone
}

export default function LoggingPanel ({ style, operation, qsos, settings, selectedKey, setSelectedKey, setLastKey, suggestedQSO }) {
  const [qso, setQSO] = useState()

  const themeColor = useMemo(() => qso?._is_new ? 'tertiary' : 'secondary', [qso])
  const upcasedThemeColor = useMemo(() => themeColor.charAt(0).toUpperCase() + themeColor.slice(1), [themeColor])

  const styles = useThemedStyles((baseStyles) => prepareStyles(baseStyles, themeColor))

  const dispatch = useDispatch()

  const mainFieldRef = useRef()

  const [visibleFields, setVisibleFields] = useState({})

  const [pausedTime, setPausedTime] = useState()

  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    if (suggestedQSO) {
      setQSO(prepareSuggestedQSO(suggestedQSO))
    }
  }, [suggestedQSO])

  const setNewQSO = useCallback((newQSO) => {
    const newVisibleFields = {}
    if (newQSO?._is_new) {
      setPausedTime(false)
    } else {
      if (newQSO?.startOnMillis) {
        setPausedTime(true)
      }
      if (newQSO.notes) {
        newVisibleFields.notes = true
      }
      if (findRef(newQSO, 'pota')) {
        newVisibleFields.pota = true
      }
    }

    setQSO(newQSO)
    setVisibleFields(newVisibleFields)
  }, [setQSO])

  const [qsoQueue, setQSOQueue] = useState([])

  // When there is no current QSO, pop one from the queue or create a new one
  // If the currently selected QSO changes, push the current one to the queue and load the new one
  useEffect(() => {
    if (!selectedKey) {
      let nextQSO
      if (qsoQueue.length > 0) {
        nextQSO = qsoQueue.pop()
        setQSOQueue(qsoQueue)
      } else {
        nextQSO = prepareNewQSO(operation, settings)
      }
      setNewQSO(nextQSO)
      if (nextQSO.key !== selectedKey) {
        setSelectedKey(nextQSO.key)
      }
      if (mainFieldRef?.current) {
        mainFieldRef.current.focus()
      }
    } else if (qso && qso?.key !== selectedKey && selectedKey !== 'new-qso') {
      let nextQSO = qsos.find(q => q.key === selectedKey)
      if (qso?._is_new) setQSOQueue([...qsoQueue, qso])
      nextQSO = prepareExistingQSO(nextQSO)
      setNewQSO(nextQSO)
      if (mainFieldRef?.current) {
        mainFieldRef.current.focus()
      }
    }
  }, [qsoQueue, setQSOQueue, selectedKey, setSelectedKey, operation, settings, qso, setNewQSO, qsos])

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

      let guess = parseCallsign(value)
      if (guess?.baseCall) {
        annotateFromCountryFile(guess)
      } else if (value) {
        guess = annotateFromCountryFile({ prefix: value, baseCall: value })
      }

      setQSO({ ...qso, their: { ...qso?.their, call: value, guess }, startOnMillis })
    } else if (fieldId === 'theirSent') {
      setQSO({ ...qso, their: { ...qso?.their, sent: value } })
    } else if (fieldId === 'ourSent') {
      setQSO({ ...qso, our: { ...qso?.our, sent: value } })
    } else if (fieldId === 'notes') {
      setQSO({ ...qso, notes: value })
    } else if (fieldId === 'freq') {
      setQSO({ ...qso, freq: parseFreqInMHz(value) })
      if (qso?._is_new) dispatch(setOperationData({ uuid: operation.uuid, freq: parseFreqInMHz(value) }))
    } else if (fieldId === 'band') {
      console.log('Setting band', value)
      setQSO({ ...qso, band: value, freq: undefined })
      if (qso?._is_new) dispatch(setOperationData({ uuid: operation.uuid, band: value, freq: undefined }))
    } else if (fieldId === 'mode') {
      setQSO({ ...qso, mode: value })
      if (qso?._is_new) dispatch(setOperationData({ uuid: operation.uuid, mode: value }))
    } else if (fieldId === 'time' || fieldId === 'date') {
      setQSO({ ...qso, startOnMillis: value })
    }
  }, [qso, setQSO, pausedTime, dispatch, operation?.uuid])

  // Finally submit the QSO
  const handleSubmit = useCallback(() => {
    // Ensure the focused component has a change to update values
    //   NOTE: This is a hack that can break on newer versions of React Native
    const component = focusedRef?.current?._internalFiberInstanceHandleDEV
    component?.memoizedProps?.onBlur()

    // Run inside a setTimeout to allow the state to update
    setTimeout(() => {
      if (isValid) {
        unstable_batchedUpdates(() => {
          setVisibleFields({})

          if (qso._is_new) {
            delete qso._is_new
          }

          qso.freq = qso.freq || operation.freq
          if (qso.freq) {
            qso.band = bandForFrequency(qso.freq)
          } else {
            qso.band = qso.band || operation.band
          }
          qso.mode = qso.mode || operation.mode

          if (!qso.startOnMillis) qso.startOnMillis = (new Date()).getTime()
          qso.startOn = new Date(qso.startOnMillis).toISOString()
          if (qso.endOnMillis) qso.endOn = new Date(qso.endOnMillis).toISOString()
          qso.our = qso.our || {}
          qso.our.call = qso.our.call || operation.stationCall || settings.operatorCall
          qso.our.sent = qso.our.sent || (operation.mode === 'CW' ? '599' : '59')

          qso.their = qso.their || {}
          qso.their.sent = qso.their.sent || (operation.mode === 'CW' ? '599' : '59')

          qso.key = qsoKey(qso)

          dispatch(addQSO({ uuid: operation.uuid, qso }))
          setSelectedKey(undefined)
          setQSO(undefined)
          setLastKey(qso.key)
        })
      }
    }, 10)
  }, [qso, isValid, dispatch, operation, settings, setSelectedKey, setLastKey])

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

          <SecondaryExchangePanel
            qso={qso}
            operation={operation}
            settings={settings}
            setQSO={setQSO}
            handleFieldChange={handleFieldChange}
            handleSubmit={handleSubmit}
            focusedRef={focusedRef}
            styles={styles}
            themeColor={themeColor}
            visibleFields={visibleFields}
            setVisibleFields={setVisibleFields}
          />

          <View style={{ flex: 0, flexDirection: 'row', paddingHorizontal: styles.oneSpace, paddingVertical: styles.halfSpace, gap: styles.oneSpace, minHeight: 5.1 * styles.oneSpace }}>
            {qso?.their?.call ? (
              <CallInfo qso={qso} operation={operation} styles={styles} themeColor={themeColor} />
            ) : (
              <OpInfo operation={operation} styles={styles} qsos={qsos} themeColor={themeColor} />
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
        <View style={{ justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: styles.halfSpace, paddingBottom: styles.oneSpace }}>
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
