/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { Fragment, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Text } from 'react-native-paper'

import { findRef, replaceRef } from '@ham2k/lib-qson-tools'

import { H2kDropDown, H2kListItem, H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput } from '../../../ui'

import { Info } from './FDExtension'

export function FDActivityOptions ({ styles, operation, settings, refs: allRefs, setRefs }) {
  const { t } = useTranslation()

  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const { transmitters, classification } = useMemo(() => {
    if (!activityRef?.class) return { transmitters: 0, classification: '' }

    const str = activityRef?.class || ''

    let num = Number.parseInt(str, 10)
    if (isNaN(num)) num = 0

    let c = str.slice(str.length - 1).toUpperCase()
    if (c !== 'A' && c !== 'B' && c !== 'C' && c !== 'D' && c !== 'E' && c !== 'F') c = ''

    return { transmitters: num, classification: c }
  }, [activityRef?.class])

  const bonuses = useMemo(() => {
    return _bonusesForRef({ activityRef, classification, transmitters, t })
  }, [activityRef, classification, transmitters, t])

  const handleChange = useCallback((value) => {
    if (value?.class) value.class = value.class.toUpperCase()
    if (value?.location) value.location = value.location.toUpperCase()
    if (value?.transmitterPower) value.transmitterPower = value.transmitterPower.toUpperCase()
    if (value?.powerSource) value.powerSource = value.powerSource.toUpperCase()

    const updatedRef = { ...activityRef, ...value }
    const updatedBonuses = _bonusesForRef({ activityRef: updatedRef, classification, transmitters, t })
    const bonusCount = Object.entries(updatedBonuses).reduce((acc, [key, bonus]) => {
      return acc + ((bonus.achieved || updatedRef[key]) ? 1 : 0)
    }, 0)
    const bonusPoints = Object.entries(updatedBonuses).reduce((acc, [key, bonus]) => {
      return acc + ((bonus.achieved || updatedRef[key]) ? bonus.points : 0)
    }, 0)

    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, ...value, bonusCount, bonusPoints }))
  }, [activityRef, allRefs, classification, transmitters, t, setRefs])

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
            uppercase={true}
            error={activityRef?.class && (transmitters === 0 || classification === '')}
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
      <H2kListSection title={t('extensions.fd.activityOptions.bonusesTitle', 'Bonus Points: {{count}} claimed, {{points}} pts', { count: activityRef.bonusCount || 0, points: activityRef.bonusPoints || 0 })}>
        <H2kListRow>
          <Text style={{ fontSize: styles.smallFontSize, marginHorizontal: styles.oneSpace }}>{t('extensions.fd.activityOptions.bonusesDescription', 'Remember to also report these bonus points when submitting your log!')}</Text>
        </H2kListRow>
        {Object.entries(bonuses).map(([key, bonus]) => (
          bonus.countInput ? (
            <Fragment key={key}>
              <H2kListItem
                title={t('extensions.fd.activityOptions.bonusTitle', '{{title}} ({{points}} pts)', { title: bonus.title, points: bonus.points })}
                description={bonus.description}
                rightSwitchValue={isNaN(activityRef[key]) ? false : (activityRef[key] > 0)}
                rightSwitchDisabled={true}
              />
              <H2kTextInput
                key={key}
                label={bonus.countTitle}
                value={isNaN(activityRef[key]) ? '' : activityRef[key]}
                onChangeText={(text) => handleChange({ [key]: Number.parseInt(text, 10) })}
                style={{ marginHorizontal: styles.oneSpace * 4, marginBottom: styles.oneSpace * 2 }}
              />
            </Fragment>
          ) : (
            <H2kListItem
              key={key}
              title={t('extensions.fd.activityOptions.bonusTitle', '{{title}} ({{points}} pts)', { title: bonus.title, points: bonus.points })}
              description={bonus.description}
              rightSwitchValue={bonus.achieved !== undefined ? bonus.achieved : activityRef[key]}
              rightSwitchDisabled={bonus.achieved !== undefined}
              rightSwitchOnValueChange={bonus.achieved !== undefined ? undefined : (value) => handleChange({ [key]: value })}
              onPress={bonus.achieved !== undefined ? undefined : () => handleChange({ [key]: !activityRef[key] })}
            />
          )
        ))}
      </H2kListSection>
    </>
  )
}

