import React, { useCallback, useEffect, useState } from 'react'

import DropDown from 'react-native-paper-dropdown'

export default function ThemedDropDown ({
  style, themeColor,
  label,
  value, list, fieldId,
  onChange, onChangeText
}) {
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

  return (
    <DropDown
      label={label}
      value={innerValue}
      setValue={onSetValue}
      visible={isOpen}
      inputProps={{ style }}
      showDropDown={onShow}
      onDismiss={onDismiss}
      list={list}
    />
  )
}
