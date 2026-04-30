/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  LIVE_QSO_UDP_MESSAGE_FORMATS,
  displayLiveQSOUDPURL,
  liveQSOUDPMessageFormatOption,
  normalizeLiveQSOUDPURL,
  normalizeLiveQSOURL,
  selectLiveQSOHTTPSettings,
  selectLiveQSON1MMSettings,
  selectLiveQSOUDPSettings
} from './liveQSOSettings'

describe('liveQSOSettings', () => {
  describe('normalizeLiveQSOURL', () => {
    it('adds an http scheme when missing', () => {
      expect(normalizeLiveQSOURL('example.org/test')).toEqual('http://example.org/test')
      expect(normalizeLiveQSOURL(' https://example.org/test ')).toEqual('https://example.org/test')
      expect(normalizeLiveQSOURL('')).toEqual('')
    })
  })

  describe('normalizeLiveQSOUDPURL', () => {
    it('adds a udp scheme when missing', () => {
      expect(normalizeLiveQSOUDPURL('192.168.1.255:12060')).toEqual('udp://192.168.1.255:12060')
      expect(normalizeLiveQSOUDPURL(' udp://example.org:2237 ')).toEqual('udp://example.org:2237')
      expect(displayLiveQSOUDPURL('udp://example.org:2237')).toEqual('example.org:2237')
    })
  })

  describe('selectors', () => {
    it('applies defaults for HTTP, UDP and N1MM settings', () => {
      expect(selectLiveQSOHTTPSettings({})).toEqual({
        enabled: false,
        url: '',
        individualRequests: false,
        sendADIFHeader: true,
        sendEdits: false,
        sendDeletes: false
      })

      expect(selectLiveQSOUDPSettings({})).toEqual({
        enabled: false,
        url: '',
        messageFormat: LIVE_QSO_UDP_MESSAGE_FORMATS.rawADIF
      })

      expect(selectLiveQSON1MMSettings({})).toEqual({
        enabled: false,
        url: '',
        sendEdits: false,
        sendDeletes: false,
        skipEmptyFields: true
      })
    })

    it('normalizes configured URLs and preserves configured flags', () => {
      const settings = {
        liveQSO: {
          http: {
            enabled: true,
            url: 'example.org/adif',
            individualRequests: true,
            sendADIFHeader: false,
            sendEdits: true,
            sendDeletes: true
          },
          udp: {
            enabled: true,
            url: '239.0.0.1:2237',
            messageFormat: LIVE_QSO_UDP_MESSAGE_FORMATS.wsjtxCompatible
          },
          n1mm: {
            enabled: true,
            url: '192.168.1.255:12060',
            sendEdits: true,
            sendDeletes: true,
            skipEmptyFields: false
          }
        }
      }

      expect(selectLiveQSOHTTPSettings(settings)).toEqual({
        enabled: true,
        url: 'http://example.org/adif',
        individualRequests: true,
        sendADIFHeader: false,
        sendEdits: true,
        sendDeletes: true
      })

      expect(selectLiveQSOUDPSettings(settings)).toEqual({
        enabled: true,
        url: 'udp://239.0.0.1:2237',
        messageFormat: LIVE_QSO_UDP_MESSAGE_FORMATS.wsjtxCompatible
      })

      expect(selectLiveQSON1MMSettings(settings)).toEqual({
        enabled: true,
        url: 'udp://192.168.1.255:12060',
        sendEdits: true,
        sendDeletes: true,
        skipEmptyFields: false
      })
    })
  })

  describe('option helpers', () => {
    it('falls back to default option values', () => {
      expect(liveQSOUDPMessageFormatOption('bogus').value).toEqual(LIVE_QSO_UDP_MESSAGE_FORMATS.rawADIF)
    })
  })
})