function _bonusesForRef ({ activityRef, classification, transmitters, t }) {
  const list = {
    bonusTransmitters: {
      title: t('extensions.fd.bonusName.transmitters', 'Transmitters'),
      description: t('extensions.fd.bonusDescription.transmitters', '100 points per transmitter (max 20), not counting GOTA or VHF.'),
      achieved: transmitters > 0,
      points: Math.min(transmitters || 0, 20) * 100
    },
    bonusEmergencyPower: {
      title: t('extensions.fd.bonusName.emergencyPower', '100% Emergency Power'),
      description: t('extensions.fd.bonusDescription.emergencyPower', '100 points per transmitter (max 20) if all contacts use emergency power.'),
      points: Math.min(transmitters || 0, 20) * 100
    },
    bonusMediaPublicity: {
      title: t('extensions.fd.bonusName.mediaPublicity', 'Media Publicity'),
      description: t('extensions.fd.bonusDescription.mediaPublicity', 'Obtain publicity from local media. Submit a copy with your entry.'),
      points: 100
    },
    bonusPublicLocation: {
      title: t('extensions.fd.bonusName.publicLocation', 'Public Location'),
      description: t('extensions.fd.bonusDescription.publicLocation', 'Locate the operation in a public place such as a park, school, or shopping center (Class A, B or F only).'),
      points: 100
    },
    bonusInformationTable: {
      title: t('extensions.fd.bonusName.informationTable', 'Public Information Table'),
      description: t('extensions.fd.bonusDescription.informationTable', 'Operate a public information table at the Field Day site (Class A, B or F only).'),
      points: 100
    },
    bonusMessageToSM: {
      title: t('extensions.fd.bonusName.messageToSM', 'Message to ARRL SM/SEC'),
      description: t('extensions.fd.bonusDescription.messageToSM', 'Originate a formal message to your ARRL Section Manager or Section Emergency Coordinator.'),
      points: 100
    },
    bonusNTSMessages: {
      title: t('extensions.fd.bonusName.ntsMessages', 'Message Handling'),
      description: t('extensions.fd.bonusDescription.ntsMessages', '10 points per NTS or ICS-213 messages (max 10) handled during the operating period.'),
      countInput: true,
      countTitle: t('extensions.fd.bonusName.ntsMessagesCount', 'Number of messages handled'),
      points: Math.min(activityRef.bonusNTSMessages || 0, 10) * 10
    },
    bonusSatelliteQSO: {
      title: t('extensions.fd.bonusName.satelliteQSO', 'Satellite QSO'),
      description: t('extensions.fd.bonusDescription.satelliteQSO', 'Complete at least one QSO via an amateur radio satellite (Class A, B or F only).'),
      points: 100
    },
    bonusAlternatePowerQSOs: {
      title: t('extensions.fd.bonusName.alternatePowerQSOs', 'Alternate Power QSOs'),
      description: t('extensions.fd.bonusDescription.alternatePowerQSOs', 'Complete at least one QSO using alternate power generation, such as solar, wind or water (Class A, B, E or F only).'),
      points: 100
    },
    bonusW1AWMessage: {
      title: t('extensions.fd.bonusName.w1awMessage', 'W1AW Field Day Message'),
      description: t('extensions.fd.bonusDescription.w1awMessage', 'Accurately copy the special Field Day bulletin transmitted by W1AW or K6KPH.'),
      points: 100
    },
    bonusElectedOfficialVisit: {
      title: t('extensions.fd.bonusName.electedOfficialVisit', 'Elected Official Visit'),
      description: t('extensions.fd.bonusDescription.electedOfficialVisit', 'Host a visit from an invited elected government official.'),
      points: 100
    },
    bonusAgencyOfficialVisit: {
      title: t('extensions.fd.bonusName.agencyOfficialVisit', 'Served Agency Official Visit'),
      description: t('extensions.fd.bonusDescription.agencyOfficialVisit', 'Host a visit from an invited served agency official.'),
      points: 100
    },
    bonusEducationalActivity: {
      title: t('extensions.fd.bonusName.educationalActivity', 'Educational Activity'),
      description: t('extensions.fd.bonusDescription.educationalActivity', 'Conduct a formal educational activity with a written lesson plan.'),
      points: 100
    },
    bonusYouthElement: {
      title: t('extensions.fd.bonusName.youthElement', 'Youth Element'),
      description: t('extensions.fd.bonusDescription.youthElement', 'Include youth participants in the operation.'),
      points: 100
    },
    bonusSafetyOfficer: {
      title: t('extensions.fd.bonusName.safetyOfficer', 'Safety Officer'),
      description: t('extensions.fd.bonusDescription.safetyOfficer', 'Have a designated Safety Officer on site (Class A only).'),
      points: 100
    },
    bonusSiteResponsibilities: {
      title: t('extensions.fd.bonusName.siteResponsibilities', 'Site Responsibilities'),
      description: t('extensions.fd.bonusDescription.siteResponsibilities', 'Complete site responsibility requirements (Classes B, C, D, E, and F).'),
      points: 50
    },
    bonusSocialMedia: {
      title: t('extensions.fd.bonusName.socialMedia', 'Social Media'),
      description: t('extensions.fd.bonusDescription.socialMedia', 'Promote your Field Day operation on social media.'),
      points: 100
    },
    bonusGotaQSOs: {
      title: t('extensions.fd.bonusName.gotaQSOs', 'GOTA Station QSOs'),
      description: t('extensions.fd.bonusDescription.gotaQSOs', '5 points for each QSO completed at the GOTA Station.'),
      countInput: true,
      countTitle: t('extensions.fd.bonusName.gotaQSOsCount', 'Number of GOTA QSOs'),
      points: (activityRef.bonusGotaQSOs || 0) * 5
    },
    bonusGotaCoach: {
      title: t('extensions.fd.bonusName.gotaCoach', 'GOTA Coach'),
      description: t('extensions.fd.bonusDescription.gotaCoach', 'There is a GOTA Coach to assist with the operation of the GOTA Station.'),
      points: 100
    },
    bonusWebSubmission: {
      title: t('extensions.fd.bonusName.webSubmission', 'Web Submission'),
      description: t('extensions.fd.bonusDescription.webSubmission', 'Submit your entry using the web app at field-day.arrl.org.'),
      achieved: true,
      points: 50
    }
  }

  if (classification === 'D') {
    list.bonusEmergencyPower.achieved = false
  }
  if (classification !== 'A' && classification !== 'B' && classification !== 'F') {
    list.bonusPublicLocation.achieved = false
    list.bonusInformationTable.achieved = false
    list.bonusSatelliteQSO.achieved = false
  }
  if (classification !== 'A' && classification !== 'B' && classification !== 'E' && classification !== 'F') {
    list.bonusAlternatePowerQSOs.achieved = false
  }
  if (classification !== 'A' && classification !== 'D' && classification !== 'E' && classification !== 'F') {
    list.bonusEducationalActivity.achieved = false
  }
  if (classification !== 'A') {
    list.bonusSafetyOfficer.achieved = false
  }
  if (classification === 'A') {
    list.bonusSiteResponsibilities.achieved = false
  }

  return list
}
