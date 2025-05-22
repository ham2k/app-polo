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
import { Icon } from 'react-native-paper'
import ThemedButton from '../../../../../components/ThemedButton'

import ThemedTextInput from '../../../../../components/ThemedTextInput'
import { selectRuntimeOnline } from '../../../../../../store/runtime'
import { findHooks } from '../../../../../../extensions/registry'
import { findRef } from '../../../../../../tools/refTools'
import { setOperationLocalData } from '../../../../../../store/operations'

const SECONDS_UNTIL_RESPOT = 30

export function SpotterControlInputs (props) {
  const { operation, vfo, styles, style, settings, setCurrentSecondaryControl, focusedRef } = props

  const online = useSelector(selectRuntimeOnline)

  const dispatch = useDispatch()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  const [spotterUI, setSpotterUI] = useState({})
  const [inProgress, setInProgress] = useState(false)
  const [spotStatus, setSpotStatus] = useState({})
  const [comments, setComments] = useState()

  const now = useSelector(selectSecondsTick)

  useEffect(() => {
    if (!inProgress) {
      if (vfo?.freq) {
        if (vfo.freq !== operation?.local?.spottedFreq) {
          setSpotterUI({
            message: `Spot at ${fmtFreqInMHz(vfo.freq)}`,
            disabled: false
          })

          if (comments === undefined || comments === 'QRV ') {
            let suggested = operation?.local?.spottedFreq ? 'QSY ' : 'QRV '
            if (operation?.stationCallPlusArray?.length > 0) suggested += `${operation?.stationCallPlusArray?.length + 1} ops `
            setComments(suggested)
          }
        } else if (now - (operation?.local?.spottedAt || 0) > (1000 * SECONDS_UNTIL_RESPOT)) {
          setSpotterUI({
            message: `Re-spot at ${fmtFreqInMHz(vfo.freq)}`,
            disabled: false
          })
        } else if (comments?.length > 0 && (now - (operation?.local?.spottedAt || 0) < (1000 * 1))) {
          setSpotterUI({
            message: `Spotted ${fmtDateTimeRelative(operation?.local?.spottedAt)}`,
            disabled: false
          })
          setComments(undefined)
        } else if (comments?.length > 0) {
          setSpotterUI({
            message: `Re-spot at ${fmtFreqInMHz(vfo.freq)}`,
            disabled: false
          })
        } else {
          setSpotterUI({
            message: `Spotted ${fmtDateTimeRelative(operation?.local?.spottedAt)}`,
            disabled: false
          })
        }
      } else {
        setSpotterUI({
          message: 'First set a frequency to spot.',
          disabled: true
        })
      }
    }
  }, [inProgress, vfo?.freq, operation?.local?.spottedFreq, operation?.local?.spottedAt, operation, now, comments])

  const hooksWithSpotting = useMemo(() => retrieveHooksWithSpotting({ operation, settings }), [operation, settings])

  const handleSpotting = useCallback(async () => {
    postSpots({ operation, vfo, comments, hooksWithSpotting, dispatch, setSpotterUI, setInProgress, setSpotStatus, setComments, setCurrentSecondaryControl })
  }, [hooksWithSpotting, dispatch, operation, vfo, comments, setCurrentSecondaryControl])

  return (
    <View style={[style, { flexDirection: 'row', flexWrap: 'wrap', gap: styles.oneSpace, alignItems: 'flex-end', width: '100%', maxWidth: styles.oneSpace * 120 }]}>
      <ThemedTextInput
        innerRef={ref}
        focusedRef={focusedRef}
        style={{ marginLeft: styles.oneSpace, marginRight: styles.oneSpace, flex: 1 }}
        label={'Comments'}
        value={comments ?? ''}
        onChangeText={setComments}
        disabled={!online || spotterUI.disabled}
      />

      <ThemedButton
        themeColor="tertiaryLighter"
        mode="contained"
        icon={online ? 'hand-wave' : 'cloud-off-outline'}
        onPress={handleSpotting}
        disabled={!online || spotterUI.disabled}
        // minWidth={styles.oneSpace * 18}
      >
        {spotterUI.message}
      </ThemedButton>
      <View style={{ flex: 0, flexDirection: 'row', position: 'absolute', top: styles.oneSpace * -1, right: 0 }}>
        {hooksWithSpotting.map((x, n) => (
          <Icon
            key={x.key}
            source={x.icon}
            size={styles.oneSpace * 2.3}
            color={styles.colors[colorForStatus(spotStatus[x.key])]}
          />
        ))}
      </View>
    </View>
  )
}

export function retrieveHooksWithSpotting ({ operation, settings }) {
  const activityHooks = findHooks('activity').filter((x) => (findRef(operation.refs, x.activationType) && x.postSpot && (!x.isSpotEnabled || (x.isSpotEnabled && x.isSpotEnabled({ operation, settings })))))
  const spottingHooks = findHooks('spots').filter((x) => x.postSpot)

  return [...activityHooks, ...spottingHooks]
}

export async function postSpots ({ operation, vfo, comments, hooksWithSpotting, dispatch, setSpotterUI, setInProgress, setSpotStatus, setComments, setCurrentSecondaryControl }) {
  hooksWithSpotting = hooksWithSpotting || []
  comments = comments || ''

  const status = {}
  let ok = true
  setSpotStatus && setSpotStatus(status)
  setInProgress && setInProgress(true)

  let [qCode, qRest] = comments?.split(' ', 2)
  if (!qCode?.match(/^Q[A-Z]{2}$/)) {
    qCode = undefined
    qRest = comments
  }
  let limitToThisHook
  if (comments.match(/ !(\w+)/)) {
    limitToThisHook = comments.match(/ !(\w+)/)[1].toLowerCase()
    comments = comments.replace(/ !(\w+)/, '')
  }

  for (const hook of hooksWithSpotting) {
    if (limitToThisHook) {
      if (hook.key.toLowerCase() !== limitToThisHook && hook.key.toLowerCase() !== `spot-${limitToThisHook}`) {
        continue
      }
    }

    setSpotterUI && setSpotterUI({
      message: `Spotting ${hook.shortName ?? hook.name}…`,
      disabled: true
    })

    status[hook.key] = await dispatch(hook.postSpot({ operation, vfo, comments, qCode, qRest }))
    ok = ok && status[hook.key]
    setSpotStatus && setSpotStatus(status)
  }
  setInProgress && setInProgress(false)
  setComments && setComments(undefined)
  if (ok) {
    dispatch(setOperationLocalData({ uuid: operation.uuid, spottedAt: new Date().getTime(), spottedFreq: vfo.freq }))
    setCurrentSecondaryControl && setCurrentSecondaryControl(undefined)
  }
}

const colorForStatus = (status) => {
  if (status === true) return 'importantLight'
  if (status === false) return 'errorLight'
  return 'onTertiaryLight'
}

export const spotterControl = {
  key: 'spotter',
  order: 100,
  icon: 'hand-wave',
  label: ({ operation, qso }) => {
    return 'Self-Spotting'
  },
  accesibilityLabel: 'Self-Spotting Controls',
  InputComponent: SpotterControlInputs,
  inputWidthMultiplier: 40,
  optionType: 'mandatory',
  onlyNewQSOs: true
}
