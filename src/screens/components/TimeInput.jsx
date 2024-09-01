/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import ThemedTextInput from './ThemedTextInput'
import { fmtTimeZulu } from '../../tools/timeFormats'
import { useSelector } from 'react-redux'
import { selectSecondsTick } from '../../store/time'

export function TimeInput (props) {
  const { label, valueInMillis, onChange, onBlur, fieldId, innerRef } = props

  const localRef = useRef()
  const actualInnerRef = innerRef ?? localRef

  const now = useSelector(selectSecondsTick)

  const [nowStr, setNowStr] = useState()

  useEffect(() => {
    setNowStr(fmtTimeZulu(new Date(), { showZ: false }))
  }, [now])

  const [localValue, setLocalValue] = useState()
  const [originalValue, setOriginalValue] = useState()

  useEffect(() => {
    if (actualInnerRef?.current?.isFocused()) return

    setLocalValue(fmtTimeZulu(valueInMillis, { showZ: false }))
    setOriginalValue(valueInMillis)
  }, [valueInMillis, actualInnerRef])

  const handleBlur = useCallback((event) => {
    setLocalValue(fmtTimeZulu(valueInMillis, { showZ: false }))
    setOriginalValue(valueInMillis)
    onBlur && onBlur(event)
  }, [valueInMillis, onBlur])

  const handleChange = useCallback((event) => {
    const { text } = event.nativeEvent
    setLocalValue(text)

    let fullBaseTime
    let newValue
    if (originalValue) {
      fullBaseTime = new Date(originalValue).toISOString()
    } else {
      fullBaseTime = new Date().toISOString()
    }
    const baseDate = fullBaseTime.split('T')[0]

    if (text?.match(/^\d{1,2}$/)) {
      newValue = Date.parse(`${baseDate}T${text}:00:00Z`)
    } else if (text?.match(/^\d{1,2}:\d{2}$/)) {
      newValue = Date.parse(`${baseDate}T${text}:00Z`)
    } else if (text?.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
      newValue = Date.parse(`${baseDate}T${text}Z`)
    } else if (text?.match(/^\d{1,4}$/)) {
      const l = text.length
      newValue = Date.parse(`${baseDate}T${text.substring(0, l - 2)}:${text.substring(l - 2, l)}:00Z`)
    } else if (text?.match(/^\d{1,6}$/)) {
      const l = text.length
      newValue = Date.parse(`${baseDate}T${text.substring(0, l - 4)}:${text.substring(l - 4, l - 2)}:${text.substring(l - 2, l)}Z`)
    } else {
      const parts = text?.match(/^\d{2}:\d{2}:\d{2}([-+]\d{1,})([hms])$/)
      if (parts) {
        let delta = parseInt(parts[1], 10)
        if (parts[2] === 'h') delta = delta * 1000 * 60 * 60
        else if (parts[2] === 'm') delta = delta * 1000 * 60
        else if (parts[2] === 's') delta = delta * 1000

        newValue = Date.parse(fullBaseTime).valueOf() + delta
      }
    }

    if (newValue) {
      newValue = newValue.valueOf()
      if (newValue !== valueInMillis) {
        onChange && onChange({ value: newValue, fieldId })
      }
    }
  }, [fieldId, onChange, originalValue, valueInMillis])

  return (
    <ThemedTextInput
      {...props}
      innerRef={actualInnerRef}
      value={localValue}
      label={label ?? 'Time'}
      placeholder={nowStr}
      onChange={handleChange}
      onEndEditing={handleBlur}
      keyboard={'numbers'}
    />
  )
}
