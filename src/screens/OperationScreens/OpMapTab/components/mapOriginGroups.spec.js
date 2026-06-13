import { buildOriginFeatureCollection, buildOriginGroups } from './mapOriginGroups'

describe('buildOriginGroups', () => {
  const styles = {
    colors: {
      bands: { other: '#111111' },
      onSurface: '#ffffff',
      outline: '#dddddd'
    }
  }

  function mappableQSO ({ uuid, grid, latitude, longitude, startAtMillis, originRefs }) {
    return {
      qso: { uuid, startAtMillis },
      ourGrid: grid,
      ourLocation: { latitude, longitude },
      originRefs
    }
  }

  it('deduplicates origins by grid and orders by first QSO time', () => {
    const groups = buildOriginGroups({
      mappableQSOs: [
        mappableQSO({ uuid: 'later', grid: 'FM18', latitude: 38.9, longitude: -77, startAtMillis: 3000 }),
        mappableQSO({ uuid: 'first', grid: 'FM19', latitude: 39.1, longitude: -76.8, startAtMillis: 1000 }),
        mappableQSO({ uuid: 'same-origin', grid: 'FM18', latitude: 38.9, longitude: -77, startAtMillis: 2000 })
      ],
      styles
    })

    expect(groups.map(group => group.grid)).toEqual(['FM19', 'FM18'])
    expect(groups.map(group => group.order)).toEqual([1, 2])
    expect(groups.map(group => group.qsoCount)).toEqual([1, 2])
  })

  it('omits display order when there is only one origin', () => {
    const groups = buildOriginGroups({
      mappableQSOs: [
        mappableQSO({ uuid: 'a', grid: 'FM19', latitude: 39.1, longitude: -76.8, startAtMillis: 1000 }),
        mappableQSO({ uuid: 'b', grid: 'FM19', latitude: 39.1, longitude: -76.8, startAtMillis: 2000 })
      ],
      styles
    })

    expect(groups).toHaveLength(1)
    expect(groups[0].order).toBeUndefined()
    expect(groups[0].qsoCount).toBe(2)
  })

  it('builds origin GeoJSON features with order labels', () => {
    const geoJSON = buildOriginFeatureCollection({
      mappableQSOs: [
        mappableQSO({ uuid: 'later', grid: 'FM18', latitude: 38.9, longitude: -77, startAtMillis: 3000 }),
        mappableQSO({ uuid: 'first', grid: 'FM19', latitude: 39.1, longitude: -76.8, startAtMillis: 1000 })
      ],
      styles
    })

    expect(geoJSON.features.map(feature => feature.properties.orderLabel)).toEqual(['1', '2'])
    expect(geoJSON.features.map(feature => feature.properties.markerType)).toEqual(['origin', 'origin'])
  })

  it('builds callouts with generic ref label, QSO count, and first-to-last duration', () => {
    const geoJSON = buildOriginFeatureCollection({
      mappableQSOs: [
        mappableQSO({
          uuid: 'later',
          grid: 'FM18',
          latitude: 38.9,
          longitude: -77,
          startAtMillis: Date.UTC(2026, 0, 1, 12, 15),
          originRefs: [{ type: 'genericActivation', ref: 'GEN-002', name: 'Second Place' }]
        }),
        mappableQSO({
          uuid: 'first',
          grid: 'FM19',
          latitude: 39.1,
          longitude: -76.8,
          startAtMillis: Date.UTC(2026, 0, 1, 12, 0),
          originRefs: [{ type: 'genericActivation', ref: 'GEN-001', name: 'First Place' }]
        }),
        mappableQSO({
          uuid: 'same-origin',
          grid: 'FM18',
          latitude: 38.9,
          longitude: -77,
          startAtMillis: Date.UTC(2026, 0, 1, 12, 30),
          originRefs: [{ type: 'genericActivation', ref: 'GEN-002', name: 'Second Place' }]
        })
      ],
      styles
    })

    expect(geoJSON.features.map(feature => feature.properties.callout)).toEqual([
      'GEN-001: First Place\n1 QSO',
      'GEN-002: Second Place\n2 QSOs • 15m'
    ])
  })
})
