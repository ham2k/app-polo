/* eslint-disable react/no-unstable-nested-components */
/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ScrollView } from 'react-native'
import { IconButton, List } from 'react-native-paper'
import DocumentPicker from 'react-native-document-picker'
import RNFetchBlob from 'react-native-blob-util'
import Share from 'react-native-share'

import { generateExport, importADIFIntoOperation, loadOperation, selectOperation, selectOperationCallInfo } from '../../../store/operations'
import { loadQSOs, selectQSOs } from '../../../store/qsos'
import { selectSettings } from '../../../store/settings'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { buildTitleForOperation } from '../OperationScreen'
import { reportError, trackEvent } from '../../../distro'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { findBestHook } from '../../../extensions/registry'
import { simpleTemplate } from '../../../tools/stringTools'
import { fmtISODate } from '../../../tools/timeFormats'

export default function OperationDataScreen (props) {
  const { navigation, route } = props
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation))
  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))
  const settings = useSelector(selectSettings)

  useEffect(() => { // When starting, make sure all operation data is loaded
    dispatch(loadQSOs(route.params.operation))
    dispatch(loadOperation(route.params.operation))
  }, [route.params.operation, dispatch])

  const qsos = useSelector(state => selectQSOs(state, route.params.operation))

  console.log('OperationDataScreen')
  useEffect(() => { console.log('-- route') }, [route])
  useEffect(() => { console.log('-- settings') }, [settings])
  useEffect(() => { console.log('-- operation') }, [operation])
  useEffect(() => { console.log('-- qsos') }, [qsos])
  useEffect(() => { console.log('-- ourInfo') }, [ourInfo])
  useEffect(() => { console.log('-- styles') }, [styles])
  useEffect(() => { console.log('-- dispatch') }, [dispatch])
  useEffect(() => { console.log('-- navigation') }, [navigation])
  useEffect(() => { console.log('-- props', Object.keys(props)) }, [props])

  useEffect(() => {
    console.log('OperationDataScreen useEffect title')
    let options = { title: 'Operation Data' }
    if (operation?.stationCall) {
      options = {
        subTitle: buildTitleForOperation({ operatorCall: operation.operatorCall, stationCall: operation.stationCall, title: operation.title, userTitle: operation.userTitle })
      }
    } else {
      options = { subTitle: 'New Operation' }
    }
    navigation.setOptions(options)
  }, [navigation, operation.operatorCall, operation.stationCall, operation.title, operation.userTitle])

  const readyToExport = useMemo(() => {
    console.log('OperationDataScreen readyToExport')
    return ourInfo.call && operation.qsoCount > 0
  }, [operation.qsoCount, ourInfo.call])

  const exportOptions = useMemo(() => {
    const exports = []

    const baseNameParts = {
      call: ourInfo.call,
      date: fmtISODate(operation.startOnMillisMax),
      compactDate: fmtISODate(operation.startOnMillisMax).replace(/-/g, ''),
      title: operation.title,
      uuid: operation.uuid,
      shortUUID: operation.uuid.split('-')[0]
    }

    const exportHandlers = (operation?.refs || []).map(ref => ({ handler: findBestHook(`ref:${ref.type}`), ref }))?.filter(x => x?.handler)
    const handlersWithOptions = exportHandlers.map(({ handler, ref }) => (
      { handler, ref, options: handler.suggestExportOptions && handler.suggestExportOptions({ operation, ref, settings }) }
    )).flat().filter(({ options }) => options)
    handlersWithOptions.forEach(({ handler, ref, options }) => {
      options.forEach(option => {
        const nameParts = { ...baseNameParts, ref: ref.ref, ...(handler.suggestOperationTitle && handler.suggestOperationTitle(ref)) }
        const baseName = simpleTemplate(option.nameTemplate || '{date} {call} {ref}', nameParts).replace(/[/\\:]/g, '-')
        let name
        let description
        if (option.format === 'adif') {
          name = `${baseName}.adi`
          description = `${handler.shortName ?? handler.name} ADIF`
        } else if (option.format === 'cabrillo') {
          name = `${baseName}.log`
          description = `${handler.shortName ?? handler.name} Cabrillo`
        } else if (option.format === 'qson') {
          name = `${baseName}.qson`
          description = `${handler.shortName ?? handler.name} QSON`
        } else if (option.format) {
          name = `${baseName}.${options.format}`
          description = `${handler.shortName ?? handler.name} ${options.format}`
        } else {
          name = `${baseName}.txt`
          description = `${handler.shortName ?? handler.name} Data`
        }
        exports.push({ handler, ref, option, name, description })
        console.log(`-- ${handler.key}`, options)
      })
    })
    if (settings.devMode) {
      exports.push({
        handler: { key: 'devmode', icon: 'briefcase-upload' },
        ref: {},
        name: simpleTemplate('{shortUUID} {date} {call} {title}.qson'.replace(/[/\\:]/g), baseNameParts),
        description: 'Developer Mode: QSON Export',
        devMode: true
      })
    }
    return exports
  }, [operation, ourInfo.call, settings])

  const handleExport = useCallback((type) => {
    trackEvent('export_operation', {
      export_type: type,
      qso_count: operation.qsoCount,
      duration_minutes: Math.round((operation.startOnMillisMax - operation.startOnMillisMin) / (1000 * 60)),
      refs: (operation.refs || []).map(r => r.type).join(',')
    })

    dispatch(generateExport(operation.uuid, type)).then((paths) => {
      if (paths?.length > 0) {
        Share.open({
          urls: paths.map(p => `file://${p}`),
          type: 'text/plain' // There is no official mime type for our files
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
    DocumentPicker.pickSingle({ mode: 'import', copyTo: 'cachesDirectory' }).then(async (file) => {
      const filename = decodeURIComponent(file.fileCopyUri.replace('file://', ''))
      const count = await dispatch(importADIFIntoOperation(filename, operation))
      trackEvent('import_adif', {
        import_count: count,
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
  }, [dispatch, operation])

  useEffect(() => { console.log('-- exportOptions') }, [exportOptions])
  useEffect(() => { console.log('-- handleImportADIF') }, [handleImportADIF])

  return (
    <ScrollView style={{ flex: 1 }}>
      <Ham2kListSection title={'Export QSOs'}>
        <Ham2kListItem
          title="Export All Files"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="share" />}
          onPress={() => readyToExport && handleExport()}
          style={{ opacity: readyToExport ? 1 : 0.5 }}
          disabled={!readyToExport}
        />
        {exportOptions.map(({ handler, name, description, devMode }) => (
          <Ham2kListItem
            title={name}
            description={description}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={handler.icon} />}
            onPress={() => readyToExport && handleExport()}
            descriptionStyle={devMode ? { color: styles.colors.devMode } : {}}
            titleStyle={devMode ? { color: styles.colors.devMode } : {}}
            style={{ opacity: readyToExport ? 1 : 0.5 }}
            disabled={!readyToExport}
          />
        ))}
      </Ham2kListSection>

      <Ham2kListSection title={'Import QSOs'}>
        <Ham2kListItem
          title="Add QSOs from ADIF file"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-import-outline" />}
          onPress={() => handleImportADIF()}
        />
      </Ham2kListSection>
    </ScrollView>
  )
}
