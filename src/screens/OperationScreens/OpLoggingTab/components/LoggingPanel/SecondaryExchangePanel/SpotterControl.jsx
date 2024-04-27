/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { fmtFreqInMHz } from '../../../../../../tools/frequencyFormats'
import { fmtDateTimeRelative } from '../../../../../../tools/timeFormats'
import { useDispatch, useSelector } from 'react-redux'
import { selectSecondsTick } from '../../../../../../store/time'
import { View } from 'react-native'
import { Badge, Icon } from 'react-native-paper'
import ThemedButton from '../../../../../components/ThemedButton'

import ThemedTextInput from '../../../../../components/ThemedTextInput'
import { selectRuntimeOnline } from '../../../../../../store/runtime'
import { findHooks } from '../../../../../../extensions/registry'
import { findRef } from '../../../../../../tools/refTools'
import { setOperationData } from '../../../../../../store/operations'

const MINUTES_UNTIL_RESPOT = 5

export function SpotterControlInputs (props) {
  const { operation, styles, style } = props

  const online = useSelector(selectRuntimeOnline)

  const dispatch = useDispatch()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 0) }, [])

  const [spotterUI, setSpotterUI] = useState({})
  const [comments, setComments] = useState()

  const now = useSelector(selectSecondsTick)

  useEffect(() => {
    if (operation?.freq) {
      if (operation.freq !== operation.spottedFreq) {
        setSpotterUI({
          message: `Spot at ${fmtFreqInMHz(operation.freq)}`,
          disabled: false
        })
        if (comments === undefined) setComments(operation.spottedFreq ? 'QSY' : 'QRV with Ham2K PoLo')
      } else if (now - operation.spottedAt > (1000 * 60 * MINUTES_UNTIL_RESPOT)) {
        setSpotterUI({
          message: `Re-spot at ${fmtFreqInMHz(operation.freq)}`,
          disabled: false
        })
        if (comments === undefined) setComments('QRT')
      } else if (comments?.length > 0 && (now - operation.spottedAt < (1000 * 1))) {
        setSpotterUI({
          message: `Spotted ${fmtDateTimeRelative(operation.spottedAt)}`,
          disabled: true
        })
        setComments(undefined)
      } else if (comments?.length > 0) {
        setSpotterUI({
          message: `Re-spot at ${fmtFreqInMHz(operation.freq)}`,
          disabled: false
        })
      } else {
        setSpotterUI({
          message: `Spotted ${fmtDateTimeRelative(operation.spottedAt)}`,
          disabled: true
        })
      }
    } else {
      setSpotterUI({
        message: 'First set a frequency to spot.',
        disabled: true
      })
    }
  }, [operation?.freq, operation?.spottedFreq, operation?.spottedAt, operation, now, comments])

  const activityHooksWithSpot = useMemo(() =>
    findHooks('activity').filter((x) => (findRef(operation.refs, x.activationType) && x.postSpot))
  , [operation.refs])

  const handleSpotting = useCallback(() => {
    activityHooksWithSpot.forEach(hook => dispatch(hook.postSpot(operation, comments)))
    dispatch(setOperationData({ uuid: operation.uuid, spottedAt: new Date().getTime(), spottedFreq: operation.freq }))
    setComments(undefined)
  }, [dispatch, operation, comments, activityHooksWithSpot])

  return (
    <View style={[style, { flexDirection: 'row', flexWrap: 'wrap', gap: styles.oneSpace, alignItems: 'flex-end' }]}>
      <View style={{ flex: 1 }}>
        <ThemedButton
          themeColor="tertiaryLighter"
          mode="contained"
          icon={online ? 'hand-wave' : 'cloud-off-outline'}
          onPress={handleSpotting}
          disabled={!online || spotterUI.disabled}
          minWidth={styles.oneSpace * 18}
          labelStyle={{ ellipsizeMode: 'middle' }}
        >
          {spotterUI.message}
        </ThemedButton>
        {activityHooksWithSpot.map((x, n) => (
          <Badge
            key={x.key}
            style={{
              position: 'absolute',
              top: -styles.oneSpace * 2,
              right: -styles.halfSpace + (n * styles.oneSpace * 3),
              backgroundColor: styles.colors.tertiaryLight,
              height: styles.oneSpace * 3.5,
              width: styles.oneSpace * 3.5,
              padding: 0,
              margin: 0
            }}
            size={styles.oneSpace * 3}
          >
            <Icon source={x.icon} size={styles.oneSpace * (styles.isIOS ? 0.8 : 2)} color={styles.colors.onTertiaryLight} />
          </Badge>
        ))}
      </View>
      {!spotterUI.disabled && (
        <ThemedTextInput
          innerRef={ref}
          style={{ marginLeft: styles.oneSpace, marginRight: styles.oneSpace, flex: 1 }}
          label={'Comments'}
          value={comments ?? ''}
          onChangeText={setComments}
        />
      )}
    </View>
  )
}

export const spotterControl = {
  key: 'spotter',
  order: 11,
  icon: 'hand-wave',
  label: ({ operation, qso }) => {
    return 'Spotting'
  },
  InputComponent: SpotterControlInputs,
  inputWidthMultiplier: 36,
  optionType: 'mandatory'
}
