/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { View } from 'react-native'
import { SegmentedButtons, Switch, Text } from 'react-native-paper'
import { ScrollView } from 'react-native-gesture-handler'
import { useTranslation } from 'react-i18next'

import { superModeForMode } from '@ham2k/lib-operation-data'
import { CONTINENTS } from '@ham2k/lib-dxcc-data'

import { H2kButton, H2kDropDown } from '../../../../ui'

import { LONG_LABEL_FOR_MODE } from './SpotsPanel'
import SpotFilterIndicators from './SpotFilterIndicators'
import { fmtNumber } from '@ham2k/lib-format-tools'

export default function SpotFilterControls ({ filteredSpots, spotsSources, vfo, options, filterState, updateFilterState, counts, operation, onDone, refreshSpots, styles, style, themeColor, settings, online }) {
  const { t } = useTranslation()

  const spotCountText = useMemo(() => {
    if (!counts.all) {
      return t('screens.opSpotsTab.noSpots', 'No spots')
    } else {
      return t('screens.opSpotsTab.spotsCount', '{{count}} spots', { count: counts.all, fmtCount: fmtNumber(counts.all) })
    }
  }, [counts.all, t])

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexDirection: 'column',
        alignItems: 'center',
        gap: styles.oneSpace,
        marginRight: style.paddingRight
      }}
    >
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
        <H2kButton style={{}} onPress={() => onDone()} mode="contained" themeColor={themeColor}>
          {spotCountText}
        </H2kButton>
      </View>
      <View style={{ flex: 0, flexDirection: 'column', marginTop: styles.oneSpace * 2, maxWidth: styles.oneSpace * 35, gap: styles.oneSpace, alignItems: 'stretch' }}>
        <Text style={[styles.markdown.heading2, { marginTop: styles.halfSpace, textAlign: 'center' }]}>
          {t('screens.opSpotsTab.filters', 'Filters')}
        </Text>
        <View style={{ flexDirection: 'row', width: '100%', alignItems: 'stretch' }}>
          <H2kDropDown
            label={t('screens.opSpotsTab.filtersBand', 'Band')}
            themeColor={themeColor}
            value={filterState.band || 'any'}
            style={{ width: '100%' }}
            onChange={(event) => updateFilterState({ band: event.nativeEvent.text })}
            fieldId={'band'}
            options={[
              { value: 'any', label: t('screens.opSpotsTab.filtersAllBands', 'All Bands') },
              { value: 'auto', label: t('screens.opSpotsTab.filtersBandAutomatic', 'Automatic (Currently {{band}}', { band: vfo?.band }) },
              ...options.band
            ]}
            dropDownContainerMaxHeight={styles.oneSpace * 40}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
          <H2kDropDown
            label={t('screens.opSpotsTab.filtersMode', 'Mode')}
            value={filterState.mode || 'any'}
            style={{ width: '100%' }}
            onChange={(event) => updateFilterState({ mode: event.nativeEvent.text })}
            fieldId={'mode'}
            options={[
              { value: 'any', label: t('screens.opSpotsTab.filtersAllModes', 'All Modes') },
              { value: 'auto', label: t('screens.opSpotsTab.filtersModeAutomatic', 'Automatic (Currently {{mode}}', { mode: LONG_LABEL_FOR_MODE[superModeForMode(vfo?.mode)] }) },
              ...options.mode
            ]}
            dropDownContainerMaxHeight={styles.oneSpace * 40}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
          <H2kDropDown
            label={t('screens.opSpotsTab.filtersMaximumAge', 'Maximum Age')}
            value={filterState.ageInMinutes || 0}
            style={{ width: '100%' }}
            onChange={(event) => updateFilterState({ ageInMinutes: Number.parseInt(event.nativeEvent.text, 10) })}
            fieldId={'age'}
            options={[
              { value: 0, label: t('screens.opSpotsTab.filtersAnyAge', 'Any age') },
              { value: 10, label: t('screens.opSpotsTab.filtersAge10Minutes', '10 minutes') },
              { value: 20, label: t('screens.opSpotsTab.filtersAge20Minutes', '20 minutes') },
              { value: 30, label: t('screens.opSpotsTab.filtersAge30Minutes', '30 minutes') },
              { value: 45, label: t('screens.opSpotsTab.filtersAge45Minutes', '45 minutes') },
              { value: 60, label: t('screens.opSpotsTab.filtersAge60Minutes', '60 minutes') }
            ]}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'column', marginTop: styles.oneSpace * 2, maxWidth: styles.oneSpace * 35, gap: styles.oneSpace, alignItems: 'stretch' }}>
        <Text style={[styles.markdown.heading2, { marginTop: styles.halfSpace, textAlign: 'center' }]}>
          {t('screens.opSpotsTab.filtersSorting', 'Sorting')}
        </Text>
        <SegmentedButtons
          style={{ width: '100%' }}
          value={filterState.sortBy || 'frequency' }
          onValueChange={(value) => updateFilterState({ sortBy: value })}
          buttons={[
            { value: 'time', label: t('screens.opSpotsTab.filtersSortByTime', 'By spot time') },
            { value: 'frequency', label: t('screens.opSpotsTab.filtersSortByFrequency', 'By frequency') }
          ]}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'stretch', gap: styles.oneSpace }}>
          <Text
            style={{ fontSize: styles.normalFontSize, flex: 1 }}
            onPress={() => {
              updateFilterState({ groupSpecialSpots: !filterState.groupSpecialSpots })
              refreshSpots()
            }}
          >
            {t('screens.opSpotsTab.filtersGroupSpecialSpots', 'Group Special Spots First')}
          </Text>
          <Switch
            value={filterState.groupSpecialSpots !== false}
            onValueChange={(value) => {
              updateFilterState({ groupSpecialSpots: value })
              refreshSpots()
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'stretch', gap: styles.oneSpace }}>
          <Text
            style={{ fontSize: styles.normalFontSize, flex: 1 }}
            onPress={() => {
              updateFilterState({ groupCallsWithNotes: !filterState.groupCallsWithNotes })
              refreshSpots()
            }}
          >
            {t('screens.opSpotsTab.filtersGroupCallsWithNotes', 'Group Calls with Notes')}
          </Text>
          <Switch
            value={filterState.groupCallsWithNotes}
            onValueChange={(value) => {
              updateFilterState({ groupCallsWithNotes: value })
              refreshSpots()
            }}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'column', marginTop: styles.oneSpace * 2, maxWidth: styles.oneSpace * 35, gap: styles.oneSpace, alignItems: 'stretch' }}>
        <Text style={[styles.markdown.heading2, { marginTop: styles.halfSpace, textAlign: 'center' }]}>
          {t('screens.opSpotsTab.filtersSpotSources', 'Spot Sources')}
        </Text>
        {spotsSources.map(source => (
          <View key={source.key} style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'stretch', gap: styles.oneSpace }}>
            <Text
              style={{ fontSize: styles.normalFontSize, flex: 1 }}
              onPress={() => {
                updateFilterState({ sources: { ...filterState.sources, [source.key]: !filterState.sources?.[source.key] } })
                if (!filterState.sources?.[source.key]) refreshSpots()
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>{source.sourceName ?? source.name}: </Text>{counts.source?.[source.key] || '0'} spots
            </Text>
            <Switch
              value={filterState.sources?.[source.key] !== false}
              onValueChange={(value) => {
                updateFilterState({ sources: { ...filterState.sources, [source.key]: value } })
                if (value) refreshSpots()
              }}
            />
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'column', marginBottom: style.paddingBottom, marginTop: styles.oneSpace * 2, maxWidth: styles.oneSpace * 35, gap: styles.oneSpace, alignItems: 'stretch' }}>
        <Text style={[styles.markdown.heading2, { marginTop: styles.halfSpace, textAlign: 'center' }]}>
          {t('screens.opSpotsTab.filtersFilterByContinent', 'Filter by Continent')}
        </Text>
        {Object.keys(CONTINENTS).map(continent => (
          <View key={continent} style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'stretch', gap: styles.oneSpace }}>
            <Text
              style={{ flex: 1, fontSize: styles.normalFontSize }}
              onPress={() => {
                updateFilterState({ continents: { ...filterState.continents, [continent]: !!filterState.continents?.[continent] } })
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>{t(`general.continents.${continent}`, CONTINENTS[continent] ?? continent)}: </Text>{counts.continent?.[continent] || '0'} spots
            </Text>
            <Switch
              value={filterState.continents?.[continent] !== false}
              onValueChange={(value) => {
                updateFilterState({ continents: { ...filterState.continents, [continent]: value } })
              }}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
