// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useMemo } from 'react'

import { distanceOnEarth, fmtDistance, gridToLocation, locationForQSONInfo } from '@ham2k/lib-geo-tools'
import { mapQSOsWithSectionContext } from '@ham2k/lib-qson-tools'

import MapboxMapWithQSOs from './MapboxMapWithQSOs'

export default function MapWithQSOs ({ styles, operation, qth, qsos, settings, selectedUUID, projection }) {
  const qsosWithOriginContext = useMemo(() => {
    const locationForGrid = (grid) => {
      if (!grid) return qth
      try {
        const [latitude, longitude] = gridToLocation(grid)
        return { latitude, longitude }
      } catch (e) {
        return qth
      }
    }

    return mapQSOsWithSectionContext({
      qsos,
      operation,
      map: ({ qso, sectionGrid }) => ({
        ...qso,
        our: {
          ...qso.our,
          grid: sectionGrid,
          location: locationForGrid(sectionGrid)
        }
      })
    })
  }, [operation, qsos, qth])

  const mappableQSOs = useMemo(() => {
    const activeQSOs = qsosWithOriginContext.filter(qso => !qso.deleted && !qso.event)
    return activeQSOs
      .map(qso => {
        const location = locationForQSONInfo(qso?.their)
        const ourLocation = qso?.our?.location ?? qth
        const ourGrid = qso?.our?.grid ?? operation.grid
        const strength = strengthForQSO(qso)
        const distance = location && ourLocation ? distanceOnEarth(location, ourLocation, { units: settings.distanceUnits }) : null
        const distanceStr = distance ? fmtDistance(distance, { units: settings.distanceUnits }) : ''
        return { qso, location, ourLocation, ourGrid, strength, distance, distanceStr }
      })
      .filter(({ location }) => location)
      .sort((a, b) => b.strength - a.strength) // Weakest first
  }, [operation.grid, qsosWithOriginContext, qth, settings])

  const initialRegion = useMemo(() => {
    const { latitude, longitude } = qth
    let latitudeMin = latitude ?? 0
    let latitudeMax = latitude ?? 0
    let longitudeMin = longitude ?? 0
    let longitudeMax = longitude ?? 0
    for (const { location, ourLocation } of mappableQSOs) {
      latitudeMin = Math.min(latitudeMin, location?.latitude ?? 0)
      latitudeMax = Math.max(latitudeMax, location?.latitude ?? 0)
      longitudeMin = Math.min(longitudeMin, location?.longitude ?? 0)
      longitudeMax = Math.max(longitudeMax, location?.longitude ?? 0)
      latitudeMin = Math.min(latitudeMin, ourLocation?.latitude ?? 0)
      latitudeMax = Math.max(latitudeMax, ourLocation?.latitude ?? 0)
      longitudeMin = Math.min(longitudeMin, ourLocation?.longitude ?? 0)
      longitudeMax = Math.max(longitudeMax, ourLocation?.longitude ?? 0)
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

  return <MapboxMapWithQSOs styles={styles} mappableQSOs={mappableQSOs} initialRegion={initialRegion} operation={operation} qth={qth} qsos={qsosWithOriginContext} settings={settings} selectedUUID={selectedUUID} projection={projection} />
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
