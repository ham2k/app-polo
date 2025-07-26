/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Geolocation from '@react-native-community/geolocation'

import { locationToGrid6, locationToGrid8 } from '@ham2k/lib-maidenhead-grid'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings } from '../../../store/settings'
import { selectOperation, setOperationData } from '../../../store/operations'
import ScreenContainer from '../../components/ScreenContainer'
import { findBestHook } from '../../../extensions/registry'
import { defaultReferenceHandlerFor } from '../../../extensions/core/references'
import { H2kGridInput, H2kListItem, H2kListSection } from '../../../ui'

export default function OperationLocationScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const operation = useSelector(state => selectOperation(state, route.params.operation))

  const refsWithHandlers = useMemo(() => {
    return (operation?.refs || []).filter(ref => ref.grid).map(ref => {
      console.log(ref)
      return { ref, handler: findBestHook(`ref:${ref.type}`) || defaultReferenceHandlerFor(ref.type) }
    })
  }, [operation?.refs])

  useEffect(() => {
    if (!operation) {
      navigation.goBack()
    }
  }, [navigation, operation])

  const handleChangeGrid = useCallback((newGrid) => {
    dispatch(setOperationData({ uuid: operation.uuid, grid: newGrid, source: 'manual' }))
  }, [dispatch, operation.uuid])

  const [locationGrid, setLocationGrid] = useState()
  const [locationMessage, setLocationMessage] = useState()

  useEffect(() => {
    setLocationMessage('Locating…')
    Geolocation.getCurrentPosition(
      info => {
        const { latitude, longitude } = info.coords
        if (settings?.useGrid8) setLocationGrid(locationToGrid8(latitude, longitude))
        else setLocationGrid(locationToGrid6(latitude, longitude))
      },
      error => {
        console.info('Geolocation error', error)
        setLocationMessage('GPS Error')
      }, {
        enableHighAccuracy: true,
        timeout: 1000 * 30 /* 30 seconds */,
        maximumAge: 1000 * 60 /* 1 minute */
      }
    )

    const watchId = Geolocation.watchPosition(
      info => {
        const { latitude, longitude } = info.coords
        if (settings?.useGrid8) setLocationGrid(locationToGrid8(latitude, longitude))
        else setLocationGrid(locationToGrid6(latitude, longitude))
      },
      error => {
        console.info('Geolocation watch error', error)
        setLocationGrid('NO GPS')
      }, {
        enableHighAccuracy: true,
        timeout: 1000 * 60 * 3 /* 3 minutes */,
        maximumAge: 1000 * 60 * 5 /* 5 minutes */
      }
    )
    return () => {
      Geolocation.clearWatch(watchId)
    }
  }, [settings?.useGrid8])

  return (
    <ScreenContainer>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, paddingVertical: styles.oneSpace }}>
          <H2kListSection title={'Selected Location'}>
            <H2kGridInput
              style={[styles.input, { marginHorizontal: styles.oneSpace * 2 }]}
              value={operation?.grid || ''}
              label="Maidenhead Grid Square Locator"
              placeholder={settings?.useGrid8 ? 'AA00aa00' : 'AA00aa'}
              onChangeText={handleChangeGrid}
            />
          </H2kListSection>
          <H2kListSection title={'Suggested Locations'} style={{ marginTop: styles.oneSpace * 3 }}>
            <H2kListItem
              title="Device GPS"
              description={locationGrid ?? locationMessage}
              titleStyle={{ color: locationGrid && locationGrid === operation.grid ? styles.colors.primary : styles.colors.onBackground }}
              descriptionStyle={{ color: locationGrid && locationGrid === operation.grid ? styles.colors.primary : styles.colors.onBackground }}
              leftIcon={'map-marker-radius'}
              leftIconColor={locationGrid && locationGrid === operation.grid ? styles.colors.primary : styles.colors.onBackground}
              onPress={() => locationGrid && handleChangeGrid(locationGrid, 'gps')}
            />
            {refsWithHandlers.map(({ ref, handler }, index) => (
              <H2kListItem
                key={index}
                title={ref.label}
                description={ref.grid}
                titleStyle={{ color: ref.grid && operation.grid === ref.grid ? styles.colors.primary : styles.colors.onBackground }}
                descriptionStyle={{ color: ref.grid && operation.grid === ref.grid ? styles.colors.primary : styles.colors.onBackground }}
                leftIcon={handler.icon}
                leftIconColor={ref.grid && operation.grid === ref.grid ? styles.colors.primary : styles.colors.onBackground}
                onPress={() => handleChangeGrid(ref.grid, ref.type)}
              />
            ))}
          </H2kListSection>
        </ScrollView>
      </SafeAreaView>
    </ScreenContainer>
  )
}
