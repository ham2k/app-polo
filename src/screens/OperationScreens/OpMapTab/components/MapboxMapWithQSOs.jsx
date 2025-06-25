/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Mapbox, { StyleURL, Camera, CircleLayer, LineLayer, MapView, MarkerView, ShapeSource, Atmosphere } from '@rnmapbox/maps'
import { Platform, View } from 'react-native'
import { Text } from 'react-native-paper'
import Config from 'react-native-config'

import { fmtShortTimeZulu } from '../../../../tools/timeFormats'

if (Platform.OS === 'ios') {
  Mapbox.setWellKnownTileServer('mapbox')
}

Mapbox.setAccessToken(Config.MAPBOX_ACCESS_TOKEN)

const DEFAULT_CENTER = [-42.16482008420197, 33.73113551794721]
const DEFAULT_ZOOM = 2

export default function MapboxMapWithQSOs ({ styles, mappableQSOs, initialRegion, operation, qth, qsos, settings, selectedUUID, projection }) {
  const qsosGeoJSON = useMemo(() => _geoJSONMarkersForQSOs({ mappableQSOs, qth, operation, styles }), [mappableQSOs, qth, operation, styles])
  const linesGeoJSON = useMemo(() => _getJSONLinesForQSOs({ mappableQSOs, qth, operation, styles }), [mappableQSOs, qth, operation, styles])

  const circleStyles = useMemo(() => {
    const newStyles = {
      circleOpacity: 1,
      circleColor: ['coalesce', ['get', 'color'], '#000000'],
      circleRadius: [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, ['*', ['coalesce', ['get', 'strengthFactor'], 1], 3],
        6, ['*', ['coalesce', ['get', 'strengthFactor'], 1], 5],
        10, ['*', ['coalesce', ['get', 'strengthFactor'], 1], 20]
      ],
      circleStrokeWidth: [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 0.6, // At zoom level 5, circle radius is 0.6px
        10, 2 // At zoom level 10, circle radius is 2px
      ],
      circleStrokeColor: '#000000'
    }
    Object.keys(styles.colors.bands).forEach(band => {
      newStyles.circleColor.push(band)
      newStyles.circleColor.push(styles.colors.bands[band])
    })
    newStyles.circleColor.push('#FF0000')

    return newStyles
  }, [styles.colors.bands])

  const linesStyles = useMemo(() => ({
    lineColor: '#000000',
    lineOpacity: [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 0.5,
      5, 0.8,
      10, 0.9
    ],
    lineWidth: [
      'interpolate',
      ['linear'],
      ['zoom'],
      5, 0.7, // At zoom level 5, line width is 0.6px
      10, 3 // At zoom level 10, line width is 2px
    ]
  }), [])

  const [selectedFeature, setSelectedFeature] = useState(null)
  const handleMapPress = useCallback((event) => {
    if (event?.features?.length > 0) {
      setSelectedFeature(event.features[0])
    } else if (selectedFeature) {
      setSelectedFeature(null)
    }
  }, [selectedFeature])

  const mapRef = useRef()
  const [camera, setCamera] = useState(null)
  const cameraRefCallback = useCallback((currentRef) => {
    if (!camera && currentRef) {
      setCamera(currentRef)
    }
  }, [camera])

  useEffect(() => {
    if (camera) {
      if (initialRegion?.latitudeDelta > 0) {
        setTimeout(() => {
          camera.fitBounds(
            initialRegion.boundingBox[0],
            initialRegion.boundingBox[1],
            [50, 50],
            500
          )
        }, 100)
      }
    }
  }, [initialRegion, qth, camera])

  return (
    <MapView
      ref={mapRef}
      style={styles.root}
      projection={projection}
      compassEnabled={false}
      rotateEnabled={projection === 'globe'}
      attributionPosition={{ bottom: Platform.OS === 'ios' ? 8 : 10, left: Platform.OS === 'ios' ? 90 : 100 }}
      logoPosition={{ bottom: 10, left: 10 }}
      scaleBarEnabled={false}
      onPress={handleMapPress}
      requestDisallowInterceptTouchEvent={true}
      styleUrl={StyleURL.Satellite}
    >
      <Camera
        ref={cameraRefCallback}
        centerCoordinate={qth?.longitude && qth?.latitude ? [qth.longitude, qth.latitude] : DEFAULT_CENTER}
        zoomLevel={DEFAULT_ZOOM}
        animationDuration={0}
      />

      {projection === 'globe' && (
        <>
          <Atmosphere
            style={{
              color: 'rgb(115, 155, 197)',
              highColor: 'rgb(41, 74, 149)',
              horizonBlend: 0.02,
              spaceColor: 'rgb(11, 11, 11)',
              starIntensity: 0.6
            }}
          />
        </>
      )}

      <FeatureCallout feature={selectedFeature} qth={qth} operation={operation} styles={styles} />

      {qsosGeoJSON && (
        <ShapeSource id="qsos-source" shape={qsosGeoJSON} onPress={handleMapPress}>
          <CircleLayer id="qsos-circles" style={circleStyles} layerIndex={100} />
        </ShapeSource>
      )}
      {linesGeoJSON && (
        <ShapeSource id="qsos-lines-source" shape={linesGeoJSON} onPress={handleMapPress}>
          <LineLayer id="qsos-lines" style={linesStyles} layerIndex={99} />
        </ShapeSource>
      )}

    </MapView>
  )
}

