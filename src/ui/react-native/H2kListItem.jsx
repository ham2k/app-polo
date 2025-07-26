/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { List, Switch, Text } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { H2kIconButton } from './H2kIconButton'
import { View } from 'react-native'
import { paperNameOrHam2KIcon } from './H2kIcon'

export function H2kListItem ({
  disabled, style,
  title, titlePrimary, titleSecondary,
  description, descriptionPrimary, descriptionSecondary,
  leftIcon, left,
  rightIcon, right, onPressRight,
  rightSwitchValue, rightSwitchOnValueChange,
  ...moreProps
}) {
  const styles = useThemedStyles()

  const rootStyle = useMemo(() => {
    if (disabled) {
      return { ...styles.list.item, ...style, opacity: 0.5 }
    } else {
      return { ...styles.list.item, ...style }
    }
  }, [style, disabled, styles])

  const titleStyle = useMemo(() => {
    return {
      ...styles.list.title,
      ...moreProps.titleStyle
    }
  }, [moreProps.titleStyle, styles])

  const descriptionStyle = useMemo(() => {
    return {
      ...styles.list.description,
      ...moreProps.descriptionStyle
    }
  }, [moreProps.descriptionStyle, styles])

  const titleElement = useMemo(() => {
    if (title) {
      return title
    } else if (titlePrimary || titleSecondary) {
      return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: styles.oneSpace }}>
          <Text style={{ fontWeight: 'bold' }}>{titlePrimary}</Text>
          <Text ellipsizeMode={'tail'} numberOfLines={1}>{titleSecondary}</Text>
        </View>
      )
    }
  }, [styles.oneSpace, title, titlePrimary, titleSecondary])

  const descriptionElement = useMemo(() => {
    if (description) {
      return description
    } else if (descriptionPrimary || descriptionSecondary) {
      return (
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <Text>{descriptionPrimary}</Text>
          <Text ellipsizeMode={'tail'} numberOfLines={1}>{descriptionSecondary}</Text>
        </View>
      )
    }
    return null
  }, [description, descriptionPrimary, descriptionSecondary])

  const leftElement = useMemo(() => {
    if (left) {
      return left()
    } else if (leftIcon) {
      return () => <List.Icon icon={paperNameOrHam2KIcon(leftIcon)} style={{ marginLeft: styles.oneSpace * 2 }} />
    }
    return null
  }, [leftIcon, left, styles])

  const rightElement = useMemo(() => {
    if (right) {
      return right()
    } else if (rightSwitchValue) {
      return () => <Switch value={rightSwitchValue} onValueChange={rightSwitchOnValueChange} />
    } else if (rightIcon) {
      if (onPressRight) {
        return () => <H2kIconButton icon={paperNameOrHam2KIcon(rightIcon)} style={{ marginRight: styles.oneSpace * 2 }} onPress={onPressRight} />
      } else {
        return () => <List.Icon icon={paperNameOrHam2KIcon(rightIcon)} style={{ marginRight: styles.oneSpace * 2 }} />
      }
    }
    return null
  }, [right, rightSwitchValue, rightIcon, rightSwitchOnValueChange, onPressRight, styles.oneSpace])

  return (
    <List.Item
      {...moreProps}
      style={rootStyle}
      title={titleElement}
      description={descriptionElement}
      titleStyle={titleStyle}
      descriptionStyle={descriptionStyle}
      left={leftElement}
      right={rightElement}
    />
  )
}
