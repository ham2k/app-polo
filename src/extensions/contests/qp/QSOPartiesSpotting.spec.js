// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

jest.mock('../../../ui/index.js', () => ({}))
jest.mock('../../../store/operations', () => ({ setOperationData: jest.fn() }))
jest.mock('./QSOPartiesActivityOptions', () => ({ ActivityOptions: () => null }))
jest.mock('react-native-quick-base64', () => ({ encode: jest.fn() }))

import { QSO_PARTY_DATA } from './QSOPartiesExtension'
import { qpHubPages } from './QSOPartiesSpotting'

// The pages the QSO Party Hub's own index (qsopartyhub.com/qso-party-spotting.html)
// linked in October 2026: the form each party's spots are posted to, and the
// table that form's page shows them in.
const HUB_SPOT_PAGES = [
  'acqp', 'alqp', 'arqp', 'azqp', 'bcqp', 'collqp', 'coqp', 'cpqp', 'cqp', 'fqp', 'gaqp', 'hqp',
  'iaqp', 'idqp', 'ilqp', 'in7qpne_de', 'ksqp', 'kyqp', 'laqp', 'mdcqp', 'meqp', 'miqp', 'mnqp',
  'moqp', 'msqp', 'ncqp', 'ndqp', 'neqp', 'nhqp', 'njqp', 'nmqp', 'nsqp', 'nvqp', 'nyqp', 'ohqp',
  'okqp', 'onqp', 'paqp', 'qcqp', 'scqp', 'sdqp', 'tnqp', 'txqp', 'vaqp', 'vtqp', 'wasr', 'wiqp', 'wvqp'
]
const HUB_TABLE_PAGES = [
  'acqp', 'alqp', 'arqp', 'azqp', 'bcqp', 'caqp', 'collqp', 'coqp', 'cpqp', 'flqp', 'gaqp', 'hiqp',
  'iaqp', 'idqp', 'ilqp', 'in7qpne_de', 'ksqp', 'kyqp', 'laqp', 'mdcqp', 'meqp', 'miqp', 'mnqp',
  'moqp', 'msqp', 'ncqp', 'ndqp', 'neqp', 'nhqp', 'njqp', 'nmqp', 'nsqp', 'nvqp', 'nyqp', 'ohqp',
  'okqp', 'onqp', 'paqp', 'qcqp', 'scqp', 'sdqp', 'tnqp', 'txqp', 'vaqp', 'vtqp', 'waqp', 'wiqp', 'wvqp'
]

describe('QSO Party Hub pages', () => {
  it('posts and reads every party on pages the hub actually has', () => {
    for (const qp of Object.values(QSO_PARTY_DATA)) {
      const { spots, table } = qpHubPages(qp)
      expect([qp.key, spots, HUB_SPOT_PAGES.includes(spots)]).toEqual([qp.key, spots, true])
      expect([qp.key, table, HUB_TABLE_PAGES.includes(table)]).toEqual([qp.key, table, true])
    }
  })

  it('posts California to cqp and reads it from caqp', () => {
    expect(qpHubPages(QSO_PARTY_DATA.CA)).toEqual({ spots: 'cqp', table: 'caqp' })
  })

  it('names a party with no short after its key, rather than failing', () => {
    expect(QSO_PARTY_DATA.KY.short).toBeUndefined()
    expect(qpHubPages(QSO_PARTY_DATA.KY)).toEqual({ spots: 'kyqp', table: 'kyqp' })
  })

  it('shares one page between the parties on the same May weekend', () => {
    expect(qpHubPages(QSO_PARTY_DATA.DE)).toEqual({ spots: 'in7qpne_de', table: 'in7qpne_de' })
  })
})
