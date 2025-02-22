/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo, useEffect } from 'react'

import { parseCallsign } from '@ham2k/lib-callsigns'

import { useUIState } from '../../store/ui/useUIState'
import ThemedTextInput from './ThemedTextInput'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

const LETTERS_REGEX = /[A-Z]+/
const ONLY_NUMBER_REGEX = /^\s*[+-]*\d+(\.\d+)*$/

export default function CallsignInput (props) {
  const { value, textStyle, allowMultiple } = props
  const styles = useThemedStyles()

  const isValid = useMemo(() => {
    const values = value.split(/[, +]+/)
    if (values.length > 1 && !allowMultiple) {
      return false
    }

    return values.every(v => {
      const callInfo = parseCallsign(v)
      if (callInfo?.baseCall) {
        return true
      } else {
        return false
      }
    })
  }, [value, allowMultiple])

  let [mode, setMode] = useUIState('NumberKeys', 'mode', 'numbers')
  useEffect(() => {
    if (value.match(LETTERS_REGEX) && !value.match(ONLY_NUMBER_REGEX)) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      mode = 'callsign'
      setMode('callsign')
    } else {
      mode = 'numbers'
      setMode('numbers')
    }
  }, [value, setMode])

  return (
    <ThemedTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      noSpaces={true}
      periodToSlash={mode === 'callsign'}
      error={value && !isValid}
      textStyle={[textStyle, styles?.text?.callsign]}
    />
  )
}
