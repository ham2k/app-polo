/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback } from 'react'
import { List } from 'react-native-paper'
import { ScrollView } from 'react-native'
import DocumentPicker from 'react-native-document-picker'
import Share from 'react-native-share'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { selectSettings } from '../../../store/settings'
import { generateExport, importQSON, selectOperationsList } from '../../../store/operations'
import { loadQSOs } from '../../../store/qsos'

export default function DevModeSettingsScreen ({ navigation }) {
  const styles = useThemedStyles((baseStyles) => {
    return {
      ...baseStyles,
      listRow: {
        marginLeft: baseStyles.oneSpace * 2,
        marginRight: baseStyles.oneSpace * 2,
        marginBottom: baseStyles.oneSpace
      }
    }
  })

  const dispatch = useDispatch()

  const settings = useSelector(selectSettings)
  const operations = useSelector(selectOperationsList)

  const handleExportFiles = useCallback(async () => {
    let paths = []
    for (const operation of operations) {
      console.log('Exporting', operation.uuid)
      await dispatch(loadQSOs(operation.uuid))
      console.log('loaded qsos')
      const qsonPaths = await dispatch(generateExport(operation.uuid, 'qson'))
      console.log('paths', qsonPaths)
      if (qsonPaths?.length > 0) {
        paths = paths.concat(qsonPaths)
      }
    }
    console.log('Paths', paths)
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
    DocumentPicker.pickSingle().then((file) => {
      console.info('File', file)
      dispatch(importQSON(file.uri))
    })
  }, [dispatch])

  if (!settings.devMode) return

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Subheader>Data</List.Subheader>
          <List.Item
            title="Export all operation data"
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-upload" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleExportFiles}
          />
          <List.Item
            title="Import QSON file"
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-download" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={handleImportFiles}
          />
        </List.Section>
      </ScrollView>
    </ScreenContainer>
  )
}
