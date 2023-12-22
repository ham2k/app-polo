/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useState } from 'react'

import { ScrollView } from 'react-native'
import { List } from 'react-native-paper'

import Share from 'react-native-share'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { deleteADIF, generateADIF, selectOperation } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { StationCallsignDialog } from './components/StationCallsignDialog'
import { POTADialog } from './components/POTADialog'
import { DeleteOperationDialog } from './components/DeleteOperationDialog'
import { AddActivityDialog } from './components/AddActivityDialog'
import { WWFFDialog } from './components/WWFFDialog'
import { SOTADialog } from './components/SOTADialog'
import { BOTADialog } from './components/BOTADialog'
import { FDDialog } from './components/FDDialog'
import { WFDDialog } from './components/WFDDialog'

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

  return (
    <ScrollView style={{ flex: 1 }}>
      <List.Section>
        <List.Subheader>Operation Details</List.Subheader>

        <List.Item
          title="Station Callsign"
          description={operation.stationCall || `${settings.operatorCall} (operator)` }
          left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="card-account-details" />}
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
      </List.Section>

      <List.Section>
        <List.Subheader>Activities</List.Subheader>

        {operation.pota !== undefined && (
          <>
            <List.Item
              title="Parks On The Air"
              description={operation.pota || 'Enter POTA references'}
              left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="tree" />}
              onPress={() => setCurrentDialog('pota')}
            />
            {currentDialog === 'pota' && (
              <POTADialog
                settings={settings}
                operation={operation}
                styles={styles}
                visible={true}
                onDialogDone={() => setCurrentDialog('')}
              />
            )}
          </>
        )}

        {operation.wwff !== undefined && (
          <>
            <List.Item
              title="World Wide Flora & Fauna"
              description={operation.wwff || 'Enter WWFF reference'}
              left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="flower" />}
              onPress={() => setCurrentDialog('wwff')}
            />
            {currentDialog === 'wwff' && (
              <WWFFDialog
                settings={settings}
                operation={operation}
                styles={styles}
                visible={true}
                onDialogDone={() => setCurrentDialog('')}
              />
            )}
          </>
        )}

        {operation.sota !== undefined && (
          <>
            <List.Item
              title="Summits On The Air"
              description={operation.sota || 'Enter SOTA reference'}
              left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="image-filter-hdr" />}
              onPress={() => setCurrentDialog('sota')}
            />
            {currentDialog === 'sota' && (
              <SOTADialog
                settings={settings}
                operation={operation}
                styles={styles}
                visible={true}
                onDialogDone={() => setCurrentDialog('')}
              />
            )}
          </>
        )}

        {operation.bota !== undefined && (
          <>
            <List.Item
              title="Beaches On The Air"
              description={operation.sota || 'Enter BOTA reference & exchange'}
              left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="umbrella-beach" />}
              onPress={() => setCurrentDialog('bota')}
            />
            {currentDialog === 'bota' && (
              <BOTADialog
                settings={settings}
                operation={operation}
                styles={styles}
                visible={true}
                onDialogDone={() => setCurrentDialog('')}
              />
            )}
          </>
        )}

        {operation.fd !== undefined && (
          <>
            <List.Item
              title="Field Day"
              description={operation.fd || 'Enter Field Day exchange'}
              left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="weather-sunny" />}
              onPress={() => setCurrentDialog('fd')}
            />
            {currentDialog === 'fd' && (
              <FDDialog
                settings={settings}
                operation={operation}
                styles={styles}
                visible={true}
                onDialogDone={() => setCurrentDialog('')}
              />
            )}
          </>
        )}

        {operation.wfd !== undefined && (
          <>
            <List.Item
              title="Winter Field Day"
              description={operation.wfd || 'Enter Winter Field Day exchange'}
              left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="snowflake" />}
              onPress={() => setCurrentDialog('wfd')}
            />
            {currentDialog === 'wfd' && (
              <WFDDialog
                settings={settings}
                operation={operation}
                styles={styles}
                visible={true}
                onDialogDone={() => setCurrentDialog('')}
              />
            )}
          </>
        )}

        <List.Item
          title="Add Activity"
          description="POTA, SOTA, Field Day and more!"
          left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="plus" />}
          onPress={() => setCurrentDialog('addActivity')}
        />
        {currentDialog === 'addActivity' && (
          <AddActivityDialog
            settings={settings}
            operation={operation}
            styles={styles}
            visible={true}
            onDialogDone={() => setCurrentDialog('')}
          />
        )}
      </List.Section>

      <List.Section>
        <List.Subheader>Operation Data</List.Subheader>
        <List.Item
          title="Export ADIF"
          left={() => <List.Icon style={{ marginLeft: styles.twoSpaces }} icon="share" />}
          onPress={handleExport}
        />
      </List.Section>
      <List.Section>
        <List.Subheader style={{ color: styles.theme.colors.error }}>The Danger Zone</List.Subheader>
        <List.Item
          title="Delete Operation"
          titleStyle={{ color: styles.theme.colors.error }}
          left={() => <List.Icon color={styles.theme.colors.error} style={{ marginLeft: styles.twoSpaces }} icon="delete" />}
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
