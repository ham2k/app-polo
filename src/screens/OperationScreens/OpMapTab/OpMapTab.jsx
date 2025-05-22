/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { IconButton } from 'react-native-paper'

import { gridToLocation } from '@ham2k/lib-maidenhead-grid'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectOperation, selectOperationCallInfo } from '../../../store/operations'
import { selectQSOs } from '../../../store/qsos'
import { View } from 'react-native'
import { selectSettings } from '../../../store/settings'

import { useUIState } from '../../../store/ui'
import MapWithQSOs from './components/MapWithQSOs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { parseCallsign } from '@ham2k/lib-callsigns'

function prepareStyles (baseStyles, themeColor) {
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
}

export default function OpMapTab ({ navigation, route }) {
  const themeColor = 'tertiary'
  const styles = useThemedStyles(prepareStyles, themeColor)
  const safeAreaInsets = useSafeAreaInsets()

  const settings = useSelector(selectSettings)

  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const operationCallInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const [loggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  const [projection, setProjection] = useState('mercator')

  const qth = useMemo(() => {
    try {
      if (operation.grid) {
        const [latitude, longitude] = gridToLocation(operation.grid)
        return { latitude, longitude }
      } else if (operationCallInfo?.lat && operationCallInfo?.lon) {
        console.log(operationCallInfo)
        if (operationCallInfo.entityPrefix === 'K') {
          // this data is incorrect in BigCTY, so until it gets fixed there we need to hardcode it.
          return { latitude: 37.60, longitude: -91.87 }
        } else {
          return { latitude: operationCallInfo.lat, longitude: operationCallInfo.lon }
        }
      }
    } catch (e) {
      return {}
    }
  }, [operation.grid, operationCallInfo])

  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))

  return (
    <>
      <MapWithQSOs
        styles={styles}
        projection={projection}
        operation={operation}
        qth={qth}
        qsos={qsos}
        settings={settings}
        selectedUUID={loggingState?.selectedUUID}
      />
      <View style={{ position: 'absolute', bottom: styles.oneSpace * 1 + safeAreaInsets.bottom, right: styles.oneSpace * 1 + safeAreaInsets.right }}>
        {projection === 'mercator' ? (
          <IconButton
            icon="earth"
            size={styles.oneSpace * 4}
            mode={'contained'}
            style={{ opacity: 0.7 }}
            onPress={() => setProjection('globe')}
          />
        ) : (
          <IconButton
            icon="earth-box"
            size={styles.oneSpace * 4}
            mode={'contained'}
            style={{ opacity: 0.7 }}
            onPress={() => setProjection('mercator')}
          />
        ) }
        <IconButton
          icon="fullscreen"
          size={styles.oneSpace * 4}
          mode={'contained'}
          style={{ opacity: 0.7 }}
          onPress={() => navigation.navigate('OperationBadgeScreen', { operation })}
        />
      </View>
    </>
  )
}
