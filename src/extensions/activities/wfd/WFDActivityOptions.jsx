/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { findRef, replaceRef } from '../../../tools/refTools'
import { Info } from './WFDExtension'
import { H2kListItem, H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput } from '../../../ui'
import { Text } from 'react-native-paper'

export function WFDActivityOptions ({ styles, operation, settings, refs: allRefs, setRefs }) {
  const { t } = useTranslation()

  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const objectives = useMemo(() => {
    return {
      objAltPower: {
        title: t('extensions.wfd.objectiveName.altPower', 'Alternative Power'),
        description: t('extensions.wfd.objectiveDescription.altPower', 'Operate 100% on alternative power, such as batteries, solar, wind, etc.'),
        multiplier: 1
      },
      objAwayFromHome: {
        title: t('extensions.wfd.objectiveName.awayFromHome', 'Operate Away From Home'),
        description: t('extensions.wfd.objectiveDescription.awayFromHome', 'Set up your field station at least ½ mile away from home.'),
        multiplier: 3
      },
      objMultipleAntennas: {
        title: t('extensions.wfd.objectiveName.multipleAntennas', 'Multiple Antennas'),
        description: t('extensions.wfd.objectiveDescription.multipleAntennas', 'Deploy at least two antennas, and make at least one contact on each.'),
        multiplier: 1
      },
      objFMSatelliteContact: {
        title: t('extensions.wfd.objectiveName.fmSatelliteContact', 'FM Satellite Contact'),
        description: t('extensions.wfd.objectiveDescription.fmSatelliteContact', 'Make at least 1 FM satellite contact during the operating period.'),
        multiplier: 2
      },
      objSSBSatelliteContact: {
        title: t('extensions.wfd.objectiveName.ssbSatelliteContact', 'SSB or CW Satellite Contact'),
        description: t('extensions.wfd.objectiveDescription.ssbSatelliteContact', 'Make at least one contact using SSB or CW.'),
        multiplier: 3
      },
      objWinlinkEmails: {
        title: t('extensions.wfd.objectiveName.winlinkEmails', 'Winlink Emails'),
        description: t('extensions.wfd.objectiveDescription.winlinkEmails', 'Send AND receive at least one email from using Winlink over RF.'),
        multiplier: 1
      },
      objSpecialBulletin: {
        title: t('extensions.wfd.objectiveName.specialBulletin', 'Special Bulletin'),
        description: t('extensions.wfd.objectiveDescription.specialBulletin', 'Accurately copy the WFD Special Bulletin message and submit your copy with your log submission.'),
        multiplier: 1
      },
      objSixBands: {
        title: t('extensions.wfd.objectiveName.sixBands', 'Six Bands'),
        description: t('extensions.wfd.objectiveDescription.sixBands', 'Make at least three contacts on each of at least six different bands.'),
        multiplier: 6
      },
      objTwelveBands: {
        title: t('extensions.wfd.objectiveName.twelveBands', 'Twelve Bands'),
        description: t('extensions.wfd.objectiveDescription.twelveBands', 'Make at least three contacts on each of at least twelve different bands.'),
        multiplier: 6
      },
      objMultipleModes: {
        title: t('extensions.wfd.objectiveName.multipleModes', 'Multiple Modes'),
        description: t('extensions.wfd.objectiveDescription.multipleModes', 'Use multiple modes during the operating period.'),
        multiplier: 2
      },
      objQRPOperation: {
        title: t('extensions.wfd.objectiveName.qrpOperation', 'QRP Operation'),
        description: t('extensions.wfd.objectiveDescription.qrpOperation', 'Operate on QRP power levels (10W or less on Phone, 5W or less on CW or Digital).'),
        multiplier: 4
      },
      objSixContinuousHours: {
        title: t('extensions.wfd.objectiveName.sixContinuousHours', 'Six Continuous Hours'),
        description: t('extensions.wfd.objectiveDescription.sixContinuousHours', 'Operate for at least six continuous hours during the operating period.'),
        multiplier: 2
      }
    }
  }, [t])

  const handleChange = useCallback((value) => {
    if (value?.class) value.class = value.class.toUpperCase()
    if (value?.location) value.location = value.location.toUpperCase()

    const updatedRef = { ...activityRef, ...value }
    const objectiveCount = Object.entries(objectives).reduce((acc, [key, objective]) => {
      return acc + (updatedRef[key] ? 1 : 0)
    }, 0)
    const objectiveMultiplier = Object.entries(objectives).reduce((acc, [key, objective]) => {
      return acc + (updatedRef[key] ? objective.multiplier : 0)
    }, 0)

    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, ...value, objectiveCount, objectiveMultiplier }))
  }, [setRefs, allRefs, activityRef, objectives])

  return (
    <>
      <H2kListSection title={t('extensions.wfd.activityOptions.exchangeInformation', 'Exchange Information')}>
        <H2kListRow>
          <H2kTextInput
            style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
            textStyle={styles.text.callsign}
            label={t('extensions.wfd.activityOptions.classLabel', 'Class')}
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
            label={t('extensions.wfd.activityOptions.locationLabel', 'Location')}
            mode={'flat'}
            uppercase={true}
            noSpaces={true}
            value={activityRef?.location || ''}
            onChangeText={(text) => handleChange({ location: text })}
          />
        </H2kListRow>
        <H2kListRow style={{ marginTop: styles.oneSpace * 4 }}>
          <H2kMarkdown>{t('extensions.wfd.activityOptions.information-md',
`
  Class for Winter Field Day is, for example \`2M\`:

  - \`1\`, \`2\`, \`3\`… for the number of transmitters.
  - \`H\` for Home Station
  - \`I\` for Indoors
  - \`O\` for Outdoors
  - \`M\` for Mobile or Mobile Stationary

  Location is the ARRL Section, RAC Section, \`MX\` for Mexico, or \`DX\` for anywhere else.

  More info in the **[official rules](https://www.winterfieldday.com/sop.php)**.
            `)}</H2kMarkdown>
        </H2kListRow>

      </H2kListSection>
      <H2kListSection title={t('extensions.wfd.activityOptions.objectives', 'Objectives: {{count}} achieved, OM ×{{multiplier}}', { count: activityRef.objectiveCount || 0, multiplier: activityRef.objectiveMultiplier })}>
        <H2kListRow>
          <Text style={{ fontSize: styles.smallFontSize, marginHorizontal: styles.oneSpace }}>{t('extensions.wfd.activityOptions.objectivesDescription', 'Remember to also report these objectives when submitting your log!')}</Text>
        </H2kListRow>
        {Object.entries(objectives).map(([key, objective]) => (
          <H2kListItem
            key={key}
            title={t('extensions.wfd.activityOptions.objectiveTitle', '{{title}} (OM ×{{multiplier}})', { title: objective.title, multiplier: objective.multiplier })}
            description={objective.description}
            rightSwitchValue={activityRef[key]}
            rightSwitchOnValueChange={(value) => handleChange({ [key]: value })}
            onPress={() => handleChange({ [key]: !activityRef[key] })}
          />
        ))}
      </H2kListSection>
    </>
  )
}
