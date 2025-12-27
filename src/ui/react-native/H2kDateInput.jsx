/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { fmtISODate } from '../../tools/timeFormats'
import { useSelector } from 'react-redux'
import { selectSecondsTick } from '../../store/time'
import { H2kTextInput } from './H2kTextInput'

export function H2kDateInput (props) {
  const { label, valueInMillis, onChange, onBlur, fieldId, innerRef } = props

  const localRef = useRef()
  const actualInnerRef = innerRef ?? localRef

  const now = useSelector(selectSecondsTick)

  const [nowStr, setNowStr] = useState()

  useEffect(() => {
    setNowStr(fmtISODate(new Date()))
  }, [now])

  const [localValue, setLocalValue] = useState()
  const [originalValue, setOriginalValue] = useState()

  useEffect(() => {
    if (actualInnerRef?.current?.isFocused()) return

    setLocalValue(fmtISODate(valueInMillis))
    setOriginalValue(valueInMillis)
  }, [valueInMillis, actualInnerRef])

  const handleBlur = useCallback((event) => {
    setLocalValue(fmtISODate(valueInMillis))
    setOriginalValue(valueInMillis)
    onBlur && onBlur(event)
    return true
  }, [valueInMillis, onBlur])

  const handleChange = useCallback((event) => {
    const { text } = event.nativeEvent
    setLocalValue(text?.trim())

    let fullBaseTime
    let newValue
    if (originalValue) {
      fullBaseTime = new Date(originalValue).toISOString()
    } else {
      fullBaseTime = new Date().toISOString()
    }
    const baseTime = fullBaseTime.split('T')[1]
    const [baseYear, baseMonth] = fullBaseTime.split('-')

    if (text?.match(/^\d{1,2}$/)) {
      newValue = Date.parse(`${baseYear}-${baseMonth}-${text}T${baseTime}`)
    } else if (text?.match(/^\d{1,2}[-/]\d{1,2}$/)) {
      newValue = Date.parse(`${baseYear}-${text}T${baseTime}`)
    } else if (text?.match(/^\d{4}$/)) {
      newValue = Date.parse(`${baseYear}-${text.substring(0, 2)}-${text.substring(2, 4)}T${baseTime}`)
    } else if (text?.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/)) {
      newValue = Date.parse(`${text}T${baseTime}`)
    } else if (text?.match(/^\d{4}\d{2}\d{2}$/)) {
      newValue = Date.parse(`${text.substring(0, 4)}-${text.substring(4, 6)}-${text.substring(6, 8)}T${baseTime}`)
    } else if (text?.match(/^\d{2}\d{2}\d{2}$/)) {
      newValue = Date.parse(`20${text.substring(0, 2)}-${text.substring(2, 4)}-${text.substring(4, 6)}T${baseTime}`)
    } else if (text?.match(/^[01]\d{3}$/)) {
      newValue = Date.parse(`${baseYear}-${text.substring(0, 2)}-${text.substring(2, 4)}T${baseTime}`)
    } else {
      const parts = text?.match(/^\d{4}-\d{2}-\d{2}([-+]\d{1,})([dmw]{0,1})$/)
      if (parts) {
        let delta = parseInt(parts[1], 10)
        if (parts[2] === 'd' || parts[2] === '') delta = delta * 1000 * 60 * 60 * 24
        else if (parts[2] === 'w') delta = delta * 1000 * 60 * 24 * 7
        else if (parts[2] === 'm') delta = delta * 1000 * 60 * 24 * 30

        newValue = Date.parse(fullBaseTime).valueOf() + delta
      }
    }

    if (text?.match(/^\d{4}-\d{2}-\d{2}[-+]\d{1,}$/)) {
      const delta = parseInt(text.substring(10, 20), 10)
      newValue = Date.parse(fullBaseTime).valueOf() + (delta * 1000 * 60 * 60 * 24)
    }

    if (newValue) {
      newValue = newValue.valueOf()
      if (newValue !== valueInMillis) {
        onChange && onChange({ value: newValue, fieldId })
      }
    }
  }, [fieldId, onChange, originalValue, valueInMillis])

  return (
    <H2kTextInput
      {...props}
      innerRef={actualInnerRef}
      value={localValue}
      label={label ?? 'Date'}
      placeholder={nowStr}
      onChange={handleChange}
      onBlur={handleBlur}
      onEndEditing={handleBlur}
      keyboard={'numbers'}
    />
  )
}
