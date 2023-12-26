import React, { useCallback, useEffect, useMemo, useState } from 'react'

import DropDown from '@go_robots/react-native-paper-dropdown'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

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
  const onSetValue = useCallback((newValue) => {
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
    <DropDown
      {...props}
      label={label}
      value={innerValue}
      setValue={onSetValue}
      visible={isOpen}
      inputProps={{
        style: [
          {
            color: colorStyles.paperDropdown.color,
            backgroundColor: colorStyles.paperDropdown.backgroundColor,
            paddingHorizontal: props.dense ? themeStyles.halfSpace : themeStyles.oneSpace
          },
          style
        ]
      }}
      showDropDown={onShow}
      onDismiss={onDismiss}
      list={list}
      keyboardShouldPersistTaps="handled"
    />
  )
}
