/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'

const ADD_DASHES_REGEX = /(?<!VK-)VK([A-Z]+)/gi
const ADD_COMMAS_REGEX = /(VK-[A-Z]{3}\d+)\s*[,]*\s*VK-/gi
const NO_PREFIX_REGEX = /(?<!VK-)([A-Z]{3}\d+)/gi

export default function SiOTAInput (props) {
  const { textStyle } = props

  const styles = useThemedStyles()

  const textTransformer = useCallback((text) => {
    text = text || ''
    text = text.replace(NO_PREFIX_REGEX, (match, p1) => `VK-${p1}`)
    text = text.replace(ADD_DASHES_REGEX, (match, p1) => `VK-${p1}`)
    text = text.replace(ADD_COMMAS_REGEX, (match, p1, p2) => `${p1}, VK-`)

    return text
  }, [])

  return (
    <ThemedTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      nospaces={true}
      placeholder={'VK-…'}
      textStyle={[textStyle, styles?.text?.callsign]}
      textTransformer={textTransformer}
    />
  )
}
