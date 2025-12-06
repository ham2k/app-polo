/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { TouchableOpacity, View } from 'react-native'
import { Text } from 'react-native-paper'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useTranslation } from 'react-i18next'

import { qsoKey } from '@ham2k/lib-qson-tools'
import { BANDS, ADIF_MODES, superModeForMode, modeForFrequency } from '@ham2k/lib-operation-data'

import { selectRuntimeOnline } from '../../../../store/runtime'
import { selectAllOperations, selectOperationCallInfo } from '../../../../store/operations'
import { selectSettings, setSettings } from '../../../../store/settings'
import { useUIState } from '../../../../store/ui'
import { selectVFO } from '../../../../store/station'
import { findBestHook, findHooks } from '../../../../extensions/registry'
import { scoringHandlersForOperation } from '../../../../extensions/scoring'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { annotateQSO } from '../../OpLoggingTab/components/LoggingPanel/useCallLookup'
import SpotList from './SpotList'
import SpotFilterControls from './SpotFilterControls'
import SpotFilterIndicators from './SpotFilterIndicators'

import GLOBAL from '../../../../GLOBAL'
import { fmtNumber } from '@ham2k/lib-format-tools'

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

function prepareStyles (baseStyles, themeColor, style) {
  return {
    ...baseStyles,
    panel: {
      backgroundColor: baseStyles.theme.colors[`${themeColor}Container`],
      borderBottomColor: baseStyles.theme.colors[`${themeColor}Light`],
      borderTopColor: baseStyles.theme.colors[`${themeColor}Light`],
      borderBottomWidth: 1,
      paddingTop: baseStyles.oneSpace,
      paddingBottom: baseStyles.oneSpace,
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

export default function SpotsPanel ({ operation, qsos, sections, onSelect, style }) {
  const { t } = useTranslation()

  const themeColor = 'tertiary'
  const styles = useThemedStyles(prepareStyles, themeColor, style)

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const online = useSelector(selectRuntimeOnline)
  const vfo = useSelector(state => selectVFO(state))

  const filterState = useMemo(() => settings?.spots?.filters || {}, [settings])
  const updateFilterState = useCallback((newState) => {
    dispatch(setSettings({ spots: { ...settings?.spots, filters: { ...settings?.spots?.filters, ...newState } } }))
  }, [dispatch, settings.spots])

  const [spotsState, , updateSpotsState] = useUIState('OpSpotsTab', 'spotsState', { spots: {}, lastFetched: 0, loading: false })
  // The keys used to get this state are also referenced in `SpotHistoryExtension`

  const allOperations = useSelector(selectAllOperations)

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation.uuid))

  const [showControls, setShowControls] = useState(false)

  const spotsHooks = useMemo(() => {
    const hooks = findHooks('spots', { withFunction: 'fetchSpots' })

    ;(operation?.refs || []).forEach(ref => {
      const refHook = findBestHook(`ref:${ref.type}`)
      if (refHook?.activitySpecificSpots?.fetchSpots) {
        hooks.push({
          ...refHook.activitySpecificSpots,
          sourceName: refHook.activitySpecificSpots.sourceNameForRef({ ref, operation })
        })
      }
    })

    return hooks
  }, [operation])

  useEffect(() => { // Refresh periodically
    const interval = setInterval(() => {
      updateSpotsState({ lastFetched: 0 })
    }, 1000 * REFRESH_INTERVAL_IN_SECONDS)
    return () => clearInterval(interval)
  })

  useEffect(() => { // Ensure we refresh if we've been offline for too long
    if (spotsState.lastFetched - Date.now() > 1000 * 2 * REFRESH_INTERVAL_IN_SECONDS) {
      updateSpotsState({ lastFetched: 0 })
    }
  }, [spotsState.lastFetched, updateSpotsState])

  const refresh = useCallback(() => {
    updateSpotsState({ lastFetched: 0 })
  }, [updateSpotsState])

  useEffect(() => {
    if (spotsState.lastFetched === 0) {
      updateSpotsState({ loading: true })
      setTimeout(async () => {
        await Promise.all(
          spotsHooks.filter(hook => filterState.sources?.[hook.key] !== false && hook.fetchSpots).map(hook => {
            return hook.fetchSpots({ online, settings, dispatch, operation }).then(async spots => {
              const annotatedSpots = []
              for (const spot of spots) {
                spot.our = spot.our || {}
                spot.timeInMillis = 0
                spot.key = `${spot.spot.subSource ?? spot.spot.source}:${qsoKey(spot)}`
                if (!spot.mode) {
                  spot.mode = modeForFrequency(spot.freq, ourInfo) ?? 'SSB'
                }

                annotatedSpots.push(await annotateQSO({ qso: spot, online: false, settings, dispatch, mode: 'spots' }))
              }
              updateSpotsState({ spots: { [hook.key]: annotatedSpots } })
            })
          })
        )
        updateSpotsState({ lastFetched: new Date(), loading: false })
      }, 0)
    }
  }, [allOperations, spotsHooks, online, settings, dispatch, operation, spotsState.lastFetched, updateSpotsState, filterState.sources, ourInfo])

  const { spots: filteredSpots, options, counts } = useMemo(() => {
    const allSpots = []
    spotsHooks.filter(hook => filterState.sources?.[hook.key] !== false).forEach(hook => {
      allSpots.push(...spotsState.spots?.[hook.key] || [])
    })

    // Most recent spot primary before merging
    allSpots.sort((a, b) => b.timeInMillis - a.timeInMillis)
    const callSpots = {}
    const mergedSpots = []

    allSpots.forEach((spot) => {
      const existingSpot = callSpots?.[spot.their.call]
      // Assume divergence in frequency different spot: don't merge
      // and reasonable 30mins between spots
      if (!existingSpot ||
          Math.abs(spot.freq - existingSpot.freq) > 0.5 || // 0.5 kHz
          Math.abs(spot.spot.timeInMillis - existingSpot.spot.timeInMillis) > 1000 * 60 * 30) { // 30mins
        const newSpot = { ...spot, refs: [...spot.refs], spots: [spot.spot] }
        if (!existingSpot) callSpots[spot.their.call] = newSpot
        mergedSpots.push(newSpot)
      } else {
        existingSpot.spots.push({ ...spot.spot })
        existingSpot.refs.push(...spot.refs)
      }
    })

    return filterAndCount(mergedSpots, filterState, vfo)
  }, [spotsHooks, filterState, vfo, spotsState.spots])

  const scoredSpots = useMemo(() => {
    const scoringHandlers = scoringHandlersForOperation({ operation, settings })

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
          const score = handler.scoringForQSO({ qso: spot, qsos, operation, score: lastSection?.scores?.[ref.key ?? ref.type], ref })

          if (score?.alerts && score?.alerts[0] === 'duplicate' && (spot.spot?.type !== 'scoring')) {
            spot.spot.type = 'duplicate'
          } else if (score?.value > 0 || score?.points > 0) {
            const subSpot = spot.spots.find(s => s?.source && s?.source === ref?.type)
            if (subSpot) {
              subSpot.type = 'scoring'
              subSpot.flags = spot.spot.flags
              if (spot.spot?.type !== 'scoring') spot.spot = subSpot // Make scoring spot primary
            } else {
              spot.spot.type = 'scoring'
            }
          }
          if (score?.emoji) {
            spot.spot.emoji = score.emoji
          }

          if (score.notices) {
            score.notices.forEach(notice => (spot.spot.flags[notice] = true))
          }

          if (score.newMult) {
            spot.spot.flags.newMult = true
          }

          // if (spot?.their?.call === 'KI2D') {
          //   console.log('KI2D spot', handler.key, score, { ...spot.spot.flags })
          // }
        })
      }

      const specialLabel = GLOBAL?.flags?.specialCalls?.[spot?.their?.call?.toLowerCase()]
      if (specialLabel) {
        spot.spot.flags.specialCall = true
        spot.spot.callLabel = specialLabel
      }
      return spot
    })
  }, [operation, settings, filteredSpots, ourInfo.call, sections, qsos])

  const mergedOpSpots = useMemo(() => {
    const _mergedSpots = []
    scoredSpots.forEach((spot) => {
      // if (spot.spot?.key?.endsWith('-special')) {
      //   mOpSpots.push(spot)
      //   return
      // }

      // Not digital as could be multiple people on one freq. e.g. FT8
      const matchingSpot = superModeForMode(spot.mode) !== 'DATA' && _mergedSpots.find(otherSpot => (
        spot.spot.type === otherSpot.spot.type && // Don't mix scoring and dupes
          Math.abs(spot.freq - otherSpot.freq) <= 0.1 && // 0.1 kHz
          Math.abs(spot.spot.timeInMillis - otherSpot.spot.timeInMillis) <= 1000 * 60 * 10 && // 10 minutes
          spot.refs.length === otherSpot.refs.length && // all refs match
          otherSpot.refs.every(ref => spot.refs.find(x => x.ref === ref.ref))
      ))
      if (matchingSpot) {
        matchingSpot.their = { ...matchingSpot.their, call: `${matchingSpot.their.call},${spot.their.call}` }
      } else {
        _mergedSpots.push(spot)
      }
    })
    return _mergedSpots
  }, [scoredSpots])

  const sectionedSpots = useMemo(() => {
    const _sections = []
    if (filterState.groupSpecialSpots !== false) {
      const specialSpots = mergedOpSpots.filter(spot => spot.spot.flags?.specialCall && spot.spot?.type !== 'duplicate')
      if (specialSpots.length > 0) {
        _sections.push({
          key: 'special',
          label: t('screens.opSpotsTab.sections.specialSpots', 'Special Spots'),
          data: specialSpots
        })
      }
      const newMults = mergedOpSpots.filter(spot => spot.spot?.flags?.newMult && spot.spot?.type !== 'duplicate')
      if (newMults.length > 0) {
        _sections.push({
          key: 'newMults',
          label: t('screens.opSpotsTab.sections.newMultipliers', 'New Multipliers'),
          data: newMults
        })
      }
    }

    if (filterState.groupCallsWithNotes) {
      const callsWithNotes = mergedOpSpots.filter(spot => spot.their?.guess?.emoji && spot.spot?.type !== 'duplicate')
      if (callsWithNotes.length > 0) {
        _sections.push({
          key: 'notes',
          label: t('screens.opSpotsTab.sections.callsOfNote', 'Calls of Note'),
          data: callsWithNotes
        })
      }
    }

    if (filterState.sortBy === 'time') {
      _sections.push({
        key: 'spots',
        label: t('screens.opSpotsTab.sections.mostRecentSpots', 'Most recent spots'),
        data: mergedOpSpots
      })
    } else {
      BANDS.forEach(band => {
        const group = mergedOpSpots.filter(spot => spot.band === band)
        if (group.length > 0) {
          _sections.push({
            key: band,
            label: t(`screens.opSpotsTab.sections.band${band}`, band),
            data: group
          })
        }
      })
    }
    return _sections
  }, [
    filterState.groupCallsWithNotes, filterState.groupSpecialSpots,
    filterState.sortBy, mergedOpSpots, t
  ])

  const spotCountText = useMemo(() => {
    if (!counts.all) {
      return t('screens.opSpotsTab.noSpots', 'No Spots')
    } else {
      if (filteredSpots.length !== counts.all) {
        const total = t('screens.opSpotsTab.spotsCount', '{{count}} Spots', { count: counts.all, fmtCount: fmtNumber(counts.all) })
        return t('screens.opSpotsTab.showingSpots', 'Showing {{count}} out of {{total}}', { count: filteredSpots.length, total })
      } else {
        return t('screens.opSpotsTab.spotsCount', '{{count}} Spots', { count: filteredSpots.length, fmtCount: fmtNumber(filteredSpots.length) })
      }
    }
  }, [counts.all, filteredSpots.length, t])

  const handlePress = useCallback(({ spot }) => {
    onSelect && onSelect({ spot })
  }, [onSelect])

  return (
    <GestureHandlerRootView style={[{ flex: 1, flexDirection: 'column', alignItems: 'stretch' }]}>
      {showControls ? (
        <View style={[styles.panel, { flex: 1, paddingBottom: 0 }]}>
          <SpotFilterControls
            style={{ paddingBottom: Math.max(style?.paddingBottom ?? 0 + styles.oneSpace, styles.oneSpace * 2), paddingRight: style?.paddingRight ?? 0 }}
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
                {spotsState.loading ? (
                  t('screens.opSpotsTab.loadingSpots', 'Loading Spots...')
                ) : (
                  spotCountText
                )}
              </Text>
            </TouchableOpacity>
          </View>
          <SpotList
            sections={sectionedSpots}
            loading={spotsState.loading}
            refresh={refresh}
            onPress={handlePress}
            style={{
              paddingBottom: style?.paddingBottom,
              paddingRight: style?.paddingRight,
              paddingLeft: style?.paddingLeft
            }}
          />
        </>
      )}
    </GestureHandlerRootView>
  )
}

