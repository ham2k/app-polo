/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useCallback, useState, useRef } from 'react'

import { useUIState } from '../../store/ui/useUIState'
import ThemedTextInput from './ThemedTextInput'

const VALID_MAIDENHEAD_REGEX = /^([A-R]{2}|[A-R]{2}[0-9]{2}|[A-R]{2}[0-9]{2}[a-x]{2}||[A-R]{2}[0-9]{2}[a-x]{2}[0-9]{2})$/
const PARTIAL_MAIDENHEAD_REGEX = /^([A-R]{0,2}|[A-R]{2}[0-9]{0,2}|[A-R]{2}[0-9]{2}[a-x]{0,2}||[A-R]{2}[0-9]{2}[a-x]{2}[0-9]{0,2})$/

export default function GridInput (props) {
  const { value, innerRef } = props

  // eslint-disable-next-line no-unused-vars
  let [mode, setMode] = useUIState('NumberKeys', 'mode', 'numbers')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    mode = 'numbers'
    setMode('numbers')
  }, [value, setMode])

  const localRef = useRef()
  const actualInnerRef = innerRef ?? localRef

  const [localValue, setLocalValue] = useState(value ?? '')

  useEffect(() => {
    if (actualInnerRef?.current?.isFocused()) return

    setLocalValue(value ?? '')
  }, [value, actualInnerRef])

  const [isValid, setIsValidValue] = useState()

  useEffect(() => {
    setIsValidValue(VALID_MAIDENHEAD_REGEX.test(localValue))
  }, [localValue])

  const textTransformer = useCallback(text => {
    text = text.substring(0, 4).toUpperCase() + text.substring(4).toLowerCase()

    return text
  }, [])

  return (
    <ThemedTextInput
      {...props}
      value={localValue ?? ' '}
      keyboard="dumb"
      noSpaces={true}
      maxLength={8}
      error={value && !isValid}
      textTransformer={textTransformer}
    />
  )
}
