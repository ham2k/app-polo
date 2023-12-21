import React, { useCallback, useState } from 'react'

import { View } from 'react-native'
import { Button, Dialog, Divider, Portal, Text, TextInput } from 'react-native-paper'

import Share from 'react-native-share'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import LoggerChip from '../components/LoggerChip'
import { useDispatch, useSelector } from 'react-redux'
import { deleteADIF, deleteOperation, generateADIF, selectOperation, setOperation } from '../../../store/operations'
import CallsignInput from '../../components/CallsignInput'
import POTAInput from '../../components/POTAInput'
import { selectSettings } from '../../../store/settings'

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

  const [showPOTA, setShowPOTA] = useState(false)
  const [showLocation, setShowLocation] = useState(false)

  const handleExport = useCallback(() => {
    dispatch(generateADIF(operation.uuid)).then((path) => {
      Share.open({
        url: `file://${path}`,
        type: 'text/plain' // There is no official ADIF mime type
      }).then((x) => {
        console.error('Shared', x)
      }).catch((e) => {
        console.error('Sharing Error', e)
      }).finally(() => {
        dispatch(deleteADIF(path))
      })
    })
  }, [dispatch, operation])

  const [deleteDialogVisible, setDeleteDialogVisible] = React.useState(false)

  const handleDelete = useCallback(() => {
    dispatch(deleteOperation(operation.uuid)).then(() => {
      navigation.navigate('Home')
    })
  }, [navigation, dispatch, operation])

  return (
    <View style={[{ flex: 1, height: '100%', width: '100%', flexDirection: 'column' }, styles.panel]}>

      <View style={[{ flex: 0, flexDirection: 'column' }, styles.container]}>

        <View style={[{ flexDirection: 'row' }]}>
          <CallsignInput
            style={[styles.paperInput, { flex: 3, width: 100 }]}
            value={operation.stationCall}
            label="Station Callsign"
            placeholder={`Defaults to ${settings.operatorCall}`}
            onChangeText={(text) => dispatch(setOperation({ uuid: operation.uuid, stationCall: text }))}
            textStyle={styles.nativeInput}
          />
        </View>

        <View style={[{ flexDirection: 'row' }]}>
          <TextInput
            style={[styles.paperInput, { flex: 3, width: 100 }]}
            textStyle={styles.nativeInput}
            label={'Description'}
            placeholder={'Operation Description'}
            mode={'flat'}
            value={operation.description}
            onChangeText={(text) => dispatch(setOperation({ uuid: operation.uuid, description: text }))}
          />
        </View>

      </View>

      <View style={[{ flex: 0, flexDirection: 'column' }, styles.container]}>
        <View style={[{ flexDirection: 'row' }]}>
          <LoggerChip icon="pine-tree" themeColor="secondary" selected={showPOTA} onChange={(val) => setShowPOTA(val)}>
            {operation.pota ? `POTA: ${operation.pota}` : 'Add POTA'}
          </LoggerChip>
        </View>
        {showPOTA && (
          <View style={[{ flex: 0, flexDirection: 'row' }]}>
            <POTAInput
              style={[styles.paperInput, { flex: 3, width: 100 }]}
              textStyle={styles.nativeInput}
              label={'POTA References'}
              mode={'flat'}
              value={operation.pota}
              onChangeText={(text) => dispatch(setOperation({ uuid: operation.uuid, pota: text }))}
            />
          </View>
        )}
      </View>

      <View style={[{ flex: 0, flexDirection: 'column' }, styles.container]}>
        <View style={[{ flexDirection: 'row' }]}>
          <LoggerChip icon="map-marker" themeColor="secondary" selected={showLocation} onChange={(val) => setShowLocation(val)}>
            {operation.grid ? `Location: ${operation.grid}` : 'Add Location'}
          </LoggerChip>
        </View>
        {(showLocation) && (
          <View style={[{ flex: 0, flexDirection: 'row' }]}>
            <TextInput
              style={[styles.paperInput, { flex: 3, width: 100 }]}
              textStyle={styles.nativeInput}
              label={'Grid'}
              mode={'flat'}
              value={operation.grid}
              onChangeText={(text) => dispatch(setOperation({ uuid: operation.uuid, grid: text }))}
            />
          </View>
        )}
      </View>

      <Divider bold style={{ marginHorizontal: styles.oneSpace, marginVertical: styles.oneSpace }} theme={{ theme: { colors: { outlineVariant: 'red' } } }} />

      <View style={[{ flex: 0, flexDirection: 'row', justifyContent: 'space-around' }, styles.container]}>
        <Button icon="share" mode="contained" onPress={handleExport}>Export</Button>
        <View style={{ width: styles.oneSpace * 3 }} />
        <Button icon="delete" mode="contained" onPress={() => setDeleteDialogVisible(true)}>Delete</Button>
      </View>

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Operation?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Are you sure you want to delete this operation?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDelete}>Yes, delete it!</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}
