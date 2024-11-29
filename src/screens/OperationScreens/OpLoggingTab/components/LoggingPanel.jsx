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
import { useDispatch } from 'react-redux'
import { SafeAreaView } from 'react-native-safe-area-context'
import UUID from 'react-native-uuid'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'

import { setOperationData } from '../../../../store/operations'
import { useUIState } from '../../../../store/ui'
import { addQSO, addQSOs } from '../../../../store/qsos'
import { setVFO } from '../../../../store/station/stationSlice'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { parseFreqInMHz } from '../../../../tools/frequencyFormats'
import { logTimer } from '../../../../tools/perfTools'
import { joinAnd } from '../../../../tools/joinAnd'
import { checkAndDescribeCommands, checkAndProcessCommands } from '../../../../extensions/commands/commandHandling'
import { SecondaryExchangePanel } from './LoggingPanel/SecondaryExchangePanel'
import { NumberKeys } from './LoggingPanel/NumberKeys'
import { CallInfo } from './LoggingPanel/CallInfo'
import { OpInfo } from './LoggingPanel/OpInfo'
import { MainExchangePanel } from './LoggingPanel/MainExchangePanel'
import { annotateQSO } from '../../OpInfoTab/components/useCallLookup'
import { useNavigation } from '@react-navigation/native'
import { findHooks } from '../../../../extensions/registry'
import { trackEvent } from '../../../../distro'

const DEBUG = false

