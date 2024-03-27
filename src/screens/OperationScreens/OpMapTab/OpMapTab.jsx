import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import MapView, { Marker, Polyline } from 'react-native-maps'

import { gridToLocation } from '@ham2k/lib-maidenhead-grid'

import DXCC_LOCATIONS from '../../../data/dxccLocations.json'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectRuntimeOnline } from '../../../store/runtime'
import { selectOperation } from '../../../store/operations'
import { addQSO, selectQSOs } from '../../../store/qsos'
import { fmtShortTimeZulu } from '../../../tools/timeFormats'
import { Image } from 'react-native'
import { selectSettings } from '../../../store/settings'
import { apiQRZ } from '../../../store/apiQRZ'
import { distanceOnEarth, fmtDistance } from '../../../tools/geoTools'

const PIN_QTH = require('./images/qth.png')
const PIN_FOR_STRENGTH = {
  1: require('./images/qso-1.png'),
  2: require('./images/qso-2.png'),
  3: require('./images/qso-3.png'),
  4: require('./images/qso-4.png'),
  5: require('./images/qso-5.png'),
  6: require('./images/qso-6.png'),
  7: require('./images/qso-7.png'),
  8: require('./images/qso-8.png'),
  9: require('./images/qso-9.png')
}

export default function OpMapTab ({ navigation, route }) {
  const themeColor = 'tertiary'
  const styles = useThemedStyles((baseStyles) => {
    return {
      ...baseStyles,
      root: {
        flexDirection: 'column',
        flex: 1
      },
      panel: {
        backgroundColor: baseStyles.theme.colors[`${themeColor}Container`],
        borderBottomColor: baseStyles.theme.colors[`${themeColor}Light`],
        borderTopColor: baseStyles.theme.colors[`${themeColor}Light`],
        borderBottomWidth: 1,
        padding: baseStyles.oneSpace
      }
    }
  })

  const dispatch = useDispatch()

  const online = useSelector(selectRuntimeOnline)
  const settings = useSelector(selectSettings)

  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))

  const qth = useMemo(() => {
    try {
      if (!operation?.grid) return {}
      const [latitude, longitude] = gridToLocation(operation.grid)
      return { latitude, longitude }
    } catch (e) {
      console.error('Error in qth', e)
      return {}
    }
  }, [operation?.grid])

  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))

  const [nextQSOWithoutInfo, setNextQSOWithoutInfo] = useState(null)

  useEffect(() => {
    if (online && settings?.accounts?.qrz?.login && settings?.accounts?.qrz?.password) {
      if (!nextQSOWithoutInfo) {
        setNextQSOWithoutInfo(qsos.find(qso => !qso.their?.qrzInfo))
      }
    }
  }, [qsos, online, settings, nextQSOWithoutInfo])

  useEffect(() => {
    if (nextQSOWithoutInfo) {
      setTimeout(async () => {
        try {
          const { data } = await dispatch(apiQRZ.endpoints.lookupCall.initiate({ call: nextQSOWithoutInfo.their.call }))
          const qrzInfo = {
            name: data?.name,
            state: data?.state,
            city: data?.city,
            country: data?.country,
            county: data?.county,
            postal: data?.postal,
            grid: data?.grid,
            cqZone: data?.cqZone,
            ituZone: data?.ituZone,
            image: data?.image,
            imageInfo: data?.imageInfo
          }

          if (data?.error) qrzInfo.error = data.error

          await dispatch(addQSO({
            uuid: operation.uuid,
            qso: {
              ...nextQSOWithoutInfo,
              their: {
                ...nextQSOWithoutInfo.their,
                guess: {
                  name: data?.name,
                  grid: data?.grid,
                  ...nextQSOWithoutInfo.their.guess
                },
                qrzInfo
              }
            }
          }))
        } catch (e) {
          console.error('QRZ Lookup Error', e)
        } finally {
          setNextQSOWithoutInfo(null)
        }
      }, 10)
    }
  }, [nextQSOWithoutInfo, dispatch, operation?.uuid])

  const mappableQSOs = useMemo(() => {
    const activeQSOs = qsos.filter(qso => !qso.deleted)
    return activeQSOs
      .map(qso => {
        const location = locationForQSO(qso)
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
      latitudeDelta: latitudeMax - latitudeMin + 10,
      longitudeDelta: longitudeMax - longitudeMin + 10
    }
  }, [qth, mappableQSOs])

  const [mapStyles, setMapStyles] = useState(stylesForMap({ region: initialRegion, qth, mappableQSOs }))
  const handleRegionChange = useCallback((region) => {
    const newStyles = stylesForMap({ region, qth, mappableQSOs })
    if (newStyles.marker.opacity !== mapStyles.marker.opacity) {
      setMapStyles(newStyles)
    }
  }, [mapStyles, qth, mappableQSOs])

  return (
    <MapView
      style={styles.root}
      initialRegion={initialRegion}
      onRegionChange={handleRegionChange}
    >
      {qth.latitude && qth.longitude && (
        <Marker
          key={'qth'}
          coordinate={qth}
          title={`QTH: ${operation.grid}`}
          description={operation.title}
          anchor={{ x: 0.5, y: 0.5 }}
          flat={true}
          tracksViewChanges={false}
        >
          <Image
            source={PIN_QTH}
            resizeMode="cover"
            style={{ width: 16, height: 16 }}
          />
        </Marker>
      )}
      {qth.latitude && qth.longitude && mappableQSOs.map(({ qso, location, strength }) => (
        <Polyline
          key={qso.key}
          geodesic={true}
          coordinates={[location, qth]}
          {...mapStyles.line}
        />
      ))}
      {mappableQSOs.map(({ qso, location, strength, distanceStr }) => (
        <Marker
          key={qso.key}
          coordinate={location}
          anchor={{ x: 0.5, y: 0.5 }}
          title={[qso.their.call, distanceStr].join(' • ')}
          description={[qso.their?.sent, qso.mode, qso.band, fmtShortTimeZulu(qso.startOnMillis)].join(' • ')}
          flat={true}
          tracksViewChanges={false}
        >
          <Image
            source={PIN_FOR_STRENGTH[strength]}
            resizeMode="cover"
            style={{ width: 16, height: 16, resizeMode: 'cover', ...mapStyles.marker }}
          />
        </Marker>
      ))}
    </MapView>
  )
}

