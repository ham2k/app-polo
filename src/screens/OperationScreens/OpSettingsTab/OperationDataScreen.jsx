// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Alert, Platform, ScrollView, View } from 'react-native'
import { Checkbox, Menu, Text } from 'react-native-paper'
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, saveDocuments } from '@react-native-documents/picker'
import RNFetchBlob from 'react-native-blob-util'
import Share from 'react-native-share'
import UUID from 'react-native-uuid'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

import { dataExportOptions, generateExportsForOptions, importADIFIntoOperation, loadOperation, selectOperation, selectOperationCallInfo } from '../../../store/operations'
import { loadQSOs, selectQSOs } from '../../../store/qsos'
import { selectLocalExtensionData } from '../../../store/local'
import { selectSettings, setSettings } from '../../../store/settings'
import { selectSystemFlag, setSystemFlag } from '../../../store/system'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { ExportComponentsForDistribution, FileStashDialogForDistribution, reportError, trackEvent } from '../../../distro'
import { H2kButton, H2kIconButton, H2kListItem, H2kListSection } from '../../../ui'
import { findHooks } from '../../../extensions/registry'

import ScreenContainer from '../../components/ScreenContainer'
import { ExportWavelogDialog } from './components/ExportWavelogDialog'
import { ExportOptionsInfoDialog } from './components/ExportOptionsInfoDialog'
import { StashSentDialog } from './components/StashSentDialog'
import { buildTitleForOperation } from '../OperationScreen'

const isLikelyCanceledSavePickError = (err) =>
  isErrorWithCode(err) &&
  (err.code === errorCodes.OPERATION_CANCELED ||
    /** Android save-picker dismiss often rejects with INVALID_DATA_RETURNED ("Data from document picker is null"). */
    err.code === 'INVALID_DATA_RETURNED')

