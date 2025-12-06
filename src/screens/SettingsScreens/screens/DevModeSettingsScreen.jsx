/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { Alert, ScrollView, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { pick, keepLocalCopy } from '@react-native-documents/picker'
import RNFetchBlob from 'react-native-blob-util'
import Share from 'react-native-share'
import DeviceInfo from 'react-native-device-info'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import YAML from 'yaml'
import Config from 'react-native-config'
import { useTranslation } from 'react-i18next'

import packageJson from '../../../../package.json'
import GLOBAL from '../../../GLOBAL'

import { DevModeSettingsForDistribution, reportError } from '../../../distro'
import { refreshCrowdInTranslations } from '../../../i18n/i18n'
import { mergeSettings, selectSettings, setSettings } from '../../../store/settings'
import { importQSON, selectOperationsList } from '../../../store/operations'
import { pathForDatabase, replaceDatabase, resetDatabase } from '../../../store/db/db'
import { setLocalData } from '../../../store/local'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'
import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { fmtGigabytes, fmtMegabytes } from '../../../tools/numberFormats'
import { H2kIconButton, H2kListItem, H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput } from '../../../ui'

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

export default function DevModeSettingsScreen ({ navigation, splitView }) {
  const { t, i18n } = useTranslation()

  const styles = useThemedStyles(prepareStyles)
  const safeAreaInsets = useSafeAreaInsets()

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
        if (e.message.includes('user canceled')) {
          // Do nothing
        } else {
          console.info('Sharing Error', e)
        }
      }).finally(() => {
        // Deleting these file causes GMail on Android to fail to attach it
        // So for the time being, we're leaving them in place.
        // dispatch(deleteExport(path))
      })
    }
  }, [])

  const handleImportDB = useCallback(async () => {
    pick({ mode: 'import' }).then(async (files) => {
      const [localCopy] = await keepLocalCopy({
        files: files.map(file => ({
          uri: file.uri,
          fileName: file.name ?? 'fallbackName'
        })),
        destination: 'cachesDirectory'
      })
      const filename = decodeURIComponent(localCopy.localUri.replace('file://', ''))
      await replaceDatabase(filename)
      RNFetchBlob.fs.unlink(filename)
    }).catch((error) => {
      console.log(error)
      if (error?.message?.indexOf('user canceled') >= 0) {
        // ignore
      } else {
        reportError('Error importing database', error)
      }
    })
  }, [])

  const handleWipeDB = useCallback(() => {
    Alert.alert(t('screens.devModeSettings.wipeDatabase.title', 'Wipe Database?'), t('screens.devModeSettings.wipeDatabase.description', 'Are you sure you want to delete all Operations, QSOs and other data?'), [
      { text: t('screens.devModeSettings.wipeDatabase.noCancel', 'No, Cancel'), onPress: () => {} },
      {
        text: t('screens.devModeSettings.wipeDatabase.yesWipeIt', 'Yes, Wipe It!'),
        onPress: () => {
          dispatch(setLocalData({ sync: { lastestOperationSyncedAtMillis: 0, completedFullSync: false } }))
          setTimeout(async () => await resetDatabase(), 50)
        }
      }
    ])
  }, [dispatch, t])

  const handleImportFiles = useCallback(() => {
    pick({ mode: 'import' }).then(async (files) => {
      const [localCopy] = await keepLocalCopy({
        files: files.map(file => ({
          uri: file.uri,
          fileName: file.name ?? 'fallbackName'
        })),
        destination: 'cachesDirectory'
      })
      const filename = decodeURIComponent(localCopy.localUri.replace('file://', ''))
      await dispatch(importQSON(filename))
      RNFetchBlob.fs.unlink(filename)
    }).catch((error) => {
      if (error?.message?.indexOf('user canceled') >= 0) {
        // ignore
      } else {
        reportError('Error importing QSON', error)
      }
    })
  }, [dispatch])

  const downloadDevSettings = useCallback(async () => {
    if (!settings.devSettingsLocation) {
      Alert.alert(t('screens.devModeSettings.downloadDevSettings.noLocationProvided', 'No location provided'), t('screens.devModeSettings.downloadDevSettings.pleaseProvideLocation', 'Please provide a location for the dev settings'))
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
    Alert.alert(t('screens.devModeSettings.downloadDevSettings.settingsLoaded', 'Settings Loaded'), msg)
  }, [dispatch, settings, t])

  const shareSystemInfo = useCallback(() => {
    Share.open({
      title: t('screens.devModeSettings.shareSystemInfo.title', 'Ham2K PoLo System Information'),
      message: systemInfo(),
      email: 'help@ham2k.com'
    })
  }, [t])

  const handleRefreshCrowdInTranslations = useCallback(async () => {
    if (!Config.CROWDIN_PROJECT_ID || !settings.crowdInPersonalToken) return

    await refreshCrowdInTranslations({ all: true, i18n, settings, dispatch, token: settings.crowdInPersonalToken })
  }, [dispatch, settings, i18n])

  if (!settings.devMode) return

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <DevModeSettingsForDistribution styles={styles} dispatch={dispatch} settings={settings} operations={operations} />
        <H2kListSection title={t('screens.devModeSettings.import.title', 'Import')}>
          <H2kListItem
            title={t('screens.devModeSettings.import.importQSONFile', 'Import QSON file')}
            leftIcon={'briefcase-download'}
            leftIconColor={styles.colors.devMode}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleImportFiles}
          />
        </H2kListSection>
        <H2kListSection title={'Experiments'}>
          <H2kListItem
            title={t('screens.devModeSettings.experiments.enableWavelogExperiments', 'Enable Wavelog Experiments')}
            description={settings.wavelogExperiments ? t('screens.devModeSettings.experiments.experimentalWavelogFeaturesEnabled', 'Experimental Wavelog features are enabled') : t('screens.devModeSettings.experiments.wavelogDisabled', 'Wavelog is Disabled')}
            leftIcon={'test-tube'}
            leftIconColor={styles.colors.devMode}
            rightValue={!!settings.wavelogExperiments}
            rightOnValueChange={(value) => dispatch(setSettings({ wavelogExperiments: value }))}
            onPress={() => dispatch(setSettings({ wavelogExperiments: !settings.wavelogExperiments }))}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
          />
        </H2kListSection>
        <H2kListSection title={'Manage Database'}>
          <H2kListItem
            title={t('screens.devModeSettings.manageDatabase.exportDatabase', 'Export Database')}
            description={t('screens.devModeSettings.manageDatabase.exportDatabaseDescription', 'Export the current database file')}
            leftIcon={'briefcase-upload'}
            leftIconColor={styles.colors.devMode}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleExportDB}
          />
          <H2kListItem
            title={t('screens.devModeSettings.manageDatabase.replaceDatabase', 'Replace Database')}
            description={t('screens.devModeSettings.manageDatabase.replaceDatabaseDescription', 'Import a new database file and replace all data')}
            leftIcon={'briefcase-edit'}
            leftIconColor={styles.colors.devMode}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleImportDB}
          />
          <H2kListItem
            title={t('screens.devModeSettings.manageDatabase.wipeDatabase', 'Wipe Database')}
            description={t('screens.devModeSettings.manageDatabase.wipeDatabaseDescription', 'Delete all data from the database.')}
            leftIcon={'briefcase-remove'}
            leftIconColor={styles.colors.devMode}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleWipeDB}
          />
        </H2kListSection>

        {Config.CROWDIN_PROJECT_ID && (
          <H2kListSection title={t('screens.devModeSettings.internationalization.title', 'Internationalization')}>
            <H2kListRow style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <H2kTextInput
                label={t('screens.devModeSettings.internationalization.crowdInPersonalTokenLabel', 'CrowdIn Personal Access Token')}
                value={settings.crowdInPersonalToken ?? ''}
                keyboard={'normal'}
                secureTextEntry={true}
                placeholder={t('screens.devModeSettings.internationalization.crowdInPersonalTokenPlaceholder', 'Get one from CrowdIn\'s account settings page')}
                onChangeText={(value) => dispatch(setSettings({ crowdInPersonalToken: value }))}
                style={{ flex: 1 }}
              />
              <H2kIconButton icon="refresh" mode="contained"
                containerColor={styles.colors.devMode} iconColor={styles.colors.background}
                onPress={handleRefreshCrowdInTranslations}
              />
            </H2kListRow>
          </H2kListSection>
        )}

        <H2kListSection title={'Download Advanced Settings'}>
          <H2kListRow style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <H2kTextInput
              label={t('screens.devModeSettings.downloadAdvancedSettings.locationLabel', 'Location')}
              value={settings.devSettingsLocation ?? ''}
              inputMode={'url'}
              placeholder={t('screens.devModeSettings.downloadAdvancedSettings.locationPlaceholder', 'https://example.com/dir/settings.yml')}
              onChangeText={(value) => dispatch(setSettings({ devSettingsLocation: value })) }
              style={{ flex: 1 }}
            />
            <H2kIconButton icon="download" mode="contained"
              containerColor={styles.colors.devMode} iconColor={styles.colors.background}
              onPress={downloadDevSettings}
            />
          </H2kListRow>

        </H2kListSection>

        <H2kListSection title={t('screens.devModeSettings.systemInformation.title', 'System Information')}>
          <View style={{ paddingHorizontal: styles.oneSpace * 2 }}>
            <H2kMarkdown styles={{ markdown: { heading3: { ...styles.markdown.heading3, marginTop: styles.oneSpace } } }}>
              {systemInfo()}
            </H2kMarkdown>
          </View>
          <H2kListItem
            title={t('screens.devModeSettings.systemInformation.shareWithDevelopmentTeam', 'Share with the Development Team')}
            leftIcon={'share'}
            onPress={shareSystemInfo}
          />
        </H2kListSection>

        <View style={{ height: safeAreaInsets.bottom }} />

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
