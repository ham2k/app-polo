import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { View } from 'react-native'
import { TextInput } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import LoggerChip from '../components/LoggerChip'
import { useDispatch, useSelector } from 'react-redux'
import { selectOperationInfo, setOperationInfo } from '../../../store/operations'
import DropDown from 'react-native-paper-dropdown'

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
  const operation = useSelector(selectOperationInfo(route.params.operation.uuid))

  const [showPOTA, setShowPOTA] = useState(false)
  const [showLocation, setShowLocation] = useState(false)

  useEffect(() => {

  }, [operation])

  return (
    <View style={[{ flex: 1, height: '100%', width: '100%', flexDirection: 'column' }, styles.panel]}>

      <View style={[{ flex: 0, flexDirection: 'column' }, styles.container]}>

        <View style={[{ flexDirection: 'row' }]}>
          <TextInput
              style={[styles.paperInput, { flex: 3, width: 100 }]}
              textStyle={styles.nativeInput}
              label={'Our Callsign'}
              mode={'flat'}
              value={operation.call}
              onChangeText={(text) => dispatch(setOperationInfo({ uuid: operation.uuid, call: text }))}
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
              onChangeText={(text) => dispatch(setOperationInfo({ uuid: operation.uuid, description: text }))}
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
            <TextInput
                style={[styles.paperInput, { flex: 3, width: 100 }]}
                textStyle={styles.nativeInput}
                label={'POTA References'}
                mode={'flat'}
                value={operation.pota}
                onChangeText={(text) => dispatch(setOperationInfo({ uuid: operation.uuid, pota: text }))}
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
                onChangeText={(text) => dispatch(setOperationInfo({ uuid: operation.uuid, grid: text }))}
              />
          </View>
        )}
      </View>
    </View>
  )
}
