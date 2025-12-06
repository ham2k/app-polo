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
import { useTranslation } from 'react-i18next'

import { locationToGrid6, locationToGrid8 } from '@ham2k/lib-maidenhead-grid'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings } from '../../../store/settings'
import { selectOperation, setOperationData } from '../../../store/operations'
import ScreenContainer from '../../components/ScreenContainer'
import { findBestHook } from '../../../extensions/registry'
import { defaultReferenceHandlerFor } from '../../../extensions/core/references'
import { H2kGridInput, H2kListItem, H2kListSection } from '../../../ui'

export default function OperationLocationScreen ({ navigation, route }) {
  const { t } = useTranslation()

  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)
  const operation = useSelector(state => selectOperation(state, route.params.operation))

  const refsWithHandlers = useMemo(() => {
    return (operation?.refs || []).filter(ref => ref.grid).map(ref => {
      return { ref, handler: findBestHook(`ref:${ref.type}`) || defaultReferenceHandlerFor(ref.type) }
    })
  }, [operation?.refs])

  const [grid, setGrid] = useState(operation?.grid || '')
  const [gridSource, setGridSource] = useState(operation?.gridSource ?? operation?.source ?? '')

  useEffect(() => {
    if (!operation) {
      navigation.goBack()
    }
    navigation.setOptions({
      leftAction: 'accept',
      leftActionA11yLabel: t('general.buttons.accept-a11y', 'Accept Changes'),
      rightAction: 'revert',
      rightActionA11yLabel: t('general.buttons.revert-a11y', 'Revert Changes'),
      onLeftActionPress: () => {
        dispatch(setOperationData({ uuid: operation.uuid, grid, gridSource }))
        navigation.goBack()
      },
      onRightActionPress: () => navigation.goBack()
    })
  }, [dispatch, grid, gridSource, navigation, operation, t])

  const handleChangeGrid = useCallback((newGrid, newGridSource) => {
    setGridSource(newGridSource ?? 'manual')
    setGrid(newGrid)
  }, [setGrid, setGridSource])

  const [locationGrid, setLocationGrid] = useState()
  const [locationMessage, setLocationMessage] = useState()

  useEffect(() => {
    setLocationMessage(t('screens.operationLocation.locating', 'Locating…'))
    Geolocation.getCurrentPosition(
      info => {
        const { latitude, longitude } = info.coords
        if (settings?.useGrid8) setLocationGrid(locationToGrid8(latitude, longitude))
        else setLocationGrid(locationToGrid6(latitude, longitude))
      },
      error => {
        console.info('Geolocation error', error)
        setLocationMessage(t('screens.operationLocation.gpsError', 'GPS Error'))
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
        setLocationGrid(t('screens.operationLocation.noGps', 'NO GPS'))
      }, {
        enableHighAccuracy: true,
        timeout: 1000 * 60 * 3 /* 3 minutes */,
        maximumAge: 1000 * 60 * 5 /* 5 minutes */
      }
    )
    return () => {
      Geolocation.clearWatch(watchId)
    }
  }, [settings?.useGrid8, t])

  return (
    <ScreenContainer>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, paddingVertical: styles.oneSpace }}>
          <H2kListSection title={t('screens.operationLocation.selectedLocation', 'Selected Location')}>
            <H2kGridInput
              style={[styles.input, { marginHorizontal: styles.oneSpace * 2 }]}
              value={grid || ''}
              label={t('screens.operationLocation.maidenheadGridSquareLocator', 'Maidenhead Grid Square Locator')}
              placeholder={settings?.useGrid8 ? 'AA00aa00' : 'AA00aa'}
              onChangeText={handleChangeGrid}
            />
          </H2kListSection>
          <H2kListSection title={t('screens.operationLocation.suggestedLocations', 'Suggested Locations')} style={{ marginTop: styles.oneSpace * 3 }}>
            <H2kListItem
              title={t('screens.operationLocation.deviceGps', 'Device GPS')}
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
