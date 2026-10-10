import { formatName } from './Ham2KLookupExtension'

describe('formatName', () => {
  it('flips "Last, First"', () => {
    expect(formatName('DELMONT, SEBASTIAN')).toEqual('Sebastian Delmont')
  })

  it('puts a suffix filed after a second comma on the end', () => {
    expect(formatName('CURTIS, OSCAR A, JR')).toEqual('Oscar A. Curtis Jr')
    expect(formatName('Wingenter, Ronald C, III')).toEqual('Ronald C. Wingenter III')
    expect(formatName('SMITH, JOHN, MD')).toEqual('John Smith, MD')
    expect(formatName('smith, john, phd')).toEqual('John Smith, PhD')
  })

  it('leaves other names with two commas in order', () => {
    expect(formatName('ACME RADIO CLUB, INC., THE')).toEqual('Acme Radio Club, Inc., The')
    expect(formatName('SMITH, JOHN,')).toEqual('Smith, John,')
  })

  it('keeps a title before the given names', () => {
    expect(formatName('Hill, Mr. Matthew H')).toEqual('Mr. Matthew H. Hill')
  })
})
