/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'

import ThemedTextInput from './ThemedTextInput'

const VALID_EMAIL_REGEX = /(\w+)@(\w+)\./

export default function EmailInput (props) {
  const { value } = props

  const isValidValue = useMemo(() => VALID_EMAIL_REGEX.test(value), [value])

  return (
    <ThemedTextInput
      {...props}
      value={value}
      keyboard="email"
      noSpaces={true}
      error={value && !isValidValue}
    />
  )
}
