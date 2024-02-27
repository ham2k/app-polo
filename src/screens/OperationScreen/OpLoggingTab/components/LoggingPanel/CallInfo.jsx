import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'
import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper'
import { View } from 'react-native'
import { capitalizeString } from '../../../../../tools/capitalizeString'
import { useLookupCallQuery } from '../../../../../store/apiQRZ'
import { useLookupParkQuery } from '../../../../../store/apiPOTA'
import { filterRefs, hasRef } from '../../../../../tools/refTools'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { findQSOHistory } from '../../../../../store/qsos/actions/findQSOHistory'
import { fmtDateZulu, fmtISODate } from '../../../../../tools/timeFormats'
import { useThemedStyles } from '../../../../../styles/tools/useThemedStyles'
import { CallInfoDialog } from './CallInfoDialog'
import { prepareCountryFilesData } from '../../../../../data/CountryFiles'

export function CallInfo ({ qso, operation, style, themeColor }) {
  const styles = useThemedStyles((baseStyles) => {
    // const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
    return {
      ...baseStyles,
      history: {
        pill: {
          marginRight: baseStyles.halfSpace,
          borderRadius: 3,
          padding: baseStyles.oneSpace * 0.3,
          paddingHorizontal: baseStyles.oneSpace * 0.5,
          backgroundColor: baseStyles.theme.colors[`${themeColor}Light`]
        },
        text: {
          fontSize: baseStyles.smallFontSize,
          fontWeight: 'normal',
          color: 'black'
        },
        alert: {
          backgroundColor: 'red',
          color: 'white'
        },
        warning: {
          backgroundColor: 'green',
          color: 'white'
        },
        info: {
        }
      }
    }
  })

  const isPotaOp = useMemo(() => {
    return hasRef(operation?.refs, 'potaActivation')
  }, [operation])

  const [showDialog, setShowDialog] = useState(false)

  // Parse the callsign
  const guess = useMemo(() => {
    if (qso?.their?.guess) {
      return qso?.their?.guess
    } else {
      let newGuess = parseCallsign(qso?.their?.call)
      if (newGuess?.baseCall) {
        annotateFromCountryFile(newGuess)
      } else if (qso?.their?.call) {
        newGuess = annotateFromCountryFile({ prefix: qso?.their?.call, baseCall: qso?.their?.call })
      }
      return newGuess
    }
  }, [qso])

  // Use `skip` to prevent calling the API on every keystroke
  const [skipQRZ, setSkipQRZ] = useState(true)
  useEffect(() => {
    setSkipQRZ(true)
    const timeout = setTimeout(() => { setSkipQRZ(false) }, 200)
    return () => clearTimeout(timeout)
  }, [guess?.baseCall])

  const qrz = useLookupCallQuery({ call: guess?.baseCall }, { skip: skipQRZ })

  const [callHistory, setCallHistory] = useState()
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const qsoHistory = await findQSOHistory(guess?.baseCall)
      setCallHistory(qsoHistory)
    }, 200)
    return () => clearTimeout(timeout)
  }, [guess?.baseCall])

  // Use `skip` to prevent calling the API on every keystroke
  const potaRef = useMemo(() => {
    const potaRefs = filterRefs(qso?.refs, 'pota')
    if (potaRefs?.length > 0) {
      return potaRefs[0].ref
    } else {
      return undefined
    }
  }, [qso?.refs])

  const pota = useLookupParkQuery({ ref: potaRef }, { skip: !potaRef })

  const locationInfo = useMemo(() => {
    const parts = []
    const entity = DXCC_BY_PREFIX[guess?.entityPrefix]

    if (pota?.data?.name) {
      parts.push(`${entity?.flag ? `${entity.flag} ` : ''} POTA: ${pota.data.name} ${pota.data.parktypeDesc}`)
      if (pota.data.locationName) parts.push(pota.data.locationName)
    } else if (pota?.data?.error) {
      parts.push(`POTA ${potaRef} ${pota.data?.error}`)
    } else {
      if (entity) parts.push(`${entity.flag} ${entity.shortName}`)

      if (qrz?.data?.call === guess?.baseCall && qrz?.data?.city && qrz?.status === 'fulfilled') {
        parts.push(qrz.data.city, qrz.data.state)
      }
    }

    return parts.filter(x => x).join(' • ')
  }, [guess, qrz, pota, potaRef])

  const stationInfo = useMemo(() => {
    if (skipQRZ) return ''

    const parts = []
    if (qrz?.error) {
      parts.push(qrz.error)
    } else if (qrz?.data?.name && qrz?.status === 'fulfilled') {
      parts.push(qrz.data.name)
      if (qrz.data.call && qrz.data.call !== qrz.originalArgs?.call) {
        parts.push(`(Now ${qrz.data.call})`)
      }
    }
    return parts.filter(x => x).join(' • ')
  }, [qrz, skipQRZ])

  const [historyInfo, historyLevel] = useMemo(() => {
    const today = new Date()
    let info = ''
    let level = 'info'
    if (callHistory?.length > 0) {
      if (qso?._is_new && callHistory.find(x => x?.operation === operation.uuid)) {
        if (isPotaOp) {
          if (fmtDateZulu(callHistory[0]?.startOnMillis) === fmtDateZulu(today)) {
            info = 'Dupe!!!'
            level = 'alert'
          } else {
            info = 'New POTA Day'
            level = 'warning'
          }
        } else {
          info = 'Dupe!!!'
          level = 'alert'
        }
      } else {
        const sameDay = callHistory.filter(x => fmtISODate(x.startOnMillis) === fmtISODate(today)).length

        if (sameDay > 1) {
          info = `${sameDay}x today + ${callHistory.length - sameDay} QSOs`
        } else {
          info = `+ ${callHistory.length - (qso?._is_new ? 1 : 0)} QSOs`
        }
        level = 'info'
      }
    }
    return [info, level]
  }, [callHistory, isPotaOp, operation?.uuid, qso?._is_new])

  return (
    <>
      <TouchableRipple onPress={() => setShowDialog(true)} style={{ width: '100%', height: styles.oneSpace * 5 }}>

        <View style={[style, { flexDirection: 'row', justifyContent: 'flex-start', alignContent: 'flex-start', alignItems: 'stretch', gap: styles.halfSpace }]}>
          <View style={{ alignSelf: 'flex-start', flex: 0 }}>
            {qrz.loading ? (
              <ActivityIndicator
                size={styles.oneSpace * 3}
                animating={true}
              />
            ) : (
              <Icon
                source={'account-outline'}
                size={styles.oneSpace * 3}
                color={styles.theme.colors[`${themeColor}ContainerVariant`]}
              />
            )}
          </View>
          <View style={[style, { flex: 1, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', paddingTop: styles.oneSpace * 0.3 }]}>
            {(locationInfo) && (
              <Text style={{}} numberOfLines={1} ellipsizeMode={'tail'}>
                {locationInfo}
              </Text>
            )}
            {(stationInfo || historyInfo) && (
              <View style={{ flexDirection: 'row' }}>
                {historyInfo && (
                  <View style={[{ flex: 0 }, styles.history.pill, historyLevel && styles.history[historyLevel]]}>
                    <Text style={[styles.history.text, historyLevel && styles.history[historyLevel]]}>{historyInfo}</Text>
                  </View>
                )}
                <Text style={{ flex: 1, fontWeight: 'bold' }} numberOfLines={1} ellipsizeMode={'tail'}>
                  {stationInfo}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableRipple>
      <CallInfoDialog
        visible={showDialog}
        setVisible={setShowDialog}
        qso={qso}
        guess={guess}
        qrz={qrz?.status === 'fulfilled' ? qrz : {}}
        pota={pota}
        operation={operation}
        callHistory={callHistory}
        styles={styles}
      />
    </>
  )
}
