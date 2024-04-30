/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Keyboard, View } from 'react-native'
import { IconButton, Text } from 'react-native-paper'
import cloneDeep from 'clone-deep'
import { useDispatch, batch } from 'react-redux'
import { SafeAreaView } from 'react-native-safe-area-context'

import { qsoKey } from '@ham2k/lib-qson-tools'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { bandForFrequency } from '@ham2k/lib-operation-data'

import { setOperationData } from '../../../../store/operations'
import { useUIState } from '../../../../store/ui'
import { addQSO } from '../../../../store/qsos'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { parseFreqInMHz } from '../../../../tools/frequencyFormats'
import { logTimer } from '../../../../tools/perfTools'
import { joinAnd } from '../../../../tools/joinAnd'
import { Ham2kMarkdown } from '../../../components/Ham2kMarkdown'
import { checkAndProcessCommands } from '../../../../extensions/commands/commandHandling'
import { SecondaryExchangePanel } from './LoggingPanel/SecondaryExchangePanel'
import { NumberKeys } from './LoggingPanel/NumberKeys'
import { CallInfo } from './LoggingPanel/CallInfo'
import { OpInfo } from './LoggingPanel/OpInfo'
import { MainExchangePanel } from './LoggingPanel/MainExchangePanel'
import { annotateQSO } from '../../OpInfoTab/components/useQSOInfo'

const DEBUG = false

function prepareStyles (themeStyles, themeColor) {
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  const commonPanelHeight = themeStyles.oneSpace * 6

  return {
    ...themeStyles,
    commonPanelHeight,
    themeColor,
    upcasedThemeColor,
    root: {
      borderTopColor: themeStyles.theme.colors[`${themeColor}Light`],
      borderTopWidth: 1,
      backgroundColor: themeStyles.theme.colors[`${themeColor}Container`]
    },
    input: {
      backgroundColor: themeStyles.theme.colors.background,
      color: themeStyles.theme.colors.onBackground
      // paddingRight: themeStyles.oneSpace
    },
    infoPanel: {
      container: {
        minHeight: commonPanelHeight,
        flexDirection: 'row',
        alignItems: 'center'
      },
      buttonContainer: {
        justifyContent: 'flex-end',
        alignSelf: 'flex-end',
        marginBottom: commonPanelHeight / 2 - themeStyles.oneSpace * 4
      },
      button: {
        size: themeStyles.oneSpace * 4,
        color: themeStyles.theme.colors[themeColor]
      }
    },
    secondaryControls: {
      headingContainer: {
        backgroundColor: themeStyles.theme.colors[themeColor],
        color: themeStyles.theme.colors[`${themeColor}Container`],
        paddingHorizontal: themeStyles.oneSpace,
        paddingVertical: themeStyles.halfSpace
      },
      headingText: {
        color: themeStyles.theme.colors[`${themeColor}Container`]
      },
      controlContainer: {
        minHeight: commonPanelHeight,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themeStyles.theme.colors[themeColor],
        color: themeStyles.theme.colors[`${themeColor}Container`],
        paddingHorizontal: themeStyles.oneSpace,
        paddingVertical: themeStyles.oneSpace
      },
      controlText: {
        color: themeStyles.theme.colors[`${themeColor}Container`]
      },
      button: {
        labelStyle: {
          color: themeStyles.theme.colors[`${themeColor}`]
        },
        contentStyle: {
          backgroundColor: themeStyles.theme.colors[`${themeColor}Lighter`],
          border: 'red' // themeStyles.theme.colors[`on${upcasedThemeColor}`]
        }
      }
    }
  }
}

function prepareNewQSO (operation, qsos, settings) {
  const qso = {
    band: operation.band,
    freq: operation.freq,
    mode: operation.mode,
    _isNew: true,
    key: 'new-qso'
  }
  if (operation._nextManualTime) {
    qso.startOnMillis = operation._nextManualTime
    qso._manualTime = true
  }
  return qso
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
  clone._isSuggested = true
  clone.key = 'new-qso'
  if (clone.freq) {
    clone.band = bandForFrequency(clone.freq)
  }
  return clone
}

