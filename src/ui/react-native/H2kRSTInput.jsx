/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo, useEffect } from 'react'

import { useUIState } from '../../store/ui/useUIState'
import { expandRSTValues } from '../../tools/callsignTools'

import { H2kTextInput } from './H2kTextInput'

export function H2kRSTInput (props) {
  const { value, radioMode, settings } = props

  const [rstLength, placeholder] = useMemo(() => {
    return [6, expandRSTValues('', radioMode, { settings })]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radioMode, settings?.defaultReportCW, settings?.defaultReportFT8, settings?.defaultReport])

  // eslint-disable-next-line no-unused-vars
  let [mode, setMode] = useUIState('NumberKeys', 'mode', 'numbers')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    mode = 'numbers'
    setMode('numbers')
  }, [value, setMode])

  return (
    <H2kTextInput
      {...props}
      placeholder={placeholder}
      noSpaces={true}
      keyboard={'numbers'}
      rst={true}
      maxLength={rstLength + 3}
    />
  )
}
