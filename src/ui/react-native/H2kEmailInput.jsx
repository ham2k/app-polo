// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useMemo } from 'react'

import { H2kEnhancedTextInput } from './H2kEnhancedTextInput'

const VALID_EMAIL_REGEX = /(\w+)@(\w+)\./

export default function H2kEmailInput (props) {
  const { value } = props

  const isValidValue = useMemo(() => VALID_EMAIL_REGEX.test(value), [value])

  return (
    <H2kEnhancedTextInput
      {...props}
      value={value}
      keyboard="email"
      noSpaces={true}
      error={value && !isValidValue}
    />
  )
}
