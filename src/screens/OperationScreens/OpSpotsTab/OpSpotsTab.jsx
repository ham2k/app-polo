/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectRuntimeOnline } from '../../../store/runtime'
import SpotList from './components/SpotList'
import ThemedDropDown from '../../components/ThemedDropDown'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BANDS } from '@ham2k/lib-operation-data'
import { selectAllOperations, selectOperationCallInfo } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { useFindHooks } from '../../../extensions/registry'
import { annotateQSO } from '../OpInfoTab/components/useQSOInfo'
import { qsoKey } from '@ham2k/lib-qson-tools'

function simplifiedMode (mode) {
  if (mode === 'CW') {
    return 'CW'
  } else if (mode === 'SSB' || mode === 'LSB' || mode === 'USB' || mode === 'FM' || mode === 'AM') {
    return 'PHONE'
  } else {
    return 'DIGITAL'
  }
}

const MAX_SPOT_AGE_IN_SECONDS = 30 * 60
const REFRESH_INTERVAL_IN_SECONDS = 60

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

export default function OpSpotsTab ({ navigation, route, operation }) {
  const themeColor = 'tertiary'
  const styles = useThemedStyles(prepareStyles, themeColor)

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const online = useSelector(selectRuntimeOnline)

  const [band, setBand] = useState('any')
  const [mode, setMode] = useState('any')

  const allOperations = useSelector(selectAllOperations)
  const ourInfo = useSelector(state => selectOperationCallInfo(state, route.params.uuid))

  const [spots, setSpots] = useState([])
  const [lastFetched, setLastFetched] = useState(0)
  const [loading, setLoading] = useState(false)

  const spotsHooks = useFindHooks('spots')
  // const hookByKey = useMemo(() => {
  //   const hooks = {}
  //   for (const hook of spotsHooks) {
  //     hooks[hook.key] = hook
  //   }
  //   return hooks
  // }, [spotsHooks])

  useEffect(() => {
    console.log('load effect', { lastFetched, online, hooks: spotsHooks.map(h => h.key) })
    if (lastFetched === 0) {
      setLastFetched(new Date())
      setLoading(true)
      setTimeout(async () => {
        console.log('loading')
        let newSpots = []
        for (const hook of spotsHooks) {
          const hookSpots = await hook.fetchSpots({ online, settings, dispatch })
          newSpots = newSpots.concat(hookSpots)
        }

        const today = new Date()

        const annotatedSpots = []

        for (const spot of newSpots) {
          if (today - (spot.spot?.timeInMillis || 0) > (1000 * MAX_SPOT_AGE_IN_SECONDS)) {
            console.log('skip', spot.their.call, spot.spot?.timeInMillis)
            continue
          }
          // spot.our.call = ourInfo.call

          spot.our = spot.our || {}
          spot.timeOnMillis = 0
          spot.key = `${spot.spot.source}:${qsoKey(spot)}`

          await annotateQSO({ qso: spot, online, settings, dispatch, skipLookup: true })
          annotatedSpots.push(spot)
        }

        setSpots(annotatedSpots)
        setLoading(false)
      }, 0)
    }
  }, [allOperations, spotsHooks, online, settings, dispatch, lastFetched, ourInfo.call])

  useEffect(() => { // Refresh periodically
    const interval = setInterval(() => {
      setLastFetched(0)
    }, 1000 * REFRESH_INTERVAL_IN_SECONDS)
    return () => clearInterval(interval)
  })

  const refresh = useCallback(() => {
    setLastFetched(0)
  }, [])

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
      return a.freq - b.freq
    })

    return [options, filtered]
  }, [mode, bandSpots])

  const handlePress = useCallback(({ spot }) => {
    if (spot._ourSpot) return

    if (route?.params?.splitView) {
      navigation.navigate('Operation', { ...route?.params, qso: { ...spot, our: undefined, key: undefined } })
    } else {
      navigation.navigate('OpLog', { qso: { ...spot, our: undefined, key: undefined } })
    }
  }, [navigation, route?.params])

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
      <SpotList spots={filteredSpots} loading={loading} refresh={refresh} onPress={handlePress} />
    </GestureHandlerRootView>
  )
}
