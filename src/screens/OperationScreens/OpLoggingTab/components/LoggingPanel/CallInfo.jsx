import React, { useEffect, useMemo, useState } from 'react'
import { Icon, Text, TouchableRipple } from 'react-native-paper'
import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

import { useLookupCallQuery } from '../../../../../store/apiQRZ'
import { useLookupParkQuery } from '../../../../../store/apiPOTA'
import { filterRefs, findRef, hasRef } from '../../../../../tools/refTools'
import { findQSOHistory } from '../../../../../store/qsos/actions/findQSOHistory'
import { fmtDateZulu, fmtISODate } from '../../../../../tools/timeFormats'
import { useThemedStyles } from '../../../../../styles/tools/useThemedStyles'
import { selectRuntimeOnline } from '../../../../../store/runtime'
import { selectSettings } from '../../../../../store/settings'

import { CallInfoDialog } from './CallInfoDialog'
import { distanceForQSON, fmtDistance } from '../../../../../tools/geoTools'
import { selectOperationCallInfo } from '../../../../../store/operations'
import { useOneCallNoteFinder } from '../../../../../extensions/data/call-notes/CallNotesExtension'
import { Ham2kMarkdown } from '../../../../components/Ham2kMarkdown'

function prepareStyles (baseStyles, themeColor) {
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
    },
    markdown: {
      ...baseStyles.markdown,
      paragraph: { margin: 0, marginTop: baseStyles.halfSpace, marginBottom: 0 }
    }
  }
}

