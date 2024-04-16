/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { capitalizeString } from './capitalizeString'

describe('capitalizeString', () => {
  it('should work', () => {
    expect(capitalizeString('NEW YORK')).toEqual('New York')
    expect(capitalizeString('new york')).toEqual('New York')
    expect(capitalizeString('New York')).toEqual('New York')
    expect(capitalizeString('BEDFORD-STUYVESANT')).toEqual('Bedford-Stuyvesant')
    expect(capitalizeString('I once visited wilkes-barre on a Monday')).toEqual('I Once Visited Wilkes-Barre On A Monday')
    expect(capitalizeString('Member of A.R.E.S.')).toEqual('Member Of A.R.E.S.')
  })

  it('has special handling for names', () => {
    expect(capitalizeString('john m doe')).toEqual('John M Doe')
    expect(capitalizeString('john m doe', { content: 'name' })).toEqual('John M. Doe')
    expect(capitalizeString('john m doe door 2 door', { content: 'name' })).toEqual('John M. Doe Door 2 Door')
    expect(capitalizeString('I once visited BEDFORD-STUYVESANT on a Monday', { content: 'name' })).toEqual('I. Once Visited Bedford-Stuyvesant On A. Monday')
  })

  it('can handle exceptions to the rule', () => {
    expect(capitalizeString('nasa ares flexradio club')).toEqual('NASA ARES FlexRadio Club')
  })

  it('can handle quotes', () => {
    expect(capitalizeString('JOHN "Joe" DOE')).toEqual('John "Joe" Doe')
    expect(capitalizeString('JOHN "JOE" DOE')).toEqual('John "Joe" Doe')
    expect(capitalizeString('john "joe" doe')).toEqual('John "Joe" Doe')
  })

  it('can preserve existing case', () => {
    expect(capitalizeString('sullivan county aRES')).toEqual('Sullivan County ARES')
    expect(capitalizeString('Sullivan county aRES', { force: false })).toEqual('Sullivan county aRES')
    expect(capitalizeString('SULLIVAN COUNTY ARES', { force: false })).toEqual('Sullivan County ARES')
    expect(capitalizeString('sullivan county aRES', { force: false })).toEqual('Sullivan County ARES') // Doesn't work if the first letter is not uppercase

    // When not forcing, only add periods to initials if they are already capitalized
    expect(capitalizeString('John P. Smith', { force: false, content: 'name' })).toEqual('John P. Smith')
    expect(capitalizeString('John P Smith', { force: false, content: 'name' })).toEqual('John P. Smith')
    expect(capitalizeString('John p smith', { force: false, content: 'name' })).toEqual('John p smith')
  })
})
