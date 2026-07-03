// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

/*
 * Based on code from https://github.com/fateh999/react-native-paper-dropdown/
 * where the README has a badge mentioning the MIT license, but no license file is present
 */

import React, { useState, useCallback, Fragment, useEffect, useMemo } from 'react'
import { ScrollView, TouchableHighlight, View } from 'react-native'
import { Divider, Menu } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { H2kIcon } from './H2kIcon'
import { H2kEnhancedTextInput } from './H2kEnhancedTextInput'

export function H2kDropDown(props) {
  const {
    style, themeColor,
    label,
    value, options, fieldId,
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
    <PaperDropDown
      {...props}
      label={label}
      value={innerValue}
      onChangeValue={handleChangeValue}
      visible={isOpen}
      styles={themeStyles}
      style={{
        ...style,
        color: colorStyles.paperDropdown.color,
        backgroundColor: colorStyles.paperDropdown.backgroundColor,
        fontSize: themeStyles.normalFontSize
      }}
      background={colorStyles.paperDropdown.backgroundColor}
      iconStyle={{ padding: 0, margin: 0, width: themeStyles.oneSpace * 2.1 }}
      showDropDown={onShow}
      onDismiss={onDismiss}
      list={options}
      keyboardShouldPersistTaps="handled"
    />
  )
}

function PaperDropDown(props, _ref) {
  const {
    value,
    onChangeValue,
    activeColor,
    label,
    placeholder,
    list,
    dropDownContainerMaxHeight,
    dropDownContainerHeight,
    styles,
    dropDownStyle,
    dropDownItemStyle,
    dropDownItemSelectedStyle,
    dropDownItemTextStyle,
    dropDownItemSelectedTextStyle,
    accessibilityLabel,
    disabled,
    onFocus = () => { },
    onBlur = () => { },
    style = {},
    editable,
    borderless,
    background,
    centered,
    rippleColor,
    underlayColor,
    touchableStyle,
    error
  } = props

  const [inputLayout, setInputLayout] = useState({
    height: 0,
    width: 0,
    x: 0,
    y: 0
  })
  const [visible, setVisible] = useState(false)

  const onDismiss = () => setVisible(false)

  const showDropDown = () => {
    if (editable !== false) {
      setVisible(true)
    }
  }

  const onLayout = (event) => {
    setInputLayout(event.nativeEvent.layout)
  }

  const displayValue = useMemo(() => {
    const selectedLabel = list.find(x => x.value === value)?.label
    return selectedLabel ?? ''
  }, [list, value])

  const isActive = useCallback((currentValue) => {
    return value === currentValue
  }, [value])

  const setActive = useCallback((currentValue) => {
    onChangeValue && onChangeValue(currentValue)
  }, [onChangeValue])

  const rightIcon = useMemo(() => {
    return (
      <H2kIcon
        icon={visible ? 'menu-up' : 'menu-down'}
        forceTextInputFocus={false}
        size={styles.oneSpace * 3}
      />
    )
  }, [styles.oneSpace, visible])

  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      theme={styles.theme}
      anchorPosition={'top'}
      anchor={
        <TouchableHighlight
          onPress={showDropDown}
          onLayout={onLayout}
          accessibilityLabel={accessibilityLabel ?? ''}
          onFocus={onFocus}
          onBlur={onBlur}
          borderless={borderless}
          background={background}
          centered={centered}
          disabled={disabled}
          rippleColor={rippleColor}
          underlayColor={underlayColor}
          style={{
            ...touchableStyle,
            flexGrow: 1,
            flexDirection: 'row',
            flexWrap: 'nowrap',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            margin: style.margin,
            marginTop: style.marginTop,
            marginRight: style.marginRight,
            marginBottom: style.marginBottom,
            marginLeft: style.marginLeft,
            padding: 0,
            paddingTop: 0,
            paddingRight: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            overflow: 'visible',
            maxWidth: '100%'
          }}
          theme={styles.theme}
        >
          <View
            pointerEvents={'none'}
            style={{
              flexGrow: 1,
              flexDirection: 'row'
            }}
          >
            <H2kEnhancedTextInput
              value={displayValue}
              label={label}
              placeholder={placeholder}
              pointerEvents={'none'}
              right={rightIcon}
              disabled={disabled}
              error={error}
              multiline={false}
              numberOfLines={1}
              placeholderColor={style.color}
              style={{
                ...style,
                flexGrow: 1,
                alignSelf: 'stretch'
              }}
              editable={false}
            />
          </View>
        </TouchableHighlight>
      }
      style={{
        maxWidth: inputLayout?.width,
        width: inputLayout?.width,
        marginTop: inputLayout?.height,
        ...dropDownStyle
      }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        bounces={false}
        style={{
          ...(dropDownContainerHeight
            ? {
              height: dropDownContainerHeight
            }
            : {
              maxHeight: dropDownContainerMaxHeight || 200
            })
        }}
      >
        {list.map((item) => (
          <Fragment key={item.value}>
            <Menu.Item
              titleStyle={{
                color: isActive(item.value)
                  ? activeColor || styles.theme.colors.primary
                  : styles.theme.colors.onSurface,
                ...(isActive(item.value)
                  ? dropDownItemSelectedTextStyle
                  : dropDownItemTextStyle)
              }}
              title={item.custom || item.label}
              style={{
                flex: 1,
                maxWidth: inputLayout?.width,
                ...(isActive(item.value)
                  ? dropDownItemSelectedStyle
                  : dropDownItemStyle)
              }} onPress={() => {
                setActive(item.value)
                if (onDismiss) {
                  onDismiss()
                }
              }}
            />
            <Divider />
          </Fragment>
        ))}
      </ScrollView>
    </Menu>
  )
}
