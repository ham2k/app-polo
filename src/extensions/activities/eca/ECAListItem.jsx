// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useEffect, useMemo, useState } from 'react'

import { fmtDistance } from '@ham2k/lib-geo-tools'

import { H2kListItem } from '../../../ui'

import { Info } from './ECAInfo'
import { ecaFindOneByReference } from './ECADataFile'

export function ECAListItem ({ activityRef, refData, allRefs, style, styles, settings, onPress, onAddReference, onRemoveReference }) {
  const [reference, setReference] = useState()
  useEffect(() => {
    ecaFindOneByReference(activityRef).then(setReference)
  }, [activityRef])

  const isInRefs = useMemo(() => {
    return allRefs.find(ref => ref.ref === activityRef)
  }, [allRefs, activityRef])

  return (
    <H2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      titlePrimary={reference?.ref ?? activityRef}
      titleSecondary={(typeof refData?.distance === 'number') && fmtDistance(refData.distance, { units: settings.distanceUnits, away: true })}
      description={reference?.ref ? [reference?.name, reference?.location].filter(x => x).join(', ') : 'Unknown Castle Reference'}
      onPress={onPress}
      leftIcon={Info.icon}
      rightIcon={isInRefs ? 'minus-circle-outline' : 'plus-circle'}
      onPressRight={isInRefs ? () => onRemoveReference(activityRef) : () => onAddReference(activityRef)}
    />
  )
}
