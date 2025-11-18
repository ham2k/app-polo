/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { selectSecondsTick, selectThirtySecondsTick } from '../../../../../../store/time'
import { selectRuntimeOnline } from '../../../../../../store/runtime'
import { setOperationLocalData } from '../../../../../../store/operations'
import { findHooks } from '../../../../../../extensions/registry'
import { findRef } from '../../../../../../tools/refTools'
import { fmtFreqInMHz } from '../../../../../../tools/frequencyFormats'
import { fmtDateTimeRelative } from '../../../../../../tools/timeFormats'
import { H2kButton, H2kIcon, H2kTextInput } from '../../../../../../ui'
import LoggerChip from '../../../../components/LoggerChip'

const SECONDS_UNTIL_RESPOT = 30

const MINUTES_FOR_AUTO_RESPOT = 10

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

  const hooksWithSpotting = useMemo(() => retrieveHooksWithSpotting({ isSelfSpotting, qso, operation, settings }), [isSelfSpotting, qso, operation, settings])

  const { spotterMessage, spotterDisabled, autoRespotting } = useMemo(() => {
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
    } else if (hooksWithSpotting.length > 0) {
      if (isSelfSpotting) {
        if (!vfo?.freq) {
          return {
            spotterMessage: 'First set a frequency to spot.',
            spotterDisabled: true
          }
        } else if (operation?.local?.autoRespotting) {
          return {
            spotterMessage: 'Stop auto-respotting',
            spotterDisabled: false,
            autoRespotting: false
          }
        } else if (vfo.freq !== operation?.local?.spottedFreq) {
          if (comments === undefined || comments === 'QRV ') {
            let suggested = operation?.local?.spottedFreq ? 'QSY ' : 'QRV '
            if (operation?.stationCallPlusArray?.length > 0) suggested += `(${operation?.stationCallPlusArray?.length + 1} ops) `
            setComments(suggested)
          }
          return {
            spotterMessage: `Self-spot at ${fmtFreqInMHz(vfo.freq)}`,
            spotterDisabled: false
          }
        } else if ((now - (operation?.local?.spottedAt || 0)) < (10 * 1000)) {
          return {
            spotterMessage: `Re-spot every ${MINUTES_FOR_AUTO_RESPOT} min`,
            spotterDisabled: false,
            autoRespotting: true
          }
        } else if (now - (operation?.local?.spottedAt || 0) > (1000 * SECONDS_UNTIL_RESPOT)) {
          return {
            spotterMessage: `Re-spot at ${fmtFreqInMHz(vfo.freq)}`,
            spotterDisabled: false
          }
        } else if (comments?.length > 0 && (now - (operation?.local?.spottedAt || 0) < (1000 * 15))) {
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
    } else {
      return {
        spotterMessage: 'Nothing to spot',
        spotterDisabled: true
      }
    }
  }, [
    now, comments, inProgress, isSelfSpotting,
    hooksWithSpotting.length,
    qso?.freq, qso?.their?.call, qso?.startAtMillis, vfo.freq,
    operation?.local?.spottedFreq, operation?.local?.spottedAt,
    operation?.local?.autoRespotting,
    operation?.stationCallPlusArray?.length
  ])

  const handleSpotting = useCallback(async () => {
    if (autoRespotting === true) {
      dispatch(setOperationLocalData({ uuid: operation.uuid, autoRespotting: true }))
    } else if (autoRespotting === false) {
      dispatch(setOperationLocalData({ uuid: operation.uuid, autoRespotting: false }))
    } else {
      postSpots({ isSelfSpotting, qso, operation, vfo, comments, hooksWithSpotting, dispatch, setInProgress, setSpotStatus, setComments, setCurrentSecondaryControl, settings })
    }
  }, [
    isSelfSpotting, autoRespotting, qso, hooksWithSpotting, dispatch, operation, vfo, comments,
    setCurrentSecondaryControl, settings
  ])

  return (
    <View style={[style, { flexDirection: 'row', flexWrap: 'wrap', gap: styles.oneSpace, alignItems: 'flex-end', width: '100%', maxWidth: styles.oneSpace * 120 }]}>
      <H2kTextInput
        innerRef={ref}
        focusedRef={focusedRef}
        style={{ marginLeft: styles.oneSpace, marginRight: styles.oneSpace, flex: 1 }}
        label={'Comments'}
        value={comments ?? ''}
        onChangeText={setComments}
        disabled={!online || spotterDisabled}
      />

      <H2kButton
        themeColor="tertiaryLighter"
        mode="contained"
        icon={online ? 'hand-wave' : 'cloud-off-outline'}
        onPress={handleSpotting}
        disabled={!online || spotterDisabled}
        // minWidth={styles.oneSpace * 18}
      >
        {spotterMessage}
      </H2kButton>
      <View style={{ flex: 0, flexDirection: 'row', position: 'absolute', top: styles.oneSpace * -1, right: 0 }}>
        {hooksWithSpotting.map((x, n) => (
          <H2kIcon
            key={x.key}
            name={x.icon}
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

  const activityHooks = findHooks('activity').filter((x) => (
    findRef(
      (isSelfSpotting ? operation : qso)?.refs,
      isSelfSpotting ? x.activationType : x.huntingType
    ) && x[spotMethodKey] &&
        (!x[spotEnabledKey] || (x[spotEnabledKey] && x[spotEnabledKey]({ operation, settings })))
  ))

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
    status[hook.key] = await dispatch(isSelfSpotting ? hook.postSelfSpot({ operation, vfo, settings, comments, qCode, qRest }) : hook.postOtherSpot({ qso, comments, spotterCall: operation.stationCall || settings.operatorCall }))
    ok = ok && status[hook.key]
    setSpotStatus && setSpotStatus(status)
  }
  setInProgress && setInProgress(false)
  setComments && setComments(undefined)
  if (ok) {
    if (isSelfSpotting) dispatch(setOperationLocalData({ uuid: operation.uuid, spottedAt: new Date().getTime(), spottedFreq: vfo.freq, spottedComments: comments }))
    setTimeout(() => {
      setCurrentSecondaryControl && setCurrentSecondaryControl(undefined)
    }, 5000)
  }
}

export function useAutoRespotting ({ operation, vfo, dispatch, settings }) {
  const hooksWithSpotting = useMemo(() => retrieveHooksWithSpotting({ isSelfSpotting: true, operation, settings }), [operation, settings])

  const thirtySecondsTick = useSelector(selectThirtySecondsTick)

  useEffect(() => {
    dispatch(setOperationLocalData({ uuid: operation.uuid, autoRespotting: false }))
  // Disable autoRespotting on start
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (operation?.local?.autoRespotting) {
      if (vfo?.freq !== operation?.local?.spottedFreq) {
        dispatch(setOperationLocalData({ uuid: operation.uuid, autoRespotting: false }))
      } else if (thirtySecondsTick - operation?.local?.spottedAt > MINUTES_FOR_AUTO_RESPOT * 60 * 1000) {
        postSpots({ isSelfSpotting: true, operation, vfo, comments: operation?.local?.spottedComments ?? '', hooksWithSpotting, dispatch, settings })
      }
    }
  // We want to be more selective with our deps.
  // No need to include all `operation` or `vfo` or `settings`, even if they are passed to some functions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation?.local?.autoRespotting, vfo?.freq, operation?.local?.spottedFreq, thirtySecondsTick])
}

const colorForStatus = (status) => {
  if (status === true) return 'importantLight'
  if (status === false) return 'errorLight'
  return 'onTertiaryLight'
}

export const spotterControl = {
  key: 'spotter',
  order: 50,
  icon: 'hand-wave',
  LabelComponent: ({ qso, operation, control, ...props }) => {
    let label = props.label || 'Self-Spotting'
    if (control.labelAsGeneralSpotting) {
      label = 'Spotting'
    } else if (qso?.their?.guess?.call && qso?.their?.guess?.baseCall) {
      label = 'Spotting'
    } else if (operation?.local?.autoRespotting) {
      label = 'Auto-respotting'
    }

    if (operation?.local?.autoRespotting) {
      return (
        <LoggerChip {...props} icon={'recycle'} iconColor={'red'}accessibilityLabel={label + ' Controls'}>{label}</LoggerChip>
      )
    } else {
      return (
        <LoggerChip {...props} accessibilityLabel={label + ' Controls'}>{label}</LoggerChip>
      )
    }
  },

  accessibilityLabel: 'Self-Spotting Controls',
  InputComponent: SpotterControlInputs,
  inputWidthMultiplier: 40,
  optionType: 'mandatory',
  onlyNewQSOs: false
}
