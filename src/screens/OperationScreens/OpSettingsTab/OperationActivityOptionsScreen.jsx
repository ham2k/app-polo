/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectOperation, setOperationData } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { findBestHook } from '../../../extensions/registry'
import { defaultReferenceHandlerFor } from '../../../extensions/core/references'
import { replaceRefs } from '../../../tools/refTools'
import ScreenContainer from '../../components/ScreenContainer'
import { trackEvent } from '../../../distro'
import { H2kListItem, H2kListSection, H2kListSeparator } from '../../../ui'

export default function OperationActivityOptionsScreen ({ navigation, route }) {
  const { t } = useTranslation()

  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const dispatch = useDispatch()

  const operation = useSelector(state => selectOperation(state, route.params.operation))

  const [refs, setRefs] = useState(operation?.refs || [])

  const handler = useMemo(() => (
    findBestHook(`ref:${route.params.activity}`) || defaultReferenceHandlerFor(route.params.activity)
  ), [route.params.activity])
  const activity = useMemo(() => findBestHook('activity', { key: handler.key }), [handler])

  useEffect(() => { // Prepare the screen, set the activity title, etc
    if (activity && operation) {
      navigation.setOptions({
        title: t(`extensions.${activity.key}.name`, activity.name || `Activity "${activity.key}"`),

        leftAction: 'accept',
        leftActionA11yLabel: t('general.buttons.accept-a11y', 'Accept Changes'),
        rightAction: 'revert',
        rightActionA11yLabel: t('general.buttons.revert-a11y', 'Revert Changes'),
        onLeftActionPress: () => {
          dispatch(setOperationData({ uuid: operation.uuid, refs }))
          navigation.goBack()
        },
        onRightActionPress: () => {
          navigation.goBack()
        }
      })
    }
  }, [navigation, activity, operation, dispatch, refs, t])

  const handleRemoveActivity = useCallback(() => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation, activity?.activationType ?? activity?.key ?? handler?.key, []) }))
    trackEvent('remove_activity', { activity: activity?.key })

    navigation.goBack()
  }, [activity, handler, dispatch, navigation, operation])

  return (
    <ScreenContainer>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}>
          {activity?.Options && <activity.Options operation={operation} styles={styles} settings={settings} refs={refs} setRefs={setRefs} />}

          <H2kListSection>
            <H2kListSeparator />
            <H2kListItem
              title={t('screens.operationActivityOptions.removeActivity', 'Remove {{activity}} from this operation',
                {
                  activity: t(`extensions.${activity.key}.shortName`, '') ||
                            activity.shortName ||
                            t(`extensions.${activity.key}.name`, '') ||
                            activity.name
                }
              )}
              titleStyle={{ color: styles.theme.colors.error }}
              leftIcon="delete"
              leftIconColor={styles.theme.colors.error}
              onPress={handleRemoveActivity}
            />
          </H2kListSection>

        </ScrollView>
      </SafeAreaView>
    </ScreenContainer>
  )
}
