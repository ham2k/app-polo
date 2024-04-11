/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Dialog, List, Portal, Text } from 'react-native-paper'
import { KeyboardAvoidingView, ScrollView } from 'react-native'
import DocumentPicker from 'react-native-document-picker'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { getDataFileDefinitions, selectAllDataFileInfos } from '../../../store/dataFiles'
import { fmtDateTimeNice, fmtDateTimeRelative } from '../../../tools/timeFormats'
import { fetchDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { selectSettings } from '../../../store/settings'
import { findHooks } from '../../../extensions/registry'
import { countHistoricalRecords, importHistoricalADIF } from '../../../store/operations'
import { countTemplate } from '../../../tools/stringTools'
import { fmtNumber } from '@ham2k/lib-format-tools'

const DataFileDefinitionItem = ({ def, settings, info, styles, onPress }) => {
  const Icon = useMemo(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={def.icon ?? 'file-outline'} />
  ), [def.icon, styles])
  return (
    <List.Item
      key={def.name}
      title={def.name}
      description={`Updated ${fmtDateTimeRelative(info?.date)}`}
      left={() => Icon}
      onPress={onPress}
    />
  )
}

const DataFileDefinitionDialog = ({ def, info, settings, styles, onDialogDone }) => {
  const dispatch = useDispatch()

  const handleRefresh = useCallback(() => {
    dispatch(fetchDataFile(def.key))
  }, [def.key, dispatch])

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
            {info?.status === 'fetching' ? (
              <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Fetching...</Text>
            ) : (
              <>
                <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Updated on {fmtDateTimeNice(info?.date)}</Text>
                {info?.version && (
                  <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Version: {info.version}</Text>
                )}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'space-between' }}>
            <Button onPress={handleRefresh} disabled={info?.status === 'fetching'}>Refresh</Button>
            <Button onPress={onDialogDone}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}

export default function DataSettingsScreen ({ navigation }) {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const settings = useSelector(selectSettings)

  const dataFileDefinitions = useMemo(() => getDataFileDefinitions(), [])
  const sortedDataFileDefinitions = useMemo(() => {
    return Object.values(dataFileDefinitions).sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''))
  }, [dataFileDefinitions])

  const dataFileInfos = useSelector(selectAllDataFileInfos)

  const [selectedDefinition, setSelectedDefinition] = useState()

  const extensionSettingHooks = useMemo(() => {
    const hooks = findHooks('setting').filter(hook => hook.category === 'data' && hook.SettingItem)
    return hooks
  }, [])

  const [loadingHistoricalMessage, setLoadingHistoricalMessage] = useState()
  const [historicalCount, setHistoricalCount] = useState()
  useEffect(() => {
    setTimeout(async () => {
      const count = await dispatch(countHistoricalRecords())
      setHistoricalCount(count)
    }, 0)
  }, [dispatch])

  const handleImportHistoricalFile = useCallback(() => {
    DocumentPicker.pickSingle().then(async (file) => {
      setLoadingHistoricalMessage('Importing ADIF records... Please be patient!')
      const interval = setInterval(async () => {
        const count = await dispatch(countHistoricalRecords())
        setHistoricalCount(count)
      }, 1000)
      await dispatch(importHistoricalADIF(file.uri))

      clearInterval(interval)

      setLoadingHistoricalMessage()
      const count = await dispatch(countHistoricalRecords())
      setHistoricalCount(count)
    })
  }, [dispatch])

  return (
    <ScreenContainer>
      {loadingHistoricalMessage && (
        <Portal>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
            <Dialog visible={true}>
              <Dialog.Content>
                <Text variant="bodyMedium" style={{ textAlign: 'center' }}>{loadingHistoricalMessage}</Text>
              </Dialog.Content>
            </Dialog>
          </KeyboardAvoidingView>
        </Portal>
      )}

      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Subheader>Offline Data</List.Subheader>
          {sortedDataFileDefinitions.map((def) => (
            <React.Fragment key={def.key}>
              <DataFileDefinitionItem def={def} settings={settings} info={dataFileInfos[def.key]} styles={styles} onPress={() => setSelectedDefinition(def.key)} />
              {selectedDefinition === def.key && (
                <DataFileDefinitionDialog
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

        <List.Section>
          <List.Subheader>Log Data</List.Subheader>
          <List.Item
            title="Import History from ADIF"
            description={historicalCount && countTemplate(historicalCount, { zero: 'No records', one: '1 record', more: '{fmtCount} records' }, { fmtCount: fmtNumber(historicalCount) })}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="database-import-outline" />}
            onPress={handleImportHistoricalFile}
          />
        </List.Section>

        {extensionSettingHooks.length > 0 && (
          <List.Section>
            <List.Subheader>Extensions</List.Subheader>
            {extensionSettingHooks.map((hook) => (
              <hook.SettingItem key={hook.key} settings={settings} styles={styles} navigation={navigation} />
            ))}
          </List.Section>
        )}
      </ScrollView>
    </ScreenContainer>
  )
}
