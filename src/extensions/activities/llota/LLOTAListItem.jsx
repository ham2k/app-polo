/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'

import { fmtDistance } from '../../../tools/geoTools'
import { H2kListItem } from '../../../ui'

import { Info } from './LLOTAInfo'

export function LLOTAListItem ({ activityRef, refData, allRefs, style, styles, settings, onPress, onAddReference, onRemoveReference, online }) {
  const isInRefs = useMemo(() => {
    return allRefs.find(ref => ref.ref === activityRef)
  }, [allRefs, activityRef])

  return (
    <H2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      titlePrimary={activityRef}
      titleSecondary={(typeof refData?.distance === 'number') && fmtDistance(refData.distance, { units: settings.distanceUnits, away: true })}
      description={refData?.name}
      onPress={onPress}
      leftIcon={Info.icon}
      rightIcon={isInRefs ? 'minus-circle-outline' : 'plus-circle'}
      onPressRight={isInRefs ? () => onRemoveReference(activityRef) : () => onAddReference(activityRef)}
    />
  )
}