export default function LoggingPanel ({ style, operation, vfo, qsos, sections, activeQSOs, settings, online, ourInfo }) {
  const navigation = useNavigation()

  const [loggingState, setLoggingState, updateLoggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  const [qso, setQSO, updateQSO] = useMemo(() => {
    const qsoValue = loggingState?.qso
    const setQSOFunction = (newQSO, more) => {
      setLoggingState({
        ...loggingState,
        qso: newQSO,
        selectedUUID: newQSO?.uuid,
        originalQSO: cloneDeep(newQSO),
        hasChanges: !!qsoValue?._isSuggested,
        ...more?.otherStateChanges
      })
    }
    const updateQSOFunction = (changes, more) => {
      const updatedQSO = { ...qsoValue, ...changes }
      updateLoggingState({
        qso: changes,
        hasChanges: !!qsoValue?._isSuggested || JSON.stringify(updatedQSO) !== JSON.stringify(loggingState?.originalQSO),
        ...more?.otherStateChanges
      })
    }
    return [qsoValue, setQSOFunction, updateQSOFunction]
  }, [loggingState, setLoggingState, updateLoggingState])

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

  const [isValidQSO, setIsValidQSO] = useState(false)

  const [isValidOperation, operationError] = useMemo(() => { // Ensure we have all the required operation data
    const errors = []
    if (!qso?.band && !vfo?.band) errors.push('band')
    if (!operation?.stationCall) errors.push('callsign')

    if (errors.length > 0) {
      return [false, `ERROR: Please enter **${joinAnd(errors)}** for a valid operation`]
    } else {
      return [true, undefined]
    }
  }, [qso, operation, vfo])

  useEffect(() => { // Manage the QSO Queue
    // When there is no current QSO, pop one from the queue or create a new one
    // If the currently selected QSO changes, push the current one to the queue and load the new one
    if (!loggingState?.selectedUUID) {
      let nextQSO
      const otherStateChanges = {}
      if (loggingState?.qsoQueue?.length > 0) {
        nextQSO = loggingState.qsoQueue.pop() ?? prepareNewQSO(operation, qsos, vfo, settings)
        otherStateChanges.qsoQueue = loggingState.qsoQueue
      } else {
        nextQSO = prepareNewQSO(operation, qsos, vfo, settings)
      }
      setQSO(nextQSO, { otherStateChanges })
      setTimeout(() => { // On android, if the field was disabled and then reenabled, it won't focus without a timeout
        if (mainFieldRef?.current) {
          mainFieldRef.current.focus()
        }
      }, 10)
    } else if ((qso?.uuid !== loggingState?.selectedUUID) || !qso) {
      let nextQSO
      const otherStateChanges = {}

      if (loggingState?.suggestedQSO) {
        nextQSO = prepareSuggestedQSO(loggingState?.suggestedQSO, qsos, operation, vfo, settings)
        otherStateChanges.suggestedQSO = undefined
      } else {
        nextQSO = qsos.find(q => q.uuid === loggingState?.selectedUUID)
        if (nextQSO) nextQSO = prepareExistingQSO(nextQSO)
        else nextQSO = prepareNewQSO(operation, qsos, settings)
      }

      if (qso?._isNew && !qso?._isSuggested) {
        otherStateChanges.qsoQueue = [...loggingState?.qsoQueue || [], qso]
      }

      setQSO(nextQSO, { otherStateChanges })

      setTimeout(() => { // On android, if the field was disabled and then reenabled, it won't focus without a timeout
        if (mainFieldRef?.current) {
          mainFieldRef.current.focus()
        }
      }, 10)
    }
  }, [loggingState?.selectedUUID, loggingState?.suggestedQSO, loggingState.qsoQueue, operation, settings, qso, vfo, qsos, setQSO])

  useEffect(() => { // Validate and analize the callsign
    let call = qso?.their?.call ?? ''
    if (call.indexOf(',') >= 0) {
      const calls = call = call.split(',')
      call = calls[calls.length - 1].trim()
    }

    const callInfo = parseCallsign(call)

    if (callInfo?.baseCall || call.indexOf('?') >= 0) {
      setIsValidQSO(true)
    } else {
      setIsValidQSO(false)
    }
  }, [qso?.their?.call])

  const [commandInfo, setCommandInfo] = useState()

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
      const commandDescription = checkAndDescribeCommands(value, { qso, originalQSO: loggingState?.originalQSO, operation, vfo, qsos, dispatch, settings, online, ourInfo })
      setCommandInfo({ message: commandDescription || undefined, match: !!commandDescription || commandDescription === '' })

      let guess = parseCallsign(value)
      if (guess?.baseCall) {
        annotateFromCountryFile(guess)
      } else if (value) {
        guess = annotateFromCountryFile({ prefix: value, baseCall: value })
      }
      updateQSO({ their: { call: value, guess } })
    } else if (fieldId === 'theirSent') {
      updateQSO({ their: { sent: value } })
    } else if (fieldId === 'ourSent') {
      updateQSO({ our: { sent: value } })
    } else if (fieldId === 'notes') {
      updateQSO({ notes: value })
    } else if (fieldId === 'freq') {
      const freq = value ? parseFreqInMHz(value) : undefined
      const band = freq ? bandForFrequency(freq) : undefined
      const mode = freq ? (modeForFrequency(freq, ourInfo) ?? qso?.mode ?? vfo?.mode ?? 'SSB') : qso?.mode
      updateQSO({ freq, band, mode })
      if (qso?._isNew) dispatch(setVFO({ band, freq, mode }))
    } else if (fieldId === 'band') {
      updateQSO({ band: value, freq: undefined })
      if (qso?._isNew) dispatch(setVFO({ band: value, freq: undefined }))
    } else if (fieldId === 'mode') {
      updateQSO({ mode: value })
      if (qso?._isNew) dispatch(setVFO({ mode: value }))
    } else if (fieldId === 'time' || fieldId === 'date') {
      updateQSO({ startAtMillis: value, _manualTime: true })
    } else if (fieldId === 'state') {
      updateQSO({ their: { state: value } })
    } else if (fieldId === 'power') {
      updateQSO({ power: value })
      if (qso?._isNew) dispatch(setVFO({ power: value }))
    }
  }, [qso, loggingState?.originalQSO, operation, vfo, qsos, dispatch, settings, online, ourInfo, updateQSO])

  const handleSubmit = useCallback(() => { // Save the QSO, or create a new one
    if (DEBUG) logTimer('submit', 'handleSubmit start', { reset: true })
    // Ensure the focused component has a chance to update values
    //   NOTE: This is a hack that can break on newer versions of React Native
    const component = focusedRef?.current?._internalFiberInstanceHandleDEV
    component?.memoizedProps?.onBlur()

    setTimeout(async () => { // Run inside a setTimeout to allow the state to update
      // First, try to process any commands
      const command = qso?.their?.call
      const commandResult = checkAndProcessCommands(command, { qso, originalQSO: loggingState?.originalQSO, operation, vfo, qsos, dispatch, settings, online, ourInfo, updateQSO, updateLoggingState, handleFieldChange, handleSubmit })
      if (commandResult) {
        trackEvent('command', { command })
        setCommandInfo({ message: commandResult || undefined, match: undefined })
        setTimeout(() => {
          setCommandInfo({ message: undefined, match: undefined })
        }, 3000)
        return
      }

      let eventName = 'edit_qso'
      if (qso?._willBeDeleted) eventName = 'delete_qso'
      else if (qso?._isNew) eventName = 'add_qso'
      else if (qso?._willBeDeleted === false && qso?.deleted === false) eventName = 'undelete_qso'

      if (qso._willBeDeleted) {
        delete qso._willBeDeleted
        qso.deleted = true
        dispatch(addQSO({ uuid: operation.uuid, qso }))
        updateLoggingState({
          qso: undefined,
          selectedUUID: undefined,
          lastUUID: qso.uuid,
          originalQSO: undefined,
          hasChanges: false,
          undoInfo: undefined
        })
        trackEvent(eventName, { their_prefix: qso.their.entityPrefix ?? qso.their.guess.entityPrefix, refs: (qso.refs || []).map(r => r.type).join(',') })
      } else if (isValidQSO && !qso.deleted) {
        setCurrentSecondaryControl(undefined)

        if (qso?._isNew && qso?._manualTime && qso.startAtMillis) {
          let nextManualTime = qso.startAtMillis + (60 * 1000)
          if (qsos.length > 0) {
            const diff = Math.abs(qso.startAtMillis - qsos[qsos.length - 1].startAtMillis)
            if (diff >= 1000) {
              nextManualTime = qso.startAtMillis + Math.min(diff, 60 * 5000)
            }
          }
          // No need to await this one, can happen in parallel
          dispatch(setOperationData({ uuid: operation.uuid, _nextManualTime: nextManualTime }))
        }

        delete qso._isNew
        delete qso._willBeDeleted
        delete qso.deleted

        qso.freq = qso.freq ?? vfo.freq
        if (qso.freq) {
          qso.band = bandForFrequency(qso.freq)
        } else {
          qso.band = qso.band ?? vfo.band
        }
        qso.mode = qso.mode ?? vfo.mode

        if (!qso.startAtMillis) qso.startAtMillis = (new Date()).getTime()
        qso.startAt = new Date(qso.startAtMillis).toISOString()
        if (qso.endAtMillis) qso.endAt = new Date(qso.endAtMillis).toISOString()
        qso.our = qso.our || {}
        qso.our.call = qso.our.call || ourInfo?.call
        qso.our.operatorCall = qso.our.operatorCall || operation.operatorCall
        qso.our.sent = qso.our.sent || defaultRSTForMode(qso.mode)

        qso.their = qso.their || {}
        qso.their.sent = qso.their.sent || defaultRSTForMode(qso.mode)

        let call = qso?.their?.call
        let lastUUID

        const calls = call = call.split(',')
        const multiQSOs = []
        for (let i = 0; i < calls.length; i++) {
          let oneQSO = qso
          if (calls.length > 1) { // If this is a multi-call QSO, we need to clone and annotate the QSO for each call
            oneQSO = cloneDeep(qso)
            if (i > 0) oneQSO.uuid = null
            oneQSO.their.call = calls[i].trim()
            oneQSO.their.guess = {}
            oneQSO.their.lookup = {}
            oneQSO = await annotateQSO({ qso: oneQSO, online, settings, dispatch })
          }
          multiQSOs.push(oneQSO)

          trackEvent(eventName, { their_prefix: oneQSO.their.entityPrefix ?? oneQSO.their.guess.entityPrefix, refs: (oneQSO.refs || []).map(r => r.type).join(',') })

          lastUUID = oneQSO.uuid
        }
        dispatch(addQSOs({ uuid: operation.uuid, qsos: multiQSOs }))
        if (DEBUG) logTimer('submit', 'handleSubmit added QSOs')

        setQSO(undefined, { otherStateChanges: { lastUUID } }) // Let queue management decide what to do
        if (DEBUG) logTimer('submit', 'handleSubmit after setQSO')
      }
      if (DEBUG) logTimer('submit', 'handleSubmit 3')
    }, 10)
    if (DEBUG) logTimer('submit', 'handleSubmit 4')
  }, [
    qso, qsos, vfo, setQSO, loggingState?.originalQSO, operation, settings, online, ourInfo,
    handleFieldChange, isValidQSO, dispatch, updateQSO, updateLoggingState, setCurrentSecondaryControl
  ])

  const handleWipe = useCallback(() => { // Wipe a new QSO
    if (qso?._isNew) {
      if (qso?._isSuggested) {
        setQSO(undefined)
      } else {
        setQSO(undefined, { otherStateChanges: { undoInfo: { qso } } })
      }
      const timeout = setTimeout(() => updateLoggingState({ undoInfo: undefined }), 10 * 1000) // Undo will clear after 10 seconds
      return () => clearTimeout(timeout)
    }
  }, [qso, setQSO, updateLoggingState])

  const handleUnwipe = useCallback(() => { // Undo wiping a new QSO
    if (loggingState?.undoInfo) {
      setQSO(loggingState?.undoInfo.qso, { otherStateChanges: { undoInfo: undefined, hasChanges: true } })
    }
  }, [loggingState?.undoInfo, setQSO])

  const handleDelete = useCallback(() => { // Delete an existing QSO
    if (!qso?._isNew) {
      updateQSO({ _willBeDeleted: true }, { otherStateChanges: { undoInfo: { qso } } })
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
              vfo={vfo}
              settings={settings}
              navigation={navigation}
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

            <View style={[styles.infoPanel.container, { flexDirection: settings.leftieMode ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1, [settings.leftieMode ? 'paddingRight' : 'paddingLeft']: styles.oneSpace }}>
                {qso?.deleted || qso?._willBeDeleted ? (
                  <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: styles.normalFontSize, color: styles.theme.colors.error }}>
                      {qso?.deleted ? 'Deleted QSO' : 'QSO will be deleted!'}
                    </Text>
                  </View>
                ) : (
                  !commandInfo?.message && qso?.their?.call?.length > 2 ? (
                    <CallInfo
                      qso={qso}
                      qsos={activeQSOs}
                      sections={sections}
                      operation={operation}
                      vfo={vfo}
                      settings={settings}
                      styles={styles}
                      themeColor={themeColor}
                      updateQSO={updateQSO}
                    />
                  ) : (
                    <OpInfo
                      message={commandInfo?.message || operationError}
                      operation={operation}
                      vfo={vfo}
                      styles={styles}
                      settings={settings}
                      qsos={activeQSOs}
                      themeColor={themeColor}
                    />
                  )
                )}
              </View>
              <View style={styles.infoPanel.buttonContainer}>
                {qso?._isNew ? (
                  loggingState?.undoInfo ? (
                    <IconButton
                      icon={'undo'}
                      accessibilityLabel="Undo"
                      size={styles.infoPanel.button.size}
                      iconColor={styles.infoPanel.button.color}
                      onPress={handleUnwipe}
                    />
                  ) : (
                    <IconButton
                      icon={'backspace-outline'}
                      accessibilityLabel="Erase"
                      size={styles.infoPanel.button.size}
                      iconColor={styles.infoPanel.button.color}
                      disabled={!loggingState?.hasChanges}
                      onPress={handleWipe}
                    />
                  )
                ) : (
                  (qso?.deleted || qso?._willBeDeleted || loggingState?.undoInfo) ? (
                    <IconButton
                      icon={'undo'}
                      accessibilityLabel="Undo"
                      size={styles.infoPanel.button.size}
                      iconColor={styles.infoPanel.button.color}
                      onPress={loggingState?.undoInfo ? handleUnwipe : handleUndelete}
                    />
                  ) : (
                    <IconButton
                      icon={'trash-can-outline'}
                      accessibilityLabel="Delete"
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
        <View style={{ flexDirection: settings.leftieMode ? 'row-reverse' : 'row', alignItems: 'center', justifyItems: 'center', paddingVertical: styles.halfSpace, ...keyboardExtraStyles }}>
          <MainExchangePanel
            style={{ flex: 1, [settings.leftieMode ? 'paddingRight' : 'paddingLeft']: styles.oneSpace }}
            qso={qso}
            operation={operation}
            vfo={vfo}
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
          <View style={{ flex: 0, justifyContent: 'center', alignItems: 'center', [settings.leftieMode ? 'paddingRight' : 'paddingLeft']: styles.halfSpace }}>
            <IconButton
              icon={qso?._isNew ? 'upload' : (qso?._willBeDeleted ? 'trash-can' : 'content-save')}
              accessibilityLabel={qso?._isNew ? 'Add QSO' : 'Save QSO'}
              size={styles.oneSpace * 4}
              mode="contained"
              disabled={!((isValidQSO && isValidOperation) || commandInfo?.match)}
              containerColor={styles.theme.colors[`${themeColor}ContainerVariant`]}
              iconColor={styles.theme.colors[`on${upcasedThemeColor}`]}
              onPress={handleSubmit}
            />
          </View>
        </View>

        {isKeyboardVisible && settings.showNumbersRow && (
          <NumberKeys settings={settings} themeColor={themeColor} onNumberKeyPressed={handleNumberKey} enabled={!!focusedRef?.current} />
        )}
      </SafeAreaView>
    </View>
  )
}

export function defaultRSTForMode (mode) {
  if (mode === 'CW' || mode === 'RTTY') return '599'
  if (mode === 'FT8' || mode === 'FT4') return '+0'
  return '59'
}

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

function prepareNewQSO (operation, qsos, vfo, settings) {
  const qso = {
    uuid: UUID.v1(),
    band: vfo.band,
    freq: vfo.freq,
    mode: vfo.mode,
    power: vfo.power,
    _isNew: true
  }
  if (operation._nextManualTime) {
    qso.startAtMillis = operation._nextManualTime
    qso._manualTime = true
  }

  const activityHooks = findHooks('activity')
  activityHooks.forEach(activity => {
    if (activity.prepareNewQSO) {
      activity.prepareNewQSO({ qso, qsos, operation, vfo, settings })
    }
  })

  return qso
}

function prepareExistingQSO (qso) {
  const clone = cloneDeep(qso || {})
  clone._isNew = false

  return clone
}

function prepareSuggestedQSO (qso, qsos, operation, vfo, settings) {
  const clone = cloneDeep(qso || {})
  clone._isNew = true
  clone._isSuggested = true
  clone.uuid = UUID.v1()

  if (clone.freq) {
    clone.band = bandForFrequency(clone.freq)
    if (!clone.mode) {
      clone.mode = modeForFrequency(clone.freq)
    }
  }

  if (vfo.power) {
    clone.power = vfo.power
  }

  const activityHooks = findHooks('activity')
  activityHooks.forEach(activity => {
    if (activity.prepareNewQSO) {
      activity.prepareNewQSO({ qso, qsos, operation, vfo, settings })
    }
  })

  return clone
}
