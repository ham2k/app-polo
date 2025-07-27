/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useState } from 'react'

import { fmtDistance } from '../../../tools/geoTools'
import { H2kListItem } from '../../../ui'

import { Info } from './HSOTAInfo'
import { hsotaFindOneByReference } from './HSOTADataFile'

export function HSOTAListItem ({ activityRef, refData, operationRef, style, settings, styles, onPress, onAddReference, onRemoveReference }) {
  const [reference, setReference] = useState()
  useEffect(() => {
    hsotaFindOneByReference(activityRef).then(setReference)
  }, [activityRef])

  return (
    <H2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      titlePrimary={reference?.ref ?? activityRef}
      titleSecondary={(typeof refData?.distance === 'number') && fmtDistance(refData.distance, { units: settings.distanceUnits }) + ' away'}
      description={reference?.name ? reference.name : Info.unknownReferenceName }
      onPress={onPress}
      leftIcon={Info.icon}
      rightIcon={activityRef === operationRef ? 'minus-circle-outline' : 'plus-circle'}
      onPressRight={activityRef === operationRef ? () => onRemoveReference(activityRef) : () => onAddReference(activityRef)}
    />
  )
}
