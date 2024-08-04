/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useMemo, useState } from 'react'
import { ScrollView } from 'react-native'
import { List } from 'react-native-paper'

import DocumentPicker from 'react-native-document-picker'
import RNFetchBlob from 'react-native-blob-util'
import Share from 'react-native-share'

import { Ham2kMarkdown } from '../../components/Ham2kMarkdown'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { generateExport, importADIFIntoOperation, selectOperation } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { DeleteOperationDialog } from './components/DeleteOperationDialog'
import { LocationDialog } from './components/LocationDialog'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { findBestHook, findHooks } from '../../../extensions/registry'
import { defaultReferenceHandlerFor } from '../../../extensions/core/references'
import { reportError, trackOperation } from '../../../distro'
import { selectRuntimeOnline } from '../../../store/runtime'

function prepareStyles (baseStyles) {
  return {
    ...baseStyles,
    panel: {
      backgroundColor: baseStyles.theme.colors.secondaryContainer,
      borderBottomColor: baseStyles.theme.colors.secondaryLight,
      borderBottomWidth: 1
    },
    paperInput: {
      backgroundColor: baseStyles.theme.colors.surface,
      color: baseStyles.theme.colors.onSurface
    },
    nativeInput: {
      backgroundColor: baseStyles.theme.colors.surface,
      color: baseStyles.theme.colors.onSurface
    },
    container: {
      paddingHorizontal: baseStyles.oneSpace,
      paddingTop: baseStyles.oneSpace,
      paddingBottom: baseStyles.oneSpace,
      gap: baseStyles.halfSpace
    }
  }
}