export function CallInfo ({ qso, operation, style, themeColor, updateQSO }) {
  const styles = useThemedStyles(prepareStyles, themeColor)

  const online = useSelector(selectRuntimeOnline)
  const settings = useSelector(selectSettings)

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const isPotaOp = useMemo(() => {
    return hasRef(operation?.refs, 'potaActivation')
  }, [operation])

  const [showDialog, setShowDialog] = useState(false)

  const guess = useMemo(() => { // Parse the callsign
    let newGuess = parseCallsign(qso?.their?.call)
    if (newGuess?.baseCall) {
      annotateFromCountryFile(newGuess)
    } else if (qso?.their?.call) {
      newGuess = annotateFromCountryFile({ prefix: qso?.their?.call, baseCall: qso?.their?.call })
    }
    return newGuess
  }, [qso?.their?.call])

  const callNotes = useOneCallNoteFinder(guess?.baseCall)

  const [callHistory, setCallHistory] = useState()
  useEffect(() => { // Get Call History
    const timeout = setTimeout(async () => {
      const qsoHistory = await findQSOHistory(guess?.baseCall)
      setCallHistory(qsoHistory)
    }, 0)
    return () => clearTimeout(timeout)
  }, [guess?.baseCall])

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
  const [qrzCall, setQRZCall] = useState()

  const qrzLookup = useLookupCallQuery({ call: qrzCall === guess.baseCall ? qrzCall : guess.call }, { skip: skipQRZ })
  const qrz = useMemo(() => {
    if (qrzLookup?.error?.message && qrzLookup.error?.message.indexOf('not found') >= 0) {
      // If the call has a prefix or suffix, and the full call was not found, let's retry with the base call
      if (qrzLookup?.originalArgs?.call !== guess.baseCall) {
        setQRZCall(guess.baseCall)
      }
    }
    return qrzLookup.currentData || {}
  }, [qrzLookup, guess.baseCall])

  const potaRef = useMemo(() => { // Find POTA references
    const potaRefs = filterRefs(qso?.refs, 'pota')
    if (potaRefs?.length > 0) {
      return potaRefs[0].ref
    } else {
      return undefined
    }
  }, [qso?.refs])

  const potaLookup = useLookupParkQuery({ ref: potaRef }, { skip: !potaRef, online })
  const pota = useMemo(() => {
    return potaLookup?.data ?? {}
  }
  , [potaLookup?.data])

  useEffect(() => { // Merge all data sources and update guesses and QSO
    const their = { guess, lookup: {} }

    let historyData = {}

    if (callHistory && callHistory[0] && callHistory[0].theirCall === guess?.baseCall) {
      historyData = JSON.parse(callHistory[0].data)
      if (historyData?.their?.qrzInfo) {
        historyData.their.lookup = historyData.their?.qrzInfo
        historyData.their.lookup.source = 'qrz.com'
      }

      their.lookup.name = historyData.their.name ?? historyData.their.lookup?.name
      their.lookup.state = historyData.their.state ?? historyData.their.lookup?.state
      their.lookup.city = historyData.their.city ?? historyData.their.lookup?.city
      their.lookup.postal = historyData.their.postal ?? historyData.their.lookup?.postal
      their.lookup.grid = historyData.their.grid ?? historyData.their.lookup?.grid
      their.lookup.cqZone = historyData.their.cqZone ?? historyData.their.lookup?.cqZone
      their.lookup.ituZone = historyData.their.ituZone ?? historyData.their.lookup?.ituZone
      Object.keys(their.lookup).forEach(key => {
        if (!their.lookup[key]) delete their.lookup[key]
      })
      their.lookup.source = 'history'
    }

    if (qrz?.name) {
      their.lookup = {
        source: 'qrz.com',
        call: qrz.call,
        name: qrz.name,
        state: qrz.state,
        city: qrz.city,
        country: qrz.country,
        dxccCode: qrz.dxccCode,
        county: qrz.county,
        postal: qrz.postal,
        grid: qrz.grid,
        cqZone: qrz.cqZone,
        ituZone: qrz.ituZone,
        image: qrz.image,
        imageInfo: qrz.imageInfo
      }
    }

    if (their.lookup?.name) {
      // Use their name in any case
      their.guess.name = their.lookup.name
      if (guess.indicators && guess.indicators.find(ind => ['P', 'M', 'AM', 'MM'].indexOf(ind) >= 0)) {
        // If operating Portable, Maritime Mobile, or Mobile, ignore location
      } else if (their.lookup.call === guess.call || !their.lookup.call) {
        // If the lookup call is the same as the guess call, then use the lookup location
        their.guess.state = their.lookup.state
        their.guess.city = their.lookup.city
        their.guess.grid = their.lookup.grid
      }
    }

    if (pota?.grid6 && pota?.locationDesc?.indexOf(',') < 0) {
      // Only use POTA info if it's not a multi-state park
      their.guess.grid = pota.grid6

      if (pota.reference?.startsWith('US-') || pota.reference?.startsWith('CA-')) {
        const potaState = (pota.locationDesc || '').split('-').pop().trim()
        their.guess.state = potaState
      }
    }

    updateQSO({ their })
  }, [guess, qrz, pota, callHistory, updateQSO])

  const [locationInfo, flag] = useMemo(() => {
    let isOnTheGo = (qso?.their?.lookup?.dxccCode && qso?.their?.lookup?.dxccCode !== guess?.dxccCode)

    const parts = []
    const entity = DXCC_BY_PREFIX[guess?.entityPrefix]

    if (operation.grid && guess?.grid) {
      const dist = distanceForQSON({ our: { ...ourInfo, grid: operation.grid }, their: { grid: qso?.their?.grid, guess } }, { units: settings.distanceUnits })
      if (dist) parts.push(fmtDistance(dist, { units: settings.distanceUnits }))
    }

    if (guess.indicators && guess.indicators.find(ind => ['P', 'M', 'AM', 'MM'].indexOf(ind) >= 0)) {
      isOnTheGo = true
      if (guess.indicators.indexOf('P') >= 0) parts.push('[Portable]')
      else if (guess.indicators.indexOf('M') >= 0) parts.push('[Mobile]')
      else if (guess.indicators.indexOf('MM') >= 0) parts.push('[🚢]')
      else if (guess.indicators.indexOf('AM') >= 0) parts.push('[✈️]')
    }

    if (entity && entity.entityPrefix !== ourInfo.entityPrefix) {
      parts.push(entity.shortName)
    }

    if (pota.name) {
      isOnTheGo = true
      parts.push(['POTA', potaRef, pota.shortName ?? pota.name].filter(x => x).join(' '))
      if (pota.locationName) parts.push(pota.locationName)
    } else if (pota.error) {
      parts.push(`POTA ${potaRef} ${pota.error}`)
    }

    if (qso?.their?.city || qso?.their?.state) {
      parts.push([qso?.their?.city, qso?.their?.state].filter(x => x).join(', '))
    } else if (!isOnTheGo && (qso?.their?.guess?.city || qso?.their?.guess?.state)) {
      parts.push([qso?.their?.guess?.city, qso?.their?.guess?.state].filter(x => x).join(', '))
    }

    if (isOnTheGo) {
      if (qso?.their?.lookup?.city || qso?.their?.lookup?.state || qso?.their?.lookup?.country) {
        parts.push(
          'From ' + [
            [qso.their.lookup.city, qso.their.lookup.state].filter(x => x).join(', '),
            qso.their.lookup.dxccCode !== guess.dxccCode ? qso.their.lookup.country : ''
          ].filter(x => x).join(' ')
        )
      }
    }

    return [parts.filter(x => x).join(' • '), entity?.flag ? entity.flag : '']
  }, [
    guess, operation.grid, pota,
    qso?.their?.lookup, qso?.their?.guess, qso?.their?.city, qso?.their?.state, qso?.their?.grid,
    ourInfo, settings.distanceUnits, potaRef
  ])

  const stationInfo = useMemo(() => {
    const parts = []
    if (callNotes && callNotes[0]) {
      parts.push(callNotes[0].note)
    } else {
      if (qrz?.error) parts.push(qrz.error)
      parts.push(qso?.their?.name ?? qso?.their?.guess?.name)
    }

    return parts.filter(x => x).join(' • ')
  }, [qrz?.error, qso?.their?.name, qso?.their?.guess?.name, callNotes])

  const [historyInfo, historyLevel] = useMemo(() => {
    const today = new Date()
    let info = ''
    let level = 'info'

    if (callHistory?.length > 0) {
      if (qso?._isNew && callHistory.find(x => x?.operation === operation.uuid && x?.mode === qso.mode && x?.band === qso.band)) {
        if (isPotaOp) {
          if (fmtDateZulu(callHistory[0]?.startOnMillis) === fmtDateZulu(today)) {
            if (findRef(qso, 'pota')) {
              info = 'Maybe Dupe!!! (P2P)'
              level = 'alert'
            } else {
              info = 'Dupe!!!'
              level = 'alert'
            }
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
        const sameDay = callHistory.filter(x => x && fmtISODate(x.startOnMillis) === fmtISODate(today)).length

        if (sameDay > 1) {
          info = `${sameDay}x today + ${callHistory.length - sameDay} QSOs`
        } else if (callHistory.length - (qso?._isNew ? 0 : 1) > 0) {
          info = `+ ${callHistory.length - (qso?._isNew ? 0 : 1)} QSOs`
        }
        info = info.replace(' 1 QSOs', '1 QSO')

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
                <Text style={{ flex: 0, fontFamily: styles.normalFontFamily, lineHeight: styles.oneSpace * 2.5 }} numberOfLines={1} ellipsizeMode={'tail'}>
                  {flag}{' '}
                </Text>

              )}
              {locationInfo && (
                <Text style={{ flex: 1, fontFamily: locationInfo.length > 40 ? styles.maybeCondensedFontFamily : styles.normalFontFamily, lineHeight: styles.oneSpace * 2.5 }} numberOfLines={2} ellipsizeMode={'tail'}>
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
                <Text style={{ flex: 1, fontWeight: 'bold', fontFamily: stationInfo.length > 40 ? styles.maybeCondensedFontFamily : styles.normalFontFamily }} numberOfLines={2} ellipsizeMode={'tail'}>
                  <Ham2kMarkdown styles={styles}>{stationInfo}</Ham2kMarkdown>
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableRipple>
      {showDialog && (
        <CallInfoDialog
          visible={showDialog}
          setVisible={setShowDialog}
          qso={qso}
          pota={pota}
          qrz={qrz}
          operation={operation}
          callHistory={callHistory}
          styles={styles}
        />
      )}
    </>
  )
}
