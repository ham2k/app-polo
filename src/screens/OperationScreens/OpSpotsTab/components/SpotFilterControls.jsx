/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { View } from 'react-native'
import { SegmentedButtons, Switch, Text } from 'react-native-paper'

import { superModeForMode } from '@ham2k/lib-operation-data'

import ThemedDropDown from '../../../components/ThemedDropDown'
import ThemedButton from '../../../components/ThemedButton'
import { LONG_LABEL_FOR_MODE } from '../OpSpotsTab'
import SpotFilterIndicators from './SpotFilterIndicators'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SpotFilterControls ({ filteredSpots, rawSpots, spotsSources, vfo, options, filterState, updateFilterState, counts, operation, onDone, refreshSpots, styles, themeColor, settings, online }) {
  return (
    <ScrollView style={{ flex: 1 }}>
      <SafeAreaView style={{ flexDirection: 'column', paddingHorizontal: 0, gap: styles.oneSpace, alignItems: 'stretch', width: '100%', maxWidth: '100%' }}>
        <SpotFilterIndicators
          options={options}
          counts={counts}
          operation={operation}
          vfo={vfo}
          styles={styles}
          themeColor={themeColor}
          settings={settings}
          online={online}
          filterState={filterState}
          onPress={() => onDone()}
        />
        <View style={{ flex: 0, maxWidth: styles.oneSpace * 35 }}>
          <ThemedButton style={{}} onPress={() => onDone()} mode="contained" themeColor={themeColor}>
            {filteredSpots.length === rawSpots?.length ? `Show ${rawSpots?.length} spots` : `Show ${filteredSpots.length} out of ${rawSpots?.length} Spots`}
          </ThemedButton>
        </View>
        <View style={{ flex: 0, flexDirection: 'column', marginTop: styles.oneSpace * 2, maxWidth: styles.oneSpace * 35, gap: styles.oneSpace, alignItems: 'stretch' }}>
          <Text style={[styles.markdown.heading2, { marginTop: styles.halfSpace, textAlign: 'center' }]}>
            Filters
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
            <ThemedDropDown
              label="Band"
              themeColor={themeColor}
              value={filterState.band || 'any'}
              onChange={(event) => updateFilterState({ band: event.nativeEvent.text })}
              fieldId={'band'}
              style={{ width: '100%' }}
              list={[
                { value: 'any', label: 'All Bands' },
                { value: 'auto', label: `Automatic (Currently ${vfo.band})` },
                ...options.band
              ]}
              dropDownContainerMaxHeight={styles.oneSpace * 40}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
            <ThemedDropDown
              label="Mode"
              value={filterState.mode || 'any'}
              onChange={(event) => updateFilterState({ mode: event.nativeEvent.text })}
              fieldId={'mode'}
              style={{ width: '100%' }}
              list={[
                { value: 'any', label: 'All Modes' },
                { value: 'auto', label: `Automatic (Currently ${LONG_LABEL_FOR_MODE[superModeForMode(vfo.mode)]})` },
                ...options.mode
              ]}
              dropDownContainerMaxHeight={styles.oneSpace * 40}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
            <ThemedDropDown
              label="Maximum Age"
              value={filterState.ageInMinutes || 0}
              onChange={(event) => updateFilterState({ ageInMinutes: Number.parseInt(event.nativeEvent.text, 10) })}
              fieldId={'age'}
              style={{ width: '100%' }}
              list={[
                { value: 0, label: 'Any age' },
                { value: 10, label: '10 minutes' },
                { value: 30, label: '30 minutes' }
              ]}
            />
          </View>
        </View>
        <View style={{ flexDirection: 'column', marginTop: styles.oneSpace * 2, maxWidth: styles.oneSpace * 35, gap: styles.oneSpace, alignItems: 'stretch' }}>
          <Text style={[styles.markdown.heading2, { marginTop: styles.halfSpace, textAlign: 'center' }]}>
            Sorting
          </Text>
          <SegmentedButtons
            value={filterState.sortBy || 'frequency' }
            onValueChange={(value) => updateFilterState({ sortBy: value })}
            buttons={[
              { value: 'time', label: 'By spot time' },
              { value: 'frequency', label: 'By frequency' }
            ]}
          />

        </View>
        <View style={{ flexDirection: 'column', marginTop: styles.oneSpace * 2, maxWidth: styles.oneSpace * 35, gap: styles.oneSpace, alignItems: 'stretch' }}>
          <Text style={[styles.markdown.heading2, { marginTop: styles.halfSpace, textAlign: 'center' }]}>
            Spot Sources
          </Text>
          {spotsSources.map(source => (
            <View key={source.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'stretch', gap: styles.oneSpace }}>
              <Switch
                value={filterState.sources?.[source.key] !== false}
                onValueChange={(value) => {
                  updateFilterState({ sources: { [source.key]: value } })
                  if (value) refreshSpots()
                }}
              />
              <Text
                style={{ fontSize: styles.normalFontSize }}
                onPress={() => {
                  updateFilterState({ sources: { [source.key]: !filterState.sources?.[source.key] } })
                  if (!filterState.sources?.[source.key]) refreshSpots()
                }}
              >
                <Text style={{ fontWeight: 'bold' }}>{source.sourceName ?? source.name}: </Text>{counts.source?.[source.key] || '0'} spots
              </Text>
            </View>
          ))}
        </View>
      </SafeAreaView>
    </ScrollView>
  )
}
