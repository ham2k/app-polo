/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Dialog, List, Text } from 'react-native-paper'
import { ScrollView } from 'react-native'
import DocumentPicker from 'react-native-document-picker'
import RNFetchBlob from 'react-native-blob-util'
import { fmtNumber } from '@ham2k/lib-format-tools'

import { reportError } from '../../../distro'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { getDataFileDefinitions, selectAllDataFileInfos } from '../../../store/dataFiles'
import { fetchDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { selectSettings } from '../../../store/settings'
import { countHistoricalRecords, importHistoricalADIF } from '../../../store/operations'
import { fmtDateTimeNice, fmtDateTimeRelative } from '../../../tools/timeFormats'
import { findHooks } from '../../../extensions/registry'
import { countTemplate } from '../../../tools/stringTools'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { Ham2kDialog } from '../../components/Ham2kDialog'

const DataFileDefinitionItem = ({ def, settings, info, styles, onPress }) => {
  const Icon = useMemo(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={def.icon ?? 'file-outline'} />
  ), [def.icon, styles])
  return (
    <Ham2kListItem
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
    <Ham2kDialog visible={true} onDismiss={onDialogDone}>
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
    </Ham2kDialog>
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
    DocumentPicker.pickSingle({ mode: 'import', copyTo: 'cachesDirectory' }).then(async (file) => {
      setLoadingHistoricalMessage('Importing ADIF records... Please be patient!')
      const interval = setInterval(async () => {
        const count = await dispatch(countHistoricalRecords())
        setHistoricalCount(count)
      }, 1000)
      await dispatch(importHistoricalADIF(file.fileCopyUri))

      RNFetchBlob.fs.unlink(file.fileCopyUri)

      clearInterval(interval)

      setLoadingHistoricalMessage()
      const count = await dispatch(countHistoricalRecords())

      setHistoricalCount(count)
    }).catch((error) => {
      if (error.indexOf('cancelled') >= 0) {
        // ignore
      } else {
        reportError('Error importing historical ADIF', error)
      }
    })
  }, [dispatch])

  return (
    <ScreenContainer>
      {loadingHistoricalMessage && (
        <Ham2kDialog visible={true}>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>{loadingHistoricalMessage}</Text>
          </Dialog.Content>
        </Ham2kDialog>
      )}

      <ScrollView style={{ flex: 1 }}>
        <Ham2kListSection title={'Offline Data'}>
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
        </Ham2kListSection>

        <Ham2kListSection title={'Log Data'}>
          <Ham2kListItem
            title="Import History from ADIF"
            description={historicalCount && countTemplate(historicalCount, { zero: 'No records', one: '1 record', more: '{fmtCount} records' }, { fmtCount: fmtNumber(historicalCount) })}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="database-import-outline" />}
            onPress={handleImportHistoricalFile}
          />
        </Ham2kListSection>

        {extensionSettingHooks.length > 0 && (
          <Ham2kListSection title={'Extensions'}>
            {extensionSettingHooks.map((hook) => (
              <hook.SettingItem key={hook.key} settings={settings} styles={styles} navigation={navigation} />
            ))}
          </Ham2kListSection>
        )}
      </ScrollView>
    </ScreenContainer>
  )
}
