/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Dialog, List, Portal, Switch, Text } from 'react-native-paper'
import { KeyboardAvoidingView, ScrollView } from 'react-native'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings, setSettings } from '../../../store/settings'
import { activateExtension, allExtensions, deactivateExtension } from '../../../extensions/registry'
import { EXTENSION_CATEGORIES, EXTENSION_CATEGORIES_ORDER } from '../../../extensions/categories'

const FeatureItem = ({ extension, settings, info, styles, onChange }) => {
  const enabled = useMemo(() => settings[`extensions/${extension.key}`] ?? extension?.enabledByDefault, [settings, extension])

  return (
    <List.Item
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
    dispatch(setSettings({ [`extensions/${extension.key}`]: value }))
    const slowTimeout = setTimeout(() => {
      setSlowOperationMessage('Activating extension, this may take a moment...')
    }, 1500)
    setTimeout(async () => {
      if (value) {
        await dispatch(activateExtension(extension))
      } else {
        await dispatch(deactivateExtension(extension))
      }
      if (slowTimeout) clearTimeout(slowTimeout)
      setSlowOperationMessage()
    }, 0)
  }, [dispatch])

  return (
    <ScreenContainer>
      {slowOperationMessage && (
        <Portal>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
            <Dialog visible={true}>
              <Dialog.Content>
                <Text variant="bodyMedium" style={{ textAlign: 'center' }}>{slowOperationMessage}</Text>
              </Dialog.Content>
            </Dialog>
          </KeyboardAvoidingView>
        </Portal>
      )}
      <ScrollView style={{ flex: 1 }}>
        {featureGroups.map(({ category, label, extensions }) => (
          <List.Section key={category}>
            <List.Subheader>{label}</List.Subheader>
            {extensions.map((extension) => (
              <FeatureItem key={extension.key} extension={extension} settings={settings} styles={styles} onChange={(value) => handleChange(extension, value)} />
            ))}
          </List.Section>
        ))}

      </ScrollView>
    </ScreenContainer>
  )
}