// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { H2kTextInput } from '../../../ui'

export default function GMAInput (props) {
  const { textStyle } = props

  const styles = useThemedStyles()

  return (
    <H2kTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      nospaces={true}
      placeholder={'GMA Reference'}
      textStyle={[textStyle, styles?.text?.callsign]}
    />
  )
}
