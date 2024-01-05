import React, { useCallback, useEffect, useState } from 'react'
import ThemedTextInput from './ThemedTextInput'
import { fmtTimeZulu } from '../../tools/timeFormats'
import { useSelector } from 'react-redux'
import { selectNow } from '../../store/time'

const VALID_TIME_REGEX = /^(\d{1,2}|\d{1,2}:\d{0,2}|\d{1,2}:\d{1,2}:\d{0,2})$/

export function TimeInput (props) {
  const { label, valueInMillis, onChange, onBlur, fieldId } = props

  const now = useSelector(selectNow)

  const [nowStr, setNowStr] = useState()

  useEffect(() => {
    setNowStr(fmtTimeZulu(new Date(), { showZ: false }))
  }, [now])

  const [localValue, setLocalValue] = useState()

  useEffect(() => {
    setLocalValue(fmtTimeZulu(valueInMillis, { showZ: false }))
  }, [valueInMillis])

  const handleChange = useCallback((event) => {
    const { text } = event.nativeEvent
    if (text.match(VALID_TIME_REGEX)) {
      setLocalValue(text)
    }
  }, [])

  const handleBlur = useCallback((event) => {
    if (localValue.match(/^\d{1,2}:\d{1,2}$/)) {
      let baseDate
      if (valueInMillis) {
        baseDate = new Date(valueInMillis).toISOString().split('T')[0]
      } else {
        baseDate = new Date().toISOString().split('T')[0]
      }

      const date = Date.parse(`${baseDate}T${localValue}Z`)
      console.log('blur', date)
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
      onEndEditing={handleBlur}
      keyboard={'dumb'}
    />
  )
}