function locationForQSO (qso) {
  try {
    const grid = qso?.their?.grid ?? qso?.their?.guess?.grid ?? qso?.their?.qrzInfo?.grid

    if (grid) {
      const [latitude, longitude] = gridToLocation(grid)
      return { latitude, longitude }
    }

    const entityPrefix = qso?.their?.entityPrefix ?? qso?.their?.guess?.entityPrefix ?? qso?.their?.qrzInfo?.entityPrefix
    const state = qso?.their?.state ?? qso?.their?.guess?.state ?? qso?.their?.qrzInfo?.state
    if (entityPrefix) {
      const loc = DXCC_LOCATIONS[[entityPrefix, state].join('-')] || DXCC_LOCATIONS[entityPrefix]
      if (loc) return { latitude: loc[1], longitude: loc[0] }
    }
    return null
  } catch (e) {
    console.error('Error in locationForQSO', e)
    return null
  }
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
    console.error('Error in strengthForQSO', e)
    return 5
  }
}

function stylesForMap ({ region, mappableQSOs, qth }) {
  let longitudeDelta = region.longitudeDelta
  if (mappableQSOs.length > 50) {
    longitudeDelta = longitudeDelta * 1.5
  }

  if (longitudeDelta > 90) {
    return { marker: { opacity: 0.4, width: 14, height: 14 }, line: { strokeColor: 'rgba(60,60,60,0.3)' } }
  } else if (longitudeDelta > 60) {
    return { marker: { opacity: 0.5, width: 14, height: 14 }, line: { strokeColor: 'rgba(60,60,60,0.3)' } }
  } else if (longitudeDelta > 40) {
    return { marker: { opacity: 0.7, width: 14, height: 14 }, line: { strokeColor: 'rgba(60,60,60,0.4)' } }
  } else if (longitudeDelta > 25) {
    return { marker: { opacity: 0.75, width: 16, height: 16 }, line: { strokeColor: 'rgba(60,60,60,0.4)' } }
  } else if (longitudeDelta > 15) {
    return { marker: { opacity: 0.8, width: 18, height: 18 }, line: { strokeColor: 'rgba(75,75,75,0.5)' } }
  } else if (longitudeDelta > 10) {
    return { marker: { opacity: 0.85, width: 20, height: 20 }, line: { strokeColor: 'rgba(90,90,90,0.7)' } }
  } else {
    return { marker: { opacity: 0.9, width: 24, height: 24 }, line: { strokeColor: 'rgba(60,60,60,0.3)' } }
  }
}
