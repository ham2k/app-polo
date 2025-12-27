/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useState } from 'react'

import { H2kListItem } from '../../../ui'
import { fmtDistance } from '../../../tools/geoTools'

import { Info } from './WWFFInfo'
import { wwffFindOneByReference } from './WWFFDataFile'

export function WWFFListItem ({ activityRef, refData, operationRef, style, styles, settings, onPress, onAddReference, onRemoveReference }) {
  const [reference, setReference] = useState()
  useEffect(() => {
    wwffFindOneByReference(activityRef).then(setReference)
  }, [activityRef])

  return (
    <H2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      titlePrimary={reference?.ref ?? activityRef}
      titleSecondary={(typeof refData?.distance === 'number') && fmtDistance(refData.distance, { units: settings.distanceUnits, away: true })}
      description={reference?.ref ? reference?.name : 'Unknown Park Reference'}
      onPress={onPress}
      leftIcon={Info.icon}
      rightIcon={activityRef === operationRef ? 'minus-circle-outline' : 'plus-circle'}
      onPressRight={activityRef === operationRef ? () => onRemoveReference(activityRef) : () => onAddReference(activityRef)}
    />
  )
}
