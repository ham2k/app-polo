import { capitalizeString } from './capitalizeString'

describe('capitalizeString', () => {
  it('should work', () => {
    expect(capitalizeString('NEW YORK')).toEqual('New York')
    expect(capitalizeString('new york')).toEqual('New York')
    expect(capitalizeString('New York')).toEqual('New York')
    expect(capitalizeString('BEDFORD-STUYVESANT')).toEqual('Bedford-Stuyvesant')
    expect(capitalizeString('I once visited BEDFORD-STUYVESANT on a Monday')).toEqual('I Once Visited Bedford-Stuyvesant On A Monday')
  })
  it('should deal with special name details', () => {
    expect(capitalizeString('john m doe')).toEqual('John M Doe')
    expect(capitalizeString('john m doe', { mode: 'name' })).toEqual('John M. Doe')
    expect(capitalizeString('I once visited BEDFORD-STUYVESANT on a Monday', { mode: 'name' })).toEqual('I. Once Visited Bedford-Stuyvesant On A. Monday')
  })

  it('can handle exceptions to the rule', () => {
    expect(capitalizeString('sullivan county aRES')).toEqual('Sullivan County ARES')
  })
})
