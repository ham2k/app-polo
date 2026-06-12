/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
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
import { useTranslation } from 'react-i18next'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'
import { joinAnd, parseFreq } from '@ham2k/lib-format-tools'

import { setOperationLocalData } from '../../../../store/operations'
import { addQSO, addQSOs } from '../../../../store/qsos'
import { setVFO } from '../../../../store/station/stationSlice'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { logTimer } from '../../../../tools/perfTools'
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
import { annotateQSO } from './LoggingPanel/useCallLookup'
import EventEditingPanel from './LoggingPanel/EventEditingPanel/EventEditingPanel'
import { manageNextQSO } from './LoggingPanel/loggingFunctions'
import { useUIState } from '../../../../store/ui'

const DEBUG = false

export default function LoggingPanel ({
  style, operation, vfo, qsos, sections, activeQSOs, settings, online, ourInfo, splitView
}) {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const { isKeyboardVisible, keyboardExtraStyles } = useKeyboardVisible()

  const dispatch = useDispatch()

  const [allowSpacesInCallField, setAllowSpacesInCallField] = useState(false)

  const [infoMessage, ,] = useUIState('OpLoggingTab', 'infoMessage')

  const [qso, setQSO, updateQSO] = useUIState('OpLoggingTab', 'qso')
  const [originalQSO, setOriginalQSO] = useUIState('OpLoggingTab', 'originalQSO')
  const [hasChanges, setHasChanges] = useUIState('OpLoggingTab', 'hasChanges')
  const [undoInfo, setUndoInfo] = useState('OpLoggingTab', 'undoInfo')
  const [, setSelectedUUID] = useUIState('OpLoggingTab', 'selectedUUID')
  const [, setLastUUID] = useUIState('OpLoggingTab', 'lastUUID')
  const [, setCallStack] = useUIState('OpLoggingTab', 'callStack')

  const themeColor = useMemo(() => (!qso || qso?._isNew) ? 'tertiary' : 'secondary', [qso])
  const styles = useThemedStyles(prepareStyles, { style, themeColor, leftieMode: settings.leftieMode, isKeyboardVisible, keyboardExtraStyles })

  useEffect(() => {
    if (!qso) {
      dispatch(manageNextQSO({ qsos: operation?.qsos, operation, vfo, settings }))
    }
  }, [qso, dispatch, operation, vfo, settings])

  useEffect(() => {
    if (qso?.uuid && qso?.uuid !== originalQSO?.uuid) {
      setOriginalQSO(cloneDeep(qso))
      setHasChanges(!!qso?._isSuggested)
      setUndoInfo(undefined)
    } else {
      setHasChanges(!!qso?._isSuggested || JSON.stringify(qso) !== JSON.stringify(originalQSO))
    }
  }, [originalQSO, qso, setOriginalQSO, setHasChanges, setUndoInfo])

  const mainFieldRef = useRef()
  const [focusedUUID, setFocusedUUID] = useState()
  useEffect(() => { // If there's a new QSO, focus the main field
    if (qso?.uuid && qso?.uuid !== focusedUUID) {
      mainFieldRef.current?.focus()
      setFocusedUUID(qso?.uuid)
    }
  }, [focusedUUID, qso?.uuid])

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
      return [false,
        t('screens.opLoggingTab.missingInfoError.message', 'ERROR: Please enter **{{errors}}** for a valid operation', {
          errors: joinAnd(errors.map(error => t(`screens.opLoggingTab.missingInfoError.${error}`, error)))
        })
      ]
    } else {
      return [true, undefined]
    }
  }, [qso, operation, vfo, t])

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
  const commandInfoTimeoutRef = useRef()
  const setCommandInfo = useCallback((info) => {
    if (commandInfoTimeoutRef.current) {
      clearTimeout(commandInfoTimeoutRef.current)
    }
    if (info?.timeout) {
      commandInfoTimeoutRef.current = setTimeout(() => {
        actualSetCommandInfo(undefined)
      }, info.timeout)
    }
    actualSetCommandInfo(info)

    return () => {
      if (commandInfoTimeoutRef.current) {
        actualSetCommandInfo(undefined)
        clearTimeout(commandInfoTimeoutRef.current)
      }
    }
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
      const { description, allowSpaces, matchingCommand } = checkAndDescribeCommands(value, { qso, originalQSO, operation, vfo, qsos, dispatch, settings, t, i18n, online, ourInfo, setCommandInfo })
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
      const freq = value ? parseFreq(value) : undefined
      const band = freq ? bandForFrequency(freq) : undefined
      const mode = freq ? (modeForFrequency(freq, ourInfo) ?? qso?.mode ?? vfo?.mode ?? 'SSB') : qso?.mode
      updateQSO({ freq, band, mode })
      if (qso?._isNew) dispatch(setVFO({ band, freq, mode }))
    } else if (fieldId === 'band') {
      updateQSO({ band: value, freq: undefined })
      if (qso?._isNew) dispatch(setVFO({ band: value, freq: undefined }))
    } else if (fieldId === 'mode') {
      const { theirReport, ourReport } = _convertRSTValues({ theirReport: qso?.their?.sent, ourReport: qso?.our?.sent, mode: value, originalMode: qso?.mode }, { settings })
      updateQSO({ mode: value, their: { sent: theirReport ?? qso?.their?.sent }, our: { sent: ourReport ?? qso?.our?.sent } })
      if (qso?._isNew) dispatch(setVFO({ mode: value }))
    } else if (fieldId === 'time' || fieldId === 'date') {
      updateQSO({ startAtMillis: value, _manualTime: true })
    } else if (fieldId === 'grid') {
      const corrected = value.substring(0, 4).toUpperCase() + value.substring(4).toLowerCase()
      updateQSO({ their: { grid: corrected } })
    } else if (fieldId === 'state') {
      updateQSO({ their: { state: value } })
    } else if (fieldId === 'power') {
      updateQSO({ power: value })
      if (qso?._isNew) dispatch(setVFO({ power: value }))
    } else if (fieldId === 'eventNote') {
      updateQSO({ event: { note: value } })
    } else if (fieldId === 'eventData') {
      updateQSO({ event: { data: value } })
    }
  }, [qso, originalQSO, operation, vfo, qsos, dispatch, settings, t, i18n, online, ourInfo, setCommandInfo, updateQSO])

  // Since our fields and logic often perform some async work,
  // we need to wait a few milliseconds before submitting to ensure all async work is complete.
  // But we can't just use a timeout, because we need the function to bind to the latest values.
  // So we use a state variable and a callback function to set it and an effect to actually submit..
  const [doSubmit, setDoSubmit] = useState(false)
  const submitTimeoutRef = useRef()
  const handleSubmit = useCallback(() => { //
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current)
    }

    if (!qso) return

    submitTimeoutRef.current = setTimeout(() => {
      setDoSubmit(true)
    }, 50)
  }, [setDoSubmit, qso])

  useEffect(() => { // Actually perform the submission: saving the QSO, or creating a new one
    if (!doSubmit) return

    setDoSubmit(false)

    if (DEBUG) logTimer('submit', 'handleSubmit start', { reset: true })

    setTimeout(async () => { // Run inside a setTimeout to allow for async functions
      // First, try to process any commands, but only if we're not editing an event
      if (!qso?.event) {
        const command = qso?.their?.call
        const commandResult = checkAndProcessCommands(command, { qso, originalQSO, operation, vfo, qsos, dispatch, settings, t, i18n, online, ourInfo, updateQSO, handleFieldChange, handleSubmit, setCommandInfo })
        if (commandResult) {
          trackEvent('command_executed', { command })
          setCommandInfo({ message: commandResult || undefined, match: undefined, timeout: 3000 })
          return
        }
      }

      let eventName = 'qso_edited'
      if (qso?._willBeDeleted) eventName = 'qso_deleted'
      else if (qso?._isNew) eventName = 'qso_added'
      else if (qso?._willBeDeleted === false && qso?.deleted === false) eventName = 'qso_undeleted'

      if (qso?._willBeDeleted !== undefined) {
        qso.deleted = qso._willBeDeleted
        delete qso._willBeDeleted
        await dispatch(addQSO({ uuid: operation.uuid, qso }))
        await setUndoInfo(undefined)
        await setQSO(undefined)
        trackEvent(eventName, { their_prefix: qso.their?.entityPrefix ?? qso.their?.guess?.entityPrefix, refs: (qso.refs || []).map(r => r.type).join(',') })
      } else if (qso?.event && !qso?.deleted) {
        // Events are just saved as-is, no extra processing needed.
        await setLastUUID(qso.uuid)
        await dispatch(addQSOs({ uuid: operation.uuid, qsos: [qso], operation }))
        await setUndoInfo(undefined)
        await setQSO(undefined)
      } else if (qso && isValidQSO && !qso?.deleted) {
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
        qso.our.sent = expandRSTValues(qso.our.sent, qso.mode, { settings })

        qso.their = qso.their || {}
        qso.their.sent = expandRSTValues(qso.their.sent, qso.mode, { settings })
        let lastUUID

        const { call, allCalls, callStack } = parseStackedCalls(qso?.their?.call ?? '')
        const multiQSOs = []
        for (let i = 0; i < allCalls.length; i++) {
          let oneQSO = qso
          qso.their.call = call
          if (allCalls.length > 1) { // If this is a multi-call QSO, we need to clone and annotate the QSO for each call
            oneQSO = cloneDeep(qso)
            if (i > 0) oneQSO.uuid = UUID.v4()
            oneQSO.their.call = allCalls[i]?.trim()
            oneQSO.their.guess = {}
            oneQSO.their.lookup = {}
            oneQSO = await annotateQSO({ qso: oneQSO, online: false, settings, operation, qsos, dispatch })
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

        setTimeout(async () => {
          // Add the QSO to the operation, and set a new QSO
          // But leave enough time for blur effects to take place before being overwritten by the new setQSO
          // Just 10ms did not seemed to be enough in tests, but 50ms is fine.

          dispatch(addQSOs({ uuid: operation.uuid, qsos: multiQSOs, operation }))
          if (DEBUG) logTimer('submit', 'handleSubmit added QSOs')

          // Let queue management decide what to do next
          setLastUUID(lastUUID)
          setCallStack(callStack)
          setUndoInfo(undefined)
          setQSO(undefined)
        }, 50)

        if (DEBUG) logTimer('submit', 'handleSubmit after setQSO')
      }
      if (DEBUG) logTimer('submit', 'handleSubmit 3')
    }, 0)
    if (DEBUG) logTimer('submit', 'handleSubmit 4')
  }, [qso, operation, vfo, qsos, dispatch, settings, i18n, t, online, ourInfo, updateQSO, handleFieldChange, isValidQSO, setCommandInfo, setCurrentSecondaryControl, doSubmit, handleSubmit, originalQSO, setLastUUID, setCallStack, setQSO])

  const undoTimeoutRef = useRef()

  const handleWipe = useCallback(() => { // Wipe a new QSO
    if (qso?._isNew) {
      if (qso?._isSuggested) {
        setQSO(undefined)
      } else {
        setUndoInfo({ qso, originalQSO })
        setQSO(undefined)
      }
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
      undoTimeoutRef.current = setTimeout(() => {
        setUndoInfo(undefined)
      }, 5 * 1000) // Undo will clear after 5 seconds
      return () => {
        setUndoInfo(undefined)
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
      }
    }
  }, [qso, setQSO, originalQSO])

  const handleUnwipe = useCallback(async () => { // Undo wiping a new QSO
    if (undoInfo) {
      await setQSO(undoInfo.qso)
      await setSelectedUUID(undoInfo.qso?.uuid)
      await setOriginalQSO(undoInfo.originalQSO)
      await setUndoInfo(undefined)
    }
  }, [setOriginalQSO, setQSO, setSelectedUUID, setUndoInfo, undoInfo])

  const handleDelete = useCallback(async () => { // Delete an existing QSO
    if (!qso?._isNew) {
      await updateQSO({ _willBeDeleted: true })
      await setUndoInfo({ qso })
    }
  }, [qso, setUndoInfo, updateQSO])

  const handleUndelete = useCallback(async () => { // Undo changes to existing QSO
    if (qso?.deleted || qso?._willBeDeleted) {
      await updateQSO({ _willBeDeleted: false, deleted: false })
    }
  }, [qso, updateQSO])

  const focusedRef = useRef()

  const handleNumberKey = useCallback((number) => {
    focusedRef.current?.onNumberKey(number)
  }, [focusedRef])

  const opMessage = useMemo(() => {
    if (operationError) return { text: operationError, icon: 'alert-circle', hideCallInfo: true }
    if (infoMessage) return { text: infoMessage, icon: 'information', hideCallInfo: true }
    if (commandInfo?.message) return { text: `**${commandInfo.message}**`, icon: 'chevron-right-box', hideCallInfo: true }
    return undefined
  }, [operationError, infoMessage, commandInfo?.message])

  const disableSubmit = useMemo(() => {
    return !((isValidQSO && isValidOperation) || commandInfo?.match)
  }, [isValidQSO, isValidOperation, commandInfo?.match])

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
                setQSO={setQSO}
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
                  updateQSO={updateQSO}
                  mainFieldRef={mainFieldRef}
                  focusedRef={focusedRef}
                  allowSpacesInCallField={allowSpacesInCallField}
                />
              )}
            </View>

            <View style={styles.actions.container}>

              {qso?._isNew ? (
                undoInfo ? (
                  <IconButton
                    icon={'undo'}
                    accessibilityLabel={t('screens.opLoggingTab.actions.undo-a11y', 'Undo')}
                    onPress={handleUnwipe}
                    size={styles.actions.button.size}
                    mode={styles.actions.button.mode}
                    iconColor={styles.actions.button.color}
                    containerColor={styles.actions.button.backgroundColor}
                  />
                ) : (
                  <IconButton
                    icon={'backspace-outline'}
                    accessibilityLabel={t('screens.opLoggingTab.actions.erase-a11y', 'Erase')}
                    onPress={handleWipe}
                    disabled={!hasChanges}
                    size={styles.actions.button.size}
                    mode={styles.actions.button.mode}
                    iconColor={styles.actions.button.color}
                    containerColor={styles.actions.button.backgroundColor}
                  />
                )
              ) : (
                (qso?.deleted || qso?._willBeDeleted || undoInfo) ? (
                  <IconButton
                    icon={undoInfo ? 'undo' : 'delete-restore'}
                    accessibilityLabel={t('screens.opLoggingTab.actions.undo-a11y', 'Undo')}
                    size={styles.actions.button.size}
                    mode={styles.actions.button.mode}
                    iconColor={styles.actions.button.color}
                    containerColor={styles.actions.button.backgroundColor}
                    onPress={undoInfo ? handleUnwipe : handleUndelete}
                  />
                ) : (
                  <IconButton
                    icon={'trash-can-outline'}
                    accessibilityLabel={t('screens.opLoggingTab.actions.delete-a11y', 'Delete')}
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
                accessibilityLabel={qso?._isNew ? t('screens.opLoggingTab.actions.addQSO-a11y', 'Add QSO') : t('screens.opLoggingTab.actions.saveQSO-a11y', 'Save QSO')}
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
        alignItems: 'center',
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

const PanelSelector = ({ qso, opMessage, styles, setQSO, ...props }) => {
  const { t } = useTranslation()

  if (qso?.deleted || qso?._willBeDeleted) {
    return (
      <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <Text style={{ fontWeight: 'bold', fontSize: styles.normalFontSize, color: styles.theme.colors.error }}>
          {qso?.deleted ? t('screens.opLoggingTab.deletedQSO', 'Deleted QSO') : t('screens.opLoggingTab.qsoWillBeDeleted', 'QSO will be deleted!')}
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
        setQSO={setQSO}
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

const _convertRSTValues = ({ theirReport, ourReport, mode, originalMode }, { settings }) => {
  if ((mode === 'CW' || mode === 'RTTY') && (originalMode === 'SSB' || originalMode === 'USB' || originalMode === 'LSB')) {
    if (theirReport) {
      const [readability, strength, ...extra] = theirReport.split('')
      theirReport = `${readability}${strength}${strength}${extra}`
    }
    if (ourReport) {
      const [readability, strength, ...extra] = ourReport.split('')
      ourReport = `${readability}${strength}${strength}${extra}`
    }
  } else if ((mode === 'SSB' || mode === 'USB' || mode === 'LSB') && (originalMode === 'CW' || mode === 'RTTY')) {
    if (theirReport) {
      // eslint-disable-next-line no-unused-vars
      const [readability, strength, tone, ...extra] = theirReport.split('')
      theirReport = `${readability}${strength}${extra}`
    }
    if (ourReport) {
      // eslint-disable-next-line no-unused-vars
      const [readability, strength, tone, ...extra] = ourReport.split('')
      ourReport = `${readability}${strength}${extra}`
    }
  }
  return { theirReport, ourReport }
}
