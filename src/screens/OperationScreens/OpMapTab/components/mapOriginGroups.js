// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

export function coordsFromLatLon ({ latitude, longitude }) {
  return [Number(longitude?.toFixed(5) ?? 0), Number(latitude?.toFixed(5) ?? 0)]
}

export function buildOriginGroups ({ mappableQSOs, styles }) {
  const byKey = new Map()

  for (const mappableQSO of mappableQSOs) {
    const origin = mappableQSO?.ourLocation
    if (origin?.latitude === undefined || origin?.longitude === undefined) continue

    const coordinates = coordsFromLatLon(origin)
    const grid = mappableQSO.ourGrid
    const key = grid || coordinates.join(',')
    const startAtMillis = mappableQSO.qso?.startAtMillis ?? Number.MAX_SAFE_INTEGER

    const existing = byKey.get(key)
    if (existing) {
      existing.qsoCount += 1
      existing.firstQSOAtMillis = Math.min(existing.firstQSOAtMillis, startAtMillis)
      existing.qsos.push(mappableQSO.qso)
    } else {
      byKey.set(key, {
        key,
        grid,
        coordinates,
        qsoCount: 1,
        firstQSOAtMillis: startAtMillis,
        qsos: [mappableQSO.qso],
        color: styles.colors.bands.other
      })
    }
  }

  const groups = [...byKey.values()].sort((a, b) => {
    if (a.firstQSOAtMillis !== b.firstQSOAtMillis) return a.firstQSOAtMillis - b.firstQSOAtMillis
    return a.key.localeCompare(b.key)
  })

  if (groups.length > 1) {
    groups.forEach((group, index) => {
      group.order = index + 1
    })
  }

  return groups
}

export function buildOriginFeatureCollection ({ mappableQSOs, styles }) {
  return {
    type: 'FeatureCollection',
    features: buildOriginGroups({ mappableQSOs, styles }).map(group => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: group.coordinates
      },
      properties: {
        markerType: 'origin',
        color: group.color,
        strengthFactor: 1,
        orderLabel: group.order ? String(group.order) : '',
        callout: `Origin: ${group.grid || group.coordinates.join(', ')}`
      }
    }))
  }
}
