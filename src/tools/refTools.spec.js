import { findRef, filterRefs, refsToString, stringToRefs, replaceRefs } from './refTools'

describe('ref tools', () => {
  describe('findRef', () => {
    const qso = {
      refs: [
        { type: 'potaActivation', ref: 'K-5279' },
        { type: 'pota', ref: 'K-0001' },
        { type: 'pota', ref: 'K-5233' },
        { type: 'contest', ref: 'NYQP' }
      ]
    }

    it('should work', () => {
      expect(findRef(qso, 'potaActivation')).toEqual({ type: 'potaActivation', ref: 'K-5279' })
      expect(findRef(qso, 'pota')).toEqual({ type: 'pota', ref: 'K-0001' })
      expect(findRef(qso, 'contest')).toEqual({ type: 'contest', ref: 'NYQP' })
      expect(findRef(qso, 'sota')).toEqual(undefined)
    })
  })

  describe('filterRefs', () => {
    const qso = {
      refs: [
        { type: 'potaActivation', ref: 'K-5279' },
        { type: 'pota', ref: 'K-0001' },
        { type: 'pota', ref: 'K-5233' },
        { type: 'contest', ref: 'NYQP' }
      ]
    }

    it('should work', () => {
      expect(filterRefs(qso, 'potaActivation')).toEqual([{ type: 'potaActivation', ref: 'K-5279' }])
      expect(filterRefs(qso, 'pota')).toEqual([{ type: 'pota', ref: 'K-0001' }, { type: 'pota', ref: 'K-5233' }])
      expect(filterRefs(qso, 'contest')).toEqual([{ type: 'contest', ref: 'NYQP' }])
      expect(filterRefs(qso, 'sota')).toEqual([])
    })
  })

  describe('refsToString', () => {
    const qso = {
      refs: [
        { type: 'potaActivation', ref: 'K-5279' },
        { type: 'pota', ref: 'K-0001' },
        { type: 'pota', ref: 'K-5233' },
        { type: 'contest', ref: 'NYQP' }
      ]
    }

    it('should work', () => {
      expect(refsToString(qso, 'potaActivation')).toEqual('K-5279')
      expect(refsToString(qso, 'pota')).toEqual('K-0001, K-5233')
      expect(refsToString(qso, 'contest')).toEqual('NYQP')
      expect(refsToString(qso, 'sota')).toEqual('')
      expect(refsToString(qso, 'pota', { separator: ' / ' })).toEqual('K-0001 / K-5233')
    })
    it('can limit the number of refs', () => {
      expect(refsToString(qso, 'pota', { limit: 1 })).toEqual('K-0001 +1')
    })
  })

  describe('stringToRefs', () => {
    it('should work', () => {
      expect(stringToRefs('potaActivation', 'K-5279')).toEqual([
        { type: 'potaActivation', ref: 'K-5279' }
      ])
      expect(stringToRefs('pota', 'K-0001, K-5233')).toEqual([
        { type: 'pota', ref: 'K-0001' },
        { type: 'pota', ref: 'K-5233' }
      ])
      expect(stringToRefs('pota', 'K-0001, K-5233 / K-10000', { separator: ' / ' })).toEqual([
        { type: 'pota', ref: 'K-0001, K-5233' },
        { type: 'pota', ref: 'K-10000' }
      ])
      expect(stringToRefs('pota', 'K-0001, ERROR, K-5233', { regex: /^K-/ })).toEqual([
        { type: 'pota', ref: 'K-0001' },
        { type: 'pota', ref: 'K-5233' }
      ])
    })
  })

  describe('replaceRefs', () => {
    it('should work', () => {
      const qso = {
        refs: [
          { type: 'potaActivation', ref: 'K-5279' },
          { type: 'pota', ref: 'K-0001' },
          { type: 'pota', ref: 'K-5233' },
          { type: 'contest', ref: 'NYQP' }
        ]
      }
      const refs = [
        { type: 'pota', ref: 'K-9999' },
        { type: 'pota', ref: 'K-9998' }
      ]

      expect(replaceRefs(qso.refs, 'pota', refs)).toEqual([
        { type: 'potaActivation', ref: 'K-5279' },
        { type: 'contest', ref: 'NYQP' },
        { type: 'pota', ref: 'K-9999' },
        { type: 'pota', ref: 'K-9998' }
      ])
    })
  })
})
