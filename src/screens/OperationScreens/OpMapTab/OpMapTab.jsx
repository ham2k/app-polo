/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { IconButton, Text } from 'react-native-paper'

import { gridToLocation } from '@ham2k/lib-maidenhead-grid'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectOperation, selectOperationCallInfo } from '../../../store/operations'
import { selectQSOs } from '../../../store/qsos'
import { View } from 'react-native'
import { selectSettings } from '../../../store/settings'

import { useUIState } from '../../../store/ui'
import MapWithQSOs from './components/MapWithQSOs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
      } else {
        return {}
      }
    } catch (e) {
      return {}
    }
  }, [operation.grid])

  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))

  const [dismissedWarnings, setDismissedWarnings] = useState({})

  const warnings = useMemo(() => {
    const _warnings = []
    if (!qth.latitude) {
      _warnings.push({
        key: 'no-location',
        text: 'No lines? You need to set your location first.\nTap here to do that.',
        onPress: () => navigation.navigate('OperationLocation', { operation: operation.uuid }),
        style: {
          backgroundColor: 'red',
          opacity: 0.8
        }
      })
    }

    const qsosWithNoLocation = qsos.filter(qso => !qso.their?.grid)
    if (qsosWithNoLocation.length / qsos.length > 0.5) {
      _warnings.push({
        key: 'many-no-location',
        text: 'Many of these QSOs have no precise location.\nYou need a paid QRZ.com account for location lookups.',
        onPress: () => navigation.navigate('Settings')
      })
    }
    return _warnings
  }, [navigation, operation.uuid, qsos, qth.latitude])

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
      {warnings.length > 0 && (
        <View style={{ position: 'absolute', top: styles.oneSpace * 1, left: styles.oneSpace * 1 + safeAreaInsets.left, right: styles.oneSpace * 1 + safeAreaInsets.right }}>
          {warnings.filter(warning => !dismissedWarnings[warning.key]).map((warning, index) => (
            <View
              key={index}
              style={{
                backgroundColor: 'red',
                opacity: 0.8,
                marginBottom: styles.oneSpace * 1,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Text
                style={{ color: 'white', padding: styles.oneSpace, flex: 1 }}
                onPress={warning.onPress}
              >
                {warning.text}
              </Text>
              <IconButton
                icon="close"
                iconColor="white"
                style={{ flex: 0, minWidth: styles.oneSpace * 4 }}
                size={styles.oneSpace * 2}
                mode={'default'}
                onPress={() => setDismissedWarnings({ ...dismissedWarnings, [warning.key]: true })}
              />
            </View>
          ))}
        </View>
      )}
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
