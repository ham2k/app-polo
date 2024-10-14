/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Button, Dialog, Text, TouchableRipple } from 'react-native-paper'
import Geolocation from '@react-native-community/geolocation'
import { locationToGrid6, locationToGrid8 } from '@ham2k/lib-maidenhead-grid'

import { setOperationData } from '../../../../store/operations'
import GridInput from '../../../components/GridInput'

import { Ham2kDialog } from '../../../components/Ham2kDialog'

const VALID_MAIDENHEAD_REGEX = /^([A-R]{2}|[A-R]{2}[0-9]{2}|[A-R]{2}[0-9]{2}[a-x]{2}||[A-R]{2}[0-9]{2}[a-x]{2}[0-9]{2})$/

export function LocationDialog ({ operation, visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [grid, setGridValue] = useState('')
  const [isValid, setIsValidValue] = useState()

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setGridValue(operation?.grid || '')
  }, [operation])

  useEffect(() => {
    setIsValidValue(VALID_MAIDENHEAD_REGEX.test(grid))
  }, [grid])

  const handleAccept = useCallback(() => {
    if (isValid) {
      dispatch(setOperationData({ uuid: operation.uuid, grid }))
    }
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [dispatch, operation, grid, isValid, onDialogDone])

  const handleCancel = useCallback(() => {
    setGridValue(operation.grid)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [operation, onDialogDone])

  const [locationGrid, setLocationGrid] = useState()
  useEffect(() => {
    Geolocation.getCurrentPosition(
      info => {
        const { latitude, longitude } = info.coords
        if (settings?.useGrid8) setLocationGrid(locationToGrid8(latitude, longitude))
        else setLocationGrid(locationToGrid6(latitude, longitude))
      },
      error => {
        console.info('Geolocation error', error)
      }, {
        enableHighAccuracy: true,
        timeout: 30 * 1000 /* 30 seconds */,
        maximumAge: 1000 * 60 * 5 /* 5 minutes */
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
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <Dialog.Title style={{ textAlign: 'center' }}>Station Location</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium">Enter a Maidenhead Grid Square Locator</Text>
        <GridInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={grid}
          label="Grid Square Locator"
          placeholder={settings?.useGrid8 ? 'AA00aa00' : 'AA00aa'}
          onChangeText={setGridValue}
        />
        {locationGrid && (
          <TouchableRipple onPress={() => setGridValue(locationGrid)} style={{ marginTop: styles.oneSpace }}>
            <Text variant="bodyMedium" style={{ marginTop: styles.oneSpace, marginBottom: styles.oneSpace }}>
              <Text>Current Location: </Text>
              <Text style={{ color: styles.colors.primary, fontWeight: 'bold' }}>{locationGrid}</Text>
            </Text>
          </TouchableRipple>

        )}
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleCancel}>Cancel</Button>
        <Button onPress={handleAccept} disabled={!isValid}>Ok</Button>
      </Dialog.Actions>
    </Ham2kDialog>
  )
}
