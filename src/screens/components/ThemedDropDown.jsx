/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import PaperDropDown from './PaperDropDown'

export default function ThemedDropDown (props) {
  const {
    style, themeColor,
    label,
    value, list, fieldId,
    onChange, onChangeText
  } = props
  const themeStyles = useThemedStyles()

  const [innerValue, setInnerValue] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const onShow = useCallback(() => setIsOpen(true), [setIsOpen])
  const onDismiss = useCallback(() => setIsOpen(false), [setIsOpen])
  const handleChangeValue = useCallback((newValue) => {
    console.log('change', newValue)
    setInnerValue(newValue)
    onChange && onChange({ fieldId, nativeEvent: { text: newValue } })
    onChangeText && onChangeText(newValue)
  }, [onChange, onChangeText, fieldId])

  useEffect(() => {
    setInnerValue(value || '')
  }, [value])

  const colorStyles = useMemo(() => {
    return {
      paperDropdown: {
        color: themeColor ? themeStyles.theme.colors[themeColor] : themeStyles.theme.colors.onBackground,
        backgroundColor: themeStyles.theme.colors.background
      }
    }
  }, [themeStyles, themeColor])
  return (
    <PaperDropDown
      {...props}
      label={label}
      value={innerValue}
      onChangeValue={handleChangeValue}
      visible={isOpen}
      style={{
        ...style,
        color: colorStyles.paperDropdown.color,
        backgroundColor: colorStyles.paperDropdown.backgroundColor,
        paddingLeft: 0, // props.dense ? themeStyles.halfSpace : themeStyles.oneSpace,
        paddingRight: 0,
        fontSize: themeStyles.normalFontSize
      }}
      background={colorStyles.paperDropdown.backgroundColor}
      iconStyle={{ padding: 0, margin: 0, width: themeStyles.oneSpace * 2.1 }}
      showDropDown={onShow}
      onDismiss={onDismiss}
      list={list}
      keyboardShouldPersistTaps="handled"
    />
  )
}
