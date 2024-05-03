/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { List } from 'react-native-paper'
import { ScrollView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import DocumentPicker from 'react-native-document-picker'
import RNFetchBlob from 'react-native-blob-util'
import Share from 'react-native-share'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { loadQSOs } from '../../../store/qsos'
import { selectSettings } from '../../../store/settings'
import { generateExport, importQSON, selectOperationsList } from '../../../store/operations'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'

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
      console.info('File', file)
      await dispatch(importQSON(file.fileCopyUri))

      RNFetchBlob.fs.unlink(file.fileCopyUri)
    }).catch((error) => {
      if (error.indexOf('cancelled') >= 0) {
        // ignore
      } else {
        reportError('Error importing QSON', error)
      }
    })
  }, [dispatch])

  if (!settings.devMode) return

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
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
      </ScrollView>
    </ScreenContainer>
  )
}
