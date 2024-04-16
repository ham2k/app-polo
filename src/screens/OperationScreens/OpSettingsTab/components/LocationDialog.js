/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { KeyboardAvoidingView } from 'react-native'
import { Button, Dialog, Portal, Text, TouchableRipple } from 'react-native-paper'
import Geolocation from '@react-native-community/geolocation'
import { locationToGrid } from '@ham2k/lib-maidenhead-grid'

import { setOperationData } from '../../../../store/operations'
import ThemedTextInput from '../../../components/ThemedTextInput'
import { reportError } from '../../../../App'

const VALID_MAIDENHEAD_REGEX = /^([A-R]{2}|[A-R]{2}[0-9]{2}|[A-R]{2}[0-9]{2}[a-x]{2}||[A-R]{2}[0-9]{2}[a-x]{2}[0-9]{2})$/
const PARTIAL_MAIDENHEAD_REGEX = /^([A-R]{0,2}|[A-R]{2}[0-9]{0,2}|[A-R]{2}[0-9]{2}[a-x]{0,2}||[A-R]{2}[0-9]{2}[a-x]{2}[0-9]{0,2})$/

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

  const handleGridChange = useCallback((text) => {
    text = text.substring(0, 4).toUpperCase() + text.substring(4).toLowerCase()
    if (PARTIAL_MAIDENHEAD_REGEX.test(text)) {
      setGridValue(text)
    }
  }, [setGridValue])

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
    Geolocation.getCurrentPosition(info => {
      const { latitude, longitude } = info.coords
      setLocationGrid(locationToGrid(latitude, longitude))
    }, error => {
      reportError('location error', error)
    })

    const watchId = Geolocation.watchPosition(info => {
      const { latitude, longitude } = info.coords
      setLocationGrid(locationToGrid(latitude, longitude))
    }, error => {
      reportError('location error', error)
    })
    return () => {
      Geolocation.clearWatch(watchId)
    }
  }, [])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={dialogVisible} onDismiss={handleCancel}>
          <Dialog.Icon icon="map-marker-radius" />
          <Dialog.Title style={{ textAlign: 'center' }}>Station Location</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Enter a Maidenhead Grid Square Locator</Text>
            <ThemedTextInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={grid}
              label="Grid Square Locator"
              placeholder={'AA00aa'}
              onChangeText={handleGridChange}
              error={!isValid}
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
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}
