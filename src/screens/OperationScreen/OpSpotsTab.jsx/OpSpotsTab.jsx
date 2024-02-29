import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { View } from 'react-native'
import { Icon, IconButton, Text } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useSpotsQuery } from '../../../store/apiPOTA'
import { selectSystemOnline } from '../../../store/system'
import SpotList from './components/SpotList'
import ThemedDropDown from '../../components/ThemedDropDown'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

function simplifiedMode (mode) {
  if (mode === 'CW') {
    return 'CW'
  } else if (mode === 'SSB' || mode === 'LSB' || mode === 'USB' || mode === 'FM' || mode === 'AM') {
    return 'PHONE'
  } else {
    return 'DIGITAL'
  }
}
export default function OpSpotsTab ({ navigation, route }) {
  const themeColor = 'tertiary'
  const upcasedThemeColor = 'Tertiary'
  const styles = useThemedStyles((baseStyles) => {
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
  })

  const online = useSelector(selectSystemOnline())

  const [band, setBand] = useState('any')
  const [mode, setMode] = useState('any')

  const spotsQuery = useSpotsQuery()
  const spots = useMemo(() => spotsQuery.currentData || spotsQuery.data || [], [spotsQuery])

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
        .map(key => ({ band: key, count: counts[key] })).sort((a, b) => {
          return b.count - a.count
        })
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
        .map(key => ({ mode: key, count: counts[key] })).sort((a, b) => {
          return b.count - a.count
        })
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

  const handleReload = useCallback(() => {
    spotsQuery.refetch()
  }, [spotsQuery])

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
