import React, { useCallback, useEffect, useState } from 'react'

import {
  Text,
  View
} from 'react-native'
import { IconButton } from 'react-native-paper'

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

export default function LoggingPanel ({ qso, onLog, themeColor }) {
  themeColor = themeColor || 'tertiary'
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)

  const [mode, setMode] = useState(qso?.mode ?? 'SSB')
  const [theirCall, setTheirCall] = useState(qso?.their?.call ?? '')
  const [theirSent, setTheirSent] = useState(qso?.their?.sent ?? mode === 'CW' ? '599' : '59')
  const [ourSent, setOurSent] = useState(qso?.our?.sent ?? mode === 'CW' ? '599' : '59')
  const [startOnMillis, setStartOnMillis] = useState(qso?.startOnMillis)
  const [notes, setNotes] = useState(qso?.notes ?? '')

  const [info, setInfo] = useState('🇺🇸 USA • John J Lavelle, Jr • Wurstboro, NY')

  const styles = useThemedStyles((baseStyles) => {
    return {
      ...baseStyles,
      input: {
        backgroundColor: baseStyles.theme.colors.background,
        color: baseStyles.theme.colors.onBackground,
        paddingHorizontal: baseStyles.oneSpace
      }
    }
  })

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
    const finalQso = {
      our: { sent: ourSent },
      their: { call: theirCall, sent: theirSent },
      startOnMillis
    }
    if (notes) finalQso.notes = notes

    onLog(finalQso)
  }, [notes, ourSent, theirCall, theirSent, startOnMillis, onLog])

  return (
    <View style={{ flex: 0, width: '100%', flexDirection: 'column', backgroundColor: styles.theme.colors[`${themeColor}Container`] }}>
      <View style={{ flex: 0, width: '100%', flexDirection: 'row' }}>

        <View style={{ flex: 0, flexDirection: 'column' }}>
          <View style={{ flex: 1, paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.halfSpace, flexDirection: 'row', flexWrap: 'wrap', gap: styles.halfSpace }}>
            <LoggerChip icon="calendar" themeColor={themeColor}>12:33:15</LoggerChip>
            <LoggerChip icon="pine-tree" themeColor={themeColor}>P2P</LoggerChip>
          </View>
          <View style={{ flex: 0, paddingHorizontal: styles.oneSpace, paddingVertical: styles.halfSpace, flexDirection: 'row', gap: styles.oneSpace }}>
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
          themeColor={themeColor}
          style={[styles.input, { flex: 5 }]}
          value={theirCall}
          label="Their Call"
          placeholder=""
          uppercase={true}
          onChange={handleFieldChange}
          fieldId={'theirCall'}
        />
        <LoggerInput
          themeColor={themeColor}
          style={[styles.input, { width: styles.normalFontSize * 2.5 }]}
          value={ourSent}
          label="Sent"
          placeholder="RST"
          onChange={handleFieldChange}
          fieldId={'ourSent'}
          />
        <LoggerInput
          themeColor={themeColor}
          style={[styles.input, { width: styles.normalFontSize * 2.5 }]}
          value={theirSent}
          label="Rcvd"
          placeholder="RST"
          onChange={handleFieldChange}
          fieldId={'theirSent'}
        />
        <LoggerInput
          themeColor={themeColor}
          style={[styles.input, { flex: 3 }]}
          value={notes}
          label="Notes"
          placeholder=""
          onChange={handleFieldChange}
          fieldId={'notes'}
        />
      </View>
    </View>
  )
}
