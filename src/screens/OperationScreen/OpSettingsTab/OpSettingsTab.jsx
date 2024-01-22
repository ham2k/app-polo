/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useMemo, useState } from 'react'

import { ScrollView } from 'react-native'
import { List } from 'react-native-paper'

import Share from 'react-native-share'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { deleteADIF, generateADIF, selectOperation } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { StationCallsignDialog } from './components/StationCallsignDialog'
import { DeleteOperationDialog } from './components/DeleteOperationDialog'
import { AddActivityDialog } from './components/AddActivityDialog'
import { refHandlers } from '../activities'
import { LocationDialog } from './components/LocationDialog'

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
  const operation = useSelector(selectOperation(route.params.operation.uuid))
  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  const handleExport = useCallback(() => {
    dispatch(generateADIF(operation.uuid)).then((path) => {
      Share.open({
        url: `file://${path}`,
        type: 'text/plain' // There is no official ADIF mime type
      }).then((x) => {
        console.info('Shared', x)
      }).catch((e) => {
        console.info('Sharing Error', e)
      }).finally(() => {
        dispatch(deleteADIF(path))
      })
    })
  }, [dispatch, operation])

  const refActivities = useMemo(() => {
    const types = [...new Set((operation?.refs || []).map((ref) => ref.type))]
    return types.map(type => refHandlers[type]).filter(x => x || x === '')
  }, [operation?.refs])

  return (
    <ScrollView style={{ flex: 1 }}>
      <List.Section>
        <List.Subheader>Operation Details</List.Subheader>

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

      <List.Section>
        <List.Subheader>Activities</List.Subheader>

        {refActivities.map((activity) => (
          <List.Item
            key={activity.key}
            title={activity.name}
            description={(activity.description && activity.description(operation)) || activity.descriptionPlaceholder}
            left={
                  () => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={activity.icon} />
                }
            onPress={() => setCurrentDialog(`activity.${activity.key}`)}
          />
        ))}
        <List.Item
          key="addActivity"
          title="Add Activity"
          description="POTA, SOTA, Field Day and more!"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="plus" />}
          onPress={() => setCurrentDialog('addActivity')}
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
      {currentDialog === 'addActivity' && (
        <AddActivityDialog
          settings={settings}
          operation={operation}
          styles={styles}
          visible={true}
          onDialogDone={() => setCurrentDialog('')}
        />
      )}

      <List.Section>
        <List.Subheader>Operation Data</List.Subheader>
        <List.Item
          title="Export ADIF"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="share" />}
          onPress={handleExport}
        />
      </List.Section>
      <List.Section>
        <List.Subheader style={{ color: styles.theme.colors.error }}>The Danger Zone</List.Subheader>
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
