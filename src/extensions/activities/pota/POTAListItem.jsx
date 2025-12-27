/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'

import { useLookupParkQuery } from '../../../store/apis/apiPOTA'
import { fmtDistance } from '../../../tools/geoTools'
import { H2kListItem } from '../../../ui'

import { Info } from './POTAInfo'

export function POTAListItem ({ activityRef, refData, allRefs, style, styles, settings, onPress, onAddReference, onRemoveReference, online }) {
  const pota = useLookupParkQuery({ ref: activityRef }, { skip: !activityRef, online })

  const description = useMemo(() => {
    let desc
    if (online && pota?.error) {
      desc = `Error: ${pota.error}`
    } else if (!pota?.data?.name && !refData?.name) {
      desc = 'Unknown Park'
    } else {
      desc = [
        pota?.data?.active === 0 && 'INACTIVE PARK!!!',
        pota?.data?.name ?? refData?.name
      ].filter(x => x).join(' • ')
    }
    return desc
  }, [pota, refData, online])

  const isInRefs = useMemo(() => {
    return allRefs.find(ref => ref.ref === activityRef)
  }, [allRefs, activityRef])

  return (
    <H2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      titlePrimary={pota?.data?.ref ?? activityRef ?? ''}
      titleSecondary={(typeof refData?.distance === 'number') && fmtDistance(refData.distance, { units: settings.distanceUnits, away: true })}
      description={description}
      onPress={onPress}
      leftIcon={Info.icon}
      rightIcon={isInRefs ? 'minus-circle-outline' : 'plus-circle'}
      onPressRight={isInRefs ? () => onRemoveReference(activityRef) : () => onAddReference(activityRef)}
    />
  )
}
