/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Dialog, List, Portal, Switch, Text } from 'react-native-paper'
import { KeyboardAvoidingView, ScrollView } from 'react-native'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings, setSettings } from '../../../store/settings'
import { activateExtension, allExtensions, deactivateExtension } from '../../../extensions/registry'

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

  const extensions = useMemo(() => allExtensions().filter(e => !e.alwaysEnabled), [])

  const sortedExtensions = useMemo(() => {
    return Object.values(extensions).sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''))
  }, [extensions])

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
        <List.Section>
          {sortedExtensions.map((extension) => (
            <React.Fragment key={extension.key}>
              <FeatureItem extension={extension} settings={settings} styles={styles} onChange={(value) => handleChange(extension, value)} />
            </React.Fragment>
          ))}
        </List.Section>

      </ScrollView>
    </ScreenContainer>
  )
}