export default function OperationDataScreen (props) {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const { navigation, route } = props
  const styles = useThemedStyles()

  const operationSelector = useCallback((state) => selectOperation(state, route.params.operation), [route.params.operation])
  const operation = useSelector(operationSelector)

  const qsosSelector = useCallback((state) => selectQSOs(state, operation?.uuid), [operation?.uuid])
  const qsos = useSelector(qsosSelector)

  const ourInfoSelector = useCallback((state) => selectOperationCallInfo(state, operation?.uuid), [operation?.uuid])
  const ourInfo = useSelector(ourInfoSelector)

  const settings = useSelector(selectSettings)

  const lofiDataSelector = useCallback((state) => selectLocalExtensionData(state, 'ham2k-lofi'), [])
  const lofiData = useSelector(lofiDataSelector)
  const isFreeLofiAccount = !lofiData?.subscription?.id

  const hasSeenFileStashInfoSelector = useCallback((state) => selectSystemFlag(state, 'viewedFileStashInfoOn'), [])
  const hasSeenFileStashInfo = useSelector(hasSeenFileStashInfoSelector)

  useEffect(() => { // When starting, make sure all operation data is loaded
    dispatch(loadQSOs(route.params.operation))
    dispatch(loadOperation(route.params.operation))
  }, [route.params.operation, dispatch])
  const [showExportWavelog, setShowExportWavelog] = useState(false)
  const [showStashInfoDialog, setShowStashInfoDialog] = useState(false)
  const [showExportOptionsInfo, setShowExportOptionsInfo] = useState(false)
  const [isStashing, setIsStashing] = useState(false)
  const [stashedFilesLabel, setStashedFilesLabel] = useState(null)
  const [exportCompleted, setExportCompleted] = useState(false)

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

  const handleExports = useCallback(({ options, disposition = 'share' }) => {
    const destination = disposition === 'save' ? 'save_documents' : 'share'
    options.forEach((option) => {
      trackEvent('operation_exported', {
        destination,
        export_type: [option.exportType ?? option.handler.key, option.format].join('.'),
        qso_count: operation.qsoCount,
        duration_minutes: Math.round((operation.startAtMillisMax - operation.startAtMillisMin) / (1000 * 60)),
        refs: (option.operationData?.refs || []).map(r => r.type).join(',')
      })
    })
    console.log(`handle exports (${disposition})`, options)
    const useDataURIs = false
    dispatch(generateExportsForOptions(operation.uuid, options, { dataURI: useDataURIs }))
      .then(async (exports) => {
        console.log('generated exports', exports)
        if (!exports?.length) return

        if (disposition === 'save') {
          let savedAll = true
          for (const e of exports) {
            try {
              const responses = await saveDocuments({
                sourceUris: [e.uri],
                mimeType: e.type ?? 'text/plain',
                fileName: e.fileName
              })
              const res = responses[0]
              if (res?.error) {
                Alert.alert(
                  t('screens.operationData.errorSavingExport', "Couldn't save file"),
                  res.error
                )
                reportError('Error saving export', new Error(res.error))
                savedAll = false
                break
              }
            } catch (err) {
              if (isLikelyCanceledSavePickError(err)) {
                savedAll = false
                break
              }
              console.info('Saving export Error', err)
              reportError('Error saving export', err instanceof Error ? err : new Error(String(err)))
              const message = typeof err?.message === 'string' ? err.message : ''
              Alert.alert(t('screens.operationData.errorSavingExport', "Couldn't save file"), message)
              savedAll = false
              break
            }
          }
          if (savedAll) setExportCompleted(true)
          return
        }

        const shareOptions =
          exports.length === 1
            ? {
                url: exports[0].uri,
                type: exports[0].type ?? 'text/plain',
                showAppsToView: true
              }
            : {
                urls: exports.map((exportItem) => exportItem.uri),
                type: 'text/plain',
                showAppsToView: true
              }
        if (useDataURIs) {
          if (exports.length === 1) {
            shareOptions.filename = exports[0].fileName
          } else {
            shareOptions.filenames = exports.map((exportItem) => exportItem.fileName)
          }
        }

        console.log('share options', shareOptions)
        Share.open({ ...shareOptions, failOnCancel: false })
          .then((x) => {
            console.info('Shared', x)
            // With `failOnCancel: false` a dismissed share sheet also resolves, so only
            // count it as an export when the user actually picked a destination
            if (!x?.dismissedAction) setExportCompleted(true)
          })
          .catch((shareErr) => {
            if (shareErr?.message?.includes('user canceled')) {
              // ignore
            } else {
              console.info('Sharing Error', shareErr)
            }
          })
      })
      .catch((error) => {
        console.error('Error generating exports', error)
        reportError('Error generating exports', error)
      })
  }, [dispatch, operation, t])

  const handleStashExport = useCallback(async (options) => {
    const confirmAsync = (title, message, confirmLabel) => new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: t('general.buttons.cancel', 'Cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, onPress: () => resolve(true) }
      ])
    })

    let finalOptions = options

    if (isFreeLofiAccount && options.length > 1) {
      const firstFileName = options[0].fileName
      const proceed = await confirmAsync(
        t('screens.operationData.freeTierOneFileTitle', 'Free accounts can only send one file at a time'),
        t('screens.operationData.freeTierOneFileMessage', 'Do you want to send just "{{fileName}}"?', { fileName: firstFileName }),
        t('screens.operationData.freeTierOneFileConfirm', 'Send {{fileName}}', { fileName: firstFileName })
      )
      if (!proceed) return
      finalOptions = [options[0]]
    }

    const syncHook = findHooks('sync')[0]

    if (isFreeLofiAccount) {
      const recent = await dispatch(syncHook.getStashFiles({ limit: 5, offset: 0 }))
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000
      const recentUndownloaded = recent?.ok && (recent.json?.stash_files || []).find(
        (f) => new Date(f.created_at).getTime() > sixHoursAgo && f.status !== 'downloaded'
      )
      if (recentUndownloaded) {
        const proceed = await confirmAsync(
          t('screens.operationData.freeTierRecentUploadTitle', 'Recent upload will be replaced'),
          t('screens.operationData.freeTierRecentUploadMessage', 'You uploaded "{{fileName}}" less than 6 hours ago and it has not been downloaded yet. Sending this file will replace it. Do you want to wait instead?', { fileName: recentUndownloaded.filename }),
          t('screens.operationData.freeTierRecentUploadConfirm', 'Send Anyway')
        )
        if (!proceed) return
      }
    }

    finalOptions.forEach((option) => {
      trackEvent('operation_exported', {
        destination: 'log_stash',
        export_type: [option.exportType ?? option.handler.key, option.format].join('.'),
        qso_count: operation.qsoCount,
        duration_minutes: Math.round((operation.startAtMillisMax - operation.startAtMillisMin) / (1000 * 60)),
        refs: (option.operationData?.refs || []).map(r => r.type).join(',')
      })
    })

    setIsStashing(true)
    try {
      const groupUuid = UUID.v4()
      const groupTitle = buildTitleForOperation({ operatorCall: operation.local?.operatorCall, stationCall: operation.stationCallPlus || operation.stationCall, title: operation.title, userTitle: operation.userTitle })

      const exports = await dispatch(generateExportsForOptions(operation.uuid, finalOptions, { dataURI: false }))
      if (!exports?.length) return

      const errors = []
      for (const e of exports) {
        try {
          const result = await dispatch(syncHook.uploadStashFile({ uri: e.uri, type: e.type, fileName: e.fileName, format: e.format, groupUuid, groupTitle }))
          if (!result?.ok) {
            const detail = result?.json?.stash_file_errors
              ? Object.entries(result.json.stash_file_errors).map(([field, errs]) => `${field}: ${errs.map(er => er.error).join(', ')}`).join('\n')
              : (result?.json?.error || `Error ${result?.status}`)
            errors.push(`${e.fileName}: ${detail}`)
          }
        } catch (err) {
          console.info('Log Stash upload error', err)
          errors.push(`${e.fileName}: ${err?.message || 'Unknown error'}`)
        }
      }

      if (errors.length > 0) {
        reportError('Error sending export to Log Stash', new Error(errors.join('; ')))
        Alert.alert(t('screens.operationData.errorSendingToLogStash', "Couldn't send to Ham2K's File Stash"), errors.join('\n'))
      } else {
        const filesLabel = exports.length === 1
          ? t('screens.operationData.retrieveSingularFile', 'this file')
          : t('screens.operationData.retrievePluralFiles', 'these files')

        setStashedFilesLabel(filesLabel)
      }
    } catch (error) {
      console.error('Error generating exports', error)
      reportError('Error generating exports', error)
    } finally {
      setIsStashing(false)
    }
  }, [dispatch, operation, t, isFreeLofiAccount])

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
      trackEvent('operation_imported_adif', {
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
    return t('screens.operationData.exportSelectedFiles', 'Export {{count}} selected files', { count: selectedExportOptions.length })
  }, [selectedExportOptions.length, t])

  const exportActionsEnabled = Boolean(readyToExport && selectedExportOptions.length > 0)

  const handleStashButtonPress = useCallback(() => {
    if (!exportActionsEnabled || isStashing) return
    if (isFreeLofiAccount && !hasSeenFileStashInfo) {
      dispatch(setSystemFlag('viewedFileStashInfoOn', Date.now()))
      setShowStashInfoDialog(true)
    } else {
      handleStashExport(selectedExportOptions)
    }
  }, [dispatch, exportActionsEnabled, isStashing, isFreeLofiAccount, hasSeenFileStashInfo, handleStashExport, selectedExportOptions])

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
          <H2kListSection title={exportLabel}>

            {pendingTodos.length > 0 && (
              <H2kListItem
                title={t('screens.operationData.pendingToDoItems', '{{count}} pending to-do items', { count: pendingTodos.length })}
                leftIcon="sticker"
                titleStyle={{ color: styles.theme.colors.error }}
                leftIconColor={styles.theme.colors.error}
                onPress={handleNavigateToLoggingTab}
              />
            )}

            <StashSentDialog
              visible={!!stashedFilesLabel}
              filesLabel={stashedFilesLabel}
              isFreeAccount={isFreeLofiAccount}
              onDismiss={({ subscribed } = {}) => {
                setStashedFilesLabel(null)
                if (!subscribed) setExportCompleted(true)
              }}
            />
            <FileStashDialogForDistribution
              visible={showStashInfoDialog}
              onDismiss={({ subscribed }) => {
                setShowStashInfoDialog(false)
                if (!subscribed) handleStashExport(selectedExportOptions)
              }}
            />
            <ExportOptionsInfoDialog
              visible={showExportOptionsInfo}
              onDismiss={() => setShowExportOptionsInfo(false)}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingHorizontal: styles.oneSpace * 2,
                paddingVertical: styles.halfSpace * 1
              }}
            >
              <H2kIconButton
                icon="information-outline"
                onPress={() => setShowExportOptionsInfo(true)}
                accessibilityRole="button"
                accessibilityLabel={t('screens.operationData.exportOptionsInfoLabel', 'About the export options')}
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: styles.oneSpace * 2,
                  opacity: readyToExport ? 1 : 0.5
                }}
              >
                <H2kButton
                  mode="elevated"
                  icon="cloud-upload-outline"
                  compact
                  loading={isStashing}
                  disabled={!exportActionsEnabled || isStashing}
                  onPress={handleStashButtonPress}
                  accessibilityRole="button"
                  accessibilityLabel={t('screens.operationData.exportActionsLogStash', "Send to Ham2K's File Stash")}
                >
                  {t('screens.operationData.exportActionsStash', 'Stash')}
                </H2kButton>

                {Platform.OS === 'android' ? (
                  <>
                    <H2kButton
                      mode="elevated"
                      icon="share"
                      compact
                      disabled={!exportActionsEnabled}
                      onPress={() => exportActionsEnabled && handleExports({ options: selectedExportOptions, disposition: 'share' })}
                      accessibilityRole="button"
                      accessibilityLabel={t('screens.operationData.exportActionsShare', 'Share')}
                    >
                      {t('screens.operationData.exportActionsShare', 'Share')}
                    </H2kButton>
                    <H2kButton
                      mode="elevated"
                      icon="content-save"
                      compact
                      disabled={!exportActionsEnabled}
                      onPress={() => exportActionsEnabled && handleExports({ options: selectedExportOptions, disposition: 'save' })}
                      accessibilityRole="button"
                      accessibilityLabel={t('screens.operationData.exportActionsSave', 'Save')}
                    >
                      {t('screens.operationData.exportActionsSave', 'Save')}
                    </H2kButton>
                  </>
                ) : (
                  <H2kButton
                    mode="elevated"
                    icon="share"
                    compact
                    disabled={!exportActionsEnabled}
                    onPress={() => readyToExport && handleExports({ options: selectedExportOptions, disposition: 'share' })}
                    accessibilityRole="button"
                    accessibilityLabel={t('screens.operationData.exportActionsShare', 'Share')}
                  >
                    {t('screens.operationData.exportActionsExport', 'Export')}
                  </H2kButton>
                )}
              </View>
            </View>
            {exportOptions.map((option) => (
              <View key={`${option.exportType}-${option.fileName}`} style={{ flexDirection: 'row', width: '100%', marginLeft: styles.oneSpace * 1, alignItems: 'flex-start' }}>
                <View style={{ marginTop: styles.oneSpace * 1, marginRight: styles.oneSpace * -1.5 }}>
                  <Checkbox.Android
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
                  onPress={() => readyToExport && handleExports({ options: [option], disposition: 'share' })}
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
        <ExportComponentsForDistribution
          operation={operation}
          exportCompleted={exportCompleted}
          onDismiss={() => setExportCompleted(false)}
        />
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
