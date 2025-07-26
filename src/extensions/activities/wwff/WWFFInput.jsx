/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { H2kTextInput } from '../../../ui'

const ADD_DASHES_REGEX = /([A-Z0-9]+FF)(\d+)/gi
const NO_PREFIX_REGEX = /^(\d\d+)/gi

export default function WWFFInput (props) {
  const { textStyle, defaultPrefix } = props

  const styles = useThemedStyles()

  const textTransformer = useCallback(text => {
    text = text || ''
    text = text.replace(NO_PREFIX_REGEX, (match, p1, p2) => `${defaultPrefix ?? 'KFF'}-${p1}`)
    text = text.replace(ADD_DASHES_REGEX, (match, p1, p2) => `${p1}-${p2}`)

    return text
  }, [defaultPrefix])

  return (
    <H2kTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      nospaces={true}
      placeholder={`${defaultPrefix ?? 'KFF'}-…`}
      textStyle={[textStyle, styles?.text?.callsign]}
      textTransformer={textTransformer}
    />
  )
}
