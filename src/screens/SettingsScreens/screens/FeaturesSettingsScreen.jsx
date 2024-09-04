/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Dialog, List, Switch, Text } from 'react-native-paper'
import { ScrollView } from 'react-native'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings, setSettings } from '../../../store/settings'
import { activateExtension, allExtensions, deactivateExtension } from '../../../extensions/registry'
import { EXTENSION_CATEGORIES, EXTENSION_CATEGORIES_ORDER } from '../../../extensions/constants'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { Ham2kDialog } from '../../components/Ham2kDialog'
import Notices from '../../HomeScreen/components/Notices'

const FeatureItem = ({ extension, settings, info, styles, onChange }) => {
  const enabled = useMemo(() => settings[`extensions/${extension.key}`] ?? extension?.enabledByDefault, [settings, extension])

  return (
    <Ham2kListItem
      key={extension.name}
      title={extension.name}
      description={extension.description}
      left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={extension.icon ?? 'format-list-bulleted'} />}
      right={() => <Switch value={enabled} onValueChange={(value) => onChange && onChange(value) } />}
      onPress={() => onChange && onChange(!enabled)}
    />
  )
}

export default function FeaturesSettingsScreen ({ navigation }) {
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const dispatch = useDispatch()

  const featureGroups = useMemo(() => {
    const extensions = allExtensions().filter(e => !e.alwaysEnabled)
    const groups = {}
    extensions.forEach((extension) => {
      let category = extension.category
      if (!EXTENSION_CATEGORIES[category]) category = 'other'

      if (!groups[category]) groups[category] = []
      groups[category].push(extension)
    })

    return EXTENSION_CATEGORIES_ORDER.map((category) => {
      return {
        category,
        label: EXTENSION_CATEGORIES[category] || '',
        extensions: (groups[category] || []).sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''))
      }
    }).filter((group) => group.extensions.length > 0)
  }, [])

  const [slowOperationMessage, setSlowOperationMessage] = useState()

  const handleChange = useCallback((extension, value) => {
    const slowTimeout = setTimeout(() => {
      setSlowOperationMessage('Activating extension, this may take a moment...')
    }, 1500)
    setTimeout(async () => {
      if (value) {
        await dispatch(activateExtension(extension))
        await dispatch(setSettings({ [`extensions/${extension.key}`]: value }))
      } else {
        await dispatch(deactivateExtension(extension))
        await dispatch(setSettings({ [`extensions/${extension.key}`]: value }))
      }
      if (slowTimeout) clearTimeout(slowTimeout)
      setSlowOperationMessage()
    }, 0)
  }, [dispatch])

  return (
    <ScreenContainer>
      {slowOperationMessage && (
        <Ham2kDialog visible={true}>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>{slowOperationMessage}</Text>
          </Dialog.Content>
        </Ham2kDialog>
      )}
      <ScrollView style={{ flex: 1 }}>
        {featureGroups.map(({ category, label, extensions }) => (
          <Ham2kListSection title={label} key={category}>
            {extensions.map((extension) => (
              <FeatureItem key={extension.key} extension={extension} settings={settings} styles={styles} onChange={(value) => handleChange(extension, value)} />
            ))}
          </Ham2kListSection>
        ))}

      </ScrollView>

      <Notices />
    </ScreenContainer>
  )
}
