import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
  Text,
  View
} from 'react-native'
import { IconButton } from 'react-native-paper'

import { fmtShortTimeZulu } from '../../../../tools/timeFormats'

import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import LoggerInput from '../LoggerInput'
import LoggerChip from '../LoggerChip'

function copyQSOFields (qso, dest = {}) {
  dest.their = dest.their ?? {}
  dest.our = dest.our ?? {}

  dest.their.call = qso?.their?.call ?? dest.their.call
  dest.their.sent = qso?.their?.sent ?? dest.their.sent
  dest.our.call = qso?.our?.call ?? dest.our.call
  dest.our.sent = qso?.our?.sent ?? dest.our.sent
  dest.startOnMillis = qso?.startOnMillis ?? dest.startOnMillis

  dest.freq = qso?.freq ?? dest.freq
  dest.band = qso?.band ?? dest.band
  dest.mode = qso?.mode ?? dest.mode

  dest.notes = qso?.notes ?? dest.notes

  return dest
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

export default function LoggingPanel ({ qso, onLog, themeColor, style }) {
  themeColor = themeColor || 'tertiary'
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  const styles = useThemedStyles((baseStyles) => prepareStyles(baseStyles, themeColor))

  const [mode, setMode] = useState()
  const [theirCall, setTheirCall] = useState()
  const [theirSent, setTheirSent] = useState()
  const [ourSent, setOurSent] = useState()
  const [pausedTime, setPausedTime] = useState()
  const [startOnMillis, setStartOnMillis] = useState()
  const [timeStr, setTimeStr] = useState()
  const [notes, setNotes] = useState()

  const [info, setInfo] = useState('🇺🇸 USA • John J Lavelle, Jr • Wurstboro, NY')

  useEffect(() => {
    const mode = qso?.mode ?? 'SSB' // eslint-disable-line no-shadow
    setMode(mode)
    setTheirCall(qso?.their?.call ?? '')
    setTheirSent(qso?.their?.sent ?? (mode === 'CW' ? '599' : '59'))
    setOurSent(qso?.our?.sent ?? (mode === 'CW' ? '599' : '59'))
    if (qso.startOnMillis) {
      setPausedTime(true)
      setStartOnMillis(qso.startOnMillis)
      setTimeStr(fmtShortTimeZulu(qso.startOnMillis))
    } else {
      setPausedTime(false)
      setStartOnMillis(null)
      setTimeStr(fmtShortTimeZulu(new Date()))
    }
    setNotes(qso?.notes ?? '')
  }, [qso])

  useEffect(() => {
    if (!pausedTime) {
      const interval = setInterval(() => {
        setTimeStr(fmtShortTimeZulu(new Date()))
        // setTimeStr(fmtDateTime(new Date(), 'ContestTimestampZulu', { weekday: undefined }))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [pausedTime])

  const callFieldRef = useRef()
  useEffect(() => {
    setTimeout(() => {
      callFieldRef?.current?.focus()
    }, 100)
  }, [qso, callFieldRef])

  const handleFieldChange = useCallback((event) => {
    const { fieldId, nativeEvent: { text } } = event
    if (fieldId === 'theirCall') {
      setTheirCall(text)

      if (text) {
        if (!startOnMillis) setStartOnMillis(Date.now())
      } else {
        setStartOnMillis(null)
      }
    } else if (fieldId === 'theirSent') {
      setTheirSent(text)
    } else if (fieldId === 'ourSent') {
      setOurSent(text)
    } else if (fieldId === 'notes') {
      setNotes(text)
    }
  }, [setTheirCall, setTheirSent, setOurSent, setNotes, setStartOnMillis, startOnMillis])

  const handleSubmit = useCallback(() => {
    console.log('SUBMIT')
    const finalQso = {
      our: { sent: ourSent },
      their: { call: theirCall, sent: theirSent },
      startOnMillis
    }
    if (notes) finalQso.notes = notes

    onLog(finalQso)
  }, [notes, ourSent, theirCall, theirSent, startOnMillis, onLog])

  return (
    <View style={[styles.root, style, { flexDirection: 'column' }]}>
      <View style={{ flex: 0, width: '100%', flexDirection: 'row' }}>

        <View style={{ flex: 0, flexDirection: 'column' }}>
          <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.halfSpace, flexWrap: 'wrap', gap: styles.halfSpace }}>
            <LoggerChip icon="clock-outline" themeColor={themeColor}><Text style={styles.text.numbers}>{timeStr}</Text></LoggerChip>
            <LoggerChip icon="pine-tree" themeColor={themeColor}>P2P</LoggerChip>
          </View>
          <View style={{ flex: 0, flexDirection: 'row', paddingHorizontal: styles.oneSpace, paddingVertical: styles.halfSpace, gap: styles.oneSpace }}>
            <Text>{info}</Text>
          </View>
        </View>

        <View style={{ flex: 0, paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.halfSpace }}>
          <IconButton
            icon="upload"
            size={styles.oneSpace * 4}
            mode="contained"
            containerColor={styles.theme.colors[`${themeColor}ContainerVariant`]}
            iconColor={styles.theme.colors[`on${upcasedThemeColor}`]}
            onPress={handleSubmit}
          />
        </View>
      </View>
      {/* <View style={{ paddingHorizontal: styles.oneSpace, paddingVertical: styles.halfSpace, flexDirection: 'row', gap: styles.oneSpace }}>
          <LoggerInput
              themeColor={themeColor}
              style={[styles.input, { flex: 1 }]}
              value={'K-0001'}
              label="Their POTA"
          />
          <LoggerInput
              themeColor={themeColor}
              style={[styles.input, { flex: 1 }]}
              value={'7.325'}
              label="Frequency"
          />
          <LoggerInput
              themeColor={themeColor}
              style={[styles.input, { flex: 1 }]}
              value={'20'}
              label="Power (Watts)"
          />
        </View> */}
      <View style={{ paddingHorizontal: styles.oneSpace, paddingTop: styles.halfSpace, paddingBottom: styles.oneSpace, flexDirection: 'row', gap: styles.oneSpace }}>
        <LoggerInput
          innerRef={callFieldRef}
          themeColor={themeColor}
          style={[styles.input, { flex: 5 }]}
          value={theirCall}
          label="Their Call"
          placeholder=""
          uppercase={true}
          onChange={handleFieldChange}
          onSubmitEditing={handleSubmit}
          textStyle={styles.text.callsign}
          fieldId={'theirCall'}
        />
        <LoggerInput
          themeColor={themeColor}
          style={[styles.input, { width: styles.normalFontSize * 2.5 }]}
          value={ourSent}
          label="Sent"
          placeholder="RST"
          onChange={handleFieldChange}
          onSubmitEditing={handleSubmit}
          fieldId={'ourSent'}
          />
        <LoggerInput
          themeColor={themeColor}
          style={[styles.input, { width: styles.normalFontSize * 2.5 }]}
          value={theirSent}
          label="Rcvd"
          placeholder="RST"
          onChange={handleFieldChange}
          onSubmitEditing={handleSubmit}
          fieldId={'theirSent'}
        />
        <LoggerInput
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
    </View>
  )
}
