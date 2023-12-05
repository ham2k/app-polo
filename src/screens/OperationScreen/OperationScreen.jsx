import React, { useEffect } from 'react'

import {
  Text,
  View
} from 'react-native'
import { Chip, IconButton } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { useDispatch, useSelector } from 'react-redux'
import { loadOperation, selectOperationInfo, selectOperationQSOs } from '../../store/operations'
import QSOItem from './components/QSOItem'
import LoggerInput from './components/LoggerInput'
import LoggerChip from './components/LoggerChip'

export default function OperationScreen ({ navigation, route }) {
  const styles = useThemedStyles((baseStyles) => {
    return {
      ...baseStyles,
      input: {
        backgroundColor: baseStyles.theme.colors.background,
        color: baseStyles.theme.colors.onBackground,
        paddingHorizontal: baseStyles.oneSpace
      }
    }
  })

  const dispatch = useDispatch()
  const operation = useSelector(selectOperationInfo(route.params.operation.uuid))
  const qsos = useSelector(selectOperationQSOs(route.params.operation.uuid))

  useEffect(() => {
    navigation.setOptions({ title: operation?.call, subTitle: operation?.name })
  }, [navigation, operation])

  useEffect(() => {
    dispatch(loadOperation(route.params.operation.uuid))
  }, [route.params.operation.uuid, dispatch])

  return (
    <ScreenContainer>
      <View style={{ flex: 0, width: '100%', flexDirection: 'column', backgroundColor: styles.theme.colors.secondaryContainer }}>
        <View style={{ paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.halfSpace, flexDirection: 'row', flexWrap: 'wrap', gap: styles.halfSpace }}>
          <LoggerChip icon="pine-tree" baseColor="secondary">POTA K-1233</LoggerChip>
          <LoggerChip icon="radio" baseColor="secondary">7.325 MHz • CW • 20W</LoggerChip>
        </View>
      </View>
      <View style={[styles.listContainer, { flex: 1 }]}>
        {qsos.length > 0 ? (
          qsos.map((qso, index) => (
            <QSOItem qso={qso} key={qso.uuid} styles={styles} />
          )
          )
        ) : (
          <Text>No QSOs Yet!</Text>
        )}
      </View>
      <View style={{ flex: 0, width: '100%', flexDirection: 'column', backgroundColor: styles.theme.colors.tertiaryContainer }}>
        <View style={{ flex: 0, width: '100%', flexDirection: 'row' }}>

          <View style={{ flex: 0, flexDirection: 'column' }}>
            <View style={{ flex: 1, paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.halfSpace, flexDirection: 'row', flexWrap: 'wrap', gap: styles.halfSpace }}>
              <LoggerChip icon="calendar" baseColor="tertiary">12:33:15</LoggerChip>
              <LoggerChip icon="pine-tree" baseColor="tertiary">P2P</LoggerChip>
            </View>
            <View style={{ flex: 0, paddingHorizontal: styles.oneSpace, paddingVertical: styles.halfSpace, flexDirection: 'row', gap: styles.oneSpace }}>
              <Text>🇺🇸 USA • John J Lavelle, Jr • Wurstboro, NY</Text>
            </View>
          </View>

          <View style={{ flex: 0, paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.halfSpace }}>
            <IconButton
              icon="upload"
              size={32}
              mode="contained"
              containerColor={styles.theme.colors.tertiary}
              iconColor={styles.theme.colors.onTertiary}
            />
          </View>
        </View>
        {/* <View style={{ paddingHorizontal: styles.oneSpace, paddingVertical: styles.halfSpace, flexDirection: 'row', gap: styles.oneSpace }}>
          <LoggerInput
              baseColor="tertiary"
              style={[styles.input, { flex: 1 }]}
              value={'K-0001'}
              label="Their POTA"
          />
          <LoggerInput
              baseColor="tertiary"
              style={[styles.input, { flex: 1 }]}
              value={'7.325'}
              label="Frequency"
          />
          <LoggerInput
              baseColor="tertiary"
              style={[styles.input, { flex: 1 }]}
              value={'20'}
              label="Power (Watts)"
          />
        </View> */}
        <View style={{ paddingHorizontal: styles.oneSpace, paddingTop: styles.halfSpace, paddingBottom: styles.oneSpace, flexDirection: 'row', gap: styles.oneSpace }}>
          <LoggerInput
              baseColor="tertiary"
              style={[styles.input, { flex: 5 }]}
              value={''}
              label="Their Call"
              placeholder=""
              uppercase={true}
            />
          <LoggerInput
              baseColor="tertiary"
              style={[styles.input, { width: styles.normalFontSize * 2.5 }]}
              value={'599'}
              label="Sent"
              placeholder="Sent"
          />
          <LoggerInput
              baseColor="tertiary"
              style={[styles.input, { width: styles.normalFontSize * 2.5 }]}
              value={'599'}
              label="Rcvd"
              placeholder="Rcvd"
          />
          <LoggerInput
              baseColor="tertiary"
              style={[styles.input, { flex: 3 }]}
              value={''}
              label="Notes"
              placeholder=""
          />
        </View>
      </View>
    </ScreenContainer>
  )
}
