// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { bandForFrequency } from '@ham2k/lib-operation-data'

import Extension from './RadioCommands'

// The registry hands out command hooks highest priority first, and that order decides
// which one claims an input, so the tests have to see them in the same order.
function registeredHooks () {
  const hooks = []
  Extension.onActivation({ registerHook: (type, { hook, priority }) => hooks.push({ hook, priority }) })
  return hooks.sort((a, b) => b.priority - a.priority).map(entry => entry.hook)
}

// Commands are typed into the callsign field, so a hook that matches too eagerly
// swallows what the operator meant as a call. This sees only this extension's hooks.
function commandFor (value) {
  return registeredHooks().find(hook => value.match(hook.match))
}

function invoke (value) {
  const hook = commandFor(value)
  const changes = []
  const message = hook.invokeCommand(value.match(hook.match), {
    qso: {},
    handleFieldChange: (change) => changes.push(change)
  })
  return { changes, message }
}

describe('GHz band commands', () => {
  // Microwave operators say '10G', not '3cm'.
  it('sets the band a GHz designation names', () => {
    expect(invoke('10G').changes).toEqual([{ fieldId: 'band', value: '3cm' }])
    expect(invoke('24G').changes).toEqual([{ fieldId: 'band', value: '1.25cm' }])
    expect(invoke('47G').changes).toEqual([{ fieldId: 'band', value: '6mm' }])
    expect(invoke('75G').changes).toEqual([{ fieldId: 'band', value: '4mm' }])
    expect(invoke('1.2G').changes).toEqual([{ fieldId: 'band', value: '23cm' }])
    expect(invoke('241G').changes).toEqual([{ fieldId: 'band', value: '1mm' }])
  })

  it('accepts lowercase and a GHz suffix', () => {
    expect(invoke('10g').changes).toEqual([{ fieldId: 'band', value: '3cm' }])
    expect(invoke('10GHz').changes).toEqual([{ fieldId: 'band', value: '3cm' }])
  })

  // The callsign field turns periods into slashes as soon as the text holds a letter,
  // so a dotted designation reaches the command in either spelling.
  it('accepts a dotted designation written with a slash', () => {
    expect(invoke('1/2G').changes).toEqual([{ fieldId: 'band', value: '23cm' }])
    expect(invoke('5/7GHZ').changes).toEqual([{ fieldId: 'band', value: '6cm' }])
    expect(invoke('1/2G').message).toEqual('Band set to 1.2G (23cm)')
  })

  // The operator typed a designation, so the confirmation says it back, with the
  // band name they'll see everywhere else in the app.
  it('confirms with both the designation and the band', () => {
    expect(invoke('10G').message).toEqual('Band set to 10G (3cm)')
  })

  it('accepts the alternate designation for bands that have one', () => {
    expect(invoke('1.3G').changes).toEqual([{ fieldId: 'band', value: '23cm' }])
    expect(invoke('2.4G').changes).toEqual([{ fieldId: 'band', value: '13cm' }])
    expect(invoke('3.3G').changes).toEqual([{ fieldId: 'band', value: '9cm' }])
    expect(invoke('5.8G').changes).toEqual([{ fieldId: 'band', value: '6cm' }])
    expect(invoke('76G').changes).toEqual([{ fieldId: 'band', value: '4mm' }])
    expect(invoke('78G').changes).toEqual([{ fieldId: 'band', value: '4mm' }])
    expect(invoke('123G').changes).toEqual([{ fieldId: 'band', value: '2.5mm' }])
  })

  // A designation names a frequency, so it has to land in the band it claims — otherwise
  // the command quietly puts the operator on the wrong band. The designations are close
  // enough together to make that an easy typo, and a designation with no band at all would
  // clear the QSO's band and frequency, so every entry is checked.
  it('names a frequency that falls in the band it maps to', () => {
    const hook = commandFor('10G')
    const designations = ['1.2G', '1.3G', '2.3G', '2.4G', '3.3G', '3.4G', '5.7G', '5.8G', '10G',
      '24G', '47G', '75G', '76G', '78G', '123G', '134G', '241G']

    designations.forEach(designation => {
      expect(commandFor(designation)).toBe(hook)
      const { changes } = invoke(designation)
      expect(changes).toHaveLength(1)
      expect(bandForFrequency(parseFloat(designation) * 1e6)).toEqual(changes[0].value)
    })
  })

  // 122G is the only designation the band table won't place: it is the label the ARRL uses,
  // but the 2.5mm band starts at 122.25 GHz, so the loop above can't check it.
  it('maps 122G to the band its label belongs to', () => {
    expect(invoke('122G').changes).toEqual([{ fieldId: 'band', value: '2.5mm' }])
    expect(bandForFrequency(122 * 1e6)).toEqual('other')
  })

  it('leaves unknown designations to be read as callsigns', () => {
    expect(commandFor('9G')).toBeUndefined()
    expect(commandFor('9G5XX')).toBeUndefined()
    expect(commandFor('4G')).toBeUndefined()
    expect(commandFor('119G')).toBeUndefined()
    expect(commandFor('142G')).toBeUndefined()
  })

  it('still handles the metre bands', () => {
    expect(invoke('20').changes).toEqual([{ fieldId: 'band', value: '20m' }])
    expect(invoke('20M').changes).toEqual([{ fieldId: 'band', value: '20m' }])
  })
})
