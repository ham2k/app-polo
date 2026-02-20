/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*
 * Based on code from https://github.com/fateh999/react-native-paper-dropdown/
 * where the README has a badge mentioning the MIT license, but no license file is present
 */

import React, { useState, useCallback, Fragment, useEffect, useMemo } from 'react'

import { LayoutChangeEvent, ScrollView, TouchableHighlight, View } from 'react-native'
import { Divider, Menu } from 'react-native-paper'
import { H2kTextInput } from '../H2kTextInput'
import { H2kIcon } from '../H2kIcon'

export function PaperDropDown (props, _ref) {
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

  const [displayValue, setDisplayValue] = useState('')
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

  const onLayout = (event: LayoutChangeEvent) => {
    setInputLayout(event.nativeEvent.layout)
  }

  useEffect(() => {
    const selectedLabel = list.find(x => x.value === value)?.label
    if (selectedLabel) {
      setDisplayValue(selectedLabel)
    }
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
        size={styles.oneSpace * 2}
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
            <H2kTextInput
              value={displayValue}
              label={label}
              placeholder={placeholder}
              pointerEvents={'none'}
              right={rightIcon}
              disabled={disabled}
              error={error}
              multiline={false}
              numberOfLines={1}
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
