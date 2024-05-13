/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapView, { Marker, Polyline, Circle } from 'react-native-maps'
import { View, useColorScheme, Platform } from 'react-native'

import { fmtShortTimeZulu } from '../../../../tools/timeFormats'
import { distanceOnEarth, fmtDistance, locationForQSONInfo } from '../../../../tools/geoTools'

const TRANSP_PNG = require('../../../../../assets/images/transp-16.png')

const METERS_IN_ONE_DEGREE = 111111

const RGB_FOR_STRENGTH = {
  1: '217, 252, 174', // '247, 239, 126',
  2: '184, 242, 111', // '252, 234, 35',
  3: '164, 219, 61', // '247, 206, 0',
  4: '192, 227, 50', // '250, 202, 45',
  5: '237, 220, 64', // '250, 178, 45',
  6: '250, 195, 77', // '250, 168, 45',
  7: '237, 156, 50', // '252, 133, 28',
  8: '227, 90, 11', // '252, 118, 50',
  9: '227, 11, 11' // '245, 7, 7'
}

export default function MapWithQSOs ({ styles, operation, qth, qsos, settings, selectedKey }) {
  // Maps change with the actual device color scheme, not the user preferences in the app
  const deviceColorScheme = useColorScheme()

  const mappableQSOs = useMemo(() => {
    const activeQSOs = qsos.filter(qso => !qso.deleted)
    return activeQSOs
      .map(qso => {
        const location = locationForQSONInfo(qso?.their)
        const strength = strengthForQSO(qso)
        const distance = location && qth ? distanceOnEarth(location, qth, { units: settings.distanceUnits }) : null
        const distanceStr = distance ? fmtDistance(distance, { units: settings.distanceUnits }) : ''
        return { qso, location, strength, distance, distanceStr }
      })
      .filter(({ location }) => location)
      .sort((a, b) => b.strength - a.strength) // Weakest first
  }, [qsos, qth, settings])

  const initialRegion = useMemo(() => {
    const { latitude, longitude } = qth
    let latitudeMin = latitude ?? 0; let latitudeMax = latitude ?? 0; let longitudeMin = longitude ?? 0; let longitudeMax = longitude ?? 0
    for (const { location } of mappableQSOs) {
      latitudeMin = Math.min(latitudeMin, location.latitude)
      latitudeMax = Math.max(latitudeMax, location.latitude)
      longitudeMin = Math.min(longitudeMin, location.longitude)
      longitudeMax = Math.max(longitudeMax, location.longitude)
    }
    return {
      latitude: latitudeMin + (latitudeMax - latitudeMin) / 2,
      longitude: longitudeMin + (longitudeMax - longitudeMin) / 2,
      latitudeDelta: Math.abs(latitudeMax - latitudeMin) + 10,
      longitudeDelta: Math.abs(longitudeMax - longitudeMin) + 10
    }
  }, [qth, mappableQSOs])

  const [layout, setLayout] = useState()
  const handleLayout = useCallback((event) => {
    setLayout(event?.nativeEvent?.layout)
  }, [setLayout])

  const [region, setRegion] = useState(initialRegion)
  const handleRegionChange = useCallback((newRegion) => {
    newRegion.latitudeDelta = Math.abs(newRegion.latitudeDelta)
    newRegion.longitudeDelta = Math.abs(newRegion.longitudeDelta)
    setRegion(newRegion)
  }, [setRegion])

  const scale = useMemo(() => {
    if (layout?.height && region?.longitudeDelta) {
      const metersPerPixel = (region.longitudeDelta * METERS_IN_ONE_DEGREE) / layout.width
      const metersPerOneSpace = Math.floor(metersPerPixel * styles.oneSpace)
      return { metersPerPixel, metersPerOneSpace, region, layout }
    } else {
      return null
    }
  }, [layout, region, styles])

  const mapStyles = useMemo(() => {
    const newStyles = stylesForMap({ latitudeDelta: scale?.latitudeDelta, metersPerPixel: scale?.metersPerPixel, count: mappableQSOs?.length, deviceColorScheme })

    return newStyles
  }, [scale, mappableQSOs?.length, deviceColorScheme])

  return (
    <MapView
      onLayout={handleLayout}
      style={styles.root}
      initialRegion={initialRegion}
      onRegionChange={handleRegionChange}
      mapType={styles.isIOS ? 'mutedStandard' : 'terrain'}
    >
      {qth.latitude && qth.longitude && scale && (
        <>
          <Marker
            key={'qth'}
            coordinate={qth}
            title={`QTH: ${operation.grid}`}
            description={operation.title}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            tracksViewChanges={false}
            icon={TRANSP_PNG}
          >
            <View style={{ width: styles.oneSpace, height: styles.oneSpace }} />
          </Marker>
          <Circle
            center={qth}
            radius={radiusForMarker({ location: qth, scale, size: 1 })}
            fillColor={'rgba(0,180,0,1)'}
            strokeWidth={0.1}
          />
        </>
      )}
      {scale && (
        <MapMarkers
          qth={qth}
          qsos={mappableQSOs}
          mapStyles={mapStyles}
          styles={styles}
          scale={scale}
          selectedKey={selectedKey}
        />
      )}
    </MapView>
  )
}

