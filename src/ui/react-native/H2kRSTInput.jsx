/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo, useEffect } from 'react'

import { useUIState } from '../../store/ui/useUIState'
import { H2kTextInput } from './H2kTextInput'

export function H2kRSTInput (props) {
  const { value, radioMode } = props

  const [rstLength, placeholder] = useMemo(() => {
    return [6, expandRSTValues('', radioMode)]
  }, [radioMode])

  // eslint-disable-next-line no-unused-vars
  let [mode, setMode] = useUIState('NumberKeys', 'mode', 'numbers')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    mode = 'numbers'
    setMode('numbers')
  }, [value, setMode])

  return (
    <H2kTextInput
      {...props}
      placeholder={placeholder}
      noSpaces={true}
      keyboard={'numbers'}
      rst={true}
      maxLength={rstLength + 3}
    />
  )
}

export function expandRSTValues (text, mode) {
  text = text?.trim() || ''
  if (text.length === 0) {
    if (mode === 'CW' || mode === 'RTTY') return '599'
    if (mode === 'FT8' || mode === 'FT4') return '+0'
    return '59'
  } else if (text.length === 1) {
    let readability = '5'
    const strength = text
    const tone = '9'
    if (strength === '1' || strength === '2' || strength === '3') {
      readability = '3'
    } else if (strength === '4') {
      readability = '4'
    }

    if (mode === 'CW' || mode === 'RTTY') {
      text = `${readability}${strength}${tone}`
    } else {
      text = `${readability}${strength}`
    }
  }

  return text
}
