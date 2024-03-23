import React, { useEffect, useMemo, useState } from 'react'
import { Icon, Text, TouchableRipple } from 'react-native-paper'
import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

import { useLookupCallQuery } from '../../../../../store/apiQRZ'
import { useLookupParkQuery } from '../../../../../store/apiPOTA'
import { filterRefs, hasRef } from '../../../../../tools/refTools'
import { findQSOHistory } from '../../../../../store/qsos/actions/findQSOHistory'
import { fmtDateZulu, fmtISODate } from '../../../../../tools/timeFormats'
import { useThemedStyles } from '../../../../../styles/tools/useThemedStyles'
import { selectRuntimeOnline } from '../../../../../store/runtime'
import { selectSettings } from '../../../../../store/settings'

import { CallInfoDialog } from './CallInfoDialog'

export function CallInfo ({ qso, operation, style, themeColor, onChange }) {
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

  const online = useSelector(selectRuntimeOnline)
  const settings = useSelector(selectSettings)

  const isPotaOp = useMemo(() => {
    return hasRef(operation?.refs, 'potaActivation')
  }, [operation])

  const [showDialog, setShowDialog] = useState(false)

  const guess = useMemo(() => { // Parse the callsign
    if (qso?.their?.guess?.baseCall) {
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

  const [skipQRZ, setSkipQRZ] = useState(undefined) // Use `skip` to prevent calling the API on every keystroke
  useEffect(() => {
    if (online && settings?.accounts?.qrz?.login && settings?.accounts?.qrz?.password && guess?.baseCall?.length > 2) {
      if (skipQRZ === undefined) {
        // If we start with a prefilled call, then call QRZ right away
        setSkipQRZ(false)
      } else {
        // Wait a bit before calling QRZ on every keystroke
        const timeout = setTimeout(() => { setSkipQRZ(false) }, 200)
        return () => clearTimeout(timeout)
      }
    }
  }, [guess?.baseCall, online, settings?.accounts?.qrz, skipQRZ])

  const qrzLookup = useLookupCallQuery({ call: guess?.baseCall }, { skip: skipQRZ })
  const qrz = useMemo(() => qrzLookup.currentData || {}, [qrzLookup.currentData])

  const [callHistory, setCallHistory] = useState()
  useEffect(() => { // Get Call History
    const timeout = setTimeout(async () => {
      const qsoHistory = await findQSOHistory(guess?.baseCall)
      setCallHistory(qsoHistory)
    }, 0)
    return () => clearTimeout(timeout)
  }, [guess?.baseCall])

  const potaRef = useMemo(() => { // Find POTA references
    const potaRefs = filterRefs(qso?.refs, 'pota')
    if (potaRefs?.length > 0) {
      return potaRefs[0].ref
    } else {
      return undefined
    }
  }, [qso?.refs])

  const potaLookup = useLookupParkQuery({ ref: potaRef }, { skip: !potaRef, online })
  const pota = useMemo(() => potaLookup?.data ?? {}, [potaLookup?.data])

  useEffect(() => {
    const theirInfo = {}
    if (qrz?.name && qrz?.name !== qso?.their?.guess?.name) {
      theirInfo.qrzInfo = {
        name: qrz.name,
        state: qrz.state,
        city: qrz.city,
        country: qrz.country,
        county: qrz.county,
        postal: qrz.postal,
        grid: qrz.grid,
        cqZone: qrz.cqZone,
        ituZone: qrz.ituZone,
        image: qrz.image,
        imageInfo: qrz.imageInfo
      }

      theirInfo.guess = {
        ...theirInfo.guess,
        name: qrz.name,
        grid: qrz.grid
      }

      if (qrz.country === 'United States' || qrz.country === 'Canada') {
        theirInfo.guess.state = qrz.state
      }
    } else if (!qrz?.name && qso?.their?.qrzInfo?.name) {
      theirInfo.qrzInfo = {}
      theirInfo.guess = {
        ...theirInfo.guess,
        state: '',
        grid: '',
        name: ''
      }
    }

    if (pota.grid6 && qso?.their?.guess?.grid !== pota.grid6) {
      theirInfo.guess = {
        ...theirInfo.guess,
        grid: pota.grid6
      }

      if (pota.reference?.startsWith('US-') || pota.reference?.startsWith('CA-')) {
        const potaState = (pota.locationDesc || '').split('-').pop().trim()
        theirInfo.guess.state = potaState
      }

      // console.log(pota.locationDesc)
      theirInfo.guess = { ...theirInfo.guess }
    }

    if (Object.keys(theirInfo).length > 0) {
      onChange && onChange({ their: theirInfo })
    }
  }, [qrz, pota, onChange, qso?.their?.qrzInfo, qso?.their?.guess])

  const [locationInfo, flag] = useMemo(() => {
    const parts = []
    const entity = DXCC_BY_PREFIX[guess?.entityPrefix]

    if (pota.name) {
      parts.push(['POTA', potaRef, pota.name, pota.parktypeDesc].filter(x => x).join(' '))
      if (pota.locationName) parts.push(pota.locationName)
    } else if (pota.error) {
      parts.push(`POTA ${potaRef} ${pota.error}`)
    } else {
      if (entity) parts.push(entity.shortName)

      if (qrz.call === guess?.baseCall && qrz.city) {
        parts.push(qrz.city, qrz.state)
      }
    }

    return [parts.filter(x => x).join(' • '), entity?.flag ? entity.flag : '']
  }, [guess, qrz, pota, potaRef])

  const stationInfo = useMemo(() => {
    const parts = []
    if (qrz) {
      parts.push(qrz.error)
      parts.push(qrz.name)
      if (qrz.call && qrz.originalCall && qrz.call !== qrz.originalCall) {
        parts.push(`(Now ${qrz.call})`)
      }
    }

    return parts.filter(x => x).join(' • ')
  }, [qrz])

  const [historyInfo, historyLevel] = useMemo(() => {
    const today = new Date()
    let info = ''
    let level = 'info'

    if (callHistory?.length > 0) {
      if (qso?._isNew && callHistory.find(x => x?.operation === operation.uuid && x?.mode === qso.mode && x?.band === qso.band)) {
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
        console.log('callHistory', callHistory.map(x => x.startOnMillis))
        const sameDay = callHistory.filter(x => x && fmtISODate(x.startOnMillis) === fmtISODate(today)).length

        if (sameDay > 1) {
          info = `${sameDay}x today + ${callHistory.length - sameDay} QSOs`
        } else {
          info = `+ ${callHistory.length - (qso?._isNew ? 0 : 1)} QSOs`
        }
        level = 'info'
      }
    }
    return [info, level]
  }, [callHistory, isPotaOp, operation?.uuid, qso])

  return (
    <>
      <TouchableRipple onPress={() => setShowDialog(true)} style={{ minHeight: styles.oneSpace * 5 }}>

        <View style={[style, { flexDirection: 'row', justifyContent: 'flex-start', alignContent: 'flex-start', alignItems: 'stretch', gap: styles.halfSpace }]}>
          <View style={{ alignSelf: 'flex-start', flex: 0 }}>
            {online ? (
              <Icon
                source={'account-outline'}
                size={styles.oneSpace * 3}
                color={styles.theme.colors[`${themeColor}ContainerVariant`]}
              />
            ) : (
              <Icon
                source={'cloud-off-outline'}
                size={styles.oneSpace * 3}
                color={styles.theme.colors[`${themeColor}ContainerVariant`]}
              />
            )}
          </View>
          <View style={[style, { flex: 1, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', paddingTop: styles.oneSpace * 0.3 }]}>
            <View style={{ flexDirection: 'row' }}>
              {flag && (
                <Text style={{ flex: 0 }} numberOfLines={1} ellipsizeMode={'tail'}>
                  {flag}{' '}
                </Text>

              )}
              {locationInfo && (
                <Text style={{ flex: 1 }} numberOfLines={2} ellipsizeMode={'tail'}>
                  {locationInfo}
                </Text>
              )}
            </View>
            {(stationInfo || historyInfo) && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                {historyInfo && (
                  <View style={[{ flex: 0 }, styles.history.pill, historyLevel && styles.history[historyLevel]]}>
                    <Text style={[styles.history.text, historyLevel && styles.history[historyLevel]]}>{historyInfo}</Text>
                  </View>
                )}
                <Text style={{ flex: 1, fontWeight: 'bold' }} numberOfLines={2} ellipsizeMode={'tail'}>
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
        qrz={qrz}
        pota={pota}
        operation={operation}
        callHistory={callHistory}
        styles={styles}
      />
    </>
  )
}
