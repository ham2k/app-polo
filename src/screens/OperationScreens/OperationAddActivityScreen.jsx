/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List } from 'react-native-paper'
import { ScrollView } from 'react-native'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { selectOperation, setOperationData } from '../../store/operations'
import { replaceRefs } from '../../tools/refTools'
import { StackActions } from '@react-navigation/native'
import { useFindHooks } from '../../extensions/registry'
import { Ham2kListItem } from '../components/Ham2kListItem'
import { Ham2kListSection } from '../components/Ham2kListSection'
import { ListSeparator } from '../components/ListComponents'

export default function OperationAddActivityScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation))

  const activityHooks = useFindHooks('activity')

  const addActivity = useCallback((activity) => {
    const type = activity.activationType || activity.refType || activity.key
    dispatch(setOperationData({
      uuid: operation.uuid,
      refs: replaceRefs(
        operation.refs,
        type,
        [{ type, ref: '', ...activity.defaultValue }]
      )
    }))
    navigation.dispatch(StackActions.replace('OperationActivityOptions', { operation: operation.uuid, activity: activity.key }))
  }, [operation, dispatch, navigation])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <Ham2kListSection>
          {activityHooks.map((activity) => (
            <Ham2kListItem
              key={activity.key}
              title={activity.name}
              // eslint-disable-next-line react/no-unstable-nested-components
              left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={activity.icon} />}
              onPress={() => addActivity(activity)}
            />
          ))}
        </Ham2kListSection>

        <ListSeparator />

        <Ham2kListSection>
          <Ham2kListItem
            title="Can't find the activity you're looking for?"
            description="There are more options in the App Features Settings"
            onPress={() => navigation.navigate('Settings', { screen: 'FeaturesSettings' })}
          />
        </Ham2kListSection>
      </ScrollView>
    </ScreenContainer>
  )
}
