/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'

const ADD_DASHES_REGEX = /(?:B?\/)?([0-9][A-Z][0-9A-Z]*|[A-Z][0-9A-Z]*)(\d+)(?!-)$/gi
const ADD_SLASHES_REGEX = /^B?((?<!\/)(?:[0-9][A-Z][0-9A-Z]*|[A-Z][0-9A-Z]*)-)$/gi
const ADD_COMMAS_REGEX = /(B\/\w+)-(\d+)[\s,]$/gi
const NO_PREFIX_REGEX = /(?:^|,)(\d\d+)/gi
const DELETE_INVALID_CHARACTERS = /[^A-Z0-9,?/-]/gi

export default function WWBOTAInput (props) {
  const { textStyle, defaultPrefix } = props

  const styles = useThemedStyles()

  const textTransformer = useCallback(text => {
    text = text.replace(NO_PREFIX_REGEX, (match, p1, p2) => `${defaultPrefix ?? 'B/?'}-${p1}`)
    text = text.replace(ADD_SLASHES_REGEX, (match, p1, p2) => `B/${p1}`)
    text = text.replace(ADD_DASHES_REGEX, (match, p1, p2) => `B/${p1}-${p2}`)
    text = text.replace(ADD_COMMAS_REGEX, (match, p1, p2) => `${p1}-${p2},${p1}-`)
    text = text.replace(DELETE_INVALID_CHARACTERS, '')

    return text
  }, [defaultPrefix])

  return (
    <ThemedTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      nospaces={true}
      placeholder={`${defaultPrefix ?? 'B/G'}-…`}
      textStyle={[textStyle, styles?.text?.callsign]}
      textTransformer={textTransformer}
    />
  )
}
