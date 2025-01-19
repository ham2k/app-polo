/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * ALL RIGHTS RESERVED.
 *
 * THIS FILE IS NOT LICENSED ALONG THE REST OF THE PROJECT.
 *
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Ham2kListSection } from '../../screens/components/Ham2kListSection'
import { Ham2kListSubheader } from '../../screens/components/Ham2kListSubheader'
import { Image, View } from 'react-native'
import { selectFeatureFlag } from '../../store/system'
import { useSelector } from 'react-redux'

const BADGE_2024 = require('./badges/2024-supporter.png')
const BADGE_2025 = require('./badges/2025-supporter.png')

const BADGES = {
  '2024-supporter': BADGE_2024,
  '2025-supporter': BADGE_2025
}

export function MainSettingsForDistribution ({ settings, styles }) {
  const badgeFlags = useSelector(state => selectFeatureFlag(state, 'badges'))

  const badges = useMemo(() => {
    if (!badgeFlags) return []
    return Object.keys(BADGES).filter(badge => badgeFlags[badge])
  }, [badgeFlags])

  if (badges.length === 0) return null
  return (
    <Ham2kListSection>
      <Ham2kListSubheader>{settings.operatorCall} is a Supporter of Ham2K</Ham2kListSubheader>
      <View style={{ marginHorizontal: styles.oneSpace * 2, flexDirection: 'row' }}>
        {badges.map(badge => (
          <Image
            source={BADGES[badge]}
            key={badge}
            style={{
              resizeMode: 'cover',
              height: styles.oneSpace * 15,
              width: styles.oneSpace * 15,
              margin: 0
            }}
          />
        ))}
      </View>
    </Ham2kListSection>
  )
}
