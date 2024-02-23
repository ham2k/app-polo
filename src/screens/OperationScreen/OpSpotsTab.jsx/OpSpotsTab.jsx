import React, { useEffect, useMemo, useState } from 'react'

import { View } from 'react-native'
import { Text } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useSpotsQuery } from '../../../store/apiPOTA'
import SpotList from './components/SpotList'
import ThemedDropDown from '../../components/ThemedDropDown'

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

  const [band, setBand] = useState('any')
  const [mode, setMode] = useState('any')

  const spots = useSpotsQuery()

  useEffect(() => {
    const interval = setInterval(() => {
      spots?.refetch()
    }, 1000 * 60)
    return () => clearInterval(interval)
  })

  const [bandOptions, bandSpots] = useMemo(() => {
    const counts = {}
    let options = [{ value: 'any', label: 'Any Band' }]
    let filtered = []

    if (spots?.status === 'fulfilled') {
      (spots?.data || []).forEach(spot => {
        counts[spot.band] = (counts[spot.band] ?? 0) + 1
      })

      options = options.concat(
        Object.keys(counts)
          .map(key => ({ band: key, count: counts[key] })).sort((a, b) => {
            return b.count - a.count
          })
          .map(b => ({ value: b.band, label: `${b.band} (${b.count})` }))
      )

      filtered = (spots?.data || [])
      if (band !== 'any') {
        filtered = filtered.filter(spot => spot.band === band)
      }
    }

    return [options, filtered]
  }, [spots, band])

  const [modeOptions, filteredSpots] = useMemo(() => {
    let options = [{ value: 'any', label: 'Any Mode' }]
    let filtered = bandSpots || []

    if (spots?.status === 'fulfilled') {
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
    }

    return [options, filtered]
  }, [spots, mode, bandSpots])

  return (
    <View style={[{ flex: 1, height: '100%', width: '100%', flexDirection: 'column' }]}>
      <View style={[{ flex: 0 }, styles.panel]}>
        <Text style={{ fontWeight: 'bold', marginBottom: styles.halfSpace }}>
          {filteredSpots ? (

            mode === 'all' && band === 'all' ? (
              `${filteredSpots.length} POTA Spots`
            ) : (
              `${filteredSpots.length} out of ${spots?.data?.length} POTA Spots`
            )
          ) : (
            'Loading POTA Spots...'
          )}
        </Text>
        <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
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
        </View>
      </View>
      <SpotList spots={filteredSpots} />
    </View>
  )
}