const MapMarkers = ({ qth, qsos, selectedKey, mapStyles, styles, scale }) => {
  const ref = useRef()

  useEffect(() => {
    if (ref.current) {
      ref.current.showCallout()
    }
  }, [ref, selectedKey])

  return (
    <>
      {qth.latitude && qth.longitude && qsos.map(({ qso, location, strength }) => (
        <Polyline
          key={qso.key}
          geodesic={true}
          coordinates={[location, qth]}
          {...mapStyles.line}
        />
      ))}
      {qsos.map(({ qso, location, strength, distanceStr }) => (
        <React.Fragment key={qso.key}>
          <Marker
            coordinate={location}
            ref={selectedKey && selectedKey === qso.key ? ref : undefined}
            anchor={{ x: 0.5, y: 0.5 }}
            title={[qso.their.call, distanceStr].join(' • ')}
            description={[qso.their?.sent, qso.mode, qso.band, fmtShortTimeZulu(qso.startOnMillis)].join(' • ')}
            flat={true}
            tracksViewChanges={false}
            icon={TRANSP_PNG}
          >
            <View width={12} height={12} style={{ width: styles.oneSpace * mapStyles.marker.size, height: styles.oneSpace * mapStyles.marker.size }}>
              <View />{/* Empty View */}
            </View>
          </Marker>
          <Circle
            center={location}
            radius={radiusForMarker({ location, scale, size: mapStyles.marker.size })}
            fillColor={`rgba(${RGB_FOR_STRENGTH[strength] ?? RGB_FOR_STRENGTH[5]}, ${mapStyles.marker.opacity})`}
            strokeWidth={0.1}
          />
        </React.Fragment>
      ))}
    </>
  )
}

function radiusForMarker ({ location, size, scale }) {
  const latitude = Math.abs(location.latitude ?? location.lat)
  let latitudeScale
  if (latitude > 85) latitudeScale = 0.006
  else if (latitude > 80) latitudeScale = 0.27
  else if (latitude > 75) latitudeScale = 0.37
  else if (latitude > 70) latitudeScale = 0.55
  else if (latitude > 65) latitudeScale = 0.7
  else if (latitude > 60) latitudeScale = 0.9
  else if (latitude > 50) latitudeScale = 1
  else if (latitude > 40) latitudeScale = 1.1
  else if (latitude > 30) latitudeScale = 1.4
  else if (latitude > 20) latitudeScale = 1.5
  else if (latitude > 10) latitudeScale = 1.8
  else latitudeScale = 2

  return (scale.metersPerOneSpace * size * latitudeScale) / 2
}