export function filterAndCount (rawSpots, filterState, vfo) {
  const results = { options: {}, spots: rawSpots || [], counts: {} }

  results.counts.all = rawSpots.length

  // == SOURCES ====================
  results.counts.source = {}
  results.spots.forEach(spot => spot.spots.forEach(subSpot => {
    results.counts.source[subSpot?.source] = (results.counts.source[subSpot?.source] ?? 0) + 1
  }))

  const disabledSources = Object.keys(filterState.sources || {}).filter(x => (filterState.sources?.[x] === false))
  results.spots = results.spots.filter(spot => (
    spot.spots.length === 0 || !spot.spots.every(s => disabledSources.includes(s?.source))
  ))

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
      .map(a => ({ value: a.mode, label: `${GLOBAL.t(`screens.opSpotsTab.modeLabel.${a.mode}`, LONG_LABEL_FOR_MODE[a.mode] || a.mode)} (${a.count})` }))
  )
  results.options.mode.push({ value: 'notDigital', label: `${GLOBAL.t('screens.opSpotsTab.modeLabel.phoneOrCW', `${LONG_LABEL_FOR_MODE.PHONE} or ${LONG_LABEL_FOR_MODE.CW}`)} (${(results.counts.mode.PHONE || 0) + (results.counts.mode.CW || 0)})` })

  if (filterState.mode && filterState.mode !== 'any') {
    const mode = filterState.mode === 'auto' ? superModeForMode(vfo.mode) : filterState.mode
    results.spots = results.spots.filter(spot => {
      if (mode === 'notDigital') {
        return superModeForMode(spot.mode) !== 'DATA'
      } else {
        return superModeForMode(spot.mode) === mode
      }
    })
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
