/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useEffect, useMemo, useState } from 'react'
import { IconButton, List, Text } from 'react-native-paper'
import { View } from 'react-native'

import { fmtDistance } from '../../../tools/geoTools'

import { Info } from './SiOTAInfo'
import { siotaFindOneByReference } from './SiOTADataFile'
import { Ham2kListItem } from '../../../screens/components/Ham2kListItem'

export function SiOTAListItem ({ activityRef, refData, allRefs, style, styles, settings, onPress, onAddReference, onRemoveReference, online }) {
  const [reference, setReference] = useState()
  useEffect(() => {
    siotaFindOneByReference(activityRef).then(setReference)
  }, [activityRef])

  const isInRefs = useMemo(() => {
    return allRefs.find(ref => ref.ref === activityRef)
  }, [allRefs, activityRef])

  return (
    <Ham2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      title={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: styles.oneSpace }}>
          <Text style={{ fontWeight: 'bold' }}>
            {reference?.ref ?? activityRef}
          </Text>
          <Text>
            {refData?.distance && fmtDistance(refData.distance, { units: settings.distanceUnits }) + ' away'}
          </Text>
        </View>
      }
      description={reference?.ref ? [reference?.name, reference?.location !== reference?.name && reference?.location, reference?.state].filter(x => x).join(', ') : 'Unknown Silo Reference'}
      onPress={onPress}
      left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={Info.icon} />}
      right={() => (
        isInRefs ? (
          onRemoveReference && <IconButton icon="minus-circle-outline" onPress={() => onRemoveReference(activityRef)} />
        ) : (
          onAddReference && <IconButton icon="plus-circle" onPress={() => onAddReference(activityRef)} />
        )
      )}
    />
  )
}
