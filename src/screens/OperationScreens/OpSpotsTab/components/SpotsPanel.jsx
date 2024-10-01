/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { TouchableOpacity, View } from 'react-native'
import { Text } from 'react-native-paper'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { qsoKey } from '@ham2k/lib-qson-tools'
import { BANDS, ADIF_MODES, superModeForMode, modeForFrequency } from '@ham2k/lib-operation-data'

import { selectRuntimeOnline } from '../../../../store/runtime'
import { selectAllOperations, selectOperationCallInfo } from '../../../../store/operations'
import { selectSettings, setSettings } from '../../../../store/settings'
import { useUIState } from '../../../../store/ui'
import { selectVFO } from '../../../../store/station'
import { useFindHooks } from '../../../../extensions/registry'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { annotateQSO } from '../../OpInfoTab/components/useQSOInfo'
import SpotList from './SpotList'
import SpotFilterControls from './SpotFilterControls'
import SpotFilterIndicators from './SpotFilterIndicators'
import { scoringHandlersForOperation } from '../../../../extensions/scoring'

export const LABEL_FOR_MODE = {
  CW: 'CW',
  PHONE: 'Phone',
  DIGITAL: 'Digi',
  DATA: 'Dig'
}

export const LONG_LABEL_FOR_MODE = {
  CW: 'CW',
  PHONE: 'Phone',
  DIGITAL: 'Digital',
  DATA: 'Digital'
}

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

export default function SpotsPanel ({ operation, qsos, sections, onSelect }) {
  const themeColor = 'tertiary'
  const styles = useThemedStyles(prepareStyles, themeColor)

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const online = useSelector(selectRuntimeOnline)
  const vfo = useSelector(state => selectVFO(state))

  const filterState = useMemo(() => settings?.spots?.filters || {}, [settings])
  const updateFilterState = useCallback((newState) => {
    dispatch(setSettings({ spots: { ...settings?.spots, filters: { ...settings?.spots?.filters, ...newState } } }))
  }, [dispatch, settings.spots])

  const [spotsState, , updateSpotsState] = useUIState('OpSpotsTab', 'spotsState', { rawSpots: [], lastFetched: 0, loading: false })

  const allOperations = useSelector(selectAllOperations)

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
          if (!spot.mode) {
            spot.mode = modeForFrequency(spot.freq)
          }

          annotatedSpots.push(await annotateQSO({ qso: spot, online, settings, dispatch, skipLookup: true }))
        }

        updateSpotsState({ rawSpots: annotatedSpots, loading: false })
      }, 0)
    }
  }, [
    allOperations, spotsHooks, online, settings, dispatch,
    ourInfo.call, operation, spotsState.lastFetched,
    updateSpotsState, filterState.sources
  ])

  const { spots: filteredSpots, options, counts } = useMemo(() => {
    return filterAndCount(spotsState.rawSpots, filterState, vfo)
  }, [spotsState.rawSpots, filterState, vfo])

  const scoredSpots = useMemo(() => {
    const scoringHandlers = scoringHandlersForOperation(operation, settings)

    return filteredSpots.map(rawSpot => {
      const spot = { ...rawSpot }
      spot.spot = spot.spot || {}
      spot.spot.type = undefined
      spot.spot.flags = {}

      if (spot.their?.call === ourInfo.call) {
        spot.spot.type = 'self'
      } else {
        scoringHandlers.forEach(({ handler, ref }) => {
          const lastSection = sections && sections[sections.length - 1]
          const score = handler.scoringForQSO({ qso: spot, qsos, score: lastSection?.scores?.[ref.key], ref })
          if (score?.alerts && score?.alerts[0] === 'duplicate') {
            if (spot.spot.type === 'scoring') {
              spot.spot.type = 'partialDuplicate'
            } else {
              spot.spot.type = 'duplicate'
            }
          } else if (score?.value === 0) {
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
  }, [operation, settings, filteredSpots, ourInfo.call, sections, qsos])

  const handlePress = useCallback(({ spot }) => {
    onSelect && onSelect({ spot })
  }, [onSelect])

  return (
    <GestureHandlerRootView style={[{ flex: 1, height: '100%', width: '100%', flexDirection: 'column', alignItems: 'stretch' }]}>
      {showControls ? (
        <View style={[styles.panel, { flex: 1, padding: 0, flexDirection: 'column', alignItems: 'stretch' }]}>
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
            filterState={filterState}
            updateFilterState={updateFilterState}
            refreshSpots={() => updateSpotsState({ lastFetched: 0 })}
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
              filterState={filterState}
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

  // == CONTINENT ===============
  results.counts.continent = {}
  results.spots.forEach(spot => {
    results.counts.continent[spot.their?.guess?.continent] = (results.counts.continent[spot.their?.guess?.continent] ?? 0) + 1
  })
  results.spots = results.spots.filter(spot => filterState.continents?.[spot.their?.guess?.continent] !== false)

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
    const simpleMode = superModeForMode(spot.mode)
    results.counts.mode[simpleMode] = (results.counts.mode[simpleMode] ?? 0) + 1
  })
  results.options.mode = results.options.mode.concat(
    Object.keys(results.counts.mode)
      .map(key => ({ mode: key, count: results.counts.mode[key] }))
      .sort((a, b) => ADIF_MODES.indexOf(a.mode) - ADIF_MODES.indexOf(b.mode))
      .map(a => ({ value: a.mode, label: `${LONG_LABEL_FOR_MODE[a.mode]} (${a.count})` }))
  )
  if (filterState.mode && filterState.mode !== 'any') {
    const mode = filterState.mode === 'auto' ? superModeForMode(vfo.mode) : filterState.mode
    results.spots = results.spots.filter(spot => superModeForMode(spot.mode) === mode)
  }

  if (filterState.sortBy === 'time') {
    results.spots = results.spots.sort((a, b) => {
      return b.spot.timeInMillis - a.spot.timeInMillis
    })
  } else {
    results.spots.sort((a, b) => {
      return a.freq - b.freq
    })
  }

  return results
}
