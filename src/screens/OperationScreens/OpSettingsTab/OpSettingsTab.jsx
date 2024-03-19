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
import { findRef } from '../../../tools/refTools'
import activities, { refHandlers } from '../../../plugins/loadPlugins'

export default function OpSettingsTab ({ navigation, route }) {
  const styles = useThemedStyles((baseStyles) => {
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
  })

  const dispatch = useDispatch()
  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  const handleExport = useCallback((type, activity) => {
    dispatch(generateExport(operation.uuid, type, activity)).then((paths) => {
      if (paths?.length > 0) {
        Share.open({
          urls: paths.map(p => `file://${p}`),
          type: 'text/plain' // There is no official ADIF or Cabrillo mime type
        }).then((x) => {
          console.info('Shared', x)
        }).catch((e) => {
          console.info('Sharing Error', e)
        }).finally(() => {
          // Deleting this file causes GMail on Android to fail to attach it
          // So for the time being, we're leaving it in place.
          // dispatch(deleteExport(path))
        })
      }
    })
  }, [dispatch, operation])

  const refActivities = useMemo(() => {
    const types = [...new Set((operation?.refs || []).map((ref) => ref?.type))]
    return types.map(type => refHandlers[type]).filter(x => x || x === '')
  }, [operation?.refs])

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
        {refActivities.map((activity) => (
          <List.Item
            key={activity.key}
            title={activity.name}
            description={(activity.description && activity.description(operation)) || activity.descriptionPlaceholder}
            left={
                  () => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={activity.icon} />
                }
            onPress={() => navigation.navigate('OperationActivityOptions', { operation: operation.uuid, activity: activity.key })}
          />
        ))}
        <List.Item
          key="addActivity"
          title="Add Activity"
          description="POTA, SOTA, Field Day and more!"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="plus" />}
          onPress={() => navigation.navigate('OperationAddActivity', { operation: operation.uuid })}
        />
      </List.Section>
      {refActivities.map((activity) => (
        currentDialog === `activity.${activity.key}` && (
          <activity.SettingsDialog
            key={activity.key}
            settings={settings}
            operation={operation}
            styles={styles}
            visible={true}
            onDialogDone={() => setCurrentDialog('')}
          />
        )
      ))}

      <List.Section title={'Operation Data'}>
        <List.Item
          title="Export ADIF"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="share" />}
          onPress={() => handleExport('adif')}
          style={{ opacity: !(operation.qsoCount > 0) ? 0.5 : 1 }}
          disabled={!(operation.qsoCount > 0)}
        />
        {activities
          .filter((activity) => activity.cabrilloHeaders && findRef(operation, activity.key))
          .map((activity) => (
            <List.Item key={activity.key}
              title={`Export Cabrillo for ${activity.name}`}
              left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="share" />}
              onPress={() => handleExport('cabrillo', activity)}
            />
          ))
        }
        <List.Item
          title="Export data files"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="briefcase-upload" />}
          onPress={() => handleExport('qson')}
          style={{ opacity: !(operation.qsoCount > 0) ? 0.5 : 1 }}
          disabled={!(operation.qsoCount > 0)}
        />
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
