/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
