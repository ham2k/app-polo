/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { H2kTextInput } from '../../../ui'

const ADD_PREFIX_REGEX = /(?<=^|,)([BHILPV])/gi
const ADD_DASHES_REGEX = /\bZL([BHILPV]\/[A-Z]+)([0-9]+)$/gi
const ADD_SLASHES_REGEX = /\bZL([BHILPV])([0-9A-Z]+(?:-[0-9])?)$/gi
const ADD_COMMAS_REGEX = /\b(ZL[BHILPV]\/[0-9A-Z]+(?:-[0-9]+)?)[\s,]$/gi
const DELETE_INVALID_CHARACTERS = /[^A-Z0-9,?/-]/gi

export default function ZLOTAInput (props) {
  const { textStyle } = props

  const styles = useThemedStyles()

  const textTransformer = useCallback(text => {
    text = text || ''
    text = text.replace(ADD_PREFIX_REGEX, (match, p1) => `ZL${p1}`)
    text = text.replace(ADD_SLASHES_REGEX, (match, p1, p2) => `ZL${p1}/${p2}`)
    text = text.replace(ADD_DASHES_REGEX, (match, p1, p2) => `ZL${p1}-${p2}`)
    text = text.replace(ADD_COMMAS_REGEX, (match, p1) => `${p1},ZL`)
    text = text.replace(DELETE_INVALID_CHARACTERS, '')

    return text
  }, [])

  return (
    <H2kTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      nospaces={true}
      placeholder={'ZL…'}
      textStyle={[textStyle, styles?.text?.callsign]}
      textTransformer={textTransformer}
    />
  )
}
