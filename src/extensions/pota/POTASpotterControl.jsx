import React, { useCallback, useEffect, useRef, useState } from 'react'

import { fmtFreqInMHz } from '../../tools/frequencyFormats'
import { fmtDateTimeRelative } from '../../tools/timeFormats'
import { useDispatch, useSelector } from 'react-redux'
import { selectSecondsTick } from '../../store/time'
import ThemedButton from '../../screens/components/ThemedButton'
import { setOperationData } from '../../store/operations'
import ThemedTextInput from '../../screens/components/ThemedTextInput'

import packageJson from '../../../package.json'
import { filterRefs } from '../../tools/refTools'
import { selectRuntimeOnline } from '../../store/runtime'
import { reportError } from '../../App'

const MINUTES_UNTIL_RESPOT = 5

const postSpot = (operation, comments) => async (dispatch, getState) => {
  const state = getState()
  const call = operation.stationCall || state.settings.operatorCall

  const refs = filterRefs(operation, 'potaActivation')
  for (const ref of refs) {
    try {
      const response = await fetch('https://api.pota.app/spot', {
        method: 'POST',
        headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` },
        body: JSON.stringify({
          activator: call,
          spotter: call,
          frequency: operation.freq,
          reference: ref.ref,
          mode: operation.mode,
          source: 'Ham2K Portable Logger',
          comments: [comments, '[Ham2K PoLo]'].filter(x => x).join(' ')
        })
      })
      if (response.status === 200) {
        // const body = await response.text()
        // console.log(body)
      } else {
        const body = await response.text()
        reportError('POTA Spotter http error', response, body)
      }
    } catch (error) {
      reportError('POTA Spotter error', error)
    }
  }

  dispatch(setOperationData({ uuid: operation.uuid, spottedAt: new Date().getTime(), spottedFreq: operation.freq }))
}

export function POTASpotterControl (props) {
  const { operation, styles } = props

  const online = useSelector(selectRuntimeOnline)

  const dispatch = useDispatch()

  const ref = useRef()
  useEffect(() => {
    setTimeout(() => {
      ref?.current?.focus()
    }, 0)
  }, [ref])

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
        if (comments === undefined) setComments(operation.spottedFreq ? 'QSY' : 'QRV')
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

  const handleSpotting = useCallback(() => {
    dispatch(postSpot(operation, comments))
    setComments(undefined)
  }, [dispatch, operation, comments])

  return (
    <>
      <ThemedButton
        themeColor="tertiaryLighter"
        mode="contained"
        icon={online ? 'hand-wave' : 'cloud-off-outline'}
        onPress={handleSpotting}
        disabled={!online || spotterUI.disabled}
      >
        {spotterUI.message}
      </ThemedButton>
      <ThemedTextInput
        innerRef={ref}
        style={{ marginLeft: styles.oneSpace, marginRight: styles.oneSpace }}
        label={'Comments'}
        value={comments ?? ''}
        onChangeText={setComments}
      />
    </>
  )
}
