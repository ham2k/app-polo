import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Text, View, findNodeHandle } from 'react-native'
import { IconButton } from 'react-native-paper'
import { analyzeFromCountryFile, useBuiltinCountryFile } from '@ham2k/lib-country-files'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

import LoggerChip from '../../components/LoggerChip'

import { fmtTimeZulu } from '../../../../tools/timeFormats'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'

import ThemedTextInput from '../../../components/ThemedTextInput'
import CallsignInput from '../../../components/CallsignInput'
import { parseCallsign } from '@ham2k/lib-callsigns'

// Not actually a react hook, just named like one
// eslint-disable-next-line react-hooks/rules-of-hooks
useBuiltinCountryFile()

function describeRadio (operation) {
  return `${operation.freq ?? '000'} MHz • ${operation.mode ?? 'SSB'} • ${operation.power ?? '?'}W`
}

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
      color: themeStyles.theme.colors.onBackground,
      paddingHorizontal: themeStyles.oneSpace
    }
  }
}

export default function LoggingPanel ({ qso, operation, onLog, themeColor, style }) {
  themeColor = themeColor || 'tertiary'
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  const styles = useThemedStyles((baseStyles) => prepareStyles(baseStyles, themeColor))

  const [theirCall, setTheirCall] = useState()
  const [theirSent, setTheirSent] = useState()
  const [ourSent, setOurSent] = useState()
  const [pausedTime, setPausedTime] = useState()
  const [startOnMillis, setStartOnMillis] = useState()
  const [timeStr, setTimeStr] = useState()
  const [notes, setNotes] = useState()

  const [info, setInfo] = useState(' ')

  const [isValid, setIsValid] = useState(false)

  const callFieldRef = useRef()
  const sentFieldRef = useRef()
  const rcvdFieldRef = useRef()

  // Initialize the form with the QSO data
  useEffect(() => {
    const mode = qso?.mode ?? 'SSB'
    setTheirCall(qso?.their?.call ?? '')
    setTheirSent(qso?.their?.sent ?? (mode === 'CW' ? '599' : '59'))
    setOurSent(qso?.our?.sent ?? (mode === 'CW' ? '599' : '59'))
    if (qso.startOnMillis) {
      setPausedTime(true)
      setStartOnMillis(qso.startOnMillis)
      setTimeStr(fmtTimeZulu(qso.startOnMillis))
    } else {
      setPausedTime(false)
      setStartOnMillis(null)
      setTimeStr(fmtTimeZulu(new Date()))
    }
    setNotes(qso?.notes ?? '')
  }, [qso])

  // Update the time every second
  useEffect(() => {
    if (!pausedTime) {
      const interval = setInterval(() => {
        setTimeStr(fmtTimeZulu(new Date()))
        // setTimeStr(fmtDateTime(new Date(), 'ContestTimestampZulu', { weekday: undefined }))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [pausedTime])

  // Focus the callsign field when the panel is opened
  useEffect(() => {
    setTimeout(() => {
      callFieldRef?.current?.focus()
    }, 100)
  }, [qso, callFieldRef])

  // Validate and analize the callsign
  useEffect(() => {
    const callInfo = parseCallsign(theirCall)
    let entityInfo
    if (callInfo?.baseCall) {
      setIsValid(true)
      entityInfo = analyzeFromCountryFile(callInfo)
    } else {
      setIsValid(false)
    }

    if (!entityInfo?.entityPrefix && theirCall) {
      entityInfo = analyzeFromCountryFile({ prefix: theirCall })
    }

    if (entityInfo?.entityPrefix) {
      const entity = DXCC_BY_PREFIX[entityInfo.entityPrefix]
      if (entity) {
        setInfo(`${entity.flag} ${entity.name}`)
      } else {
        setInfo(' ')
      }
    } else {
      setInfo(' ')
    }
  }, [theirCall, setInfo])

  // Handle form fields and update QSO info
  const handleFieldChange = useCallback((event) => {
    const { fieldId, nativeEvent: { text } } = event
    if (fieldId === 'theirCall') {
      setTheirCall(text)

      if (!pausedTime) {
        if (text) {
          if (!startOnMillis) setStartOnMillis(Date.now())
        } else {
          setStartOnMillis(null)
        }
      }
    } else if (fieldId === 'theirSent') {
      setTheirSent(text)
    } else if (fieldId === 'ourSent') {
      setOurSent(text)
    } else if (fieldId === 'notes') {
      setNotes(text)
    }
  }, [setTheirCall, setTheirSent, setOurSent, setNotes, setStartOnMillis, startOnMillis, pausedTime])

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

  // Finally submit the QSO
  const handleSubmit = useCallback(() => {
    if (isValid) {
      const finalQso = {
        our: { sent: ourSent },
        their: { call: theirCall, sent: theirSent },
        startOnMillis
      }
      if (notes) finalQso.notes = notes

      onLog(finalQso)
    }
  }, [notes, ourSent, theirCall, theirSent, startOnMillis, onLog, isValid])

  return (
    <View style={[styles.root, style, { flexDirection: 'column', justifyContent: 'flex-end', width: '100%', minHeight: 100 }]}>
      <View style={{ width: '100%', flexDirection: 'row', minHeight: 20 }}>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.halfSpace, flexWrap: 'wrap', gap: styles.halfSpace }}>
            <LoggerChip icon="clock-outline" themeColor={themeColor}><Text style={styles.text.numbers}>{timeStr}</Text></LoggerChip>
            <LoggerChip icon="radio" themeColor={themeColor}>{describeRadio(operation)}</LoggerChip>
            {operation.pota && <LoggerChip icon="pine-tree" themeColor={themeColor}>P2P</LoggerChip>}
          </View>
          <View style={{ flex: 0, flexDirection: 'row', paddingHorizontal: styles.oneSpace, paddingVertical: styles.halfSpace, gap: styles.oneSpace }}>
            <Text>{info}</Text>
          </View>
        </View>

      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1, paddingHorizontal: styles.oneSpace, paddingTop: styles.halfSpace, paddingBottom: styles.oneSpace, flexDirection: 'row', gap: styles.oneSpace }}>
          <CallsignInput
            innerRef={callFieldRef}
            themeColor={themeColor}
            style={[styles.input, { flex: 5 }]}
            value={theirCall}
            label="Their Call"
            placeholder=""
            error={!isValid}
            uppercase={true}
            noSpaces={true}
            onChange={handleFieldChange}
            onSubmitEditing={handleSubmit}
            textStyle={styles.text.callsign}
            fieldId={'theirCall'}
            onKeyPress={spaceKeyHander}
          />
          <ThemedTextInput
            innerRef={sentFieldRef}
            themeColor={themeColor}
            style={[styles.input, { width: styles.normalFontSize * 2.5 }]}
            value={ourSent}
            numeric={true}
            label="Sent"
            placeholder="RST"
            onChange={handleFieldChange}
            onSubmitEditing={handleSubmit}
            fieldId={'ourSent'}
            onKeyPress={spaceKeyHander}
          />
          <ThemedTextInput
            innerRef={rcvdFieldRef}
            themeColor={themeColor}
            style={[styles.input, { width: styles.normalFontSize * 2.5 }]}
            value={theirSent}
            numeric={true}
            label="Rcvd"
            placeholder="RST"
            onChange={handleFieldChange}
            onSubmitEditing={handleSubmit}
            fieldId={'theirSent'}
            onKeyPress={spaceKeyHander}
          />
          <ThemedTextInput
            themeColor={themeColor}
            style={[styles.input, { flex: 3 }]}
            value={notes}
            label="Notes"
            placeholder=""
            onChange={handleFieldChange}
            onSubmitEditing={handleSubmit}
            fieldId={'notes'}
          />
        </View>
        <View style={{ justifyContent: 'flex-end', alignItems: 'flex-end', paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.halfSpace }}>
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

    </View>
  )
}
