/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useState } from 'react'

import { fmtDistance } from '../../../tools/geoTools'
import { H2kListItem } from '../../../ui'

import { Info } from './SOTAInfo'
import { sotaFindOneByReference } from './SOTADataFile'

export function SOTAListItem ({ activityRef, refData, operationRef, style, settings, styles, onPress, onAddReference, onRemoveReference }) {
  const [reference, setReference] = useState()
  useEffect(() => {
    sotaFindOneByReference(activityRef).then(setReference)
  }, [activityRef])

  return (
    <H2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      titlePrimary={reference?.ref ?? activityRef}
      titleSecondary={reference?.name ? ` - ${reference?.name}` : ''}
      description={[
        fmtDistance(refData.distance, { units: settings.distanceUnits, away: true }),
        reference?.ref ? [reference?.region, reference?.association].filter(x => x).join(' • ') : 'Unknown Summit Reference'
      ].filter(x => x).join(' • ')}
      onPress={onPress}
      leftIcon={Info.icon}
      rightIcon={activityRef === operationRef ? 'minus-circle-outline' : 'plus-circle'}
      onPressRight={activityRef === operationRef ? () => onRemoveReference(activityRef) : () => onAddReference(activityRef)}
    />
  )
}
