// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import { fmtTimeZulu } from '@ham2k/lib-format-tools'

import LoggerChip from './LoggerChip'
import { selectSecondsTick } from '../../../store/time'

export default function TimeChip (props) {
  const { time, children, styles } = props

  const now = useSelector(selectSecondsTick)
  const [timeStr, setTimeStr] = useState()

  useEffect(() => {
    if (!time) {
      setTimeStr(fmtTimeZulu(now ?? Date.now()))
    } else {
      setTimeStr(fmtTimeZulu(time))
    }
  }, [time, now])

  return (
    <LoggerChip
      icon={props.icon ?? 'clock-outline'}
      {...props}
      textStyle={styles?.text?.numbers}
      accessibilityLabel={props.accessibilityLabel + ' ' + timeStr}
    >{children ?? timeStr}</LoggerChip>
  )
}
