/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Alert, ScrollView, View } from 'react-native'
import { Checkbox, Menu, Text } from 'react-native-paper'
import { pick, keepLocalCopy } from '@react-native-documents/picker'
import RNFetchBlob from 'react-native-blob-util'
import Share from 'react-native-share'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

import { dataExportOptions, generateExportsForOptions, importADIFIntoOperation, loadOperation, selectOperation, selectOperationCallInfo } from '../../../store/operations'
import { loadQSOs, selectQSOs } from '../../../store/qsos'
import { selectSettings, setSettings } from '../../../store/settings'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { reportError, trackEvent } from '../../../distro'
import { H2kListItem, H2kListSection } from '../../../ui'

import ScreenContainer from '../../components/ScreenContainer'
import { ExportWavelogDialog } from './components/ExportWavelogDialog'
import { buildTitleForOperation } from '../OperationScreen'

export default function OperationDataScreen (props) {
  const { t } = useTranslation()

  const { navigation, route } = props
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation))
  const qsos = useSelector(state => selectQSOs(state, operation?.uuid))
  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))
  const settings = useSelector(selectSettings)

  useEffect(() => { // When starting, make sure all operation data is loaded
    dispatch(loadQSOs(route.params.operation))
    dispatch(loadOperation(route.params.operation))
  }, [route.params.operation, dispatch])
  const [showExportWavelog, setShowExportWavelog] = useState(false)

  useEffect(() => {
    let options = { title: t('screens.operationData.title', 'Operation Data') }
    if (operation?.stationCall) {
      options = {
        subTitle: buildTitleForOperation({ operatorCall: operation.local?.operatorCall, stationCall: operation.stationCallPlus || operation.stationCall, title: operation.title, userTitle: operation.userTitle })
      }
    } else {
      options = { subTitle: t('general.terms.newOperation', 'New Operation') }
    }
    options.rightMenuItems = <DataScreenMenuItems {...{ operation, settings, styles, dispatch }} />

    navigation.setOptions(options)
  }, [dispatch, navigation, operation, settings, styles, t])

  const pendingTodos = useMemo(() => {
    return qsos.filter((qso) => !qso?.deleted && qso?.event?.event === 'todo' && !(qso.event?.data?.done ?? qso.event?.done))
  }, [qsos])

  const readyToExport = useMemo(() => {
    return ourInfo.call && operation.qsoCount > 0
  }, [operation.qsoCount, ourInfo.call])

  const exportOptions = useMemo(() => {
    if (operation.stationCallPlusArray && operation.stationCallPlusArray.length > 0) {
      const ourInfos = [ourInfo]
      ourInfos.push(...operation.stationCallPlusArray.map(call => {
        let info = parseCallsign(call)
        info = annotateFromCountryFile(info)
        if (info.entityPrefix) {
          info = { ...info, ...DXCC_BY_PREFIX[info?.entityPrefix] }
        }
        return info
      }))
      return ourInfos.map(info => {
        const operationClone = { ...operation, stationCall: info?.call || operation.stationCall || settings.operatorCall, operatorCall: info?.call }
        return dataExportOptions({ operation: operationClone, qsos, settings, ourInfo: info })
      }).flat()
    } else {
      return dataExportOptions({ operation, qsos, settings, ourInfo })
    }
  }, [operation, ourInfo, qsos, settings])

  const handleExports = useCallback(({ options }) => {
    options.forEach((option) => {
      trackEvent('export_operation', {
        export_type: [option.exportType ?? option.handler.key, option.format].join('.'),
        qso_count: operation.qsoCount,
        duration_minutes: Math.round((operation.startAtMillisMax - operation.startAtMillisMin) / (1000 * 60)),
        refs: (option.operationData?.refs || []).map(r => r.type).join(',')
      })
    })
    console.log('handle exports', options)
    const useDataURIs = false
    dispatch(generateExportsForOptions(operation.uuid, options, { dataURI: useDataURIs })).then((exports) => {
      console.log('generated exports', exports)
      if (exports?.length > 0) {
        const shareOptions = {
          urls: exports.map(e => e.uri),
          mimeType: 'text/plain',
          showAppsToView: true
        }
        if (useDataURIs) {
          shareOptions.filenames = exports.map(e => e.fileName)
        }

        console.log('share options', shareOptions)
        Share.open(shareOptions).then((x) => {
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
    }).catch((error) => {
      console.error('Error generating exports', error)
      reportError('Error generating exports', error)
    })
  }, [dispatch, operation])

  const handleImportADIF = useCallback(() => {
    pick({ mode: 'import' }).then(async (files) => {
      const [localCopy] = await keepLocalCopy({
        files: files.map(file => ({
          uri: file.uri,
          fileName: file.name ?? 'fallbackName'
        })),
        destination: 'cachesDirectory'
      })

      const filename = decodeURIComponent(localCopy?.localUri?.replace('file://', ''))
      const { adifCount, importCount } = await dispatch(importADIFIntoOperation(filename, operation, qsos))
      trackEvent('import_adif', {
        import_count: importCount,
        adif_count: adifCount,
        qso_count: operation.qsoCount,
        refs: (operation.refs || []).map(r => r.type).join(',')
      })
      RNFetchBlob.fs.unlink(filename)
    }).catch((error) => {
      if (error?.message?.indexOf('user canceled') >= 0) {
        // ignore
      } else {
        Alert.alert(t('screens.operationData.errorImportingADIF', 'Error importing ADIF'), error.message)
        reportError('Error importing ADIF', error)
      }
    })
  }, [dispatch, operation, qsos, t])

  const selectedExportOptions = useMemo(() => exportOptions.filter(option => (settings.exportTypes?.[option.exportType] ?? option.selectedByDefault) !== false), [exportOptions, settings.exportTypes])

  const exportLabel = useMemo(() => {
    if (selectedExportOptions.length === 0) return t('screens.operationData.selectFromTheExportOptionsBelow', 'Select from the export options below')
    if (exportOptions.length === 1) return t('screens.operationData.exportSingeFile', 'Export one file')
    if (selectedExportOptions.length === exportOptions.length) return t('screens.operationData.exportAllFiles', `Export all ${selectedExportOptions.length} files`)
    return t('screens.operationData.exportSelectedFiles', 'Export {{count}} selected files', { count: selectedExportOptions.length })
  }, [exportOptions.length, selectedExportOptions.length, t])

  const handleNavigateToLoggingTab = useCallback(() => {
    // Passing `selectedUUID` in `params` so that it makes it to the `OpLog` tab if it is present
    // but also passing it directly so that it makes it to the main screen in split view.
    navigation.popTo('Operation', {
      uuid: operation.uuid,
      screen: 'OpLog',
      params: { selectedUUID: pendingTodos?.[0]?.uuid },
      selectedUUID: pendingTodos?.[0]?.uuid
    })
  }, [navigation, operation.uuid, pendingTodos])

  return (
    <ScreenContainer>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}>
          <H2kListSection title={t('screens.operationData.exportQSOs', 'Export QSOs')}>

            {pendingTodos.length > 0 && (
              <H2kListItem
                title={t('screens.operationData.pendingToDoItems', '{{count}} pending to-do items', { count: pendingTodos.length })}
                leftIcon="sticker"
                titleStyle={{ color: styles.theme.colors.error }}
                leftIconColor={styles.theme.colors.error}
                onPress={handleNavigateToLoggingTab}
              />
            )}

            <H2kListItem
              title={exportLabel}
              leftIcon="share"
              onPress={() => readyToExport && handleExports({ options: selectedExportOptions })}
              style={{ opacity: readyToExport ? 1 : 0.5 }}
              disabled={!readyToExport}
            />
            {exportOptions.map((option) => (
              <View key={`${option.exportType}-${option.fileName}`} style={{ flexDirection: 'row', width: '100%', marginLeft: styles.oneSpace * 1, alignItems: 'flex-start' }}>
                <View style={{ marginTop: styles.oneSpace * 1 }}>
                  <Checkbox
                    status={(settings.exportTypes?.[option.exportType] ?? option.selectedByDefault) !== false ? 'checked' : 'unchecked'}
                    onPress={() => dispatch(setSettings({ exportTypes: { ...settings.exportTypes, [option.exportType]: !((settings.exportTypes?.[option.exportType] ?? option.selectedByDefault) !== false) } }))}
                  />
                </View>
                <H2kListItem
                  key={option.fileName}
                  title={option.exportLabel || option.exportName}
                  description={option.fileName}
                  leftIcon={option.icon ?? option.handler.icon ?? 'file-outline'}
                  leftIconColor={option.devMode ? styles.colors.devMode : styles.colors.onBackground}
                  onPress={() => readyToExport && handleExports({ options: [option] })}
                  descriptionStyle={option.devMode ? { color: styles.colors.devMode } : {}}
                  titleStyle={option.devMode ? { color: styles.colors.devMode } : {}}
                  style={{ opacity: readyToExport ? 1 : 0.5, flex: 1 }}
                  disabled={!readyToExport}
                />
              </View>
            ))}
          </H2kListSection>

          <H2kListSection title={t('screens.operationData.importQSOs', 'Import QSOs')}>
            <H2kListItem
              title={t('screens.operationData.addQSOsFromADIFFile', 'Add QSOs from ADIF file')}
              leftIcon="file-import-outline"
              onPress={() => handleImportADIF()}
            />
          </H2kListSection>

          { settings.devMode && (

            <H2kListSection title={t('screens.operationData.ham2kLoFiSync', 'Ham2K LoFi Sync')} titleStyle={{ color: styles.colors.devMode }}>
              <H2kListItem
                title={t('screens.operationData.operation', 'Operation')}
                description={operation.uuid}
                leftIcon="sync-circle"
                leftIconColor={styles.colors.devMode}
                titleStyle={{ color: styles.colors.devMode }}
                descriptionStyle={{ color: styles.colors.devMode }}
                onPress={() => {}}
              />
            </H2kListSection>
          )}
          { settings.wavelogExperiments && (
            <H2kListSection title={t('screens.operationData.wavelogExport', 'Wavelog Export')} titleStyle={{ color: styles.colors.devMode }}>
              <H2kListItem
                title={t('screens.operationData.exportQSOsToWavelog', 'Export QSOs to Wavelog')}
                description={t('screens.operationData.exportQSOsToWavelogDescription', 'Send all QSOs for this operation to Wavelog')}
                leftIcon="cloud-upload-outline"
                leftIconColor={styles.colors.devMode}
                onPress={() => setShowExportWavelog(true)}
                titleStyle={{ color: styles.colors.devMode }}
                descriptionStyle={{ color: styles.colors.devMode }}
              />
            </H2kListSection>

          )}
          { showExportWavelog && (
            <ExportWavelogDialog
              operation={operation}
              qsos={qsos || []}
              visible={showExportWavelog}
              onDialogDone={() => setShowExportWavelog(false)}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenContainer>
  )
}

function DataScreenMenuItems ({ operation, settings, styles, dispatch, online, setShowMenu }) {
  const { t } = useTranslation()

  const hideAndRun = useCallback((action) => {
    setShowMenu(false)
    setTimeout(() => action(), 10)
  }, [setShowMenu])

  return (
    <>
      <Text style={{ marginHorizontal: styles.oneSpace * 2, marginVertical: styles.oneSpace * 1, ...styles.text.bold }}>
        {t('screens.operationData.exportSettings', 'Export Settings')}
      </Text>
      <Menu.Item
        leadingIcon="file-code-outline"
        trailingIcon={settings.useCompactFileNames ? 'check-circle-outline' : 'circle-outline'}
        onPress={() => { hideAndRun(() => dispatch(setSettings({ useCompactFileNames: !settings.useCompactFileNames }))) }}
        title={t('screens.operationData.useCompactFileNames', 'Use compact file names')}
      />
    </>
  )
}
