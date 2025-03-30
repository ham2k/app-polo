/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Mapbox, { Camera, CircleLayer, LineLayer, MapView, MarkerView, ShapeSource } from '@rnmapbox/maps'
import { View } from 'react-native'
import { Text } from 'react-native-paper'
import Config from 'react-native-config'

import { fmtShortTimeZulu } from '../../../../tools/timeFormats'

Mapbox.setAccessToken(Config.MAPBOX_ACCESS_TOKEN)

export default function MapboxMapWithQSOs ({ styles, mappableQSOs, initialRegion, operation, qth, qsos, settings, selectedUUID }) {
  const qsosGeoJSON = useMemo(() => geoJSONMarkersForQSOs({ mappableQSOs, qth, operation, styles }), [mappableQSOs, qth, operation, styles])
  const linesGeoJSON = useMemo(() => getJSONLinesForQSOs({ mappableQSOs, qth, operation, styles }), [mappableQSOs, qth, operation, styles])

  const circleStyles = useMemo(() => {
    const newStyles = {
      circleOpacity: 1,
      circleColor: ['coalesce', ['get', 'color'], '#000000'],
      circleRadius: [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 3,
        6, 5,
        10, 20
      ],
      circleStrokeWidth: [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 0.6, // At zoom level 5, circle radius is 1px
        10, 2 // At zoom level 10, circle radius is 5px
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

  return (
    <MapView
      style={styles.root}
      projection={'mercator'}
      compassEnabled={false}
      rotateEnabled={false}
      attributionPosition={{ bottom: 8, left: 90 }}
      logoPosition={{ bottom: 10, left: 10 }}
      scaleBarEnabled={false}
      onPress={handleMapPress}
    >
      <Camera
        centerCoordinate={[initialRegion.longitude, initialRegion.latitude]}
        bounds={[
          [initialRegion.longitude - initialRegion.longitudeDelta / 2, initialRegion.latitude - initialRegion.latitudeDelta / 2],
          [initialRegion.longitude + initialRegion.longitudeDelta / 2, initialRegion.latitude + initialRegion.latitudeDelta / 2]
        ]}
      />

      <FeatureCallout feature={selectedFeature} qth={qth} operation={operation} styles={styles} />

      {qsosGeoJSON && (
        <ShapeSource id="qsos-source" shape={qsosGeoJSON} onPress={handleMapPress}>
          <CircleLayer id="qsos-circles" style={circleStyles} layerIndex={130} />
        </ShapeSource>
      )}
      {linesGeoJSON && (
        <ShapeSource id="qsos-lines-source" shape={linesGeoJSON} onPress={handleMapPress}>
          <LineLayer id="qsos-lines" style={linesStyles} layerIndex={129} />
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
            {' • '}<Text style={{ fontWeight: 'bold', color: colorForText({ qso, styles }) }}>{qso.band}</Text>
            {' • '}{fmtShortTimeZulu(qso.startAtMillis)}
          </Text>
        </View>
      </MarkerView>
    )
  }
}

function geoJSONMarkerForQTH ({ qth, operation, styles }) {
  if (qth.latitude && qth.longitude) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [qth.longitude, qth.latitude]
      },
      properties: {
        color: styles.colors.bands.default,
        callout: `QTH: ${operation.grid}`
      }
    }
  }
}

function geoJSONMarkersForQSOs ({ mappableQSOs, qth, operation, styles }) {
  const features = []
  if (qth.latitude && qth.longitude) {
    features.push(geoJSONMarkerForQTH({ qth, operation, styles }))
  }
  features.push(...mappableQSOs.map(mappableQSO => geoJSONMarkerForQSO({ mappableQSO, qth, operation, styles })).filter(x => x))

  return {
    type: 'FeatureCollection',
    features
  }
}

function geoJSONMarkerForQSO ({ mappableQSO, qth, operation, styles }) {
  if (mappableQSO.location) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [mappableQSO.location.longitude, mappableQSO.location.latitude]
      },
      properties: {
        color: styles.colors.bands[mappableQSO.qso.band] || styles.colors.bands.default,
        qso: mappableQSO.qso,
        distanceStr: mappableQSO.distanceStr
      }
    }
  }
}

function getJSONLinesForQSOs ({ mappableQSOs, qth, operation, styles }) {
  const features = mappableQSOs.map(mappableQSO => geoJSONLineForQSO({ mappableQSO, qth, operation, styles })).flat().filter(x => x)

  return {
    type: 'FeatureCollection',
    features
  }
}

function geoJSONLineForQSO ({ mappableQSO, qth, operation, styles }) {
  if (mappableQSO.location) {
    const start = [mappableQSO.location.longitude, mappableQSO.location.latitude]
    const end = [qth.longitude, qth.latitude]

    const segments = generateGeodesicPoints(start, end)

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

function colorForText ({ qso, styles, mapStyles }) {
  return styles.colors.bands[qso.band] || styles.colors.bands.default
}

function generateGeodesicPoints (start, end, numPoints = 100) {
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
