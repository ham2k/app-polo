/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Dialog, List, Switch, Text } from 'react-native-paper'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings, setSettings } from '../../../store/settings'
import { activateExtension, allExtensions, deactivateExtension } from '../../../extensions/registry'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { Ham2kDialog } from '../../components/Ham2kDialog'
import Notices from '../../HomeScreen/components/Notices'
import { paperNameOrHam2KIcon } from '../../components/Ham2KIcon'

const FeatureItem = ({ extension, settings, info, styles, onChange, category }) => {
  const enabled = useMemo(() => settings[`extensions/${extension.key}`] ?? extension?.enabledByDefault, [settings, extension])

  return (
    <Ham2kListItem
      key={extension.name}
      title={extension.name}
      description={extension.description}
      titleStyle={category === 'devmode' ? { color: styles.colors.devMode } : {}}
      descriptionStyle={category === 'devmode' ? { color: styles.colors.devMode } : {}}
      left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={paperNameOrHam2KIcon(extension.icon ?? 'format-list-bulleted')} color={category === 'devmode' ? styles.colors.devMode : undefined} />}
      right={() => <Switch value={enabled} onValueChange={(value) => onChange && onChange(value) } />}
      onPress={() => onChange && onChange(!enabled)}
    />
  )
}

export default function FeaturesSettingsScreen ({ navigation, splitView }) {
  const styles = useThemedStyles()
  const safeAreaInsets = useSafeAreaInsets()

  const settings = useSelector(selectSettings)

  const dispatch = useDispatch()

  const featureGroups = useMemo(() => groupAndSortExtensions(allExtensions().filter(e => !e.alwaysEnabled), settings.devMode), [settings.devMode])

  const [showMoreForGroup, setShowMoreForGroup] = useState({})

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
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        {featureGroups.map(({ category, label, extensions, popular }) => (

          <Ham2kListSection title={label} key={category} titleStyle={category === 'devmode' ? { color: styles.colors.devMode } : {}}>
            {showMoreForGroup[category] || popular.length === 0 ? (
              <>
                {extensions.map((extension) => (
                  <FeatureItem key={extension.key} extension={extension} category={category}settings={settings} styles={styles} onChange={(value) => handleChange(extension, value)} />
                ))}
                {popular.length > 0 && (
                  <Ham2kListItem
                    title={`Fewer ${label}...`}
                    left={() => <View style={{ width: styles.oneSpace * 5 }} />}
                    onPress={() => setShowMoreForGroup({ ...showMoreForGroup, [category]: false })}
                  />
                )}
              </>
            ) : (
              <>
                {popular.map((extension) => (
                  <FeatureItem key={extension.key} extension={extension} settings={settings} styles={styles} onChange={(value) => handleChange(extension, value)} />
                ))}
                <Ham2kListItem
                  title={`More ${label}...`}
                  left={() => <View style={{ width: styles.oneSpace * 5 }} />}
                  onPress={() => setShowMoreForGroup({ ...showMoreForGroup, [category]: true })}
                />
              </>
            )}
          </Ham2kListSection>
        ))}

        <View style={{ height: safeAreaInsets.bottom }} />
      </ScrollView>

      <Notices paddingForSafeArea={true} />
    </ScreenContainer>
  )
}

const CATEGORY_TITLES = {
  core: 'Core Features',
  locationBased: 'Location-based Activities',
  contestsAndFieldOps: 'Contests & Field Ops',
  lookup: 'Data Lookup',
  devmode: 'Developer Mode',
  other: 'Other Features'
}

const CATEGORY_REGROUPINGS = {
  fieldOps: 'contestsAndFieldOps',
  contests: 'contestsAndFieldOps'
}

const CATEGORIES_ORDER = ['locationBased', 'contestsAndFieldOps', 'lookup', 'core', 'other', 'devmode']

const POPULAR_EXTENSIONS = [
  'pota',
  'wwff',
  'sota',
  'fd',
  'colonies',
  'qp'
]

function groupAndSortExtensions (extensions, devMode = false) {
  const groups = {}
  const popularForGroup = {}
  extensions.forEach((extension) => {
    let category = extension.category

    if (CATEGORY_REGROUPINGS[category]) category = CATEGORY_REGROUPINGS[category]

    if (!CATEGORY_TITLES[category]) category = 'other'

    if (!groups[category]) groups[category] = []
    groups[category].push(extension)

    if (POPULAR_EXTENSIONS.includes(extension.key)) {
      if (!popularForGroup[category]) popularForGroup[category] = []
      popularForGroup[category].push(extension)
    }
  })

  return CATEGORIES_ORDER.map((category) => {
    return {
      category,
      label: CATEGORY_TITLES[category] || '',
      extensions: (groups[category] || []).sort(extensionComparer),
      popular: (popularForGroup[category] || []).sort(extensionComparer)
    }
  }).filter((group) => group.extensions.length > 0).filter((group) => devMode || group.category !== 'devmode')
}

function extensionComparer (a, b) {
  const popularA = POPULAR_EXTENSIONS.includes(a.key)
  const popularB = POPULAR_EXTENSIONS.includes(b.key)
  if (popularA && !popularB) return -1
  if (!popularA && popularB) return 1
  return (a?.name ?? '').localeCompare(b?.name ?? '')
}
