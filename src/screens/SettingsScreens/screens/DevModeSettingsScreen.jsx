/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { IconButton, List } from 'react-native-paper'
import { Alert, ScrollView, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import DocumentPicker from 'react-native-document-picker'
import RNFetchBlob from 'react-native-blob-util'
import Share from 'react-native-share'
import DeviceInfo from 'react-native-device-info'
import YAML from 'yaml'

import packageJson from '../../../../package.json'

import { DevModeSettingsForDistribution, reportError } from '../../../distro'
import { mergeSettings, selectSettings, setSettings } from '../../../store/settings'
import { importQSON, selectOperationsList } from '../../../store/operations'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { Ham2kMarkdown } from '../../components/Ham2kMarkdown'
import { ListRow } from '../../components/ListComponents'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { fmtGigabytes, fmtMegabytes } from '../../../tools/numberFormats'
import { dbSelectAll, pathForDatabase, replaceDatabase, resetDatabase } from '../../../store/db/db'
import { fmtNumber } from '@ham2k/lib-format-tools'
import GLOBAL from '../../../GLOBAL'
import { setLocalData } from '../../../store/local'
import ThemedTextInput from '../../components/ThemedTextInput'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'

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

  const handleExportDB = useCallback(async () => {
    const paths = []
    paths.push(pathForDatabase())

    console.log(paths)
    if (paths.length > 0) {
      Share.open({
        urls: paths.map(p => 'file://' + p)
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
  }, [])

  const handleImportDB = useCallback(async () => {
    DocumentPicker.pickSingle({ mode: 'import', copyTo: 'cachesDirectory' }).then(async (file) => {
      const filename = decodeURIComponent(file.fileCopyUri.replace('file://', ''))
      await replaceDatabase(filename)
      RNFetchBlob.fs.unlink(filename)
    }).catch((error) => {
      console.log(error)
      if (error.indexOf('cancelled') >= 0) {
        // ignore
      } else {
        reportError('Error importing database', error)
      }
    })
  }, [])

  const handleWipeDB = useCallback(() => {
    Alert.alert('Wipe Database?', 'Are you sure you want to delete all Operations, QSOs and other data?', [
      { text: 'No, Cancel', onPress: () => {} },
      {
        text: 'Yes, Wipe It!',
        onPress: () => {
          dispatch(setLocalData({ sync: { lastOperationSyncedAtMillis: 0, completedFullSync: false } }))
          setTimeout(async () => await resetDatabase(), 50)
        }
      }
    ])
  }, [dispatch])

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

  const downloadDevSettings = useCallback(async () => {
    if (!settings.devSettingsLocation) {
      Alert.alert('No location provided', 'Please provide a location for the dev settings')
      return
    }

    const data = await fetchAndProcessURL({
      url: settings.devSettingsLocation ?? '',
      process: async (body) => {
        if (body.startsWith('{')) {
          return JSON.parse(body)
        } else {
          return YAML.parse(body)
        }
      }
    })
    const { extensions, exports } = data
    const restrictedData = { extensions, exports }

    dispatch(mergeSettings(restrictedData))

    let msg = ''
    if (Object.keys(extensions || {}).length > 0) {
      msg += `Extensions: ${Object.keys(extensions || {}).join(', ')}\n`
    }
    if (Object.keys(exports || {}).length > 0) {
      msg += `Exports: ${Object.keys(exports || {}).join(', ')}\n`
    }
    console.log('settings loaded', { extensions, exports })
    Alert.alert('Settings Loaded', msg)
  }, [dispatch, settings])

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
        <Ham2kListSection title={'Import'}>
          <Ham2kListItem
            title="Import QSON file"
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-download" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleImportFiles}
          />
        </Ham2kListSection>
        <Ham2kListSection title={'Manage Database'}>
          <Ham2kListItem
            title="Export Database"
            description={'Export the current database file'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-upload" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleExportDB}
          />
          <Ham2kListItem
            title="Replace Database"
            description={'Import a new database file and replace all data'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-edit" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleImportDB}
          />
          <Ham2kListItem
            title="Wipe Database"
            description={'Delete all data from the database.'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-remove" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleWipeDB}
          />
        </Ham2kListSection>

        <Ham2kListSection title={'Download Advanced Settings'}>
          <ListRow style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <ThemedTextInput
              label="Location"
              value={settings.devSettingsLocation ?? ''}
              inputMode={'url'}
              placeholder={'https://example.com/dir/settings.yml'}
              onChangeText={(value) => dispatch(setSettings({ devSettingsLocation: value })) }
              style={{ flex: 1 }}
            />
            <IconButton icon="download" mode="contained"
              containerColor={styles.colors.devMode} iconColor={styles.colors.background}
              onPress={downloadDevSettings}
            />
          </ListRow>

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
* ${DeviceInfo.getInstallerPackageNameSync()} - ${DeviceInfo.getInstallReferrerSync()}
* Device ${GLOBAL.deviceId.slice(0, 8)}… "${GLOBAL.deviceName}"

### Resources

* ${fmtGigabytes(DeviceInfo.getTotalMemorySync())} RAM - ${fmtMegabytes(DeviceInfo.getUsedMemorySync())} used
* ${fmtGigabytes(DeviceInfo.getTotalDiskCapacitySync())} storage - ${fmtGigabytes(DeviceInfo.getFreeDiskStorageSync())} free
${DeviceInfo.isKeyboardConnectedSync() ? '* Keyboard connected\n' : ''}
  `
}
