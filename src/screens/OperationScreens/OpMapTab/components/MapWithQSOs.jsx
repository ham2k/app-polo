/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'

import { distanceOnEarth, fmtDistance, locationForQSONInfo } from '../../../../tools/geoTools'

import MapboxMapWithQSOs from './MapboxMapWithQSOs'

export default function MapWithQSOs ({ styles, operation, qth, qsos, settings, selectedUUID, projection }) {
  const mappableQSOs = useMemo(() => {
    const activeQSOs = qsos.filter(qso => !qso.deleted && !qso.event)
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
    let latitudeMin = latitude ?? 0
    let latitudeMax = latitude ?? 0
    let longitudeMin = longitude ?? 0
    let longitudeMax = longitude ?? 0
    for (const { location } of mappableQSOs) {
      latitudeMin = Math.min(latitudeMin, location?.latitude ?? 0)
      latitudeMax = Math.max(latitudeMax, location?.latitude ?? 0)
      longitudeMin = Math.min(longitudeMin, location?.longitude ?? 0)
      longitudeMax = Math.max(longitudeMax, location?.longitude ?? 0)
    }
    return {
      latitude: latitudeMin + (latitudeMax - latitudeMin) / 2,
      longitude: longitudeMin + (longitudeMax - longitudeMin) / 2,
      latitudeDelta: Math.abs(latitudeMax - latitudeMin),
      longitudeDelta: Math.abs(longitudeMax - longitudeMin),
      boundingBox: [
        [longitudeMin, latitudeMin],
        [longitudeMax, latitudeMax]
      ]
    }
  }, [qth, mappableQSOs])

  return <MapboxMapWithQSOs styles={styles} mappableQSOs={mappableQSOs} initialRegion={initialRegion} operation={operation} qth={qth} qsos={qsos} settings={settings} selectedUUID={selectedUUID} projection={projection} />
}

function strengthForQSO (qso) {
  try {
    if (qso.mode === 'CW' || qso.mode === 'RTTY') {
      return Math.floor((qso.their?.sent || 555) / 10) % 10
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

export function stylesForMap ({ longitudeDelta, metersPerPixel, count, deviceColorScheme }) {
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
