import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// eslint-disable-next-line camelcase
import { Keyboard, View, unstable_batchedUpdates } from 'react-native'
import { IconButton, Text } from 'react-native-paper'
import cloneDeep from 'clone-deep'
import { useDispatch } from 'react-redux'

import { qsoKey } from '@ham2k/lib-qson-tools'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { bandForFrequency } from '@ham2k/lib-operation-data'

import { prepareCountryFilesData } from '../../../../data/CountryFiles'
import { setOperationData } from '../../../../store/operations'
import { addQSO } from '../../../../store/qsos'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { parseFreqInMHz } from '../../../../tools/frequencyFormats'
import { SecondaryExchangePanel } from './LoggingPanel/SecondaryExchangePanel'
import { NumberKeys } from './LoggingPanel/NumberKeys'
import { CallInfo } from './LoggingPanel/CallInfo'
import { OpInfo } from './LoggingPanel/OpInfo'
import { MainExchangePanel } from './LoggingPanel/MainExchangePanel'
import { joinAnd } from '../../../../tools/joinAnd'
import { Ham2kMarkdown } from '../../../../screens/components/Ham2kMarkdown'

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
    _isNew: true,
    key: 'new-qso'
  }
}

function prepareExistingQSO (qso) {
  const clone = cloneDeep(qso || {})
  clone._originalKey = qso?.key
  clone._isNew = false
  return clone
}

function prepareSuggestedQSO (qso) {
  const clone = cloneDeep(qso || {})
  clone._isNew = true
  clone.key = 'new-qso'
  if (clone.freq) {
    clone.band = bandForFrequency(clone.freq)
  }
  return clone
}

