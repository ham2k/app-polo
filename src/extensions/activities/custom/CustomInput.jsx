// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'

import { H2kTextInput } from '../../../ui'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

export default function CustomInput (props) {
  const { textStyle } = props

  const styles = useThemedStyles()

  return (
    <H2kTextInput
      {...props}
      keyboard="dumb"
      uppercase={false}
      nospaces={false}
      placeholder={'ref…'}
      textStyle={[textStyle, styles?.text?.callsign]}
    />
  )
}
