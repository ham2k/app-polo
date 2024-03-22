/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useState } from 'react'
import { List, Switch } from 'react-native-paper'
import { ScrollView } from 'react-native'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { selectSettings, setSettings } from '../../../store/settings'
import { FlagsDialog } from '../components/FlagsDialog'

export default function LoggingSettingsScreen ({ navigation }) {
  const dispatch = useDispatch()

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

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  const SwitchSentRcvdIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="arrow-left-right" />
  ), [styles])

  const ToggleSwitchSentRcvd = useCallback(() => (
    <Switch value={!!settings.switchSentRcvd} onValueChange={(value) => dispatch(setSettings({ switchSentRcvd: value })) } />
  ), [dispatch, settings.switchSentRcvd])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Item title={'Country Flags'}
            description={{ none: "Don't show any flags", all: 'Show flags for all contacts' }[settings.dxFlags] || 'Show only for DX contacts'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="flag" />}
            onPress={() => setCurrentDialog('flags')}
          />
          {currentDialog === 'flags' && (
            <FlagsDialog
              settings={settings}
              styles={styles}
              visible={true}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}
          <List.Item title={'State Field'}
            description={settings.showStateField ? 'Include State field in main exchange' : "Don't include State field" }
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="select-marker" />}
            right={() => <Switch value={!!settings.showStateField} onValueChange={(value) => dispatch(setSettings({ showStateField: value })) } />}
            onPress={() => dispatch(setSettings({ showStateField: !settings.showStateField }))}
          />

          <List.Item
            title="Show numbers row"
            description={settings.showNumbersRow ? 'Quick buttons for numbers' : "Don't show numbers row"}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="numeric" />}
            right={() => <Switch value={!!settings.showNumbersRow} onValueChange={(value) => dispatch(setSettings({ showNumbersRow: value })) } />}
            onPress={() => dispatch(setSettings({ showNumbersRow: !settings.showNumbersRow }))}
          />

          <List.Item
            title="Switch signal report order"
            description={!settings.switchSentRcvd ? 'Sent first, Rcvd second' : 'Rcvd first, Sent second'}
            left={SwitchSentRcvdIcon}
            right={ToggleSwitchSentRcvd}
            onPress={() => dispatch(setSettings({ switchSentRcvd: !settings.switchSentRcvd }))}
          />

          <List.Item
            title="Keep device awake"
            description={settings.keepDeviceAwake ? 'Prevent device from locking screen' : 'Allow regular screen locking'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="coffee" />}
            right={() => <Switch value={!!settings.keepDeviceAwake} onValueChange={(value) => dispatch(setSettings({ keepDeviceAwake: value })) } />}
            onPress={() => dispatch(setSettings({ keepDeviceAwake: !settings.keepDeviceAwake }))}
          />
        </List.Section>
      </ScrollView>
    </ScreenContainer>
  )
}

// ))}
