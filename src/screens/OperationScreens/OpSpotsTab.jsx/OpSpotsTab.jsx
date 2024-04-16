/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useSpotsQuery } from '../../../store/apiPOTA'
import { selectRuntimeOnline } from '../../../store/runtime'
import SpotList from './components/SpotList'
import ThemedDropDown from '../../components/ThemedDropDown'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BANDS } from '@ham2k/lib-operation-data'
import { findQSOHistory } from '../../../store/qsos/actions/findQSOHistory'
import { selectAllOperations, selectOperationCallInfo } from '../../../store/operations'
import { filterRefs } from '../../../tools/refTools'

function simplifiedMode (mode) {
  if (mode === 'CW') {
    return 'CW'
  } else if (mode === 'SSB' || mode === 'LSB' || mode === 'USB' || mode === 'FM' || mode === 'AM') {
    return 'PHONE'
  } else {
    return 'DIGITAL'
  }
}

const MAX_SPOT_AGE_IN_MINUTES = 10

function prepareStyles (baseStyles, themeColor) {
  return {
    ...baseStyles,
    panel: {
      backgroundColor: baseStyles.theme.colors[`${themeColor}Container`],
      borderBottomColor: baseStyles.theme.colors[`${themeColor}Light`],
      borderTopColor: baseStyles.theme.colors[`${themeColor}Light`],
      borderBottomWidth: 1,
      padding: baseStyles.oneSpace
    },
    container: {
      paddingHorizontal: baseStyles.oneSpace,
      paddingTop: baseStyles.oneSpace,
      paddingBottom: baseStyles.oneSpace,
      gap: baseStyles.halfSpace
    }
  }
}

export default function OpSpotsTab ({ navigation, route }) {
  const themeColor = 'tertiary'
  const styles = useThemedStyles(prepareStyles, themeColor)

  const online = useSelector(selectRuntimeOnline)

  const [band, setBand] = useState('any')
  const [mode, setMode] = useState('any')

  const spotsQuery = useSpotsQuery()
  const [spots, setSpots] = useState([])

  const allOperations = useSelector(selectAllOperations)
  const callInfo = useSelector(state => selectOperationCallInfo(state, route.params.uuid))

  useEffect(() => {
    setTimeout(async () => {
      const newSpots = spotsQuery.currentData || spotsQuery.data || []
      const annotatedSpots = []

      const today = new Date()
      for (const spot of newSpots) {
        const flags = {}

        if (today - spot.timeInMillis > (1000 * 60 * MAX_SPOT_AGE_IN_MINUTES)) {
          continue
        }

        if (spot.activator === callInfo?.call) {
          flags._ourSpot = true
        }

        const qsoHistory = await findQSOHistory(spot.activator, { onDate: today })
        if (qsoHistory.length > 0) {
          if (qsoHistory.filter(qso => qso.band === spot.band).length === 0) {
            flags._newBand = true
          }

          if (qsoHistory.filter(qso => qso.mode === spot.mode).length === 0) {
            flags._newMode = true
          }

          let potaRefs = []
          for (const qso of qsoHistory) {
            const qsoData = JSON.parse(qso.data)
            potaRefs = potaRefs + (filterRefs(qsoData?.refs, 'pota') || []).map(ref => ref.ref)
          }
          if (potaRefs.length > 1) {
            if (!potaRefs.includes(spot.reference)) {
              flags._newReference = true
            }
          } else {
            flags._newActivity = true
          }
          flags._worked = !flags._newBand && !flags._newMode && !flags._newReference && !flags._newActivity
        }
        annotatedSpots.push({ ...spot, ...flags })
      }

      setSpots(annotatedSpots)
    }, 0)
  }, [spotsQuery, allOperations, callInfo])

  useEffect(() => {
    const interval = setInterval(() => {
      spotsQuery?.refetch()
    }, 1000 * 60)
    return () => clearInterval(interval)
  })

  const [bandOptions, bandSpots] = useMemo(() => {
    const counts = {}
    let options = [{ value: 'any', label: 'Any Band' }]
    let filtered = []

    spots.forEach(spot => {
      counts[spot.band] = (counts[spot.band] ?? 0) + 1
    })

    options = options.concat(
      Object.keys(counts)
        .map(key => ({ band: key, count: counts[key] }))
        .sort((a, b) => BANDS.indexOf(a.band) - BANDS.indexOf(b.band))
        .map(b => ({ value: b.band, label: `${b.band} (${b.count})` }))
    )

    filtered = spots
    if (band !== 'any') {
      filtered = filtered.filter(spot => spot.band === band)
    }

    return [options, filtered]
  }, [spots, band])

  const [modeOptions, filteredSpots] = useMemo(() => {
    let options = [{ value: 'any', label: 'Any Mode' }]
    let filtered = bandSpots || []

    const counts = {}
    filtered.forEach(spot => {
      const simpleMode = simplifiedMode(spot.mode)
      counts[simpleMode] = (counts[simpleMode] ?? 0) + 1
    })

    options = options.concat(
      Object.keys(counts)
        .map(key => ({ mode: key, count: counts[key] }))
        .sort((a, b) => b.mode - a.mode)
        .map(b => ({ value: b.mode, label: `${b.mode} (${b.count})` }))
    )

    if (mode !== 'any') {
      filtered = filtered?.filter(spot => simplifiedMode(spot.mode) === mode)
    }

    filtered.sort((a, b) => {
      return a.frequency - b.frequency
    })

    return [options, filtered]
  }, [mode, bandSpots])

  return (
    <GestureHandlerRootView style={[{ flex: 1, height: '100%', width: '100%', flexDirection: 'column' }]}>
      <View style={[{ flex: 0 }, styles.panel]}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace, alignItems: 'center' }}>
          <ThemedDropDown
            label="Band"
            themeColor={themeColor}
            value={band}
            onChange={(event) => setBand(event.nativeEvent.text)}
            fieldId={'band'}
            style={{ }}
            list={bandOptions}
          />
          <ThemedDropDown
            label="Mode"
            value={mode}
            onChange={(event) => setMode(event.nativeEvent.text)}
            fieldId={'mode'}
            style={{ }}
            list={modeOptions}
          />
          {!online && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Icon
                source={'cloud-off-outline'}
                size={styles.oneSpace * 4}
                color={styles.theme.colors[`${themeColor}ContainerVariant`]}
              />
            </View>
          )}
        </View>
        <Text style={{ fontWeight: 'bold', marginTop: styles.halfSpace, textAlign: 'center' }}>
          {filteredSpots ? (

            mode === 'all' && band === 'all' ? (
              `${filteredSpots.length} POTA Spots`
            ) : (
              `Showing ${filteredSpots.length} out of ${spots?.length} POTA Spots`
            )
          ) : (
            'Loading POTA Spots...'
          )}
        </Text>
      </View>
      <SpotList spots={filteredSpots} spotsQuery={spotsQuery} />
    </GestureHandlerRootView>
  )
}
