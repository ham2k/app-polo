/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'

import ThemedTextInput from './ThemedTextInput'

export default function FrequencyInput (props) {
  const { styles, textStyle, value, onChange, innerRef } = props

  const localRef = useRef()
  const actualInnerRef = innerRef ?? localRef
  const [localValue, setLocalValue] = useState(`${value}`)

  // When frequency is changed, the real value often jumps to a different value
  // but we don't want to reflect these jumps in the input field.
  //
  // For example, if the user enters "714" we interpret it as "714000" but if they add one more zero "7140" would be "7140".
  // If we let this value change into the input field, the user would never be able to enter "7140".
  //
  // So we need a local value that's only updated when the input is not focused.

  useEffect(() => {
    if (actualInnerRef?.current?.isFocused()) return // Do not update if the input is focused

    setLocalValue(value ?? '')
  }, [value, actualInnerRef])

  const handleChange = useCallback((event) => {
    setLocalValue(event.nativeEvent.text)
    onChange && onChange(event)
  }, [setLocalValue, onChange])

  return (
    <ThemedTextInput
      {...props}
      value={localValue}
      onChange={handleChange}
      innerRef={actualInnerRef}
      keyboard="numbers"
      decimal={true}
      textStyle={[textStyle, styles?.text?.callsign]}
    />
  )
}
