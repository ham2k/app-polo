/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { Text } from 'react-native-paper'
import Mapbox from '@rnmapbox/maps'

import { fmtShortTimeZulu } from '../../../../tools/timeFormats'

const TRANSP_PNG = require('../../../../../assets/images/transp-16.png')

export const MapboxMapMarkers = React.memo(function MapMarkers ({ qth, qsos, selectedUUID, mapStyles, styles, metersPerOneSpace }) {
  const ref = useRef()

  useEffect(() => {
    if (ref.current) {
      ref.current.showCallout()
    }
  }, [ref, selectedUUID])

  return (
    <>
      {qth.latitude && qth.longitude && qsos.map(({ qso, location, strength }) => (
        <Mapbox.Polyline
          key={`${qso.uuid}-line-${metersPerOneSpace}`}
          geodesic={true}
          coordinates={[location, qth]}
          {...mapStyles.line}
        />
      ))}
      {qsos.map(({ qso, location, strength, distanceStr }) => (
        <Mapbox.Marker
          key={`${qso.uuid}-marker-${metersPerOneSpace}`}
          coordinate={location}
          ref={selectedUUID && selectedUUID === qso.uuid ? ref : undefined}
          anchor={{ x: 0.5, y: 0.5 }}
          flat={true}
          tracksViewChanges={false}
          image={TRANSP_PNG}
        >
          <Mapbox.Callout>
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
          </Mapbox.Callout>
        </Mapbox.Marker>
      ))}
    </>
  )
})

function colorForText ({ qso, styles, mapStyles }) {
  return styles.colors.bands[qso.band] || styles.colors.bands.default
}