function strengthForQSO (qso) {
  try {
    if (qso.mode === 'CW' || qso.mode === 'RTTY') {
      return Math.floor(qso.their?.sent || 555 / 10) % 10
    } else if (qso.mode === 'FT8' || qso.mode === 'FT4') {
      const signal = (qso.their?.sent || -10)
      // map signal report from -20 to +10 into 1 to 9
      const remapped = (9 - 1) / (10 - (-20)) * (signal - (-20)) + 1
      return Math.min(9, Math.max(1, Math.round(remapped)))
    } else {
      return (qso.their?.sent || 55) % 10
    }
  } catch (e) {
    return 5
  }
}

function stylesForMap ({ longitudeDelta, metersPerPixel, count, deviceColorScheme }) {
  // in iOS, maps change with the actual device color scheme, not the user preferences in the app

  if (count > 50) {
    longitudeDelta = longitudeDelta * 1.5
  }

  if (Platform.OS === 'ios') {
    const darkMode = Platform.OS === 'ios' && deviceColorScheme === 'dark'
    if (metersPerPixel > 32000) {
      return { marker: { opacity: 0.7, size: 0.5 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '40,40,40'}, 0.3)` } }
    } else if (metersPerPixel > 16000) {
      return { marker: { opacity: 0.7, size: 0.7 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '40,40,40'}, 0.3)` } }
    } else if (metersPerPixel > 8000) {
      return { marker: { opacity: 0.8, size: 0.9 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '40,40,40'}, 0.3)` } }
    } else if (metersPerPixel > 4000) {
      return { marker: { opacity: 0.7, size: 1 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '60,60,60'}, 0.4)` } }
    } else if (metersPerPixel > 2000) {
      return { marker: { opacity: 0.7, size: 1 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '60,60,60'}, 0.4)` } }
    } else if (metersPerPixel > 1000) {
      return { marker: { opacity: 0.7, size: 1.05 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '60,60,60'}, 0.4)` } }
    } else if (metersPerPixel > 500) {
      return { marker: { opacity: 1, size: 1.1 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '75,75,75'}, 0.4)` } }
    } else if (metersPerPixel > 100) {
      return { marker: { opacity: 1, size: 1.2 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '75,75,75'}, 0.5)` } }
    } else {
      return { marker: { opacity: 1, size: 1.4 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '75,75,75'}, 0.5)` } }
    }
  } else {
    if (metersPerPixel > 32000) {
      return { marker: { opacity: 0.7, size: 0.7 }, line: { strokeColor: 'rgba(40,40,40,0.4)' } }
    } else if (metersPerPixel > 16000) {
      return { marker: { opacity: 0.7, size: 0.8 }, line: { strokeColor: 'rgba(40,40,40,0.4)' } }
    } else if (metersPerPixel > 8000) {
      return { marker: { opacity: 0.8, size: 0.9 }, line: { strokeColor: 'rgba(40,40,40,0.5)' } }
    } else if (metersPerPixel > 4000) {
      return { marker: { opacity: 0.7, size: 1 }, line: { strokeColor: 'rgba(60,60,60,0.5)' } }
    } else if (metersPerPixel > 2000) {
      return { marker: { opacity: 0.7, size: 1 }, line: { strokeColor: 'rgba(60,60,60,0.6)' } }
    } else if (metersPerPixel > 1000) {
      return { marker: { opacity: 0.7, size: 1.05 }, line: { strokeColor: 'rgba(60,60,60,0.6)' } }
    } else if (metersPerPixel > 500) {
      return { marker: { opacity: 1, size: 1.1 }, line: { strokeColor: 'rgba(75,75,75,0.7)' } }
    } else if (metersPerPixel > 100) {
      return { marker: { opacity: 1, size: 1.2 }, line: { strokeColor: 'rgba(75,75,75,0.7)' } }
    } else {
      return { marker: { opacity: 1, size: 1.4 }, line: { strokeColor: 'rgba(75,75,75,0.7)' } }
    }
  }
}
