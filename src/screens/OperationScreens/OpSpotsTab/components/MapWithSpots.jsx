/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapView, { Callout, Circle, Marker } from 'react-native-maps'
import { useColorScheme, View } from 'react-native'

import { fmtDateTimeRelative } from '../../../../tools/timeFormats'
import { distanceOnEarth, fmtDistance, bearingOnEarth, locationForQSONInfo } from '../../../../tools/geoTools'
import { stylesForMap } from '../../OpMapTab/components/MapWithQSOs'
import { Icon, Text } from 'react-native-paper'
import { gridToLocation } from '@ham2k/lib-maidenhead-grid'
import { partsForFreqInMHz } from '../../../../tools/frequencyFormats'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'

const TRANSP_PNG = require('../../../../../assets/images/transp-16.png')

const METERS_IN_ONE_DEGREE = 111111

function prepareStyles (themeStyles) {
  const DEBUG = false

  const commonStyles = {
    fontSize: themeStyles.normalFontSize,
    lineHeight: themeStyles.normalFontSize * 1.3,
    borderWidth: DEBUG ? 1 : 0
  }

  return {
    ...themeStyles,
    calloutInnerView: {
      ...commonStyles,
      height: themeStyles.oneSpace * 10,
      paddingHorizontal: themeStyles.oneSpace,
      paddingVertical: themeStyles.oneSpace,
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '100%'
    },
    calloutInnerLine: {
      ...commonStyles,
      height: themeStyles.oneSpace * 2.6,
      flexDirection: 'row',
      width: '100%'
    },
    fields: {
      modeBandFreq: {
        ...commonStyles,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: themeStyles.oneSpace * 5
      },
      freq: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        width: themeStyles.oneSpace * 11.15,
        marginLeft: 0,
        textAlign: 'right'
      },
      freqMHz: {
        ...commonStyles,
        fontWeight: '600',
        textAlign: 'right'
      },
      freqKHz: {
        ...commonStyles,
        textAlign: 'right'
      },
      freqHz: {
        ...commonStyles,
        fontWeight: '400',
        textAlign: 'right',
        fontSize: themeStyles.normalFontSize * 0.7
      },
      callAndEmoji: {
        ...commonStyles,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: themeStyles.oneSpace * 5
      },
      call: {
        ...commonStyles,
        ...themeStyles.text.callsign,
        fontWeight: 'bold',
        textAlign: 'left'
      },
      emoji: {
        ...commonStyles,
        flex: 0,
        textAlign: 'left',
        marginRight: 0,
        paddingLeft: themeStyles.oneSpace,
        marginTop: themeStyles.isIOS ? 0 : themeStyles.oneSpace * -0.5,
        textShadowColor: themeStyles.isDarkMode ? 'rgb(200, 200, 200)' : 'rgb(90, 90, 90)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 3
      },
      icon: {
        ...commonStyles,
        flex: 0,
        textAlign: 'left',
        marginRight: themeStyles.oneSpace * 0.3,
        marginLeft: themeStyles.oneSpace * -0.5,
        marginTop: themeStyles.oneSpace * 0.2
      },
      label: {
        ...commonStyles,
        flex: 1,
        textAlign: 'left'
      },
      time: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        minWidth: themeStyles.oneSpace * 6,
        marginLeft: themeStyles.oneSpace,
        marginTop: -themeStyles.oneSpace / 6,
        textAlign: 'right'
      },
      distanceBearing: {
        ...commonStyles,
        flex: 0,
        minWidth: themeStyles.oneSpace * 6,
        textAlign: 'right'
      }
    }
  }
}

export default function MapWithSpots ({ style, operation, spots, settings, selectedUUID, onPress }) {
  // Set up styles
  const styles = useThemedStyles(prepareStyles)

  // Maps change with the actual device color scheme, not the user preferences in the app
  const deviceColorScheme = useColorScheme()

  // Get our QTH, if set
  const qth = useMemo(() => {
    try {
      if (!operation?.grid) return {}
      const [latitude, longitude] = gridToLocation(operation.grid)
      return { latitude, longitude }
    } catch (e) {
      return {}
    }
  }, [operation?.grid])

  // Get a list of spots that have location information in them, and pre-calculate our distance to them and their age
  const mappableSpots = useMemo(() => {
    return spots
      .map(spot => {
        const location = locationForQSONInfo(spot?.their)
        const distance = location && qth ? distanceOnEarth(location, qth, { units: settings.distanceUnits }) : null
        const distanceStr = distance ? fmtDistance(distance, { units: settings.distanceUnits }) : ''
        const bearing = location && qth ? bearingOnEarth(location, qth) : null
        const bearingStr = bearing ? Math.round(bearing) + '°' : ''
        const age = spot.spot.timeInMillis ? Date.now() - spot.spot.timeInMillis : 0
        return { spot, location, age, distance, distanceStr, bearing, bearingStr }
      })
      .filter(({ location }) => location)
      .sort((a, b) => b.spot.timeInMillis - a.spot.timeInMillis)
  }, [spots, qth, settings])

  // Work out the initial projection of the map in order to best show the spots we have
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

  // Respond to layout change
  const [layout, setLayout] = useState()
  const handleLayout = useCallback((event) => {
    setLayout(event?.nativeEvent?.layout)
  }, [setLayout])

  // Respond to map pan
  const [region, setRegion] = useState(initialRegion)
  const handleRegionChange = useCallback((newRegion) => {
    newRegion.latitudeDelta = Math.abs(newRegion.latitudeDelta)
    newRegion.longitudeDelta = Math.abs(newRegion.longitudeDelta)
    setRegion(newRegion)
  }, [setRegion])

  // Respond to map scale change
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

  // Apply map styles
  const mapStyles = useMemo(() => {
    return stylesForMap({
      latitudeDelta: scale?.latitudeDelta,
      metersPerPixel: scale?.metersPerPixel,
      count: mappableSpots?.length,
      deviceColorScheme
    })
  }, [scale, mappableSpots?.length, deviceColorScheme])

  return (
    <MapView
      onLayout={handleLayout}
      style={[{ flex: 1, flexDirection: 'column' }, styles.root]}
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
            radius={radiusForMarker({ age: 0, location: qth, metersPerOneSpace: scale?.metersPerOneSpace, size: mapStyles.marker.size })}
            fillColor={'rgba(0,0,0,1)'}
            strokeWidth={0.1}
          />
        </>
      )}
      {scale?.metersPerOneSpace && (
        <MapMarkers
          spots={mappableSpots}
          mapStyles={mapStyles}
          styles={styles}
          metersPerOneSpace={scale?.metersPerOneSpace}
          selectedUUID={selectedUUID}
          onPress={onPress}
        />
      )}
    </MapView>
  )
}

