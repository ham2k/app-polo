/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { TouchableOpacity, View } from 'react-native'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectRuntimeOnline } from '../../../store/runtime'
import SpotList from './components/SpotList'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BANDS, ADIF_MODES } from '@ham2k/lib-operation-data'
import { selectAllOperations, selectOperationCallInfo } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { findBestHook, useFindHooks } from '../../../extensions/registry'
import { annotateQSO } from '../OpInfoTab/components/useQSOInfo'
import { qsoKey } from '@ham2k/lib-qson-tools'
import { selectQSOs } from '../../../store/qsos'
import { useUIState } from '../../../store/ui'
import SpotFilterControls from './components/SpotFilterControls'
import SpotFilterIndicators from './components/SpotFilterIndicators'
import { selectVFO } from '../../../store/station/stationSlice'
import { Text } from 'react-native-paper'

export function simplifiedMode (mode) {
  if (mode === 'CW') {
    return 'CW'
  } else if (mode === 'SSB' || mode === 'LSB' || mode === 'USB' || mode === 'FM' || mode === 'AM') {
    return 'PHONE'
  } else {
    return 'DIGITAL'
  }
}

export const LABEL_FOR_MODE = {
  CW: 'CW',
  PHONE: 'Phone',
  DIGITAL: 'Digi'
}

export const LONG_LABEL_FOR_MODE = {
  CW: 'CW',
  PHONE: 'Phone',
  DIGITAL: 'Digital'
}

// const MAX_SPOT_AGE_IN_SECONDS = 30 * 60
const REFRESH_INTERVAL_IN_SECONDS = 60

