/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { parseCallsign } from '@ham2k/lib-callsigns'
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
  const { qso, operation, vfo, styles, style, settings, setCurrentSecondaryControl, focusedRef } = props

  const online = useSelector(selectRuntimeOnline)

  const dispatch = useDispatch()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  const [inProgress, setInProgress] = useState(false)
  const [spotStatus, setSpotStatus] = useState({})
  const [comments, setComments] = useState()

  const now = useSelector(selectSecondsTick)

  const isSelfSpotting = useMemo(() => !qso || !parseCallsign(qso.their?.call)?.baseCall, [qso])

  const { spotterMessage, spotterDisabled } = useMemo(() => {
    const freq = qso?.freq || vfo?.freq

    if (inProgress) {
      if (isSelfSpotting) {
        return {
          spotterMessage: `Self-spotting at ${fmtFreqInMHz(freq)}`,
          spotterDisabled: true
        }
      } else {
        return {
          spotterMessage: `Spotting ${qso?.their?.call} at ${fmtFreqInMHz(freq)}`,
          spotterDisabled: true
        }
      }
    } else {
      if (isSelfSpotting) {
        if (!vfo?.freq) {
          return {
            spotterMessage: 'First set a frequency to spot.',
            spotterDisabled: true
          }
        } else if (vfo.freq !== operation?.local?.spottedFreq) {
          if (comments === undefined || comments === 'QRV ') {
            let suggested = operation?.local?.spottedFreq ? 'QSY ' : 'QRV '
            if (operation?.stationCallPlusArray?.length > 0) suggested += `${operation?.stationCallPlusArray?.length + 1} ops `
            setComments(suggested)
          }
          return {
            spotterMessage: `Self-spot at ${fmtFreqInMHz(vfo.freq)}`,
            spotterDisabled: false
          }
        } else if (now - (operation?.local?.spottedAt || 0) > (1000 * SECONDS_UNTIL_RESPOT)) {
          return {
            spotterMessage: `Re-spot at ${fmtFreqInMHz(vfo.freq)}`,
            spotterDisabled: false
          }
        } else if (comments?.length > 0 && (now - (operation?.local?.spottedAt || 0) < (1000 * 1))) {
          setComments(undefined)
          return {
            spotterMessage: `Self-spotted ${fmtDateTimeRelative(operation?.local?.spottedAt)}`,
            spotterDisabled: false
          }
        } else if (comments?.length > 0) {
          return {
            spotterMessage: `Re-spot at ${fmtFreqInMHz(vfo.freq)}`,
            spotterDisabled: false
          }
        } else {
          return {
            spotterMessage: `Self-spotted ${fmtDateTimeRelative(operation?.local?.spottedAt)}`,
            spotterDisabled: false
          }
        }
      } else {
        if (!qso?.startAtMillis || (now - qso?.startAtMillis) < (1000 * 60 * 10)) {
          return {
            spotterMessage: `Spot ${qso?.their?.call} at ${fmtFreqInMHz(freq)}`,
            spotterDisabled: false
          }
        } else {
          return {
            spotterMessage: `Too late to spot ${qso?.their?.call}`,
            spotterDisabled: true
          }
        }
      }
    }
  }, [
    now, comments, inProgress, isSelfSpotting,
    qso?.freq, qso?.their?.call, qso?.startAtMillis, vfo.freq,
    operation?.local?.spottedFreq, operation?.local?.spottedAt,
    operation?.stationCallPlusArray?.length
  ])

  const hooksWithSpotting = useMemo(() => retrieveHooksWithSpotting({ isSelfSpotting, qso, operation, settings }), [isSelfSpotting, qso, operation, settings])

  const handleSpotting = useCallback(async () => {
    postSpots({ isSelfSpotting, qso, operation, vfo, comments, hooksWithSpotting, dispatch, setInProgress, setSpotStatus, setComments, setCurrentSecondaryControl, settings })
  }, [
    isSelfSpotting, qso, hooksWithSpotting, dispatch, operation, vfo, comments,
    setCurrentSecondaryControl, settings
  ])

  return (
    <View style={[style, { flexDirection: 'row', flexWrap: 'wrap', gap: styles.oneSpace, alignItems: 'flex-end', width: '100%', maxWidth: styles.oneSpace * 120 }]}>
      <ThemedTextInput
        innerRef={ref}
        focusedRef={focusedRef}
        style={{ marginLeft: styles.oneSpace, marginRight: styles.oneSpace, flex: 1 }}
        label={'Comments'}
        value={comments ?? ''}
        onChangeText={setComments}
        disabled={!online || spotterDisabled}
      />

      <ThemedButton
        themeColor="tertiaryLighter"
        mode="contained"
        icon={online ? 'hand-wave' : 'cloud-off-outline'}
        onPress={handleSpotting}
        disabled={!online || spotterDisabled}
        // minWidth={styles.oneSpace * 18}
      >
        {spotterMessage}
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

export function retrieveHooksWithSpotting ({ isSelfSpotting, qso, operation, settings }) {
  const spotMethodKey = isSelfSpotting ? 'postSelfSpot' : 'postOtherSpot'
  const spotEnabledKey = isSelfSpotting ? 'isSelfSpotEnabled' : 'isOtherSpotEnabled'

  const activityHooks = findHooks('activity').filter((x) => (findRef((isSelfSpotting ? operation : qso)?.refs, isSelfSpotting ? x.activationType : x.huntingType) && x[spotMethodKey] && (!x[spotEnabledKey] || (x[spotEnabledKey] && x[spotEnabledKey]({ operation, settings })))))
  const spottingHooks = findHooks('spots').filter((x) => x[spotMethodKey])

  return [...activityHooks, ...spottingHooks]
}

export async function postSpots ({ isSelfSpotting, qso, operation, vfo, comments, hooksWithSpotting, dispatch, setSpotterUI, setInProgress, setSpotStatus, setComments, setCurrentSecondaryControl, settings }) {
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

    status[hook.key] = await dispatch(isSelfSpotting ? hook.postSelfSpot({ operation, vfo, comments, qCode, qRest }) : hook.postOtherSpot({ qso, comments, spotterCall: operation.stationCall || settings.operatorCall }))
    ok = ok && status[hook.key]
    setSpotStatus && setSpotStatus(status)
  }
  setInProgress && setInProgress(false)
  setComments && setComments(undefined)
  if (ok) {
    if (isSelfSpotting) dispatch(setOperationLocalData({ uuid: operation.uuid, spottedAt: new Date().getTime(), spottedFreq: vfo.freq }))
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
  label: ({ qso }) => {
    return qso && parseCallsign(qso.their?.call)?.baseCall ? 'Spotting' : 'Self-Spotting'
  },
  accesibilityLabel: 'Self-Spotting Controls',
  InputComponent: SpotterControlInputs,
  inputWidthMultiplier: 40,
  optionType: 'mandatory',
  onlyNewQSOs: false
}
