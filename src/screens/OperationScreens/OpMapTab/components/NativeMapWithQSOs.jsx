/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import MapView, { Marker, Circle } from 'react-native-maps'
import { View, useColorScheme, Platform } from 'react-native'

import { NativeMapMarkers } from './NativeMapMarkers'

const TRANSP_PNG = require('../../../../../assets/images/transp-16.png')

const METERS_IN_ONE_DEGREE = 111111

export default function NativeMapWithQSOs ({ styles, mappableQSOs, initialRegion, operation, qth, settings, selectedUUID }) {
  // Maps change with the actual device color scheme, not the user preferences in the app
  const deviceColorScheme = useColorScheme()

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

  const [scale, setScale] = useState()
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (layout?.height && region?.longitudeDelta) {
        const metersPerPixel = (region.longitudeDelta * METERS_IN_ONE_DEGREE) / layout.width
        const metersPerOneSpace = Math.floor(metersPerPixel * styles.oneSpace)
        setScale({ metersPerPixel, metersPerOneSpace })
      }
    }, 50)
    return () => clearTimeout(timeout)
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
      cameraZoomRange={{ animated: false }}
      mapType={styles.isIOS ? 'mutedStandard' : 'terrain'}
    >
      {qth?.latitude && qth?.longitude && scale?.metersPerOneSpace && (
        <>
          <Marker
            key={'qth-marker'}
            coordinate={qth}
            title={`QTH: ${operation.grid}`}
            description={operation.title}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            tracksViewChanges={false}
            image={TRANSP_PNG}
          >
            <View style={{ width: styles.oneSpace, height: styles.oneSpace }} />
          </Marker>
          <Circle
            key={'qth-circle'}
            center={qth}
            radius={radiusForMarker({ location: qth, metersPerOneSpace: scale?.metersPerOneSpace, size: mapStyles.marker.size })}
            fillColor={'rgba(0,0,0,1)'}
            strokeWidth={0.1}
          />
        </>
      )}
      {scale?.metersPerOneSpace && (
        <NativeMapMarkers
          qth={qth}
          qsos={mappableQSOs}
          mapStyles={mapStyles}
          styles={styles}
          metersPerOneSpace={scale?.metersPerOneSpace}
          selectedUUID={selectedUUID}
        />
      )}
    </MapView>
  )
}

function radiusForMarker ({ qso, strength, location, size, metersPerOneSpace }) {
  const latitude = Math.abs(location?.latitude ?? location?.lat ?? 0)

  const latitudeScale = Math.cos(latitude * Math.PI / 180)

  const baseRadius = (metersPerOneSpace * size * latitudeScale) / 2

  // A signal strength of 5 is 100% radius. 9 is 130% radius. 1 is 70% radius.
  return baseRadius * (1 + (((strength || 5) - 5) / ((9 - 1) / 2) * 0.30))
}

function stylesForMap ({ longitudeDelta, metersPerPixel, count, deviceColorScheme }) {
  // in iOS, maps change with the actual device color scheme, not the user preferences in the app

  if (count > 50) {
    longitudeDelta = longitudeDelta * 1.5
  }

  if (Platform.OS === 'ios') {
    const darkMode = Platform.OS === 'ios' && deviceColorScheme === 'dark'
    if (metersPerPixel > 32000) {
      return { marker: { opacity: 0.7, size: 1 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '40,40,40'}, 0.3)` } }
    } else if (metersPerPixel > 16000) {
      return { marker: { opacity: 0.7, size: 1.4 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '40,40,40'}, 0.3)` } }
    } else if (metersPerPixel > 8000) {
      return { marker: { opacity: 0.8, size: 1.8 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '40,40,40'}, 0.3)` } }
    } else if (metersPerPixel > 4000) {
      return { marker: { opacity: 0.7, size: 2 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '60,60,60'}, 0.4)` } }
    } else if (metersPerPixel > 2000) {
      return { marker: { opacity: 0.7, size: 2 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '60,60,60'}, 0.4)` } }
    } else if (metersPerPixel > 1000) {
      return { marker: { opacity: 0.7, size: 2.1 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '60,60,60'}, 0.4)` } }
    } else if (metersPerPixel > 500) {
      return { marker: { opacity: 1, size: 2.2 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '75,75,75'}, 0.4)` } }
    } else if (metersPerPixel > 100) {
      return { marker: { opacity: 1, size: 2.4 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '75,75,75'}, 0.5)` } }
    } else {
      return { marker: { opacity: 1, size: 2.8 }, line: { strokeColor: `rgba(${darkMode ? '180,180,180' : '75,75,75'}, 0.5)` } }
    }
  } else {
    if (metersPerPixel > 32000) {
      return { marker: { opacity: 0.7, size: 1.4 }, line: { strokeColor: 'rgba(40,40,40,0.4)' } }
    } else if (metersPerPixel > 16000) {
      return { marker: { opacity: 0.7, size: 1.6 }, line: { strokeColor: 'rgba(40,40,40,0.4)' } }
    } else if (metersPerPixel > 8000) {
      return { marker: { opacity: 0.8, size: 1.8 }, line: { strokeColor: 'rgba(40,40,40,0.5)' } }
    } else if (metersPerPixel > 4000) {
      return { marker: { opacity: 0.7, size: 2 }, line: { strokeColor: 'rgba(60,60,60,0.5)' } }
    } else if (metersPerPixel > 2000) {
      return { marker: { opacity: 0.7, size: 2 }, line: { strokeColor: 'rgba(60,60,60,0.6)' } }
    } else if (metersPerPixel > 1000) {
      return { marker: { opacity: 0.7, size: 2.1 }, line: { strokeColor: 'rgba(60,60,60,0.6)' } }
    } else if (metersPerPixel > 500) {
      return { marker: { opacity: 1, size: 2.2 }, line: { strokeColor: 'rgba(75,75,75,0.7)' } }
    } else if (metersPerPixel > 100) {
      return { marker: { opacity: 1, size: 2.4 }, line: { strokeColor: 'rgba(75,75,75,0.7)' } }
    } else {
      return { marker: { opacity: 1, size: 2.8 }, line: { strokeColor: 'rgba(75,75,75,0.7)' } }
    }
  }
}