function prepareStyles (baseStyles, themeColor) {
  return {
    ...baseStyles,
    panel: {
      backgroundColor: baseStyles.theme.colors[`${themeColor}Container`],
      borderBottomColor: baseStyles.theme.colors[`${themeColor}Light`],
      borderTopColor: baseStyles.theme.colors[`${themeColor}Light`],
      borderBottomWidth: 1,
      padding: baseStyles.oneSpace,
      flexDirection: 'column'
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

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const online = useSelector(selectRuntimeOnline)
  const vfo = useSelector(state => selectVFO(state))

  const [filterState] = useUIState('OpSpotsTab', 'filterState', {})
  const [spotsState, , updateSpotsState] = useUIState('OpSpotsTab', 'spotsState', { rawSpots: [], lastFetched: 0, loading: false })

  const allOperations = useSelector(selectAllOperations)

  const operation = route.params.operation
  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation.uuid))

  const [showControls, setShowControls] = useState(false)

  const spotsHooks = useFindHooks('spots')

  useEffect(() => { // Refresh periodically
    const interval = setInterval(() => {
      updateSpotsState({ lastFetched: 0 })
    }, 1000 * REFRESH_INTERVAL_IN_SECONDS)
    return () => clearInterval(interval)
  })

  const refresh = useCallback(() => {
    updateSpotsState({ lastFetched: 0 })
  }, [updateSpotsState])

  useEffect(() => {
    if (spotsState.lastFetched === 0) {
      updateSpotsState({ lastFetched: new Date(), loading: true })
      setTimeout(async () => {
        console.log('load timeout')
        let newSpots = []
        for (const hook of spotsHooks) {
          if (filterState.sources?.[hook.key] !== false) {
            const hookSpots = await hook.fetchSpots({ online, settings, dispatch })
            newSpots = newSpots.concat(hookSpots)
          }
        }

        const annotatedSpots = []

        for (const spot of newSpots) {
          spot.our = spot.our || {}
          spot.timeOnMillis = 0
          spot.key = `${spot.spot.source}:${qsoKey(spot)}`

          await annotateQSO({ qso: spot, online, settings, dispatch, skipLookup: true })

          annotatedSpots.push(spot)
        }

        updateSpotsState({ rawSpots: annotatedSpots, loading: false })
      }, 0)
    }
  }, [
    allOperations, spotsHooks, online, settings, dispatch,
    ourInfo.call, operation, qsos, spotsState.lastFetched,
    updateSpotsState, filterState.sources
  ])

  useEffect(() => { console.log('filterState', filterState) }, [filterState])

  const { spots: filteredSpots, options, counts } = useMemo(() => {
    console.log('filtering spots', spotsState.rawSpots?.length, filterState)
    return filterAndCount(spotsState.rawSpots, filterState, vfo)
  }, [spotsState.rawSpots, filterState, vfo])

  const scoredSpots = useMemo(() => {
    const scoringRefHandlers = (operation?.refs || []).map(ref => (
      { handler: findBestHook(`ref:${ref.type}`), ref }
    ))?.filter(x => x?.handler && x.handler.scoringForQSO)

    return filteredSpots.map(rawSpot => {
      const spot = { ...rawSpot }
      spot.spot = spot.spot || {}
      spot.spot.type = undefined
      spot.spot.flags = {}

      if (spot.their?.call === ourInfo.call) {
        spot.spot.type = 'self'
      } else {
        scoringRefHandlers.forEach(({ handler, ref }) => {
          const score = handler.scoringForQSO({ qso: spot, qsos, operation, ref })
          if (score?.alerts && score?.alerts[0] === 'duplicate') {
            if (spot.spot.type === 'scoring') {
              spot.spot.type = 'partialDuplicate'
            } else {
              spot.spot.type = 'duplicate'
            }
          } else if (score?.counts === '0') {
            spot.spot.type = spot.spot.type || 'nonScoring'
          } else {
            spot.spot.type = spot.spot.type || 'scoring'
          }

          if (score.notices) {
            score.notices.forEach(notice => (spot.spot.flags[notice] = true))
          }
        })
      }
      return spot
    })
  }, [operation, filteredSpots, ourInfo.call, qsos])

  const handlePress = useCallback(({ spot }) => {
    if (spot._ourSpot) return

    if (route?.params?.splitView) {
      navigation.navigate('Operation', { ...route?.params, qso: { ...spot, our: undefined, key: undefined } })
    } else {
      navigation.navigate('OpLog', { qso: { ...spot, our: undefined, key: undefined } })
    }
  }, [navigation, route?.params])

  return (
    <GestureHandlerRootView style={[{ flex: 1, height: '100%', width: '100%', flexDirection: 'column', alignItems: 'stretch' }]}>
      {showControls ? (
        <View style={[{ flex: 1, flexDirection: 'column', alignItems: 'center' }, styles.panel]}>
          <SpotFilterControls
            rawSpots={spotsState.rawSpots}
            filteredSpots={scoredSpots}
            options={options}
            counts={counts}
            spotsSources={spotsHooks}
            operation={operation}
            vfo={vfo}
            styles={styles}
            themeColor={themeColor}
            settings={settings}
            online={online}
            onDone={() => setShowControls(false)}
          />
        </View>
      ) : (
        <>
          <View style={[{ flex: 0, flexDirection: 'column', alignItems: 'center' }, styles.panel]}>
            <SpotFilterIndicators
              operation={operation}
              vfo={vfo}
              styles={styles}
              themeColor={themeColor}
              settings={settings}
              online={online}
              onPress={() => setShowControls(true)}
            />
            <TouchableOpacity onPress={() => setShowControls(true)} style={{ flex: 0, flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace, alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', marginTop: styles.halfSpace, textAlign: 'center' }}>
                {filteredSpots ? (
                  filterState.mode === 'any' && filterState.band === 'any' ? (
                `${filteredSpots.length} Spots`
                  ) : (
                `Showing ${filteredSpots.length} out of ${spotsState.rawSpots?.length} Spots`
                  )
                ) : (
                  'Loading Spots...'
                )}
              </Text>
            </TouchableOpacity>
          </View>
          <SpotList spots={scoredSpots} loading={spotsState.loading} refresh={refresh} onPress={handlePress} />
        </>
      )}
    </GestureHandlerRootView>
  )
}

export function filterAndCount (rawSpots, filterState, vfo) {
  const results = { options: {}, spots: rawSpots || [], counts: {} }

  // == SOURCES ====================
  results.counts.source = {}
  results.spots.forEach(spot => {
    results.counts.source[spot.spot?.source] = (results.counts.source[spot.spot?.source] ?? 0) + 1
  })

  ;(Object.keys(filterState.sources || {}))
    .filter(x => (filterState.sources?.[x] === false))
    .forEach(disabledSource => {
      results.spots = results.spots.filter(spot => !(spot.spot?.source === disabledSource))
    })

  // == AGE =====================
  const today = new Date()

  if (filterState.ageInMinutes && filterState.ageInMinutes > 0) {
    results.spots = results.spots.filter(spot => {
      return (today - (spot.spot?.timeInMillis || 0) <= (1000 * 60 * filterState.ageInMinutes))
    })
  }

  // == BAND ====================
  results.counts.band = {}
  results.options.band = []

  results.spots.forEach(spot => {
    results.counts.band[spot.band] = (results.counts.band[spot.band] ?? 0) + 1
  })
  results.options.band = results.options.band.concat(
    Object.keys(results.counts.band)
      .map(key => ({ band: key, count: results.counts.band[key] }))
      .sort((a, b) => BANDS.indexOf(a.band) - BANDS.indexOf(b.band))
      .map(b => ({ value: b.band, label: `${b.band} (${b.count})` }))
  )
  if (filterState.band && filterState.band !== 'any') {
    const band = filterState.band === 'auto' ? vfo.band : filterState.band
    results.spots = results.spots.filter(spot => spot.band === band)
  }

  // == MODE ====================
  results.counts.mode = {}
  results.options.mode = []

  results.spots.forEach(spot => {
    const simpleMode = simplifiedMode(spot.mode)
    results.counts.mode[simpleMode] = (results.counts.mode[simpleMode] ?? 0) + 1
  })
  results.options.mode = results.options.mode.concat(
    Object.keys(results.counts.mode)
      .map(key => ({ mode: key, count: results.counts.mode[key] }))
      .sort((a, b) => ADIF_MODES.indexOf(a.mode) - ADIF_MODES.indexOf(b.mode))
      .map(a => ({ value: a.mode, label: `${LONG_LABEL_FOR_MODE[a.mode]} (${a.count})` }))
  )
  if (filterState.mode && filterState.mode !== 'any') {
    const mode = filterState.mode === 'auto' ? simplifiedMode(vfo.mode) : filterState.mode
    results.spots = results.spots.filter(spot => simplifiedMode(spot.mode) === mode)
  }

  results.spots.sort((a, b) => {
    return a.freq - b.freq
  })

  return results
}
