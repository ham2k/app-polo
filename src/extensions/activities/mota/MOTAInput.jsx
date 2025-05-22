/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'

const NO_PREFIX_REGEX = /(?:^|,)(\d\d+)/gi
const ADD_COMMAS_REGEX = /X(\d+)[\s,]$/gi

export default function MOTAInput (props) {
  const { textStyle } = props

  const styles = useThemedStyles()

  const textTransformer = useCallback(text => {
    text = text || ''
    text = text.replace(NO_PREFIX_REGEX, (match, p1, p2) => `X${p1}`)
    text = text.replace(ADD_COMMAS_REGEX, (match, p1, p2) => `X${p1},X`)
    return text
  }, [])

  return (
    <ThemedTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      nospaces={true}
      placeholder={'X…'}
      textStyle={[textStyle, styles?.text?.callsign]}
      textTransformer={textTransformer}
    />
  )
}
