import React, { useCallback, useEffect, useMemo, useState } from 'react'

import DropDown from '@developerblue/react-native-paper-dropdown'
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
  const handleChangeValue = useCallback((newValue) => {
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
      onChangeValue={handleChangeValue}
      visible={isOpen}
      style={{
        ...style,
        color: colorStyles.paperDropdown.color,
        backgroundColor: colorStyles.paperDropdown.backgroundColor,
        height: themeStyles.oneSpace * 7,
        paddingLeft: 0, // props.dense ? themeStyles.halfSpace : themeStyles.oneSpace,
        paddingRight: 0
      }}
      contentStyle={{}}
      background={colorStyles.paperDropdown.backgroundColor}
      iconStyle={{ padding: 0, margin: 0, width: themeStyles.oneSpace * 2.1 }}
      dropDownStyle={{
        backgroundColor: colorStyles.paperDropdown.backgroundColor,
        borderColor: themeStyles.theme.colors[themeColor]
      }}
      showDropDown={onShow}
      onDismiss={onDismiss}
      list={list}
      keyboardShouldPersistTaps="handled"
    />
  )
}
