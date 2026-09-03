// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { modeForFrequency } from '@ham2k/lib-operation-data'
import { fmtFreq, parseFreq } from '@ham2k/lib-format-tools'

const Info = {
  key: 'commands-radio',
  name: 'Shortcuts to change frequency, band and mode'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: ModeCommandHook })
    registerHook('command', { priority: 100, hook: BandCommandHook })
    registerHook('command', { priority: 100, hook: GigBandCommandHook })
    registerHook('command', { priority: 99, hook: FrequencyCommandHook })
    registerHook('command', { priority: 98, hook: PowerCommandHook })
  }
}

export default Extension

const BandCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-band',
  match: /^(2|6|10|12|15|17|20|30|40|60|80|160)M{0,1}$/i,
  describeCommand: (match, { qso, t }) => {
    if (!qso) return

    if (match[0].length < 2) return ''
    return t?.('extensions.commands-radio.band', 'Change band to {{band}}?', { band: `${match[1]}m` }) || `Change band to ${match[1]}m?`
  },
  invokeCommand: (match, { handleFieldChange, qso, t }) => {
    if (!qso) return

    handleFieldChange({ fieldId: 'band', value: match[1] + 'm' })
    return t?.('extensions.commands-radio.bandConfirm', 'Band set to {{band}}', { band: `${match[1]}m` }) || `Band set to ${match[1]}m`
  }
}

// Microwave operators name their bands in GHz — '10G', not '3cm' — and that is also
// what contest exchanges and Cabrillo logs use. Typing a frequency instead is a trap:
// '10368.1' is read as kHz, so the band is only right by way of a fallback.
// Several bands go by more than one designation, so both are accepted.
// 119G and 142G are not: they name allocations that no longer exist, and fall
// outside every band we have.
const BANDS_FOR_GIG_DESIGNATIONS = {
  '1.2G': '23cm',
  '1.3G': '23cm',
  '2.3G': '13cm',
  '2.4G': '13cm',
  '3.3G': '9cm',
  '3.4G': '9cm',
  '5.7G': '6cm',
  '5.8G': '6cm',
  '10G': '3cm',
  '24G': '1.25cm',
  '47G': '6mm',
  '75G': '4mm', // The Cabrillo label; 76G and 78G are where the band is actually worked
  '76G': '4mm',
  '78G': '4mm',
  '122G': '2.5mm', // The Cabrillo label, though the band itself starts at 122.25 GHz
  '123G': '2.5mm',
  '134G': '2mm',
  '241G': '1mm'
}

// Built from the designations we know, so a callsign like '9G' isn't taken for one.
// A period is matched as either itself or a slash: the callsign field rewrites periods
// to slashes once the text has a letter in it, which is how '1.2GHZ' arrives as '1/2GHZ'.
const GIG_DESIGNATIONS_REGEX = new RegExp(
  `^(${Object.keys(BANDS_FOR_GIG_DESIGNATIONS).map(d => d.replace(/\./g, '[/.]')).join('|')})(HZ)?$`, 'i'
)

function bandForGigDesignation (designation) {
  return BANDS_FOR_GIG_DESIGNATIONS[designation.toUpperCase().replaceAll('/', '.')]
}

const GigBandCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-gig-band',
  match: GIG_DESIGNATIONS_REGEX,
  describeCommand: (match, { qso, t }) => {
    if (!qso) return

    const band = bandForGigDesignation(match[1])
    const label = `${match[1].toUpperCase().replaceAll('/', '.')} (${band})`
    return t?.('extensions.commands-radio.band', 'Change band to {{band}}?', { band: label }) || `Change band to ${label}?`
  },
  invokeCommand: (match, { handleFieldChange, qso, t }) => {
    if (!qso) return

    const band = bandForGigDesignation(match[1])
    // The regex is built from the table, and a test holds them to each other. Bail out
    // rather than pass an undefined on: that would clear the QSO's band and its frequency,
    // and still tell the operator the band was set.
    if (!band) return

    const label = `${match[1].toUpperCase().replaceAll('/', '.')} (${band})`
    handleFieldChange({ fieldId: 'band', value: band })
    return t?.('extensions.commands-radio.bandConfirm', 'Band set to {{band}}', { band: label }) || `Band set to ${label}`
  }
}

const FrequencyCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-frequency',
  match: /^([\d.,]{1,})$/,
  describeCommand: (match, { qso, vfo, ourInfo, t }) => {
    if (!qso) return

    let freq
    if (match[1].length < 3) return
    if (match[1].startsWith('..') && qso.freq) {
      freq = parseFreq(`${Math.round(qso.freq)}${match[1].substring(1)}`)
    } else if (match[1].startsWith('.') && qso.freq) {
      freq = parseFreq(`${Math.floor(qso.freq / 1000)}${match[1]}`)
    } else if (match[1].startsWith(',') && qso.freq) {
      freq = parseFreq(`${Math.floor(qso.freq / 1000)}${match[1]}`)
    } else {
      freq = parseFreq(match[1])
    }
    if (freq) {
      const mode = modeForFrequency(freq, ourInfo) ?? vfo.mode ?? 'SSB'
      if (mode && mode !== vfo?.mode) {
        return t?.('extensions.commands-radio.frequencyAndMode', 'Change frequency to {{freq}} MHz ({{mode}})?', { freq: fmtFreq(freq), mode }) || `Change frequency to ${fmtFreq(freq)} MHz (${mode})?`
      } else {
        return t?.('extensions.commands-radio.frequency', 'Change frequency to {{freq}} MHz?', { freq: fmtFreq(freq) }) || `Change frequency to ${fmtFreq(freq)} MHz?`
      }
    }
  },
  invokeCommand: (match, { qso, handleFieldChange, vfo, ourInfo, t }) => {
    if (!qso) return

    let freq
    if (match[1].startsWith('..') && qso.freq) {
      freq = parseFreq(`${Math.round(qso.freq)}${match[1].substring(1)} `)
    } else if (match[1].startsWith('.') && qso.freq) {
      freq = parseFreq(`${Math.floor(qso.freq / 1000)}${match[1]} `)
    } else {
      freq = parseFreq(match[1])
    }

    if (freq) {
      const mode = modeForFrequency(freq, ourInfo) ?? vfo.mode ?? 'SSB'
      handleFieldChange({ fieldId: 'freq', value: freq })
      if (mode && mode !== vfo?.mode) {
        return t?.('extensions.commands-radio.frequencyAndModeConfirm', 'Frequency set to {{freq}} MHz ({{mode}})', { freq: fmtFreq(freq), mode }) || `Frequency set to ${fmtFreq(freq)} MHz (${mode})`
      } else {
        return t?.('extensions.commands-radio.frequencyConfirm', 'Frequency set to {{freq}} MHz', { freq: fmtFreq(freq) }) || `Frequency set to ${fmtFreq(freq)} MHz`
      }
    }
  }
}

const PowerCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-power',
  match: /^([\d.]{1,})[wW]$/,
  describeCommand: (match, { qso, t }) => {
    if (!qso) return

    return t?.('extensions.commands-radio.power', 'Change power to {{power}}W?', { power: match[1] }) || `Change power to ${match[1]} W ? `
  },
  invokeCommand: (match, { qso, handleFieldChange, t }) => {
    if (!qso) return

    handleFieldChange({ fieldId: 'power', value: match[1] })
    return t?.('extensions.commands-radio.powerConfirm', 'Power set to {{power}}W', { power: match[1] }) || `Power set to ${match[1]} W`
  }
}

const ModeCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-radio-mode',
  match: /^(CW|SSB|USB|LSB|FM|AM|FT8|FT4|FT2|RTTY|LSB|USB)$/i,
  describeCommand: (match, { qso, t }) => {
    if (!qso) return

    return t?.('extensions.commands-radio.mode', 'Change mode to {{mode}}?', { mode: match[1] }) || `Change mode to ${match[1]}?`
  },
  invokeCommand: (match, { handleFieldChange, qso, t }) => {
    if (!qso) return

    handleFieldChange({ fieldId: 'mode', value: match[1] })
    return t?.('extensions.commands-radio.modeConfirm', 'Mode set to {{mode}}', { mode: match[1] }) || `Mode set to ${match[1]} `
  }
}
