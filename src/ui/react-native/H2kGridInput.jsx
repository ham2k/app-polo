// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useMemo } from 'react'

import { H2kEnhancedTextInput } from './H2kEnhancedTextInput'

const VALID_MAIDENHEAD_REGEX = /^([A-R]{2}|[A-R]{2}[0-9]{2}|[A-R]{2}[0-9]{2}[a-x]{2}||[A-R]{2}[0-9]{2}[a-x]{2}[0-9]{2})$/

export function H2kGridInput (props) {
  const { value, requiredLength } = props

  const isValidValue = useMemo(() => VALID_MAIDENHEAD_REGEX.test(value), [value])

  // When a minimum length is required, only flag entries that are present but too short
  const isLongEnough = useMemo(() => {
    if (!requiredLength || !value) return true
    return value.length >= requiredLength
  }, [value, requiredLength])

  const textTransformer = useCallback(text => {
    text = text.substring(0, 4).toUpperCase() + text.substring(4).toLowerCase()

    return text
  }, [])

  return (
    <H2kEnhancedTextInput
      {...props}
      value={value}
      keyboard="dumb"
      noSpaces={true}
      maxLength={8}
      error={(value && !isValidValue) || !isLongEnough}
      textTransformer={textTransformer}
    />
  )
}
