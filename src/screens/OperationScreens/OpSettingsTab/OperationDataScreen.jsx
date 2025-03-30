/* eslint-disable react/no-unstable-nested-components */
/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ScrollView, View } from 'react-native'
import { Checkbox, List, Menu, Text } from 'react-native-paper'
import { pick, keepLocalCopy } from '@react-native-documents/picker'
import RNFetchBlob from 'react-native-blob-util'
import Share from 'react-native-share'

import { dataExportOptions, generateExportsForOptions, importADIFIntoOperation, loadOperation, selectOperation, selectOperationCallInfo } from '../../../store/operations'
import { loadQSOs, selectQSOs } from '../../../store/qsos'
import { selectSettings, setSettings } from '../../../store/settings'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { buildTitleForOperation } from '../OperationScreen'
import { reportError, trackEvent } from '../../../distro'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

export default function OperationDataScreen (props) {
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

  useEffect(() => {
    let options = { title: 'Operation Data' }
    if (operation?.stationCall) {
      options = {
        subTitle: buildTitleForOperation({ operatorCall: operation.local?.operatorCall, stationCall: operation.stationCallPlus || operation.stationCall, title: operation.title, userTitle: operation.userTitle })
      }
    } else {
      options = { subTitle: 'New Operation' }
    }
    options.rightMenuItems = <DataScreenMenuItems {...{ operation, settings, styles, dispatch }} />

    navigation.setOptions(options)
  }, [dispatch, navigation, operation, settings, styles])

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
    dispatch(generateExportsForOptions(operation.uuid, options)).then((paths) => {
      if (paths?.length > 0) {
        Share.open({
          urls: paths.map(p => `file://${p}`)
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


      const filename = decodeURIComponent(localCopy.localUri.replace('file://', ''))
      const { adifCount, importCount } = await dispatch(importADIFIntoOperation(filename, operation, qsos))
      trackEvent('import_adif', {
        import_count: importCount,
        adif_count: adifCount,
        qso_count: operation.qsoCount,
        refs: (operation.refs || []).map(r => r.type).join(',')
      })
      RNFetchBlob.fs.unlink(filename)
    }).catch((error) => {
      if (error.indexOf('cancelled') >= 0) {
        // ignore
      } else {
        reportError('Error importing ADIF', error)
      }
    })
  }, [dispatch, operation, qsos])

  const selectedExportOptions = useMemo(() => exportOptions.filter(option => (settings.exportTypes?.[option.exportType] ?? option.selectedByDefault) !== false), [exportOptions, settings.exportTypes])

  const exportLabel = useMemo(() => {
    if (selectedExportOptions.length === 0) return 'Select from the export options below'
    if (selectedExportOptions.length === 1 && exportOptions.length === 1) return 'Export 1 file'
    if (selectedExportOptions.length === 1) return 'Export 1 selected file'
    if (selectedExportOptions.length === exportOptions.length) return `Export all ${selectedExportOptions.length} files`
    return `Export ${selectedExportOptions.length} selected files`
  }, [exportOptions.length, selectedExportOptions.length])

  return (
    <ScrollView style={{ flex: 1 }}>
      <Ham2kListSection title={'Export QSOs'}>
        <Ham2kListItem
          title={exportLabel}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="share" />}
          onPress={() => readyToExport && handleExports({ options: selectedExportOptions })}
          style={{ opacity: readyToExport ? 1 : 0.5 }}
          disabled={!readyToExport}
        />
        {exportOptions.map((option) => (
          <View key={`${option.exportType}-${option.fileName}`} style={{ flexDirection: 'row', width: '100%', marginLeft: styles.oneSpace * 1, alignItems: 'center' }}>
            <Checkbox
              status={(settings.exportTypes?.[option.exportType] ?? option.selectedByDefault) !== false ? 'checked' : 'unchecked'}
              onPress={() => dispatch(setSettings({ exportTypes: { ...settings.exportTypes, [option.exportType]: !((settings.exportTypes?.[option.exportType] ?? option.selectedByDefault) !== false) } }))}
            />
            <Ham2kListItem
              key={option.fileName}
              title={option.exportLabel || option.exportName}
              description={option.fileName}
              left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} color={option.devMode ? styles.colors.devMode : styles.colors.onBackground} icon={option.icon ?? option.handler.icon ?? 'file-outline'} />}
              onPress={() => readyToExport && handleExports({ options: [option] })}
              descriptionStyle={option.devMode ? { color: styles.colors.devMode } : {}}
              titleStyle={option.devMode ? { color: styles.colors.devMode } : {}}
              style={{ opacity: readyToExport ? 1 : 0.5, flex: 1 }}
              disabled={!readyToExport}
            />
          </View>
        ))}
      </Ham2kListSection>

      <Ham2kListSection title={'Import QSOs'}>
        <Ham2kListItem
          title="Add QSOs from ADIF file"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-import-outline" />}
          onPress={() => handleImportADIF()}
        />
      </Ham2kListSection>

      { settings.devMode && (

        <Ham2kListSection title={'Ham2K LoFi Sync'} titleStyle={{ color: styles.colors.devMode }}>
          <Ham2kListItem
            title="Operation"
            description={operation.uuid}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="sync-circle" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={() => {}}
          />
        </Ham2kListSection>
      )}
    </ScrollView>
  )
}

function DataScreenMenuItems ({ operation, settings, styles, dispatch, online, setShowMenu }) {
  const hideAndRun = useCallback((action) => {
    setShowMenu(false)
    setTimeout(() => action(), 10)
  }, [setShowMenu])

  return (
    <>
      <Text style={{ marginHorizontal: styles.oneSpace * 2, marginVertical: styles.oneSpace * 1, ...styles.text.bold }}>
        Export Settings
      </Text>
      <Menu.Item
        leadingIcon="file-code-outline"
        trailingIcon={settings.useCompactFileNames ? 'check-circle-outline' : 'circle-outline'}
        onPress={() => { hideAndRun(() => dispatch(setSettings({ useCompactFileNames: !settings.useCompactFileNames }))) }}
        title={'Use compact file names'}

      />
    </>
  )
}