const FeatureCallout = ({ feature, qth, operation, styles }) => {
  if (feature?.properties?.callout) {
    return (
      <MarkerView coordinate={feature.geometry.coordinates} anchor={{ x: 0.5, y: 1.2 }}>
        <View style={{ backgroundColor: 'white', minWidth: styles.oneSpace * 10, padding: 10, borderRadius: 5 }}>
          <Text style={{ fontWeight: 'bold', color: '#333' }}>{feature.properties.callout}</Text>
        </View>
      </MarkerView>
    )
  } else if (feature?.properties?.qso) {
    const qso = feature.properties.qso

    return (
      <MarkerView coordinate={feature.geometry.coordinates} anchor={{ x: 0.5, y: 1.2 }}>
        <View style={{ backgroundColor: 'white', minWidth: styles.oneSpace * 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333' }}>
          <Text style={{ fontWeight: 'bold', color: '#333' }}>
            {qso.their?.call} • {feature.properties.distanceStr}
          </Text>
          <Text style={{ color: '#333' }}>
            {qso.their?.sent}
            {' • '}{qso.mode}
            {' • '}<Text style={{ fontWeight: 'bold', color: _colorForText({ qso, styles }) }}>{qso.band}</Text>
            {' • '}{fmtShortTimeZulu(qso.startAtMillis)}
          </Text>
        </View>
      </MarkerView>
    )
  }
}

function _geoJSONMarkerForQTH ({ qth, operation, styles }) {
  if (qth?.latitude && qth?.longitude) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [qth.longitude, qth.latitude]
      },
      properties: {
        color: styles.colors.bands.default,
        strenghtFactor: 1,
        callout: `QTH: ${operation.grid}`
      }
    }
  }
}

function _geoJSONMarkersForQSOs ({ mappableQSOs, qth, operation, styles }) {
  const features = []
  if (qth?.latitude && qth?.longitude) {
    features.push(_geoJSONMarkerForQTH({ qth, operation, styles }))
  }
  features.push(...mappableQSOs.map(mappableQSO => _geoJSONMarkerForQSO({ mappableQSO, qth, operation, styles })).filter(x => x))

  return {
    type: 'FeatureCollection',
    features
  }
}

function _geoJSONMarkerForQSO ({ mappableQSO, qth, operation, styles }) {
  if (mappableQSO.location) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [mappableQSO.location.longitude, mappableQSO.location.latitude]
      },
      properties: {
        color: styles.colors.bands[mappableQSO.qso.band] || styles.colors.bands.default,
        strengthFactor: _radiusForStrength({ strength: mappableQSO.strength }),
        qso: mappableQSO.qso,
        distanceStr: mappableQSO.distanceStr
      }
    }
  }
}

