import React, { useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Dialog, List, Portal, Text } from 'react-native-paper'
import { KeyboardAvoidingView, ScrollView } from 'react-native'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { actions, getDataFileDefinitions, selectAllDataFileInfos } from '../../../store/dataFiles'
import { fmtDateTimeNice, fmtDateTimeRelative } from '../../../tools/timeFormats'
import { fetchDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { selectSettings, setSettings } from '../../../store/settings'

const DefinitionItem = ({ def, settings, info, styles, onPress }) => {
  const enabled = useMemo(() => settings[`dataFiles/${def.key}`] ?? def?.enabledByDefault, [settings, def])

  const Icon = useMemo(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={def.icon ?? 'file-outline'} />
  ), [def.icon, styles])
  return (
    <List.Item
      key={def.name}
      title={def.name}
      description={enabled ? `Updated ${fmtDateTimeRelative(info?.date)}` : 'Not enabled'}
      left={() => Icon}
      onPress={onPress}
    />
  )
}

const DefinitionDialog = ({ def, info, settings, styles, onDialogDone }) => {
  const dispatch = useDispatch()

  const enabled = useMemo(() => settings[`dataFiles/${def.key}`] ?? def?.enabledByDefault, [settings, def])

  const handleRefresh = useCallback(() => {
    dispatch(fetchDataFile(def.key))
  }, [def.key, dispatch])

  const handleEnabled = useCallback(() => {
    dispatch(setSettings({ [`dataFiles/${def.key}`]: !enabled }))
    if (!enabled) {
      dispatch(fetchDataFile(def.key))
    }
  }, [def.key, dispatch, enabled])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog visible={true} onDismiss={onDialogDone}>
          <Dialog.Icon icon={def.icon ?? 'file-outline'} />
          <Dialog.Title style={{ textAlign: 'center' }}>{def.name}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>{def.description}</Text>
          </Dialog.Content>
          <Dialog.Content>
            {enabled ? (
              info?.status === 'fetching' ? (
                <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Fetching...</Text>
              ) : (
                <>
                  <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Updated on {fmtDateTimeNice(info?.date)}</Text>
                  {info?.version && (
                    <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Version: {info.version}</Text>
                  )}
                </>
              )
            ) : (
              <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Not currently enabled</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'space-between' }}>
            <Button onPress={handleEnabled} disabled={enabled && info?.status === 'fetching'}>{enabled ? 'Disable' : 'Enable' }</Button>
            <Button onPress={handleRefresh} disabled={!enabled || info?.status === 'fetching'}>Refresh</Button>
            <Button onPress={onDialogDone}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}

export default function DataFilesSettingsScreen ({ navigation }) {
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const definitions = useMemo(() => getDataFileDefinitions(), [])
  const sortedDefinitions = useMemo(() => {
    return Object.values(definitions).sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''))
  }, [definitions])

  const dataFileInfos = useSelector(selectAllDataFileInfos)

  const [selectedDefinition, setSelectedDefinition] = useState()

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          {sortedDefinitions.map((def) => (
            <React.Fragment key={def.key}>
              <DefinitionItem def={def} settings={settings} info={dataFileInfos[def.key]} styles={styles} onPress={() => setSelectedDefinition(def.key)} />
              {selectedDefinition === def.key && (
                <DefinitionDialog
                  settings={settings}
                  def={def}
                  info={dataFileInfos[def.key]}
                  styles={styles}
                  visible={true}
                  onDialogDone={() => setSelectedDefinition('')}
                />
              )}
            </React.Fragment>
          ))}
        </List.Section>

      </ScrollView>
    </ScreenContainer>
  )
}
