/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Dialog, Text, TouchableRipple } from 'react-native-paper'
import Geolocation from '@react-native-community/geolocation'

import { selectOperationCallInfo, setOperationData } from '../../../../store/operations'
import ThemedTextInput from '../../../../screens/components/ThemedTextInput'
import { Ham2kDialog } from '../../../../screens/components/Ham2kDialog'
import { locationToWABSquare } from '../WABLocation'

const VALID_WAB_REGEX = /^(W[AV][0-9]{2}|[BCDFGHJLMNOQRSTVWX][0-9]{2}|[HJNOST][A-HJ-Z][0-9]{2}|)$/
const PARTIAL_WAB_REGEX = /^([CDGHJNOSTW]{0,1}|W[AV][0-9]{0,2}|[BCDFGHJLMNOQRSTVWX][0-9]{0,2}|[HJNOST][A-Z][0-9]{0,2})$/

export function WABSquareDialog ({ operation, visible, settings, styles, onDialogDone }) {
  const dispatch = useDispatch()

  const [dialogVisible, setDialogVisible] = useState(false)

  const [square, setSquareValue] = useState('')
  const [isValid, setIsValidValue] = useState()

  const callInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  useEffect(() => {
    setDialogVisible(visible)
  }, [visible])

  useEffect(() => {
    setSquareValue(operation?.wabSquare || '')
  }, [operation])

  useEffect(() => {
    setIsValidValue(VALID_WAB_REGEX.test(square))
  }, [square])

  const handSquareChange = useCallback((text) => {
    text = text.toUpperCase()
    if (PARTIAL_WAB_REGEX.test(text)) {
      setSquareValue(text)
    }
  }, [setSquareValue])

  const handleAccept = useCallback(() => {
    if (isValid) {
      dispatch(setOperationData({ uuid: operation.uuid, wabSquare: square }))
    }
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [dispatch, operation, square, isValid, onDialogDone])

  const handleCancel = useCallback(() => {
    setSquareValue(operation.grid)
    setDialogVisible(false)
    onDialogDone && onDialogDone()
  }, [setSquareValue, operation.grid, setDialogVisible, onDialogDone])

  const [wabSquare, setWABSquare] = useState()
  useEffect(() => {
    Geolocation.getCurrentPosition(
      info => {
        const { latitude, longitude } = info.coords
        setWABSquare(locationToWABSquare(latitude, longitude))
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
        setWABSquare(locationToWABSquare(latitude, longitude))
      },
      error => {
        console.info('Geolocation watch error', error)
      }, {
        enableHighAccuracy: true,
        timeout: 1000 * 60 * 3 /* 3 minutes */,
        maximumAge: 1000 * 60 * 5 /* 5 minutes */
      }
    )
    return () => {
      Geolocation.clearWatch(watchId)
    }
  }, [])

  return (
    <Ham2kDialog visible={dialogVisible} onDismiss={handleCancel}>
      <Dialog.Title style={{ textAlign: 'center' }}>{'Worked All ' + (callInfo?.entityPrefix?.[0] === 'G' ? 'Britain' : 'Ireland') + ' Square'}</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium">Enter Square</Text>
        <ThemedTextInput
          style={[styles.input, { marginTop: styles.oneSpace }]}
          value={square}
          label="Square"
          placeholder={callInfo?.entityPrefix?.[0] === 'G' ? 'e.g. SU14' : 'e.g. N93'}
          onChangeText={handSquareChange}
          error={!isValid}
        />
        {wabSquare && (
          <TouchableRipple onPress={() => setSquareValue(wabSquare)} style={{ marginTop: styles.oneSpace }}>
            <Text variant="bodyMedium" style={{ marginTop: styles.oneSpace, marginBottom: styles.oneSpace }}>
              <Text>Current Square: </Text>
              <Text style={{ color: styles.colors.primary, fontWeight: 'bold' }}>{wabSquare}</Text>
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