function _getJSONLinesForQSOs ({ mappableQSOs, qth, operation, styles }) {
  const features = mappableQSOs.map(mappableQSO => _geoJSONLineForQSO({ mappableQSO, qth, operation, styles })).flat().filter(x => x)

  return {
    type: 'FeatureCollection',
    features
  }
}

function _geoJSONLineForQSO ({ mappableQSO, qth, operation, styles }) {
  if (mappableQSO.location) {
    const start = [mappableQSO.location.longitude, mappableQSO.location.latitude]
    const end = [qth?.longitude, qth?.latitude]

    const segments = _generateGeodesicPoints(start, end)

    // If we have multiple segments, create separate features
    return segments.map(segment => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: segment
      }
    }))
  }
}

function _colorForText ({ qso, styles, mapStyles }) {
  return styles.colors.bands[qso.band] || styles.colors.bands.default
}

function _generateGeodesicPoints (start, end, numPoints = 100) {
  const [lon1, lat1] = start
  const [lon2, lat2] = end

  // Convert to radians
  const λ1 = (lon1 * Math.PI) / 180
  const φ1 = (lat1 * Math.PI) / 180
  const λ2 = (lon2 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180

  // Calculate the distance between points (d)
  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((φ2 - φ1) / 2), 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.pow(Math.sin((λ2 - λ1) / 2), 2)
  ))

  const segments = [[]] // Start with first segment
  let prevLon = null
  let prevPoint = null

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints

    // Spherical interpolation formula
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)

    // Calculate intermediate point
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
    const z = A * Math.sin(φ1) + B * Math.sin(φ2)

    // Convert back to lat/lon
    const λ = Math.atan2(y, x)
    const φ = Math.atan2(z, Math.sqrt(x * x + y * y))

    // Convert back to degrees
    const lon = ((λ * 180) / Math.PI + 540) % 360 - 180
    const lat = (φ * 180) / Math.PI
    const point = [lon, lat]

    // Handle date line crossing
    if (prevPoint !== null && Math.abs(lon - prevLon) > 180) {
      // Calculate the fraction where we cross the meridian
      const f1 = (i - 1) / numPoints
      const f2 = i / numPoints

      // Binary search to find the exact crossing point
      let fa = f1
      let fb = f2
      let crossingLat = null

      for (let j = 0; j < 8; j++) { // Increase iterations for more precision
        const fm = (fa + fb) / 2

        // Calculate point at fm
        const Am = Math.sin((1 - fm) * d) / Math.sin(d)
        const Bm = Math.sin(fm * d) / Math.sin(d)

        const xm = Am * Math.cos(φ1) * Math.cos(λ1) + Bm * Math.cos(φ2) * Math.cos(λ2)
        const ym = Am * Math.cos(φ1) * Math.sin(λ1) + Bm * Math.cos(φ2) * Math.sin(λ2)
        const zm = Am * Math.sin(φ1) + Bm * Math.sin(φ2)

        const λm = Math.atan2(ym, xm)
        const lonm = ((λm * 180) / Math.PI + 540) % 360 - 180

        if (Math.abs(lonm) > 179.99) {
          // We found our crossing point
          crossingLat = (Math.atan2(zm, Math.sqrt(xm * xm + ym * ym)) * 180) / Math.PI
          break
        }

        // Adjust search interval
        if ((prevLon < 0 && lonm < 0) || (prevLon > 0 && lonm > 0)) {
          fa = fm
        } else {
          fb = fm
        }
      }

      // Only add crossing points if we found a valid latitude
      if (crossingLat !== null && !isNaN(crossingLat)) {
        if (prevLon < 0) {
          segments[segments.length - 1].push([-180, crossingLat])
          segments.push([[180, crossingLat]]) // Start new segment
        } else {
          segments[segments.length - 1].push([180, crossingLat])
          segments.push([[-180, crossingLat]]) // Start new segment
        }
      }
    }

    segments[segments.length - 1].push(point)
    prevLon = lon
    prevPoint = point
  }

  return segments
}

function _radiusForStrength ({ strength }) {
  // A signal strength of 5 is 100% radius. 9 is 130% radius. 1 is 70% radius.
  return (1 + (((strength || 5) - 5) / ((9 - 1) / 2) * 0.30))
}
