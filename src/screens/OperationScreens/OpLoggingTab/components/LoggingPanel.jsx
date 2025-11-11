/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { View } from 'react-native'
import { IconButton, Text } from 'react-native-paper'
import cloneDeep from 'clone-deep'
import { useDispatch } from 'react-redux'
import { SafeAreaView } from 'react-native-safe-area-context'
import UUID from 'react-native-uuid'
import { useNavigation } from '@react-navigation/native'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'

import { setOperationLocalData } from '../../../../store/operations'
import { useUIState } from '../../../../store/ui'
import { addQSO, addQSOs } from '../../../../store/qsos'
import { setVFO } from '../../../../store/station/stationSlice'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { parseFreqInMHz } from '../../../../tools/frequencyFormats'
import { logTimer } from '../../../../tools/perfTools'
import { joinAnd } from '../../../../tools/joinAnd'
import { checkAndDescribeCommands, checkAndProcessCommands } from '../../../../extensions/commands/commandHandling'
import { useKeyboardVisible } from '../../../components/useKeyboardVisible'
import { findHooks } from '../../../../extensions/registry'
import { trackEvent } from '../../../../distro'
import { expandRSTValues, parseStackedCalls } from '../../../../tools/callsignTools'

import { SecondaryExchangePanel } from './LoggingPanel/SecondaryExchangePanel'
import { NumberKeys } from './LoggingPanel/NumberKeys'
import { CallInfo } from './LoggingPanel/CallInfo'
import { OpInfo } from './LoggingPanel/OpInfo'
import { EventInfo } from './LoggingPanel/EventInfo'
import { MainExchangePanel } from './LoggingPanel/MainExchangePanel'
import { annotateQSO, resetCallLookupCache } from './LoggingPanel/useCallLookup'
import EventEditingPanel from './LoggingPanel/EventEditingPanel/EventEditingPanel'

const DEBUG = false

let commandInfoTimeout
let submitTimeout

