/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useMemo } from 'react'
import { IconButton, List, Text } from 'react-native-paper'
import { View } from 'react-native'

import { useLookupParkQuery } from '../../../store/apis/apiPOTA'
import { fmtDistance } from '../../../tools/geoTools'

import { Info } from './POTAInfo'
import { Ham2kListItem } from '../../../screens/components/Ham2kListItem'

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
    <Ham2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      title={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: styles.oneSpace }}>
          <Text style={{ fontWeight: 'bold' }}>
            {pota?.data?.ref ?? activityRef}
          </Text>
          {/* <Text>
            {(pota?.data?.locationDesc ?? refData?.locationDesc) && ` (${pota?.data?.locationDesc ?? refData?.locationDesc})`}
          </Text> */}
          <Text>
            {(typeof refData?.distance === 'number') ? fmtDistance(refData.distance, { units: settings.distanceUnits }) + ' away' : ''}
          </Text>
        </View>
      }
      description={description}
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
