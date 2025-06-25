/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useRef } from 'react'
import { Marker, Polyline, Circle, Callout } from 'react-native-maps'
import { View } from 'react-native'

import { fmtShortTimeZulu } from '../../../../tools/timeFormats'
import { Text } from 'react-native-paper'

const TRANSP_PNG = require('../../../../../assets/images/transp-16.png')

export const NativeMapMarkers = React.memo(function MapMarkers ({ qth, qsos, selectedUUID, mapStyles, styles, metersPerOneSpace }) {
  const ref = useRef()

  useEffect(() => {
    if (ref.current) {
      ref.current.showCallout()
    }
  }, [ref, selectedUUID])

  return (
    <>
      {qth?.latitude && qth?.longitude && qsos.map(({ qso, location, strength }) => (
        <Polyline
          key={`${qso.uuid}-line-${metersPerOneSpace}`}
          geodesic={true}
          coordinates={[location, qth]}
          {...mapStyles.line}
        />
      ))}
      {qsos.map(({ qso, location, strength, distanceStr }) => (
        <React.Fragment key={qso.uuid}>
          <Marker
            key={`${qso.uuid}-marker-${metersPerOneSpace}`}
            coordinate={location}
            ref={selectedUUID && selectedUUID === qso.uuid ? ref : undefined}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            tracksViewChanges={false}
            image={TRANSP_PNG}
          >
            <Callout>
              <View>
                <Text style={{ fontWeight: 'bold', color: '#333' }}>
                  {qso.their?.call} • {distanceStr}
                </Text>
                <Text style={{ color: '#333' }}>
                  {qso.their?.sent}
                  {' • '}{qso.mode}
                  {' • '}<Text style={{ fontWeight: 'bold', color: colorForText({ qso, styles, mapStyles }) }}>{qso.band}</Text>
                  {' • '}{fmtShortTimeZulu(qso.startAtMillis)}
                </Text>
              </View>
            </Callout>
          </Marker>
          <Circle
            key={`${qso.uuid}-circle-${metersPerOneSpace}`}
            center={location}
            radius={radiusForMarker({ qso, strength, location, metersPerOneSpace, size: mapStyles.marker.size })}
            fillColor={colorForMarker({ qso, location, strength, styles, mapStyles })}
            strokeWidth={0.1}
          />
        </React.Fragment>
      ))}
    </>
  )
})

function radiusForMarker ({ qso, strength, location, size, metersPerOneSpace }) {
  const latitude = Math.abs(location?.latitude ?? location?.lat ?? 0)

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
