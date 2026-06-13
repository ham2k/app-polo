// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'

import { H2kListItem } from '../../../ui'

import { Info } from './CustomInfo'

export function CustomListItem ({ activityRef, style, styles, onPress, onRemoveReference }) {
  return (
    <H2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      titlePrimary={[activityRef?.mySig, activityRef?.mySigInfo].filter(x => x).join(' ')}
      titleSecondary={activityRef?.name}
      description={activityRef?.name}
      onPress={onPress}
      leftIcon={Info.icon}
      rightIcon={onRemoveReference && 'minus-circle-outline'}
      onPressRight={onRemoveReference && (() => onRemoveReference(activityRef.ref))}
    />
  )
}