const MapMarkers = React.memo(function MapMarkers ({ spots, selectedUUID, mapStyles, styles, metersPerOneSpace, onPress }) {
  const ref = useRef()

  useEffect(() => {
    if (ref.current) {
      ref.current.showCallout()
    }
  }, [ref, selectedUUID])

  // Common styles for text formatting
  const commonStyle = {
  }

  return (
    <>
      {spots.map(({ spot, location, age, distance, distanceStr, bearingStr }) => (
        <React.Fragment key={spot.key}>
          <Marker
            key={`${spot.key}-marker-${metersPerOneSpace}`}
            coordinate={location}
            ref={selectedUUID && selectedUUID === spot.key ? ref : undefined}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            tracksViewChanges={false}
            image={TRANSP_PNG}
          >
            <Callout onPress={() => onPress && onPress({ spot })}>
              <View style={styles.calloutInnerView}>
                <View style={styles.calloutInnerLine}>
                  <View style={styles.fields.callAndEmoji}>
                    <Text style={[callsignStyle({ spot, styles }), commonStyle]}>{spot.their?.call ?? '?'}</Text>
                    {spot.their?.guess?.emoji && (
                      <Text style={[styles.fields.emoji, commonStyle, { lineHeight: 20 }]}>{spot.their?.guess?.emoji}</Text>
                    )}
                  </View>
                  <Text style={[styles.fields.time, commonStyle]}>
                    {fmtDateTimeRelative(spot.spot?.timeInMillis, { roundTo: 'minutes' })}
                  </Text>
                </View>
                <View style={styles.calloutInnerLine}>
                  {spot.spots.filter(s => s?.icon).map(subSpot => (
                    <View key={subSpot.source} style={[styles.fields.icon, commonStyle]}>
                      <Icon
                        key={subSpot.source}
                        source={subSpot.icon}
                        size={styles.oneSpace * 2.3}
                        color={commonStyle?.color}
                      />
                    </View>
                  ))}
                  <Text style={[styles.fields.label, commonStyle]}>
                    {truncate(spot.spot.label, 40)}
                  </Text>
                </View>
                <View style={styles.calloutInnerLine}>
                  <Text style={[styles.fields.modeBandFreq, commonStyle]}>
                    {spot.mode}{' • '}{spot.band}{' • '}
                    <Text style={[styles.fields.freq, commonStyle]}>
                      <Text style={[styles.fields.freqMHz, commonStyle]}>{partsForFreqInMHz(spot.freq)[0]}</Text>
                      <Text style={[styles.fields.freqKHz, commonStyle]}>.{partsForFreqInMHz(spot.freq)[1]}</Text>
                      <Text style={[styles.fields.freqHz, commonStyle]}>.{partsForFreqInMHz(spot.freq)[2]}</Text>
                    </Text>
                  </Text>
                  {distance && (
                    <Text style={[styles.fields.distanceBearing, commonStyle]}>
                      {distanceStr}{' • '}{bearingStr}
                    </Text>
                  )}
                </View>
              </View>
            </Callout>
          </Marker>
          <Circle
            key={`${spot.key}-circle-${metersPerOneSpace}`}
            center={location}
            radius={radiusForMarker({ age, location, metersPerOneSpace, size: mapStyles.marker.size })}
            fillColor={colorForMarker({ spot, styles })}
            strokeWidth={0.1}
          />
        </React.Fragment>
      ))}
    </>
  )
})

// Get a radius for the marker. Zero age is 130% radius, 30 minutes old or older is 70% radius. This matches the radii
// used for signal strength in the QSO map. Age provided in millis.
function radiusForMarker ({ age, location, size, metersPerOneSpace }) {
  const latitude = Math.abs(location.latitude ?? location.lat)
  const latitudeScale = Math.cos(latitude * Math.PI / 180)
  const baseRadius = (metersPerOneSpace * size * latitudeScale) / 2
  return Math.max(baseRadius * (1.3 - age / 1800000.0 * 0.6), 10000.0)
}

function colorForMarker ({ spot, styles }) {
  if (spot.spot?.type === 'duplicate') {
    return 'grey'
  }
  return styles.colors.bands[spot.band] || styles.colors.bands.default
}

function callsignStyle ({ spot, styles }) {
  if (spot.spot?.type === 'duplicate') {
    return {
      textDecorationLine: 'line-through',
      textDecorationColor: styles.colors.onBackground
    }
  } else {
    return {
      fontWeight: 'bold',
      color: '#333'
    }
  }
}

function truncate (str, limit) {
  if (str.length > limit) {
    return str.substring(0, limit) + '…'
  }
  return str
}
