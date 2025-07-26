/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { H2kTextInput } from '../../../ui'

const ADD_DASHES_REGEX = /^([A-Z0-9]{1,3})\/{0,1}([A-Z0-9]{2,2})-{0,1}(\d+)/g

export default function SOTAInput (props) {
  const { textStyle } = props

  const styles = useThemedStyles()

  const textTransformer = useCallback(text => {
    text = text || ''
    text = text.replace(ADD_DASHES_REGEX, (match, p1, p2, p3) => (
      `${p1}/${p2}-${p3}`)
    )

    return text
  }, [])

  return (
    <H2kTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      nospaces={true}
      placeholder={'SOTA Reference'}
      textStyle={[textStyle, styles?.text?.callsign]}
      textTransformer={textTransformer}
    />
  )
}
