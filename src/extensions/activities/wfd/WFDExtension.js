/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'

import { superModeForMode } from '@ham2k/lib-operation-data'

import { findRef, replaceRef } from '../../../tools/refTools'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'
import ThemedTextInputWithSuggestions from '../../../screens/components/ThemedTextInputWithSuggestions'

import { WFDActivityOptions } from './WFDActivityOptions'
import { ARRL_SECTIONS, RAC_SECTIONS } from '../fd/FDSections'

/*
 NOTES:

 ADIF
   <ARRL_SECT:3>ENY
   <CONTEST_ID:3>WFD
   <APP_N1MM_EXCHANGE1:2>1H

 Cabrillo
   QSO: 18072 CW 2024-01-24 0246 KI2D          1H     ENY KN2X          1H   ENY
   QSO: 18072 CW 2024-01-24 0246 KI2D          1H     ENY WC3W          2H   NFL

 */

export const Info = {
  key: 'wfd',
  icon: 'snowflake',
  name: 'Winter Field Day',
  shortName: 'WFD',
  infoURL: 'https://www.winterfieldday.org/',
  defaultValue: { class: '', location: '' }
}

const Extension = {
  ...Info,
  category: 'fieldOps',
  onActivation: ({ registerHook }) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler })
  }
}

export default Extension

const ActivityHook = {
  ...Info,
  Options: WFDActivityOptions,
  mainExchangeForOperation
}

const ReferenceHandler = {
  ...Info,

  descriptionPlaceholder: '',
  description: (operation) => {
    let date
    if (operation?.qsos && operation.qsos[0]?.startAtMillis) date = Date.parse(operation.qsos[0].startAtMillis)
    else date = new Date()
    const ref = findRef(operation, Info.key)
    return [`WFD ${date.getFullYear()}`, [ref?.class, ref?.location].filter(x => x).join(' ')].filter(x => x).join(' • ')
  },

  suggestOperationTitle: (ref) => {
    return { for: Info.shortName, subtitle: [ref?.class, ref?.location].filter(x => x).join(' ') }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref?.type === Info?.key) {
      return [{
        format: 'adif',
        nameTemplate: settings.useCompactFileNames ? `{call}-${Info.shortName}-{compactDate}` : `{date} {call} for ${Info.shortName}`,
        titleTemplate: `{call}: ${Info.name} on {date}`
      },
      {
        format: 'cabrillo',
        nameTemplate: settings.useCompactFileNames ? `{call}-${Info.shortName}-{compactDate}` : `{date} {call} for ${Info.shortName}`,
        titleTemplate: `{call}: ${Info.name} on {date}`
      }]
    }
  },

  cabrilloHeaders: ({ operation, settings, headers }) => {
    const ref = findRef(operation, Info.key)
    headers.push(['CONTEST', Info.cabrilloName ?? Info.shortName])
    headers.push(['CALLSIGN', operation.stationCall || settings.operatorCall])
    headers.push(['LOCATION', ref.location])
    headers.push(['NAME', ''])
    if (operation.local?.operatorCall) headers.push(['OPERATORS', operation.local.operatorCall])
    if (operation.grid) headers.push(['GRID-LOCATOR', operation.grid])
    return headers
  },

  qsoToCabrilloParts: ({ qso, ref, operation, settings, parts }) => {
    parts = parts || []

    const ourCall = operation.stationCall || settings.operatorCall
    const qsoRef = findRef(qso, Info.key)

    parts.push((ourCall ?? '').padEnd(13, ' '))
    parts.push((ref?.class ?? '').padEnd(6, ' '))
    parts.push((ref?.location ?? '').padEnd(3, ' '))
    parts.push((qso?.their?.call ?? '').padEnd(13, ' '))
    parts.push((qsoRef?.class ?? '').padEnd(4, ' '))
    parts.push((qsoRef?.location ?? '').padEnd(3, ' '))
    return parts
  },
  relevantInfoForQSOItem: ({ qso, operation }) => {
    return [qso.their.exchange]
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    const { band, mode, uuid, startAtMillis } = qso
    const superMode = superModeForMode(mode)

    const nearDupes = qsos.filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.uuid !== uuid)

    if (nearDupes.length === 0) {
      return { counts: 1, type: Info.activationType }
    } else {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => superModeForMode(q.mode) === superMode).length !== 0
      if (sameBand && sameMode) {
        return { counts: 0, alerts: ['duplicate'], type: Info.activationType }
      } else {
        const notices = []
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')

        return { counts: 1, notices, type: Info.activationType }
      }
    }
  }
}

const WFD_CLASS_REGEX = /^[1-9]+[HIMO]$/

export const WFD_LOCATION_VALUES = { ...ARRL_SECTIONS, ...RAC_SECTIONS, MX: 'Mexico', DX: 'DX' }
export const WFD_LOCATIONS = Object.keys(WFD_LOCATION_VALUES)

export const WFD_LOCATION_SUGGESTIONS = Object.entries(WFD_LOCATION_VALUES)

function mainExchangeForOperation (props) {
  const { qso, updateQSO, styles, refStack } = props

  const ref = findRef(qso?.refs, Info.key) || { type: Info.key, class: '', location: '' }

  const fields = []

  fields.push(
    <ThemedTextInput
      {...props}
      key={`${Info.key}/class`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 7, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Class'}
      placeholder={''}
      mode={'flat'}
      keyboard={'dumb'}
      uppercase={true}
      noSpaces={true}
      value={ref?.class || ''}
      error={ref?.class && !ref.class.match(WFD_CLASS_REGEX)}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...ref, class: text }),
        their: { exchange: [text, ref?.location].join(' ') }
      })}
    />
  )
  fields.push(
    <ThemedTextInputWithSuggestions
      {...props}
      key={`${Info.key}/location`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 7, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Loc'}
      placeholder={''}
      mode={'flat'}
      keyboard={'dumb'}
      uppercase={true}
      noSpaces={true}
      value={ref?.location || ''}
      error={ref?.location && !WFD_LOCATIONS.includes(ref.location)}
      suggestions={WFD_LOCATION_SUGGESTIONS}
      minimumLengthForSuggestions={3}
      onChangeText={(text) => updateQSO({
        refs: replaceRef(qso?.refs, Info.key, { ...ref, location: text }),
        their: { arrlSection: text, exchange: [ref?.class, text].join(' ') }
      })}
    />
  )
  return fields
}
