/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useState } from 'react'
import { List } from 'react-native-paper'
import { ScrollView, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import DocumentPicker from 'react-native-document-picker'
import RNFetchBlob from 'react-native-blob-util'
import Share from 'react-native-share'
import DeviceInfo from 'react-native-device-info'

import packageJson from '../../../../package.json'

import { DevModeSettingsForDistribution, reportError } from '../../../distro'
import { loadQSOs } from '../../../store/qsos'
import { selectSettings } from '../../../store/settings'
import { generateExport, importQSON, selectOperationsList } from '../../../store/operations'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { Ham2kMarkdown } from '../../components/Ham2kMarkdown'
import { SyncServiceDialog } from '../components/SyncServiceDialog'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { fmtGigabytes, fmtMegabytes } from '../../../tools/numberFormats'
import { dbSelectAll } from '../../../store/db/db'
import { fmtNumber } from '@ham2k/lib-format-tools'
import { resetSyncedStatus } from '../../../store/sync'

function prepareStyles (baseStyles) {
  return {
    ...baseStyles,
    listRow: {
      marginLeft: baseStyles.oneSpace * 2,
      marginRight: baseStyles.oneSpace * 2,
      marginBottom: baseStyles.oneSpace
    }
  }
}

export default function DevModeSettingsScreen ({ navigation }) {
  const styles = useThemedStyles(prepareStyles)

  const dispatch = useDispatch()

  const settings = useSelector(selectSettings)
  const operations = useSelector(selectOperationsList)

  const [currentDialog, setCurrentDialog] = useState()

  const [syncStatus, setSyncStatus] = useState()
  useEffect(() => {
    setImmediate(async () => {
      setSyncStatus(await syncCountDescription())
    })
  }, [])

  const handleResetSyncStatus = useCallback(async () => {
    await resetSyncedStatus()
    setSyncStatus(await syncCountDescription())
  }, [])

  const handleExportFiles = useCallback(async () => {
    let paths = []
    for (const operation of operations) {
      await dispatch(loadQSOs(operation.uuid))
      const qsonPaths = await dispatch(generateExport(operation.uuid, 'qson'))
      if (qsonPaths?.length > 0) {
        paths = paths.concat(qsonPaths)
      }
    }
    if (paths.length > 0) {
      Share.open({
        urls: paths.map(p => `file://${p}`),
        type: 'text/plain' // There is no official QSON mime type
      }).then((x) => {
        console.info('Shared', x)
      }).catch((e) => {
        console.info('Sharing Error', e)
      }).finally(() => {
        // Deleting these file causes GMail on Android to fail to attach it
        // So for the time being, we're leaving them in place.
        // dispatch(deleteExport(path))
      })
    }
  }, [dispatch, operations])

  const handleImportFiles = useCallback(() => {
    DocumentPicker.pickSingle({ mode: 'import', copyTo: 'cachesDirectory' }).then(async (file) => {
      const filename = decodeURIComponent(file.fileCopyUri.replace('file://', ''))
      await dispatch(importQSON(filename))
      RNFetchBlob.fs.unlink(filename)
    }).catch((error) => {
      if (error.indexOf('cancelled') >= 0) {
        // ignore
      } else {
        reportError('Error importing QSON', error)
      }
    })
  }, [dispatch])

  const shareSystemInfo = useCallback(() => {
    Share.open({
      title: 'Ham2K PoLo System Information',
      message: systemInfo(),
      email: 'help@ham2k.com'
    })
  }, [])

  if (!settings.devMode) return

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <DevModeSettingsForDistribution styles={styles} dispatch={dispatch} settings={settings} operations={operations} />
        <Ham2kListSection title={'Data'}>
          <Ham2kListItem
            title="Export all operation data"
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-upload" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleExportFiles}
          />
          <Ham2kListItem
            title="Import QSON file"
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-download" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleImportFiles}
          />
        </Ham2kListSection>
        <Ham2kListSection title={'Sync Services'}>
          <Ham2kListItem
            title="Ham2K Log Filer"
            description={settings?.extensions?.['ham2k-lofi']?.enabled ? settings?.extensions?.['ham2k-lofi']?.server : 'Disabled'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="sync-circle" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode, marginLeft: 0 }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={() => setCurrentDialog('ham2k-lofi')}
          />
          {currentDialog === 'ham2k-lofi' && (
            <SyncServiceDialog
              settings={settings}
              styles={styles}
              visible={true}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}
          <Ham2kListItem
            title="Reset Sync Status"
            description={syncStatus}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="cellphone-remove" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleResetSyncStatus}
          />
        </Ham2kListSection>
        <Ham2kListSection title={'System Information'}>
          <View style={{ paddingHorizontal: styles.oneSpace * 2 }}>
            <Ham2kMarkdown styles={{ markdown: { heading3: { ...styles.markdown.heading3, marginTop: styles.oneSpace } } }}>
              {systemInfo()}
            </Ham2kMarkdown>
          </View>
          <Ham2kListItem
            title="Share with the Development Team"
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="share" />}
            onPress={shareSystemInfo}
          />
        </Ham2kListSection>
      </ScrollView>
    </ScreenContainer>
  )
}

function systemInfo () {
  return `
### Version

* ${packageJson.version}
* Build ${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})

### System

* ${DeviceInfo.getSystemName()} ${DeviceInfo.getSystemVersion()}
* ${DeviceInfo.getManufacturerSync()} ${DeviceInfo.getDeviceId()}
*  ${DeviceInfo.getInstallerPackageNameSync()} - ${DeviceInfo.getInstallReferrerSync()}

### Resources

* ${fmtGigabytes(DeviceInfo.getTotalMemorySync())} RAM - ${fmtMegabytes(DeviceInfo.getUsedMemorySync())} used
* ${fmtGigabytes(DeviceInfo.getTotalDiskCapacitySync())} storage - ${fmtGigabytes(DeviceInfo.getFreeDiskStorageSync())} free
${DeviceInfo.isKeyboardConnectedSync() ? '* Keyboard connected\n' : ''}
  `
}

async function syncCountDescription () {
  const result = await dbSelectAll('SELECT COUNT(*) as count, synced FROM qsos WHERE operation != "historical" GROUP BY synced')
  const counts = result.reduce((acc, row) => {
    acc[row.synced ? 'synced' : 'unsynced'] = row.count
    return acc
  }, {})
  return `${fmtNumber(counts.synced || 0)} synced, ${fmtNumber(counts.unsynced || 0)} unsynced`
}
