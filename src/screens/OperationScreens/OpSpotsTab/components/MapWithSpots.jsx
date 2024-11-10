/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapView, { Marker, Polyline, Circle, Callout } from 'react-native-maps'
import { View, useColorScheme, Platform } from 'react-native'

import { fmtShortTimeZulu } from '../../../../tools/timeFormats'
import { distanceOnEarth, fmtDistance, locationForQSONInfo } from '../../../../tools/geoTools'
import { stylesForMap } from '../../OpMapTab/components/MapWithQSOs'
import { Text } from 'react-native-paper'

const TRANSP_PNG = require('../../../../../assets/images/transp-16.png')

const METERS_IN_ONE_DEGREE = 111111

// @todo qth, loading, refresh, selectedKey
export default function MapWithSpots ({ styles, operation, qth, spots, loading, refresh, settings, selectedKey }) {
  // Maps change with the actual device color scheme, not the user preferences in the app
  const deviceColorScheme = useColorScheme()

  const mappableSpots = useMemo(() => {
    return spots
      .map(spot => {
        // @todo don't think this works for spots, figure out how to get qson or another way to get spot location
        const location = locationForQSONInfo(spot?.their)
        const distance = location && qth ? distanceOnEarth(location, qth, { units: settings.distanceUnits }) : null
        const distanceStr = distance ? fmtDistance(distance, { units: settings.distanceUnits }) : ''
        return { spot, location, distance, distanceStr }
      })
      .filter(({ location }) => location)
      .sort((a, b) => b.strength - a.strength) // @todo Oldest first
  }, [spots, qth, settings])

  const initialRegion = useMemo(() => {
    const { latitude, longitude } = qth
    let latitudeMin = latitude ?? 0; let latitudeMax = latitude ?? 0; let longitudeMin = longitude ?? 0; let longitudeMax = longitude ?? 0
    for (const { location } of mappableSpots) {
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
  }, [qth, mappableSpots])

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
    const newStyles = stylesForMap({ latitudeDelta: scale?.latitudeDelta, metersPerPixel: scale?.metersPerPixel, count: mappableSpots?.length, deviceColorScheme })

    return newStyles
  }, [scale, mappableSpots?.length, deviceColorScheme])

  return (
    <MapView
      onLayout={handleLayout}
      style={styles.root}
      initialRegion={initialRegion}
      onRegionChange={handleRegionChange}
      cameraZoomRange={{ animated: false }}
      mapType={styles.isIOS ? 'mutedStandard' : 'terrain'}
    >
      {qth.latitude && qth.longitude && scale?.metersPerOneSpace && (
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
        <MapMarkers
          qth={qth}
          spots={mappableSpots}
          mapStyles={mapStyles}
          styles={styles}
          metersPerOneSpace={scale?.metersPerOneSpace}
          selectedKey={selectedKey}
        />
      )}
    </MapView>
  )
}

const MapMarkers = React.memo(function MapMarkers ({ qth, spots, selectedKey, mapStyles, styles, metersPerOneSpace }) {
  const ref = useRef()

  useEffect(() => {
    if (ref.current) {
      ref.current.showCallout()
    }
  }, [ref, selectedKey])

  return (
    <>
      {qth.latitude && qth.longitude && spots.map(({ spot, location, strength }) => (
        <Polyline
          key={`${spot.key}-line-${metersPerOneSpace}`}
          geodesic={true}
          coordinates={[location, qth]}
          {...mapStyles.line}
        />
      ))}
      {spots.map(({ spot, location, strength, distanceStr }) => (
        <React.Fragment key={spot.key}>
          <Marker
            key={`${spot.key}-marker-${metersPerOneSpace}`}
            coordinate={location}
            ref={selectedKey && selectedKey === spot.key ? ref : undefined}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            tracksViewChanges={false}
            image={TRANSP_PNG}
          >
            <Callout>
              <View>
                <Text style={{ fontWeight: 'bold', color: '#333' }}>
                  {spot.their?.call} • {distanceStr}
                </Text>
                <Text style={{ color: '#333' }}>
                  {spot.their?.sent}
                  {' • '}{spot.mode}
                  {' • '}<Text style={{ fontWeight: 'bold', color: colorForText({ spot, styles, mapStyles }) }}>{spot.band}</Text>
                  {' • '}{fmtShortTimeZulu(spot.startAtMillis)}
                </Text>
              </View>
            </Callout>
          </Marker>
          <Circle
            key={`${spot.key}-circle-${metersPerOneSpace}`}
            center={location}
            radius={radiusForMarker({ spot, strength, location, metersPerOneSpace, size: mapStyles.marker.size })}
            fillColor={colorForMarker({ spot, location, strength, styles, mapStyles })}
            strokeWidth={0.1}
          />
        </React.Fragment>
      ))}
    </>
  )
})

function radiusForMarker ({ qso, strength, location, size, metersPerOneSpace }) {
  const latitude = Math.abs(location.latitude ?? location.lat)

  const latitudeScale = Math.cos(latitude * Math.PI / 180)

  const baseRadius = (metersPerOneSpace * size * latitudeScale) / 2

  // A signal strength of 5 is 100% radius. 9 is 130% radius. 1 is 70% radius.
  return baseRadius * (1 + (((strength || 5) - 5) / ((9 - 1) / 2) * 0.30))
}

function colorForMarker ({ qso, location, strength, styles, mapStyles }) {
  return styles.colors.bands[qso.band] || styles.colors.bands.default
}

function colorForText ({ qso, styles, mapStyles }) {
  return styles.colors.bands[qso.band] || styles.colors.bands.default
}
