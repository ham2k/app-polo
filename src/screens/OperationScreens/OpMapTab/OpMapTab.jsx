/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IconButton } from 'react-native-paper'

import { gridToLocation } from '@ham2k/lib-maidenhead-grid'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectRuntimeOnline } from '../../../store/runtime'
import { selectOperation } from '../../../store/operations'
import { addQSO, selectQSOs } from '../../../store/qsos'
import { View } from 'react-native'
import { selectSettings } from '../../../store/settings'
import { apiQRZ } from '../../../store/apiQRZ'
import { reportError } from '../../../App'
import { useUIState } from '../../../store/ui'
import MapWithQSOs from './components/MapWithQSOs'

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

  const dispatch = useDispatch()

  const online = useSelector(selectRuntimeOnline)
  const settings = useSelector(selectSettings)

  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))

  const [loggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  const qth = useMemo(() => {
    try {
      if (!operation?.grid) return {}
      const [latitude, longitude] = gridToLocation(operation.grid)
      return { latitude, longitude }
    } catch (e) {
      return {}
    }
  }, [operation?.grid])

  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))

  const [nextQSOWithoutInfo, setNextQSOWithoutInfo] = useState(null)

  useEffect(() => {
    if (online && settings?.accounts?.qrz?.login && settings?.accounts?.qrz?.password) {
      if (!nextQSOWithoutInfo) {
        setNextQSOWithoutInfo(qsos.find(qso => !qso.their?.lookup))
      }
    }
  }, [qsos, online, settings, nextQSOWithoutInfo])

  useEffect(() => {
    if (nextQSOWithoutInfo) {
      setTimeout(async () => {
        try {
          const { data } = await dispatch(apiQRZ.endpoints.lookupCall.initiate({ call: nextQSOWithoutInfo.their.call }))
          const lookup = {
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

          if (data?.error) lookup.error = data.error

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
                lookup
              }
            }
          }))
        } catch (e) {
          reportError('QRZ Lookup Error', e)
        } finally {
          setNextQSOWithoutInfo(null)
        }
      }, 10)
    }
  }, [nextQSOWithoutInfo, dispatch, operation?.uuid])

  return (
    <>
      <MapWithQSOs
        styles={styles}
        operation={operation}
        qth={qth}
        qsos={qsos}
        settings={settings}
        selectedKey={loggingState?.selectedKey}
      />
      <View style={{ position: 'absolute', bottom: styles.oneSpace * 2, right: styles.oneSpace * 2 }}>
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
