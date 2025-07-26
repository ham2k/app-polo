/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useState } from 'react'

import { fmtDistance } from '../../../tools/geoTools'
import { H2kListItem } from '../../../ui'

import { Info } from './ZLOTAInfo'
import { zlotaFindOneByReference } from './ZLOTADataFile'

export function ZLOTAListItem ({ activityRef, refData, allRefs, style, styles, settings, onPress, onAddReference, onRemoveReference, online }) {
  const [reference, setReference] = useState()
  useEffect(() => {
    zlotaFindOneByReference(activityRef).then(setReference)
  }, [activityRef])

  const isInRefs = useMemo(() => {
    return allRefs.find(ref => ref.ref === activityRef)
  }, [allRefs, activityRef])

  return (
    <H2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      titlePrimary={reference?.ref ?? activityRef}
      titleSecondary={(typeof refData?.distance === 'number') && fmtDistance(refData.distance, { units: settings.distanceUnits }) + ' away'}
      description={reference?.ref ? [reference?.name, reference?.assetType].filter(x => x).join(' • ') : 'Unknown Reference'}
      onPress={onPress}
      leftIcon={Info.icon}
      rightIcon={isInRefs ? 'minus-circle-outline' : 'plus-circle'}
      onPressRight={isInRefs ? () => onRemoveReference(activityRef) : () => onAddReference(activityRef)}
    />
  )
}
