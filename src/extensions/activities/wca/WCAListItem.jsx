/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { H2kListItem } from '../../../ui'
import { fmtDistance } from '../../../tools/geoTools'

import { Info } from './WCAInfo'
import { wcaFindOneByReference } from './WCADataFile'

export function WCAListItem ({ activityRef, refData, allRefs, style, styles, settings, onPress, onAddReference, onRemoveReference }) {
  const { t } = useTranslation()

  const [reference, setReference] = useState()
  useEffect(() => {
    wcaFindOneByReference(activityRef).then(setReference)
  }, [activityRef])

  const isInRefs = useMemo(() => {
    return allRefs.find(ref => ref.ref === activityRef)
  }, [allRefs, activityRef])

  return (
    <H2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      titlePrimary={reference?.ref ?? activityRef}
      titleSecondary={(typeof refData?.distance === 'number') && fmtDistance(refData.distance, { units: settings.distanceUnits, away: true })}
      description={reference?.ref ? [reference?.name, reference?.location].filter(x => x).join(', ') : t('extensions.wca.unknownReference', 'Unknown Castle Reference')}
      onPress={onPress}
      leftIcon={Info.icon}
      rightIcon={isInRefs ? 'minus-circle-outline' : 'plus-circle'}
      onPressRight={isInRefs ? () => onRemoveReference(activityRef) : () => onAddReference(activityRef)}
    />
  )
}
