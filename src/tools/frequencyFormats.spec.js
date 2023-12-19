import { fmtFreqInMHz, partsForFreqInMHz, parseFreqInMHz } from './frequencyFormats'

describe('fmtFreqInMHz', () => {
  it('should convert MHz to a nice formatting', () => {
    expect(fmtFreqInMHz(7125)).toEqual('7.125')
    expect(fmtFreqInMHz(7125, { compact: false })).toEqual('7.125.000')
    expect(fmtFreqInMHz(7125.100)).toEqual('7.125.100')
    expect(fmtFreqInMHz(7125.100, { compact: false })).toEqual('7.125.100')
    expect(fmtFreqInMHz(146520.125)).toEqual('146.520.125')
    expect(fmtFreqInMHz(146520.125, { compact: false })).toEqual('146.520.125')
  })
})

describe('partsForFreqInMHz', () => {
  it('should convert MHz to a nice formatting', () => {
    expect(partsForFreqInMHz(7125)).toEqual(['7', '125', '000'])
    expect(partsForFreqInMHz(7125.100)).toEqual(['7', '125', '100'])
    expect(partsForFreqInMHz(146520.125)).toEqual(['146', '520', '125'])
  })
})

describe('parseFreqInMHz', () => {
  it('should convert strings to MHz', () => {
    expect(parseFreqInMHz('7125')).toEqual(7125)
    expect(parseFreqInMHz('7.125')).toEqual(7125)
    expect(parseFreqInMHz('7,125')).toEqual(7125)
    expect(parseFreqInMHz('7125.500')).toEqual(7125.500)
    expect(parseFreqInMHz('7125,500')).toEqual(7125.500)
    expect(parseFreqInMHz('7.125.500')).toEqual(7125.500)
    expect(parseFreqInMHz('146.520.500')).toEqual(146520.500)
  })
})
