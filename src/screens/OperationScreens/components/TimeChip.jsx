import React, { useEffect, useState } from 'react'
import LoggerChip from './LoggerChip'
import { fmtTimeZulu } from '../../../tools/timeFormats'
import { useSelector } from 'react-redux'
import { selectSecondsTick } from '../../../store/time'

export default function TimeChip (props) {
  const { time, children, styles } = props

  const now = useSelector(selectSecondsTick)
  const [timeStr, setTimeStr] = useState()

  useEffect(() => {
    if (!time) {
      setTimeStr(fmtTimeZulu(now))
    } else {
      setTimeStr(fmtTimeZulu(time))
    }
  }, [time, now])

  return (
    <LoggerChip icon="clock-outline" {...props} textStyle={styles?.text?.numbers}>{children ?? timeStr}</LoggerChip>
  )
}
