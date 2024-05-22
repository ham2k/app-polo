/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo, useEffect } from 'react'

import { useUIState } from '../../store/ui/useUIState'
import ThemedTextInput from './ThemedTextInput'
import { defaultRSTForMode } from '../OperationScreens/OpLoggingTab/components/LoggingPanel'

export default function RSTInput (props) {
  const { value, radioMode } = props

  const [rstLength, placeholder] = useMemo(() => {
    return [6, defaultRSTForMode(radioMode)]
  }, [radioMode])

  // eslint-disable-next-line no-unused-vars
  let [mode, setMode] = useUIState('NumberKeys', 'mode', 'numbers')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    mode = 'numbers'
    setMode('numbers')
  }, [value, setMode])

  return (
    <ThemedTextInput
      {...props}
      placeholder={placeholder}
      noSpaces={true}
      keyboard={'numbers'}
      rst={true}
      maxLength={rstLength + 3}
    />
  )
}
