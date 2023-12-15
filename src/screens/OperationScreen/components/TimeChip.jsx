import React, { useEffect, useState } from 'react'
import LoggerChip from './LoggerChip'
import { fmtTimeZulu } from '../../../tools/timeFormats'
import { Text } from 'react-native-paper'

export default function TimeChip (props) {
  const { time, styles, children } = props

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
    <LoggerChip icon="clock-outline" {...props}><Text style={styles?.text?.numbers}>{children ?? timeStr}</Text></LoggerChip>
  )
}
