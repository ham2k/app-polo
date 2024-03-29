/* eslint-disable react/no-unstable-nested-components */
import React, { useMemo } from 'react'
import { IconButton, List, Text } from 'react-native-paper'
import { View } from 'react-native'

import { Info } from './WWFFInfo'
import { WWFFData } from './WWFFDataFile'
import { fmtDistance } from '../../tools/geoTools'

export function WWFFListItem ({ activityRef, refData, operationRef, style, styles, settings, onPress, onAddReference, onRemoveReference }) {
  const reference = useMemo(() => {
    return (WWFFData.byReference && WWFFData.byReference[activityRef]) || {}
  }, [activityRef])

  return (
    <List.Item style={{ paddingRight: styles.oneSpace * 1 }}
      title={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: styles.oneSpace }}>
          <Text style={{ fontWeight: 'bold' }}>
            {reference.ref ?? activityRef}
          </Text>
          <Text>
            {refData?.distance && fmtDistance(refData.distance, { units: settings.distanceUnits }) + ' away'}
          </Text>
        </View>
      }
      description={reference.name}
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
