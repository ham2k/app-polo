/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ScrollView } from 'react-native'
import { StackActions } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { selectOperation, setOperationData } from '../../../store/operations'
import { findRef, replaceRefs } from '../../../tools/refTools'
import { findBestHook, useFindHooks } from '../../../extensions/registry'
import ScreenContainer from '../../components/ScreenContainer'
import { trackEvent } from '../../../distro'
import { H2kListItem, H2kListSection, H2kListSeparator } from '../../../ui'

export default function OperationAddActivityScreen ({ navigation, route }) {
  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation))
  const currentActivities = useMemo(() => {
    const activities = {}
    ;(operation?.refs || []).forEach(ref => {
      const hook = findBestHook(`ref:${ref.type}`)
      if (hook) {
        activities[hook.key] = hook.description && hook.description(operation)
      }
    })

    return activities
  }, [operation])

  const activityHooks = useFindHooks('activity')

  const addActivity = useCallback((activity) => {
    const type = activity.activationType || activity.refType || activity.key

    const ref = findRef(operation, type)
    if (!ref) {
      dispatch(setOperationData({
        uuid: operation.uuid,
        refs: replaceRefs(
          operation.refs,
          type,
          [{ type, ref: '', ...activity.defaultValue }]
        )
      }))
    }

    trackEvent('add_activity', { activity: activity?.key })
    navigation.dispatch(StackActions.replace('OperationActivityOptions', { operation: operation.uuid, activity: activity.key }))
  }, [operation, dispatch, navigation])

  return (
    <ScreenContainer>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}>
          <H2kListSection>
            {activityHooks.map((activity) => (
              <H2kListItem
                key={activity.key}
                title={activity.name}
                description={currentActivities[activity.key] ?? ''}
                leftIcon={activity.icon}
                onPress={() => addActivity(activity)}
              />
            ))}
          </H2kListSection>

          <H2kListSeparator />

          <H2kListSection>
            <H2kListItem
              title="Can't find the activity you're looking for?"
              description="There are more options in Settings > App Features"
              onPress={() => navigation.navigate('Settings', { screen: 'FeaturesSettings' })}
            />
          </H2kListSection>
        </ScrollView>
      </SafeAreaView>
    </ScreenContainer>
  )
}
