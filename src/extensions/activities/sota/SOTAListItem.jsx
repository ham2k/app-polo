/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useEffect, useState } from 'react'
import { IconButton, List, Text } from 'react-native-paper'
import { View } from 'react-native'

import { Info } from './SOTAInfo'
import { sotaFindOneByReference } from './SOTADataFile'
import { fmtDistance } from '../../../tools/geoTools'
import { Ham2kListItem } from '../../../screens/components/Ham2kListItem'

export function SOTAListItem ({ activityRef, refData, operationRef, style, settings, styles, onPress, onAddReference, onRemoveReference }) {
  const [reference, setReference] = useState()
  useEffect(() => {
    sotaFindOneByReference(activityRef).then(setReference)
  }, [activityRef])

  return (
    <Ham2kListItem style={{ paddingRight: styles.oneSpace * 1 }}
      title={
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ fontWeight: 'bold' }}>
            {reference?.ref ?? activityRef}
          </Text>
          <Text>
            {reference?.name ? ` - ${reference?.name}` : ''}
          </Text>
        </View>
      }
      description={
        <View style={{ flexDirection: 'row' }}>
          <Text>
            {[reference?.region, reference?.association].filter(x => x).join(' • ')}
          </Text>
          {refData?.distance && (
            <Text>
              {' - ' + fmtDistance(refData.distance, { units: settings.distanceUnits }) + ' away'}
            </Text>
          )}
        </View>
      }
      onPress={onPress}
      left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={Info.icon} />}
      right={() => (
        activityRef === operationRef ? (
          onRemoveReference && <IconButton icon="minus-circle-outline" onPress={() => onRemoveReference(activityRef)} />
        ) : (
          onAddReference && <IconButton icon="plus-circle" onPress={() => onAddReference(activityRef)} />

        )
      )}
    />
  )
}
