/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'

export default function CustomInput (props) {
  const { textStyle } = props

  const styles = useThemedStyles()

  return (
    <ThemedTextInput
      {...props}
      keyboard="dumb"
      uppercase={false}
      nospaces={false}
      placeholder={'ref…'}
      textStyle={[textStyle, styles?.text?.callsign]}
    />
  )
}