export default function LoggingPanel ({
  style, operation, vfo, qsos, sections, activeQSOs, settings, online, ourInfo, splitView
}) {
  const navigation = useNavigation()
  const [loggingState, setLoggingState, updateLoggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  const [allowSpacesInCallField, setAllowSpacesInCallField] = useState(false)

  const [qso, setQSO, updateQSO] = useMemo(() => {
    const qsoValue = loggingState?.qso
    const setQSOFunction = (newQSO, more) => {
      setLoggingState({
        ...loggingState,
        qso: newQSO,
        selectedUUID: newQSO?.uuid,
        originalQSO: cloneDeep(newQSO),
        hasChanges: !!qsoValue?._isSuggested,
        infoMessage: undefined,
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
  const { isKeyboardVisible, keyboardExtraStyles } = useKeyboardVisible()

  const styles = useThemedStyles(prepareStyles, { style, themeColor, leftieMode: settings.leftieMode, isKeyboardVisible, keyboardExtraStyles })

  const dispatch = useDispatch()

  const mainFieldRef = useRef()

  const [currentSecondaryControl, reallySetCurrentSecondaryControl] = useState({})
  const setCurrentSecondaryControl = useCallback((control) => {
    if (control === currentSecondaryControl) {
      control = undefined
    }
    mainFieldRef.current?.focus()
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

      if (loggingState.callStack) {
        otherStateChanges.callStack = undefined
        nextQSO.their = nextQSO.their || {}
        nextQSO.their.call = loggingState.callStack
      }

      setQSO(nextQSO, { otherStateChanges })
      dispatch(resetCallLookupCache())
      setTimeout(() => { // On android, if the field was disabled and then reenabled, it won't focus without a timeout
        mainFieldRef?.current?.focus()
      }, 100)
    } else if ((qso?.uuid !== loggingState?.selectedUUID) || !qso) {
      let nextQSO
      const otherStateChanges = { undoInfo: undefined }

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
        mainFieldRef?.current?.focus()
      }, 100)
    }
  }, [loggingState?.selectedUUID, loggingState?.suggestedQSO, loggingState.qsoQueue, operation, settings, qso, vfo, qsos, setQSO, dispatch, loggingState.callStack])

  useEffect(() => { // Validate and analize the callsign
    const { call } = parseStackedCalls(qso?.their?.call ?? '')

    const callInfo = parseCallsign(call)

    if (qso?.event) {
      setIsValidQSO(true)
    } else if (callInfo?.baseCall || call.indexOf('?') >= 0) {
      setIsValidQSO(true)
    } else {
      setIsValidQSO(false)
    }
  }, [qso?.their?.call, qso?.event])

  const [commandInfo, actualSetCommandInfo] = useState()
  const setCommandInfo = useCallback((info) => {
    if (commandInfoTimeout) {
      clearTimeout(commandInfoTimeout)
    }
    if (info?.timeout) {
      commandInfoTimeout = setTimeout(() => {
        actualSetCommandInfo(undefined)
      }, info.timeout)
    }
    actualSetCommandInfo(info)
  }, [actualSetCommandInfo])

  const handleFieldChange = useCallback((event) => { // Handle form fields and update QSO info
    const { fieldId, alsoClearTheirCall } = event
    const value = event?.value || event?.nativeEvent?.text

    if (qso?.deleted || qso?._willBeDeleted) {
      return
    }

    if (alsoClearTheirCall && fieldId !== 'theirCall') { // This is used by command-handling to reset the call entry when a command was processed
      qso.their.call = ''
      setAllowSpacesInCallField(false)
    }

    if (fieldId === 'theirCall') {
      const { description, allowSpaces, matchingCommand } = checkAndDescribeCommands(value, { qso, originalQSO: loggingState?.originalQSO, operation, vfo, qsos, dispatch, settings, online, ourInfo, setCommandInfo })
      setCommandInfo({ message: description || undefined, matchingCommand, match: !!matchingCommand })
      setAllowSpacesInCallField(allowSpaces)

      let guess = parseCallsign(value)
      if (guess?.baseCall) {
        annotateFromCountryFile(guess)
      } else if (value) {
        guess = annotateFromCountryFile({ prefix: value, baseCall: value })
      }
      updateQSO({ their: { call: value, guess, lookup: undefined }, qsl: undefined })
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
    } else if (fieldId === 'eventNote') {
      updateQSO({ event: { note: value } })
    } else if (fieldId === 'eventDone') {
      updateQSO({ event: { done: value } })
    }
  }, [qso, loggingState?.originalQSO, operation, vfo, qsos, dispatch, settings, online, ourInfo, setCommandInfo, updateQSO])

  // Since our fields and logic often perform some async work,
  // we need to wait a few milliseconds before submitting to ensure all async work is complete.
  // But we can't just use a timeout, because we need the function to bind to the latest values.
  // So we use a state variable and a callback function to set it and an effect to actually submit..
  const [doSubmit, setDoSubmit] = useState(false)

  const handleSubmit = useCallback(() => { //
    if (submitTimeout) clearTimeout(submitTimeout)

    submitTimeout = setTimeout(() => {
      setDoSubmit(true)
    }, 50)
  }, [setDoSubmit])

  useEffect(() => { // Actually perform the submission: saving the QSO, or creating a new one
    if (!doSubmit) return

    setDoSubmit(false)

    if (DEBUG) logTimer('submit', 'handleSubmit start', { reset: true })

    setTimeout(async () => { // Run inside a setTimeout to allow for async functions
      // First, try to process any commands, but only if we're not editing an event
      if (!qso.event) {
        const command = qso?.their?.call
        const commandResult = checkAndProcessCommands(command, { qso, originalQSO: loggingState?.originalQSO, operation, vfo, qsos, dispatch, settings, online, ourInfo, updateQSO, updateLoggingState, handleFieldChange, handleSubmit, setCommandInfo })
        if (commandResult) {
          trackEvent('command', { command })
          setCommandInfo({ message: commandResult || undefined, match: undefined, timeout: 3000 })
          return
        }
      }

      let eventName = 'edit_qso'
      if (qso?._willBeDeleted) eventName = 'delete_qso'
      else if (qso?._isNew) eventName = 'add_qso'
      else if (qso?._willBeDeleted === false && qso?.deleted === false) eventName = 'undelete_qso'

      if (qso._willBeDeleted !== undefined) {
        qso.deleted = qso._willBeDeleted
        delete qso._willBeDeleted
        dispatch(addQSO({ uuid: operation.uuid, qso }))
        updateLoggingState({
          qso: undefined,
          selectedUUID: undefined,
          lastUUID: qso.uuid,
          originalQSO: undefined,
          hasChanges: false,
          undoInfo: undefined
        })
        trackEvent(eventName, { their_prefix: qso.their?.entityPrefix ?? qso.their?.guess?.entityPrefix, refs: (qso.refs || []).map(r => r.type).join(',') })
      } else if (qso.event && !qso.deleted) {
        // Events are just saved as-is, no extra processing needed.
        setTimeout(() => {
          dispatch(addQSOs({ uuid: operation.uuid, qsos: [qso] }))
          setQSO(undefined, { otherStateChanges: { lastUUID: qso.uuid } })
        }, 50)
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
          dispatch(setOperationLocalData({ uuid: operation.uuid, _nextManualTime: nextManualTime }))
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
        qso.our.operatorCall = qso.our.operatorCall || operation.local?.operatorCall
        qso.our.sent = expandRSTValues(qso.our.sent, qso.mode)

        qso.their = qso.their || {}
        qso.their.sent = expandRSTValues(qso.their.sent, qso.mode)
        let lastUUID

        const { call, allCalls, callStack } = parseStackedCalls(qso?.their?.call ?? '')
        const multiQSOs = []
        for (let i = 0; i < allCalls.length; i++) {
          let oneQSO = qso
          qso.their.call = call
          if (allCalls.length > 1) { // If this is a multi-call QSO, we need to clone and annotate the QSO for each call
            oneQSO = cloneDeep(qso)
            if (i > 0) oneQSO.uuid = null
            oneQSO.their.call = allCalls[i]?.trim()
            oneQSO.their.guess = {}
            oneQSO.their.lookup = {}
            oneQSO = await annotateQSO({ qso: oneQSO, online: false, settings, dispatch })
            oneQSO._needsLookup = true
          }
          multiQSOs.push(oneQSO)

          trackEvent(eventName, { their_prefix: oneQSO.their?.entityPrefix ?? oneQSO.their?.guess?.entityPrefix, refs: (oneQSO.refs || []).map(r => r.type).join(',') })

          lastUUID = oneQSO.uuid
        }

        const activities = findHooks('activity').filter(activity => activity.processQSOBeforeSaveWithDispatch || activity.processQSOBeforeSave)
        for (const activity of activities) {
          for (const q of multiQSOs) {
            if (activity.processQSOBeforeSaveWithDispatch) {
              await activity.processQSOBeforeSaveWithDispatch({ qso: q, operation, qsos, vfo, settings, dispatch })
            } else {
              activity.processQSOBeforeSave({ qso: q, operation, qsos, vfo, settings })
            }
          }
        }

        setTimeout(() => {
          // Add the QSO to the operation, and set a new QSO
          // But leave enough time for blur effects to take place before being overwritten by the new setQSO
          // Just 10ms did not seemed to be enough in tests, but 50ms is fine.

          dispatch(addQSOs({ uuid: operation.uuid, qsos: multiQSOs }))
          if (DEBUG) logTimer('submit', 'handleSubmit added QSOs')

          // Let queue management decide what to do next
          setQSO(undefined, { otherStateChanges: { lastUUID, callStack } })
        }, 50)

        if (DEBUG) logTimer('submit', 'handleSubmit after setQSO')
      }
      if (DEBUG) logTimer('submit', 'handleSubmit 3')
    }, 0)
    if (DEBUG) logTimer('submit', 'handleSubmit 4')
  }, [
    qso, loggingState?.originalQSO, operation, vfo, qsos, dispatch, settings, online, ourInfo,
    updateQSO, updateLoggingState, handleFieldChange, isValidQSO,
    setCommandInfo, setCurrentSecondaryControl, setQSO, doSubmit, handleSubmit
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
    focusedRef.current?.onNumberKey(number)
  }, [focusedRef])

  const opMessage = useMemo(() => {
    if (operationError) return { text: operationError, icon: 'alert-circle', hideCallInfo: true }
    if (loggingState.infoMessage) return { text: loggingState.infoMessage, icon: 'information', hideCallInfo: false }
    if (commandInfo?.message) return { text: `**${commandInfo.message}**`, icon: 'chevron-right-box', hideCallInfo: true }
    return undefined
  }, [operationError, commandInfo?.message, loggingState.infoMessage])

  const disableSubmit = useMemo(() => {
    return !((isValidQSO && isValidOperation) || commandInfo?.matchingCommand)
  }, [isValidQSO, isValidOperation, commandInfo?.matchingCommand])

  return (
    <View style={styles.root}>
      <SafeAreaView edges={[isKeyboardVisible ? '' : 'bottom', 'left', splitView ? '' : 'right'].filter(x => x)}>

        <View style={styles.innerContainer}>
          <SecondaryExchangePanel
            style={styles.secondary.container}
            styles={styles}
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
            themeColor={themeColor}
            currentSecondaryControl={currentSecondaryControl}
            setCurrentSecondaryControl={setCurrentSecondaryControl}
          />

          <View style={styles.primary.container}>

            <View style={styles.panels.container}>

              <PanelSelector
                styles={styles}
                themeColor={themeColor}
                opMessage={opMessage}
                qso={qso}
                qsos={qsos}
                operation={operation}
                activeQSOs={activeQSOs}
                sections={sections}
                vfo={vfo}
                settings={settings}
                updateQSO={updateQSO}
              />

              {qso?.event ? (
                <EventEditingPanel
                  qso={qso}
                  qsos={qsos}
                  operation={operation}
                  vfo={vfo}
                  settings={settings}
                  styles={styles}
                  themeColor={themeColor}
                  onSubmitEditing={handleSubmit}
                  handleFieldChange={handleFieldChange}
                  setQSO={setQSO}
                  updateQSO={updateQSO}
                  mainFieldRef={mainFieldRef}
                  focusedRef={focusedRef}
                />
              ) : (
                <MainExchangePanel
                  style={{ flex: 1, [settings.leftieMode ? 'paddingRight' : 'paddingLeft']: styles.oneSpace }}
                  qso={qso}
                  qsos={qsos}
                  operation={operation}
                  vfo={vfo}
                  settings={settings}
                  disabled={qso?.deleted || qso?._willBeDeleted || qso?.event}
                  styles={styles}
                  themeColor={themeColor}
                  onSubmitEditing={handleSubmit}
                  handleFieldChange={handleFieldChange}
                  setQSO={setQSO}
                  updateQSO={updateQSO}
                  mainFieldRef={mainFieldRef}
                  focusedRef={focusedRef}
                  allowSpacesInCallField={allowSpacesInCallField}
                />
              )}
            </View>

            <View style={styles.actions.container}>

              {qso?._isNew ? (
                loggingState?.undoInfo ? (
                  <IconButton
                    icon={'undo'}
                    accessibilityLabel="Undo"
                    onPress={handleUnwipe}
                    size={styles.actions.button.size}
                    mode={styles.actions.button.mode}
                    iconColor={styles.actions.button.color}
                    containerColor={styles.actions.button.backgroundColor}
                  />
                ) : (
                  <IconButton
                    icon={'backspace-outline'}
                    accessibilityLabel="Erase"
                    onPress={handleWipe}
                    disabled={!loggingState?.hasChanges}
                    size={styles.actions.button.size}
                    mode={styles.actions.button.mode}
                    iconColor={styles.actions.button.color}
                    containerColor={styles.actions.button.backgroundColor}
                  />
                )
              ) : (
                (qso?.deleted || qso?._willBeDeleted || loggingState?.undoInfo) ? (
                  <IconButton
                    icon={loggingState.undoInfo ? 'undo' : 'delete-restore'}
                    accessibilityLabel="Undo"
                    size={styles.actions.button.size}
                    mode={styles.actions.button.mode}
                    iconColor={styles.actions.button.color}
                    containerColor={styles.actions.button.backgroundColor}
                    onPress={loggingState?.undoInfo ? handleUnwipe : handleUndelete}
                  />
                ) : (
                  <IconButton
                    icon={'trash-can-outline'}
                    accessibilityLabel="Delete"
                    onPress={handleDelete}
                    disabled={false}
                    size={styles.actions.button.size}
                    mode={styles.actions.button.mode}
                    iconColor={styles.actions.button.color}
                    containerColor={styles.actions.button.backgroundColor}
                  />
                )
              )}

              <IconButton
                icon={qso?._isNew ? 'upload' : (qso?._willBeDeleted ? 'trash-can' : 'content-save')}
                accessibilityLabel={qso?._isNew ? 'Add QSO' : 'Save QSO'}
                onPress={handleSubmit}
                disabled={disableSubmit}
                size={styles.actions.importantButton.size}
                mode={styles.actions.importantButton.mode}
                theme={styles.actions.importantButton.theme}
              />
            </View>
          </View>
        </View>

        {isKeyboardVisible && settings.showNumbersRow && (
          <NumberKeys settings={settings} themeColor={themeColor} onNumberKeyPressed={handleNumberKey} enabled={!!focusedRef?.current} />
        )}
      </SafeAreaView>
    </View>
  )
}

function prepareStyles (themeStyles, { style, themeColor, leftieMode, isKeyboardVisible, keyboardExtraStyles }) {
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  const panelSize = themeStyles.oneSpace * 6
  const buttonSize = themeStyles.oneSpace * 4

  const leftieRightieDirection = leftieMode ? 'row-reverse' : 'row'

  return {
    ...themeStyles,
    panelSize,
    themeColor,
    upcasedThemeColor,
    root: {
      borderTopColor: themeStyles.theme.colors[`${themeColor}Light`],
      borderTopWidth: 3,
      backgroundColor: themeStyles.theme.colors[`${themeColor}Container`],
      ...style
    },
    input: {
      backgroundColor: themeStyles.theme.colors.background,
      color: themeStyles.theme.colors.onBackground
      // paddingRight: themeStyles.oneSpace
    },
    innerContainer: {
      flexDirection: 'column',
      minHeight: panelSize * 3,
      alignItems: 'stretch',
      ...keyboardExtraStyles
    },
    secondary: { // Top section with row of secondary controls
      container: {
      }
    },
    primary: { // Bottom section with panels and fields and actions
      container: {
        flexDirection: leftieRightieDirection,
        // [leftieMode ? 'paddingRight' : 'paddingLeft']: themeStyles.oneSpace,
        paddingLeft: themeStyles.oneSpace,
        paddingRight: themeStyles.oneSpace,
        paddingBottom: themeStyles.oneSpace,
        gap: themeStyles.oneSpace
      }
    },
    panels: {
      container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignSelf: 'flex-end'
      }
    },
    actions: {
      container: {
        flex: 0,
        minWidth: panelSize,
        justifyContent: 'flex-end',
        alignSelf: 'flex-end'
        // marginTop: themeStyles.oneSpace * 2

      },
      button: {
        size: buttonSize,
        mode: 'default',
        color: themeStyles.theme.colors[themeColor],
        backgroundColor: themeStyles.theme.colors[`${themeColor}Container`]
      },
      importantButton: {
        size: buttonSize,
        mode: 'contained',
        color: 'red', // themeStyles.theme.colors[`on${upcasedThemeColor}`],
        disabledColor: 'blue', // themeStyles.theme.colors.onSurfaceDisabled,
        backgroundColor: themeStyles.theme.colors[`${themeColor}ContainerVariant`],
        theme: {
          colors: {
            // selected
            onPrimary: themeStyles.theme.colors['{themeColor}Lighter'],
            // unselected
            primary: themeStyles.theme.colors[`on${upcasedThemeColor}`],
            surfaceVariant: themeStyles.theme.colors[themeColor],
            // disabled
            onSurfaceDisabled: themeStyles.theme.colors.onSurfaceDisabled,
            surfaceDisabled: themeStyles.theme.colors.surfaceDisabled
          }
        }
      }
    },

    callInfoPanel: {
      container: {
        // flex: 1,
        flexDirection: 'column',
        minHeight: panelSize * 1.2,
        paddingBottom: themeStyles.halfSpace
      }
    },

    opInfoPanel: {
      container: {
        // flex: 1,
        flexDirection: 'column',
        minHeight: panelSize * 1.2,
        paddingBottom: themeStyles.halfSpace
      }
    },

    eventInfoPanel: {
      container: {
        // flex: 1,
        flexDirection: 'column',
        paddingBottom: themeStyles.halfSpace
      }
    },

    mainExchangePanel: {
      container: {
        height: panelSize * 1.2,
        minHeight: panelSize * 1.2,
        maxHeight: panelSize * 1.2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        gap: themeStyles.oneSpace
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
        minHeight: panelSize,
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
    uuid: UUID.v4(),
    band: vfo.band,
    freq: vfo.freq,
    mode: vfo.mode,
    power: vfo.power,
    _isNew: true
  }
  if (operation.local?._nextManualTime) {
    qso.startAtMillis = operation.local?._nextManualTime
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
  clone.uuid = UUID.v4()

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

const PanelSelector = ({ qso, opMessage, styles, ...props }) => {
  if (qso?.deleted || qso?._willBeDeleted) {
    return (
      <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <Text style={{ fontWeight: 'bold', fontSize: styles.normalFontSize, color: styles.theme.colors.error }}>
          {qso?.deleted ? 'Deleted QSO' : 'QSO will be deleted!'}
        </Text>
      </View>
    )
  } else if (qso?.event) {
    return (
      <EventInfo
        qso={qso}
        styles={styles}
        style={styles.eventInfoPanel.container}
        {...props}
      />
    )
  } else if (!opMessage?.hideCallInfo && qso?.their?.call?.length > 2) {
    return (
      <CallInfo
        qso={qso}
        styles={styles}
        style={styles.callInfoPanel.container}
        {...props}
      />
    )
  } else if (opMessage?.text || (qso?.their?.call?.length || 0) <= 2) {
    return (
      <OpInfo
        message={opMessage}
        styles={styles}
        style={styles.opInfoPanel.container}
        {...props}
      />
    )
  } else {
    return null
  }
}
