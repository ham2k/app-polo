import React, { useCallback, useEffect, useState } from 'react'
import ThemedTextInput from './ThemedTextInput'
import { fmtISODate } from '../../tools/timeFormats'
import { useSelector } from 'react-redux'
import { selectSecondsTick } from '../../store/time'

const VALID_DATE_REGEX = /^(\d{1,4}|\d{1,4}-\d{0,2}|\d{1,4}-\d{1,2}-\d{0,2})$/

export function DateInput (props) {
  const { label, valueInMillis, onChange, onBlur, fieldId } = props

  const now = useSelector(selectSecondsTick)

  const [nowStr, setNowStr] = useState()

  useEffect(() => {
    setNowStr(fmtISODate(new Date()))
  }, [now])

  const [localValue, setLocalValue] = useState()

  useEffect(() => {
    setLocalValue(fmtISODate(valueInMillis))
  }, [valueInMillis])

  const handleChange = useCallback((event) => {
    const { text } = event.nativeEvent
    if (text.match(VALID_DATE_REGEX)) {
      setLocalValue(text)
    }
  }, [])

  const handleBlur = useCallback((event) => {
    if (localValue.match(/^\d{1,4}-\d{1,2}-\d{1,2}$/)) {
      let baseTime
      if (valueInMillis) {
        baseTime = new Date(valueInMillis).toISOString().split('T')[1]
      } else {
        baseTime = new Date().toISOString().split('T')[1]
      }
      const date = Date.parse(`${localValue}T${baseTime}`)
      if (date) {
        onChange && onChange({ value: date.valueOf(), fieldId })
      }
    }
    onBlur && onBlur(event)
  }, [localValue, onChange, valueInMillis, fieldId, onBlur])

  return (
    <ThemedTextInput
      {...props}
      value={localValue}
      label={label ?? 'Time'}
      placeholder={nowStr}
      onChange={handleChange}
      onBlur={handleBlur}
      onEndEditing={handleBlur}
      keyboard={'dumb'}
    />
  )
}