export default function LoggingPanel ({ style, operation, qsos, activeQSOs, settings, online }) {
  const [qso, setQSO, updateQSO] = useUIState('LoggingPanel', 'qso', undefined)

  const [originalQSO, setOriginalQSO] = useState()
  const [qsoHasChanges, setQSOHasChanges] = useState(false)

  const [loggingState, , updateLoggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  const themeColor = useMemo(() => (!qso || qso?._isNew) ? 'tertiary' : 'secondary', [qso])
  const upcasedThemeColor = useMemo(() => themeColor.charAt(0).toUpperCase() + themeColor.slice(1), [themeColor])

  const styles = useThemedStyles(prepareStyles, themeColor)

  const dispatch = useDispatch()

  const mainFieldRef = useRef()

  const [currentSecondaryControl, reallySetCurrentSecondaryControl] = useState({})
  const setCurrentSecondaryControl = useCallback((control) => {
    if (control === currentSecondaryControl) {
      control = undefined
    }
    mainFieldRef.current.focus()
    setTimeout(() => reallySetCurrentSecondaryControl(control), 0)
  }, [currentSecondaryControl, reallySetCurrentSecondaryControl])

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
    if (!newQSO) updateLoggingState({ selectedKey: undefined })

    if (!newQSO?._isNew && newQSO?.startOnMillis) {
      setPausedTime(true)
    } else {
      setPausedTime(false)
    }

    setQSO(newQSO)
    setOriginalQSO(cloneDeep(newQSO))
    setCurrentSecondaryControl(undefined)
  }, [setQSO, updateLoggingState, setCurrentSecondaryControl])

  useEffect(() => { // Keep track of QSO changes
    if (qso && originalQSO) {
      if (qso._isSuggested) {
        setQSOHasChanges(true)
      } else {
        setQSOHasChanges(JSON.stringify(qso) !== JSON.stringify(originalQSO))
      }
    } else {
      setQSOHasChanges(false)
    }
  }, [qso, originalQSO])

  const [qsoQueue, setQSOQueue] = useState([])

  useEffect(() => { // Manage the QSO Queue
    // When there is no current QSO, pop one from the queue or create a new one
    // If the currently selected QSO changes, push the current one to the queue and load the new one
    if (!loggingState?.selectedKey || (loggingState?.selectedKey === 'new-qso' && !qso)) {
      let nextQSO
      if (qsoQueue.length > 0) {
        nextQSO = qsoQueue.pop()
        setQSOQueue(qsoQueue)
      } else {
        nextQSO = prepareNewQSO(operation, qsos, settings)
      }
      setNewQSO(nextQSO)
      if (nextQSO.key !== loggingState?.selectedKey) {
        updateLoggingState({ selectedKey: nextQSO.key })
      }
      setTimeout(() => { // On android, if the field was disabled and then reenabled, it won't focus without a timeout
        if (mainFieldRef?.current) {
          mainFieldRef.current.focus()
        }
      }, 10)
    } else if (qso && qso?.key !== loggingState?.selectedKey && loggingState?.selectedKey !== 'new-qso') {
      let nextQSO
      if (loggingState?.selectedKey === 'suggested-qso') {
        nextQSO = prepareSuggestedQSO(loggingState?.suggestedQSO)
        updateLoggingState({ selectedKey: nextQSO.key })
      } else {
        nextQSO = qsos.find(q => q.key === loggingState?.selectedKey)
        if (nextQSO) nextQSO = prepareExistingQSO(nextQSO)
        else nextQSO = prepareNewQSO(operation, qsos, settings)
      }

      if (qso?._isNew) setQSOQueue([...qsoQueue, qso])

      setNewQSO(nextQSO)
      setTimeout(() => { // On android, if the field was disabled and then reenabled, it won't focus without a timeout
        if (mainFieldRef?.current) {
          mainFieldRef.current.focus()
        }
      }, 10)
    }
  }, [qsoQueue, setQSOQueue, loggingState?.selectedKey, updateLoggingState, loggingState?.suggestedQSO, operation, settings, qso, setNewQSO, qsos])

  useEffect(() => { // Validate and analize the callsign
    let call = qso?.their?.call ?? ''
    if (call.indexOf(',') >= 0) {
      const calls = call = call.split(',')
      call = calls[calls.length - 1].trim()
    }

    const callInfo = parseCallsign(call)

    if (callInfo?.baseCall) {
      setIsValidQSO(true)
    } else {
      setIsValidQSO(false)
    }
  }, [qso?.their?.call])

  const handleFieldChange = useCallback((event) => { // Handle form fields and update QSO info
    const { fieldId, alsoClearTheirCall } = event
    const value = event?.value || event?.nativeEvent?.text

    if (qso?.deleted || qso?._willBeDeleted) {
      return
    }

    if (alsoClearTheirCall && fieldId !== 'theirCall') { // This is used by command-handling to reset the call entry when a command was processed
      qso.their.call = ''
    }

    if (fieldId === 'theirCall') {
      let timeChanges = {}
      if (qso?._isNew && value && !pausedTime && !qso.startOnMillis) {
        setPausedTime(true)
        timeChanges = { startOnMillis: Math.floor(Date.now() / 1000) * 1000, _manualTime: false }
      } else if (qso?._isNew && !value) {
        setPausedTime(false)
        timeChanges = { startOnMillis: undefined, _manualTime: false }
      }

      let guess = parseCallsign(value)
      if (guess?.baseCall) {
        annotateFromCountryFile(guess)
      } else if (value) {
        guess = annotateFromCountryFile({ prefix: value, baseCall: value })
      }

      updateQSO({ their: { call: value, guess }, ...timeChanges })
    } else if (fieldId === 'theirSent') {
      updateQSO({ their: { sent: value } })
    } else if (fieldId === 'ourSent') {
      updateQSO({ our: { sent: value } })
    } else if (fieldId === 'notes') {
      updateQSO({ notes: value })
    } else if (fieldId === 'freq') {
      const freq = value ? parseFreqInMHz(value) : undefined
      const band = freq ? bandForFrequency(freq) : undefined

      updateQSO({ freq, band })
      if (qso?._isNew) dispatch(setOperationData({ uuid: operation.uuid, band, freq }))
    } else if (fieldId === 'band') {
      updateQSO({ band: value, freq: undefined })
      if (qso?._isNew) dispatch(setOperationData({ uuid: operation.uuid, band: value, freq: undefined }))
    } else if (fieldId === 'mode') {
      updateQSO({ mode: value })
      if (qso?._isNew) dispatch(setOperationData({ uuid: operation.uuid, mode: value }))
    } else if (fieldId === 'time' || fieldId === 'date') {
      updateQSO({ startOnMillis: value, _manualTime: true })
    } else if (fieldId === 'state') {
      updateQSO({ their: { state: value } })
    }
  }, [qso, updateQSO, pausedTime, dispatch, operation?.uuid])

  const handleSubmit = useCallback(() => { // Save the QSO, or create a new one
    if (DEBUG) logTimer('submit', 'handleSubmit start', { reset: true })
    // Ensure the focused component has a chance to update values
    //   NOTE: This is a hack that can break on newer versions of React Native
    const component = focusedRef?.current?._internalFiberInstanceHandleDEV
    component?.memoizedProps?.onBlur()

    setTimeout(async () => { // Run inside a setTimeout to allow the state to update
      // First, try to process any commands
      if (checkAndProcessCommands(qso?.their?.call, { qso, originalQSO, operation, dispatch, settings, handleFieldChange })) {
        return
      }

      if (qso._willBeDeleted) {
        delete qso._willBeDeleted
        qso.deleted = true
        dispatch(addQSO({ uuid: operation.uuid, qso }))
        updateLoggingState({ selectedKey: undefined, lastKey: qso.key })
        setUndoInfo(undefined)
        setQSO(undefined) // Let queue management decide what to do
      } else if (isValidQSO && !qso.deleted) {
        await batch(async () => {
          setCurrentSecondaryControl(undefined)

          if (qso?._isNew && qso?._manualTime && qso.startOnMillis) {
            let nextManualTime = qso.startOnMillis + (60 * 1000)
            if (qsos.length > 0) {
              const diff = Math.abs(qso.startOnMillis - qsos[qsos.length - 1].startOnMillis)
              if (diff >= 1000) {
                nextManualTime = qso.startOnMillis + Math.min(diff, 60 * 5000)
              }
            }
            // No need to await this one, can happen in parallel
            dispatch(setOperationData({ uuid: operation.uuid, _nextManualTime: nextManualTime }))
          }

          delete qso._isNew
          delete qso._willBeDeleted
          delete qso.deleted

          qso.freq = qso.freq ?? operation.freq
          if (qso.freq) {
            qso.band = bandForFrequency(qso.freq)
          } else {
            qso.band = qso.band ?? operation.band
          }
          qso.mode = qso.mode ?? operation.mode

          if (!qso.startOnMillis) qso.startOnMillis = (new Date()).getTime()
          qso.startOn = new Date(qso.startOnMillis).toISOString()
          if (qso.endOnMillis) qso.endOn = new Date(qso.endOnMillis).toISOString()
          qso.our = qso.our || {}
          qso.our.sent = qso.our.sent || (operation.mode === 'CW' || operation.mode === 'RTTY' ? '599' : '59')

          qso.their = qso.their || {}
          qso.their.sent = qso.their.sent || (operation.mode === 'CW' || operation.mode === 'RTTY' ? '599' : '59')

          let call = qso?.their?.call
          const calls = call = call.split(',')
          for (let i = 0; i < calls.length; i++) {
            let oneQSO = qso
            if (calls.length > 1) { // If this is a multi-call QSO, we need to clone and annotate the QSO for each call
              oneQSO = cloneDeep(qso)
              oneQSO.their.call = calls[i].trim()
              oneQSO.their.guess = {}
              oneQSO.their.lookup = {}
              await annotateQSO({ qso: oneQSO, online, settings, dispatch })

              if (i > 0 && oneQSO._originalKey) {
                delete oneQSO._originalKey // Only the first call in a multi-call QSO should have the original key
              }
            }

            oneQSO.key = qsoKey(oneQSO)

            if (DEBUG) logTimer('submit', 'handleSubmit before dispatch')
            dispatch(addQSO({ uuid: operation.uuid, qso: oneQSO }))
            if (DEBUG) logTimer('submit', 'handleSubmit before updateLoggingState')
            updateLoggingState({ selectedKey: undefined, lastKey: oneQSO.key })
            if (DEBUG) logTimer('submit', 'handleSubmit before setUndoInfo')
          }
          setUndoInfo(undefined)
          if (DEBUG) logTimer('submit', 'handleSubmit before setQSO')
          setQSO(undefined) // Let queue management decide what to do
          if (DEBUG) logTimer('submit', 'handleSubmit after setQSO')
        })
        if (DEBUG) logTimer('submit', 'handleSubmit after batchedUpdates')
      }
      if (DEBUG) logTimer('submit', 'handleSubmit 3')
    }, 10)
    if (DEBUG) logTimer('submit', 'handleSubmit 4')
  }, [
    qso, qsos, setQSO, originalQSO, operation, settings, online,
    handleFieldChange, isValidQSO, dispatch, updateLoggingState, setCurrentSecondaryControl
  ])

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
  }, [undoInfo, setQSO])

  const handleDelete = useCallback(() => { // Delete an existing QSO
    if (!qso?._isNew) {
      setUndoInfo({ qso })
      updateQSO({ _willBeDeleted: true })
      // const timeout = setTimeout(() => { setUndoInfo(undefined) }, 10 * 1000) // Undo will clear after 10 seconds
      // return () => clearTimeout(timeout)
    }
  }, [qso, updateQSO])

  const handleUndelete = useCallback(() => { // Undo changes to existing QSO
    if (qso?.deleted || qso?._willBeDeleted) {
      updateQSO({ _willBeDeleted: false, deleted: false })
    }
  }, [qso, updateQSO])

  const focusedRef = useRef()

  const handleNumberKey = useCallback((number) => {
    if (!focusedRef.current) return
    focusedRef.current.onNumberKey && focusedRef.current.onNumberKey(number)
  }, [focusedRef])

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [keyboardExtraStyles, setKeyboardExtraStyles] = useState({})
  useEffect(() => {
    if (Keyboard.isVisible()) {
      const metrics = Keyboard.metrics()
      if (metrics.height > 100) {
        setIsKeyboardVisible(true)
        setKeyboardExtraStyles({})
      } else {
        setIsKeyboardVisible(false)
        setKeyboardExtraStyles({ paddingBottom: metrics.height - 10 })
      }
    }

    const didShowSubscription = Keyboard.addListener('keyboardDidShow', () => {
      const metrics = Keyboard.metrics()
      if (metrics.height > 100) {
        // On iPads, when there's an external keyboard connected, the OS still shows a small
        // button on the bottom right with some options
        // This is considered "keyboard visible", which causes KeyboardAvoidingView to leave an ugly empty padding
        setIsKeyboardVisible(true)
        setKeyboardExtraStyles({})
      } else {
        setIsKeyboardVisible(false)
        setKeyboardExtraStyles({ paddingBottom: metrics.height - 10 })
      }
    })
    const didHideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false)
      setKeyboardExtraStyles({})
    })

    return () => {
      didShowSubscription.remove()
      didHideSubscription.remove()
    }
  }, [])

  return (
    <View style={[styles.root, style]}>
      <SafeAreaView edges={[isKeyboardVisible ? '' : 'bottom', 'left', 'right'].filter(x => x)}>

        <View style={{ width: '100%', flexDirection: 'row', minHeight: 20 }}>
          <View style={{ flex: 1, flexDirection: 'column' }}>

            <SecondaryExchangePanel
              qso={qso}
              operation={operation}
              settings={settings}
              setQSO={setQSO}
              updateQSO={updateQSO}
              disabled={qso?.deleted || qso?._willBeDeleted}
              handleFieldChange={handleFieldChange}
              onSubmitEditing={handleSubmit}
              focusedRef={focusedRef}
              styles={styles}
              themeColor={themeColor}
              currentSecondaryControl={currentSecondaryControl}
              setCurrentSecondaryControl={setCurrentSecondaryControl}
            />

            <View style={styles.infoPanel.container}>
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
                      <CallInfo qso={qso} operation={operation} settings={settings} styles={styles} themeColor={themeColor} updateQSO={updateQSO} />
                    ) : (
                      <OpInfo operation={operation} styles={styles} settings={settings} qsos={activeQSOs} themeColor={themeColor} />
                    )
                  )

                )}
              </View>
              <View style={styles.infoPanel.buttonContainer}>
                {qso?._isNew ? (
                  undoInfo ? (
                    <IconButton
                      icon={'undo'}
                      size={styles.infoPanel.button.size}
                      iconColor={styles.infoPanel.button.color}
                      onPress={handleUnwipe}
                    />
                  ) : (
                    <IconButton
                      icon={'backspace-outline'}
                      size={styles.infoPanel.button.size}
                      iconColor={styles.infoPanel.button.color}
                      disabled={!qsoHasChanges}
                      onPress={handleWipe}
                    />
                  )
                ) : (
                  (qso?.deleted || qso?._willBeDeleted || undoInfo) ? (
                    <IconButton
                      icon={'undo'}
                      size={styles.infoPanel.button.size}
                      iconColor={styles.infoPanel.button.color}
                      onPress={undoInfo ? handleUnwipe : handleUndelete}
                    />
                  ) : (
                    <IconButton
                      icon={'trash-can-outline'}
                      size={styles.infoPanel.button.size}
                      iconColor={styles.infoPanel.button.color}
                      disabled={false}
                      onPress={handleDelete}
                    />
                  )
                )}
              </View>

            </View>

          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyItems: 'center', paddingVertical: styles.halfSpace, ...keyboardExtraStyles }}>
          <MainExchangePanel
            style={{ flex: 1, paddingLeft: styles.oneSpace }}
            qso={qso}
            operation={operation}
            settings={settings}
            disabled={qso?.deleted || qso?._willBeDeleted}
            styles={styles}
            themeColor={themeColor}
            onSubmitEditing={handleSubmit}
            handleFieldChange={handleFieldChange}
            setQSO={setQSO}
            updateQSO={updateQSO}
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
      </SafeAreaView>
    </View>
  )
}
