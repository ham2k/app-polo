/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'

import { parseCallsign } from '@ham2k/lib-callsigns'

import ThemedTextInput from './ThemedTextInput'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export default function CallsignInput (props) {
  const { value, textStyle } = props
  const styles = useThemedStyles()

  const isValid = useMemo(() => {
    if (value === '3RR0R') {
      throw new Error('Test error')
    }
    const callInfo = parseCallsign(value)
    if (callInfo?.baseCall) {
      return true
    } else {
      return false
    }
  }, [value])

  return (
    <ThemedTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      noSpaces={true}
      error={value && !isValid}
      textStyle={[textStyle, styles?.text?.callsign]}
    />
  )
}
