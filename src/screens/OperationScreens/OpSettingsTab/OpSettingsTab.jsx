/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useMemo, useState } from 'react'

import { ScrollView } from 'react-native'
import { List } from 'react-native-paper'

import Share from 'react-native-share'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { generateExport, selectOperation } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { StationCallsignDialog } from './components/StationCallsignDialog'
import { DeleteOperationDialog } from './components/DeleteOperationDialog'
import { LocationDialog } from './components/LocationDialog'
import { findBestHook, findHooks } from '../../../extensions/registry'
import { defaultReferenceHandlerFor } from '../../../extensions/core/references'

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

  const [currentDialog, setCurrentDialog] = useState()

  const handleExport = useCallback((type) => {
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

  const refHandlers = useMemo(() => {
    const types = [...new Set((operation?.refs || []).map((ref) => ref?.type).filter(x => x))]
    const handlers = types.map(type => (
      findBestHook(`ref:${type}`) || defaultReferenceHandlerFor(type)
    ))
    return handlers
  }, [operation?.refs])

  const activityHooks = useMemo(() => findHooks('activity'), [])

  return (
    <ScrollView style={{ flex: 1 }}>
      <List.Section title={'Operation Details'}>

        <List.Item
          title="Station Callsign"
          description={operation.stationCall || `${settings.operatorCall} (operator)` }
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="card-account-details" />}
          onPress={() => setCurrentDialog('stationCall')}
        />
        {currentDialog === 'stationCall' && (
          <StationCallsignDialog
            settings={settings}
            operation={operation}
            styles={styles}
            visible={true}
            onDialogDone={() => setCurrentDialog('')}
          />
        )}

        <List.Item
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
      </List.Section>

      <List.Section title={'Activities'}>
        {refHandlers.map((handler) => (
          <List.Item
            key={handler.key}
            title={handler.name}
            description={(handler.description && handler.description(operation)) || handler.descriptionPlaceholder}
            left={
                  () => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={handler.icon} />
                }
            onPress={() => navigation.navigate('OperationActivityOptions', { operation: operation.uuid, activity: handler.key })}
          />
        ))}
        <List.Item
          key="addActivity"
          title="Add Activity"
          disabled={activityHooks.length === 0}
          style={{ opacity: activityHooks.length === 0 ? 0.5 : 1 }}
          description={activityHooks.length > 0 ? 'POTA, SOTA, Field Day and more!' : 'First enable some activity features in the main settings screen'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="plus" />}
          onPress={() => navigation.navigate('OperationAddActivity', { operation: operation.uuid })}
        />
      </List.Section>

      <List.Section title={'Operation Data'}>
        <List.Item
          title="Export Log Files"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="share" />}
          onPress={() => handleExport()}
          style={{ opacity: !(operation.qsoCount > 0) ? 0.5 : 1 }}
          disabled={!(operation.qsoCount > 0)}
        />
        {settings.devMode && (
          <List.Item
            title="Export QSON file"
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-upload" color={styles.colors.devMode} />}
            titleStyle={{ color: styles.colors.devMode }}
            descriptionStyle={{ color: styles.colors.devMode }}
            onPress={() => handleExport('qson')}
            style={{ opacity: !(operation.qsoCount > 0) ? 0.5 : 1 }}
            disabled={!(operation.qsoCount > 0)}
          />
        )}
      </List.Section>

      <List.Section titleStyle={{ color: styles.theme.colors.error }} title={'The Danger Zone'}>
        <List.Item
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
      </List.Section>
    </ScrollView>

  )
}