export default function OpSettingsTab ({ navigation, route }) {
  const styles = useThemedStyles(prepareStyles)

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const settings = useSelector(selectSettings)
  const online = useSelector(selectRuntimeOnline)

  const [currentDialog, setCurrentDialog] = useState()

  const [stationInfo, stationInfoColor] = useMemo(() => {
    const stationCall = operation?.stationCall ?? settings?.stationCall ?? settings?.operatorCall ?? ''
    const operatorCall = operation?.operatorCall ?? settings?.operatorCall ?? ''
    if (stationCall && operatorCall && stationCall !== operatorCall) {
      return [`\`${stationCall}\` (operated by \`${operatorCall}\`)`, styles.colors.onSurface]
    } else if (stationCall) {
      return [`\`${stationCall}\``, styles.colors.onSurface]
    } else {
      return ['NO STATION CALLSIGN DEFINED', styles.colors.error]
    }
  }, [operation?.operatorCall, operation?.stationCall, settings?.operatorCall, settings?.stationCall, styles.colors])

  const handleExport = useCallback((type) => {
    if (online) trackOperation({ settings, operation, action: 'exportOperation', actionData: { type } })

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
  }, [dispatch, online, operation, settings])

  const handleImportADIF = useCallback(() => {
    DocumentPicker.pickSingle({ mode: 'import', copyTo: 'cachesDirectory' }).then(async (file) => {
      const filename = decodeURIComponent(file.fileCopyUri.replace('file://', ''))
      await dispatch(importADIFIntoOperation(filename, operation))
      RNFetchBlob.fs.unlink(filename)
    }).catch((error) => {
      if (error.indexOf('cancelled') >= 0) {
        // ignore
      } else {
        reportError('Error importing ADIF', error)
      }
    })
  }, [dispatch, operation])

  const refHandlers = useMemo(() => {
    const types = [...new Set((operation?.refs || []).map((ref) => ref?.type).filter(x => x))]
    const handlers = types.map(type => (
      findBestHook(`ref:${type}`) || defaultReferenceHandlerFor(type)
    ))
    return handlers
  }, [operation?.refs])

  const activityHooks = useMemo(() => findHooks('activity'), [])
  const opSettingsHooks = useMemo(() => findHooks('opSetting'), [])

  const readyToExport = useMemo(() => {
    return (operation.stationCall ?? settings?.operatorCall) && operation.qsoCount > 0
  }, [operation.qsoCount, operation.stationCall, settings?.operatorCall])

  return (
    <ScrollView style={{ flex: 1 }}>
      <Ham2kListSection title={'Operation Details'}>

        <Ham2kListItem
          title="Station Info"
          description={() => <Ham2kMarkdown style={{ ...styles.list.description, color: stationInfoColor }} compact={true}>{stationInfo}</Ham2kMarkdown>}
          titleStyle={{ color: stationInfoColor }}
          left={() => <List.Icon color={stationInfoColor} style={{ marginLeft: styles.oneSpace * 2 }} icon="radio-tower" />}
          onPress={() => navigation.navigate('OperationStationInfo', { operation: operation.uuid })}
        />

        <Ham2kListItem
          title="Location"
          description={operation.grid ? `Grid ${operation.grid}` : 'No location set'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="map-marker-radius" />}
          onPress={() => setCurrentDialog('location')}
        />
        {currentDialog === 'location' && (
          <LocationDialog
            settings={settings}
            operation={operation}
            styles={styles}
            visible={true}
            onDialogDone={() => setCurrentDialog('')}
          />
        )}

        {opSettingsHooks.filter(hook => hook.category === 'detail').map((hook) => (
          <hook.OpSettingItem key={hook.key} operation={operation} styles={styles} settings={settings} />
        ))}
      </Ham2kListSection>

      <Ham2kListSection title={'Activities'}>
        {refHandlers.map((handler) => (
          <Ham2kListItem
            key={handler.key}
            title={handler.name}
            description={(handler.description && handler.description(operation)) || handler.descriptionPlaceholder}
            left={
                  () => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={handler.icon} />
                }
            onPress={() => navigation.navigate('OperationActivityOptions', { operation: operation.uuid, activity: handler.key })}
          />
        ))}
        <Ham2kListItem
          key="addActivity"
          title="Add Activity"
          disabled={activityHooks.length === 0}
          style={{ opacity: activityHooks.length === 0 ? 0.5 : 1 }}
          description={activityHooks.length > 0 ? 'POTA, SOTA, Field Day and more!' : 'First enable some activity features in the main settings screen'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="plus" />}
          onPress={() => navigation.navigate('OperationAddActivity', { operation: operation.uuid })}
        />
      </Ham2kListSection>

      <Ham2kListSection title={'Operation Data'}>
        <Ham2kListItem
          title="Export Log Files"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="share" />}
          onPress={() => readyToExport && handleExport()}
          style={{ opacity: readyToExport ? 1 : 0.5 }}
          disabled={!readyToExport}
        />
      </Ham2kListSection>
      {settings.devMode && (
        <Ham2kListSection title={'Developer Options'} titleStyle={{ color: styles.colors.devMode }}>
          <Ham2kListItem
            title="Add QSOs from ADIF file"
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-import-outline" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={() => handleImportADIF()}
          />
          <Ham2kListItem
            title="Export QSON file"
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-upload" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={() => readyToExport && handleExport('qson')}
            style={{ opacity: readyToExport ? 1 : 0.5 }}
            disabled={!readyToExport}
          />
        </Ham2kListSection>
      )}

      <Ham2kListSection titleStyle={{ color: styles.theme.colors.error }} title={'The Danger Zone'}>
        <Ham2kListItem
          title="Delete Operation"
          titleStyle={{ color: styles.theme.colors.error }}
          left={() => <List.Icon color={styles.theme.colors.error} style={{ marginLeft: styles.oneSpace * 2 }} icon="delete" />}
          onPress={() => setCurrentDialog('delete')}
        />
        {currentDialog === 'delete' && (
          <DeleteOperationDialog
            settings={settings}
            operation={operation}
            styles={styles}
            visible={true}
            onDialogDone={() => setCurrentDialog('')}
          />
        )}
      </Ham2kListSection>
    </ScrollView>

  )
}
