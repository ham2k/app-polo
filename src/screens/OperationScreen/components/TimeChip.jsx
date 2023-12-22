import React, { useEffect, useState } from 'react'
import LoggerChip from './LoggerChip'
import { fmtTimeZulu } from '../../../tools/timeFormats'

export default function TimeChip (props) {
  const { time, children, styles } = props

  const [timeStr, setTimeStr] = useState()

  useEffect(() => {
    if (!time) {
      setTimeStr(fmtTimeZulu(new Date()))
      const interval = setInterval(() => {
        setTimeStr(fmtTimeZulu(new Date()))
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setTimeStr(fmtTimeZulu(time))
    }
  }, [time])

  return (
    <LoggerChip icon="clock-outline" {...props} textStyle={styles?.text?.numbers}>{children ?? timeStr}</LoggerChip>
  )
}
