/* eslint-disable react/no-unstable-nested-components */
import React, { useState } from 'react'
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
            title="Switch signal report order"
            description={!settings.switchSentRcvd ? 'Sent first, Rcvd second' : 'Rcvd first, Sent second'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="arrow-left-right" />}
            right={() => <Switch value={!!settings.switchSentRcvd} onValueChange={(value) => dispatch(setSettings({ switchSentRcvd: value })) } />}
            onPress={() => dispatch(setSettings({ switchSentRcvd: !settings.switchSentRcvd }))}
          />

          <List.Item
            title="Jump to next field on RST entry"
            description={settings.jumpAfterRST ? 'Jump after RST is entered' : "Don't jump automatically" }
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="redo" />}
            right={() => <Switch value={!!settings.jumpAfterRST} onValueChange={(value) => dispatch(setSettings({ jumpAfterRST: value })) } />}
            onPress={() => dispatch(setSettings({ jumpAfterRST: !settings.jumpAfterRST }))}
          />

          <List.Item
            title="Bands & Modes"
            description={[settings.bands.join(', '), settings.modes.join(', ')].join(' • ')}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="radio" />}
            onPress={() => navigation.navigate('BandModeSettings')}
          />
        </List.Section>
      </ScrollView>
    </ScreenContainer>
  )
}

// ))}