export default function LoggingPanel ({ style, operation, qsos, settings, selectedKey, setSelectedKey, setLastKey, suggestedQSO }) {
  const [qso, setQSO] = useState()
  const [originalQSO, setOriginalQSO] = useState()
  const [qsoHasChanges, setQSOHasChanges] = useState(false)

  const themeColor = useMemo(() => (!qso || qso?._isNew) ? 'tertiary' : 'secondary', [qso])
  const upcasedThemeColor = useMemo(() => themeColor.charAt(0).toUpperCase() + themeColor.slice(1), [themeColor])

  const styles = useThemedStyles((baseStyles) => prepareStyles(baseStyles, themeColor))

  const dispatch = useDispatch()

  const mainFieldRef = useRef()

  const [visibleFields, setVisibleFields] = useState({})

  const [pausedTime, setPausedTime] = useState()

  const [isValidQSO, setIsValidQSO] = useState(false)

  const [isValidOperation, operationError] = useMemo(() => { // Ensure we have all the required operation data
    const errors = []
    if (!qso?.band && !operation?.band) errors.push('band')
    if (!qso?.mode && !operation?.mode) errors.push('mode')
    if (!operation?.stationCall && !settings?.operatorCall) errors.push('callsign')

    if (errors.length > 0) {
      return [false, `Please enter **${joinAnd(errors)}** for a valid operation`]
    } else {
      return [true, undefined]
    }
  }, [qso, operation, settings])

  const setNewQSO = useCallback((newQSO) => {
    if (!newQSO) setSelectedKey(undefined)

    if (!newQSO?._isNew && newQSO?.startOnMillis) {
      setPausedTime(true)
    } else {
      setPausedTime(false)
    }

    setQSO(newQSO)
    setOriginalQSO(cloneDeep(newQSO))
    setQSOHasChanges(false)
    setVisibleFields({})
  }, [setQSO, setSelectedKey])

  useEffect(() => { // Keep track of QSO changes
    if (qso && originalQSO) {
      setQSOHasChanges(JSON.stringify(qso) !== JSON.stringify(originalQSO))
    } else {
      setQSOHasChanges(false)
    }
  }, [qso, originalQSO])

  useEffect(() => { // If a parameter was passed suggesting a QSO, use that
    if (suggestedQSO) {
      setNewQSO(prepareSuggestedQSO(suggestedQSO))
    }
  }, [suggestedQSO, setNewQSO])

  const [qsoQueue, setQSOQueue] = useState([])

  useEffect(() => { // Manage the QSO Queue
    // When there is no current QSO, pop one from the queue or create a new one
    // If the currently selected QSO changes, push the current one to the queue and load the new one
    if (!selectedKey || (selectedKey === 'new-qso' && !qso)) {
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
      if (qso?._isNew) setQSOQueue([...qsoQueue, qso])
      nextQSO = prepareExistingQSO(nextQSO)
      setNewQSO(nextQSO)
      if (mainFieldRef?.current) {
        mainFieldRef.current.focus()
      }
    }
  }, [qsoQueue, setQSOQueue, selectedKey, setSelectedKey, operation, settings, qso, setNewQSO, qsos])

  useEffect(() => { // Validate and analize the callsign
    const callInfo = parseCallsign(qso?.their?.call)

    if (callInfo?.baseCall) {
      setIsValidQSO(true)
    } else {
      setIsValidQSO(false)
    }
  }, [qso?.their?.call])

  const handleFieldChange = useCallback((event) => { // Handle form fields and update QSO info
    const { fieldId } = event
    const value = event?.value || event?.nativeEvent?.text

    if (qso?.deleted || qso?._willBeDeleted) {
      return
    }

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
      const freq = parseFreqInMHz(value)
      const band = bandForFrequency(freq)
      setQSO({ ...qso, freq, band })
      if (qso?._isNew) dispatch(setOperationData({ uuid: operation.uuid, band, freq }))
    } else if (fieldId === 'band') {
      setQSO({ ...qso, band: value, freq: undefined })
      if (qso?._isNew) dispatch(setOperationData({ uuid: operation.uuid, band: value, freq: undefined }))
    } else if (fieldId === 'mode') {
      setQSO({ ...qso, mode: value })
      if (qso?._isNew) dispatch(setOperationData({ uuid: operation.uuid, mode: value }))
    } else if (fieldId === 'time' || fieldId === 'date') {
      setQSO({ ...qso, startOnMillis: value })
    }
  }, [qso, setQSO, pausedTime, dispatch, operation?.uuid])

  const handleSubmit = useCallback(() => { // Save the QSO, or create a new one
    // Ensure the focused component has a change to update values
    //   NOTE: This is a hack that can break on newer versions of React Native
    const component = focusedRef?.current?._internalFiberInstanceHandleDEV
    component?.memoizedProps?.onBlur()

    setTimeout(() => { // Run inside a setTimeout to allow the state to update
      if (qso._willBeDeleted) {
        delete qso._willBeDeleted
        qso.deleted = true
        dispatch(addQSO({ uuid: operation.uuid, qso }))
        setSelectedKey(undefined)
        setUndoInfo(undefined)
        setQSO(undefined) // Let queue management decide what to do
        setLastKey(qso.key)
      } else if (isValidQSO && !qso.deleted) {
        unstable_batchedUpdates(() => {
          setVisibleFields({})

          delete qso._isNew
          delete qso._willBeDeleted
          delete qso.deleted

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
          qso.our.sent = qso.our.sent || (operation.mode === 'CW' || operation.mode === 'RTTY' ? '599' : '59')

          qso.their = qso.their || {}
          qso.their.sent = qso.their.sent || (operation.mode === 'CW' || operation.mode === 'RTTY' ? '599' : '59')

          qso.key = qsoKey(qso)

          dispatch(addQSO({ uuid: operation.uuid, qso }))
          setSelectedKey(undefined)
          setUndoInfo(undefined)
          setQSO(undefined) // Let queue management decide what to do
          setLastKey(qso.key)
        })
      }
    }, 10)
  }, [qso, isValidQSO, dispatch, operation, settings, setSelectedKey, setLastKey])

  const [undoInfo, setUndoInfo] = useState()

  const handleWipe = useCallback(() => { // Wipe a new QSO
    if (qso?._isNew) {
      setUndoInfo({ qso })
      setNewQSO(undefined)
      const timeout = setTimeout(() => { setUndoInfo(undefined) }, 10 * 1000) // Undo will clear after 10 seconds
      return () => clearTimeout(timeout)
    }
  }, [qso, setNewQSO])

  const handleUnwipe = useCallback(() => { // Undo wiping a new QSO
    if (undoInfo) {
      setQSO(undoInfo.qso)
      setUndoInfo(undefined)
      setQSOHasChanges(true)
    }
  }, [undoInfo])

  const handleDelete = useCallback(() => { // Delete an existing QSO
    if (!qso?._isNew) {
      setUndoInfo({ qso })
      setQSO({ ...qso, _willBeDeleted: true })
      // const timeout = setTimeout(() => { setUndoInfo(undefined) }, 10 * 1000) // Undo will clear after 10 seconds
      // return () => clearTimeout(timeout)
    }
  }, [qso])

  const handleUndelete = useCallback(() => { // Undo changes to existing QSO
    if (qso?.deleted) {
      setQSO({ ...qso, _willBeDeleted: false, deleted: false })
    }
  }, [qso])

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
            disabled={qso?.deleted || qso?._willBeDeleted}
            handleFieldChange={handleFieldChange}
            handleSubmit={handleSubmit}
            focusedRef={focusedRef}
            styles={styles}
            themeColor={themeColor}
            visibleFields={visibleFields}
            setVisibleFields={setVisibleFields}
          />

          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingLeft: styles.oneSpace }}>
              {operationError ? (
                <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
                  <Ham2kMarkdown style={{ color: styles.theme.colors.error }}>
                    {operationError || 'ERROR'}
                  </Ham2kMarkdown>
                </View>
              ) : (
                qso?.deleted || qso?._willBeDeleted ? (
                  <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: styles.normalFontSize, color: styles.theme.colors.error }}>
                      {qso?.deleted ? 'Deleted QSO' : 'QSO will be deleted!'}
                    </Text>
                  </View>
                ) : (
                  qso?.their?.call ? (
                    <CallInfo qso={qso} operation={operation} styles={styles} themeColor={themeColor} />
                  ) : (
                    <OpInfo operation={operation} styles={styles} qsos={qsos} themeColor={themeColor} />
                  )
                )

              )}
            </View>

            <View style={{ justifyContent: 'flex-end', alignSelf: 'flex-end' }}>
              {qso?._isNew ? (
                undoInfo ? (
                  <IconButton
                    icon={'undo'}
                    size={styles.oneSpace * 4}
                    iconColor={styles.theme.colors[themeColor]}
                    onPress={handleUnwipe}
                  />
                ) : (
                  <IconButton
                    icon={'backspace-outline'}
                    size={styles.oneSpace * 4}
                    disabled={!qsoHasChanges}
                    iconColor={styles.theme.colors[themeColor]}
                    onPress={handleWipe}
                  />
                )
              ) : (
                (qso?.deleted || qso?._willBeDeleted) ? (
                  <IconButton
                    icon={'undo'}
                    size={styles.oneSpace * 4}
                    iconColor={styles.theme.colors[themeColor]}
                    onPress={handleUndelete}
                  />
                ) : (
                  <IconButton
                    icon={'trash-can-outline'}
                    size={styles.oneSpace * 4}
                    disabled={false}
                    iconColor={styles.theme.colors[themeColor]}
                    onPress={handleDelete}
                  />
                )
              )}
            </View>

          </View>
        </View>

      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: styles.halfSpace }}>
        <MainExchangePanel
          style={{ flex: 1, paddingLeft: styles.oneSpace }}
          qso={qso}
          operation={operation}
          settings={settings}
          disabled={qso?.deleted || qso?._willBeDeleted}
          styles={styles}
          themeColor={themeColor}
          handleSubmit={handleSubmit}
          handleFieldChange={handleFieldChange}
          setQSO={setQSO}
          mainFieldRef={mainFieldRef}
          focusedRef={focusedRef}
        />
        <View style={{ flex: 0, justifyContent: 'center', alignItems: 'center', paddingLeft: styles.halfSpace }}>
          <IconButton
            icon={qso?._isNew ? 'upload' : (qso?._willBeDeleted ? 'trash-can' : 'content-save')}
            size={styles.oneSpace * 4}
            mode="contained"
            disabled={!isValidQSO || !isValidOperation}
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
