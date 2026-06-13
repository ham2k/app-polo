// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { fmtTimeBetween } from '@ham2k/lib-format-tools'

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
      existing.lastQSOAtMillis = Math.max(existing.lastQSOAtMillis, startAtMillis)
      existing.qsos.push(mappableQSO.qso)
      if (!existing.originRef) existing.originRef = firstDisplayRef(mappableQSO.originRefs)
    } else {
      byKey.set(key, {
        key,
        grid,
        coordinates,
        qsoCount: 1,
        firstQSOAtMillis: startAtMillis,
        lastQSOAtMillis: startAtMillis,
        qsos: [mappableQSO.qso],
        originRef: firstDisplayRef(mappableQSO.originRefs),
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

  groups.forEach(group => {
    group.callout = calloutForOriginGroup(group)
  })

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
        callout: group.callout
      }
    }))
  }
}

export function calloutForOriginGroup (group) {
  const label = labelForOriginGroup(group)
  const qsoLabel = group.qsoCount === 1 ? '1 QSO' : `${group.qsoCount} QSOs`
  const durationLabel = durationForOriginGroup(group)
  return `${label}\n${[qsoLabel, durationLabel].filter(Boolean).join(' • ')}`
}

function labelForOriginGroup (group) {
  const ref = group.originRef
  if (ref?.ref && ref?.name) return `${ref.ref}: ${ref.name}`
  if (ref?.ref) return ref.ref
  return group.grid || group.coordinates.join(', ')
}

function firstDisplayRef (refs) {
  return refs?.find(ref => ref?.ref)
}

function durationForOriginGroup (group) {
  if (!Number.isFinite(group.firstQSOAtMillis) || !Number.isFinite(group.lastQSOAtMillis)) return ''
  if (group.firstQSOAtMillis === group.lastQSOAtMillis) return ''
  return fmtTimeBetween(group.firstQSOAtMillis, group.lastQSOAtMillis, { roundTo: 'minutes' })
}
