/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List } from 'react-native-paper'
import { ScrollView } from 'react-native'

import ScreenContainer from '../components/ScreenContainer'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { selectOperation, setOperationData } from '../../store/operations'

import { replaceRefs } from '../../tools/refTools'
import { ListSeparator } from '../components/ListComponents'
import { findBestHook } from '../../extensions/registry'
import { defaultReferenceHandlerFor } from '../../extensions/core/references'
import { selectSettings } from '../../store/settings'
import { Ham2kListItem } from '../components/Ham2kListItem'
import { Ham2kListSection } from '../components/Ham2kListSection'

export default function OperationActivityOptionsScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const dispatch = useDispatch()

  const operation = useSelector(state => selectOperation(state, route.params.operation))
  const handler = useMemo(() => (
    findBestHook(`ref:${route.params.activity}`) || defaultReferenceHandlerFor(route.params.activity)
  ), [route.params.activity])
  const activity = useMemo(() => findBestHook('activity', { key: handler.key }), [handler])

  useEffect(() => { // Prepare the screen, set the activity title, etc
    if (activity && operation) {
      navigation.setOptions({
        title: activity.name ?? `Activity "${activity.key}`
      })
    }
  }, [navigation, activity, operation])

  const handleRemoveActivity = useCallback(() => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation, activity?.activationType ?? activity?.key ?? handler?.key, []) }))

    navigation.goBack()
  }, [activity, handler, dispatch, navigation, operation])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        {activity?.Options && <activity.Options operation={operation} styles={styles} settings={settings} />}

        <Ham2kListSection>
          <ListSeparator />
          <Ham2kListItem
            title={`Remove ${activity?.shortName ?? activity?.name ?? handler?.name} from this operation`}
            titleStyle={{ color: styles.theme.colors.error }}
            // eslint-disable-next-line react/no-unstable-nested-components
            left={() => <List.Icon color={styles.theme.colors.error} style={{ marginLeft: styles.oneSpace * 2 }} icon="delete" />}
            onPress={handleRemoveActivity}
          />
        </Ham2kListSection>

      </ScrollView>
    </ScreenContainer>
  )
}
