/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { findRef, replaceRef } from '../../../tools/refTools'
import { H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput, H2kDropDown } from '../../../ui'

import { Info } from './FDExtension'

export function FDActivityOptions ({ styles, operation, settings, refs: allRefs, setRefs }) {
  const { t } = useTranslation()

  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const handleChange = useCallback((value) => {
    if (value?.class) value.class = value.class.toUpperCase()
    if (value?.location) value.location = value.location.toUpperCase()
    if (value?.transmitterPower) value.transmitterPower = value.transmitterPower.toUpperCase()
    if (value?.powerSource) value.powerSource = value.powerSource.toUpperCase()

    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, ...value }))
  }, [activityRef, allRefs, setRefs])

  const handleTransmitterPowerChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, transmitterPower: value }))
  }, [activityRef, allRefs, setRefs])

  const handlePowerSourceChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, powerSource: value }))
  }, [activityRef, allRefs, setRefs])

  return (
    <>
      <H2kListSection title={t('extensions.fd.activityOptions.exchangeInformation', 'Exchange Information')}>
        <H2kListRow>
          <H2kTextInput
            style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
            textStyle={styles.text.callsign}
            label={t('extensions.fd.activityOptions.classLabel', 'Class')}
            mode={'flat'}
            uppercase={true}
            noSpaces={true}
            value={activityRef?.class || ''}
            onChangeText={(text) => handleChange({ class: text })}
          />
        </H2kListRow>
        <H2kListRow>
          <H2kTextInput
            style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
            textStyle={styles.text.callsign}
            label={t('extensions.fd.activityOptions.locationLabel', 'Location')}
            mode={'flat'}
            uppercase={true}
            noSpaces={true}
            value={activityRef?.location || ''}
            onChangeText={(text) => handleChange({ location: text })}
          />
        </H2kListRow>
        <H2kListRow style={{ marginTop: styles.oneSpace * 4 }}>
          <H2kMarkdown>{t('extensions.fd.activityOptions.information-md',
`
  Class for ARRL Field Day is, for example \`2A\`:

  - \`1\`, \`2\`, \`3\`… for the number of transmitters.
  - \`A\` for Group (3 or more) Portable Station
  - \`B\` for One or two person Portable Station
  - \`C\` for Mobile Station
  - \`D\` for Home Station
  - \`E\` for Home Station on Emergency Power
  - \`F\` for Emergency Operation Center

  Location is the ARRL Section, RAC Section, \`MX\` for Mexico, or \`DX\` for anywhere else.

  More info in the **[official rules](https://www.arrl.org/field-day-rules)**.
            `)}</H2kMarkdown>
        </H2kListRow>
      </H2kListSection>
      <H2kListSection title={t('extensions.fd.activityOptions.additionalInformation', 'Additional Information')}>
        <H2kListRow style={{ maxWidth: styles.oneSpace * 80 }}>
          <H2kDropDown
            label={t('extensions.fd.activityOptions.highestTransmitterPowerLabel', 'Highest Transmitter Power')}
            value={activityRef?.transmitterPower}
            placeholder={t('extensions.fd.activityOptions.highestTransmitterPowerPlaceholder', '100W')}
            onChangeText={handleTransmitterPowerChange}
            options={[
              { label: t('extensions.fd.activityOptions.qrpOption', 'QRP: 5W or less'), value: '5W' },
              { label: t('extensions.fd.activityOptions.qroOption', 'QRO: 100W or less'), value: '100W' },
              { label: t('extensions.fd.activityOptions.moreThan100WOption', 'More than 100W'), value: '500W' }
            ]}
          />

        </H2kListRow>
        <H2kListRow style={{ maxWidth: styles.oneSpace * 80 }}>
          <H2kDropDown
            label={t('extensions.fd.activityOptions.powerSourceLabel', 'Power Source')}
            value={activityRef?.powerSource}
            placeholder={t('extensions.fd.activityOptions.powerSourcePlaceholder', 'Select a power source')}
            onChangeText={handlePowerSourceChange}
            options={[
              { label: t('extensions.fd.activityOptions.batteriesOption', 'Batteries, Solar, Wind'), value: 'BATTERIES' },
              { label: t('extensions.fd.activityOptions.commercialPowerOption', 'Commercial Power, Generator'), value: 'GENERATOR' }
            ]}
          />
        </H2kListRow>
      </H2kListSection>
    </>
  )
}
