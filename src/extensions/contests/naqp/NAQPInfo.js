/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import US_STATES from '../../../data/usStates.json'
import CANADIAN_PROVINCES from '../../../data/canadianProvinces.json'

export const Info = {
  key: 'naqp',
  icon: 'flag-checkered',
  name: 'North American QSO Party',
  infoURL: 'https://ncjweb.com/naqp/',
  shortName: 'NAQP'
}

export const NORTH_AMERICAN_ENTITIES = [
  '4U1U',
  '6Y',
  '8P',
  'C6',
  'CM',
  'CY9',
  'CY0',
  'FG',
  'FJ',
  'FM',
  'FO',
  'FP',
  'FS',
  'HH',
  'HI',
  'HK0',
  'HP',
  'HR',
  'J3',
  'J6',
  'J7',
  'J8',
  'KG4',
  'KP1',
  'KP2',
  'KP4',
  'KP5',
  'OX',
  'PJ5',
  'PJ7',
  'TG',
  'TI',
  'TI9',
  'V2',
  'V3',
  'V4',
  'VP2E',
  'VP2M',
  'VP2V',
  'VP5',
  'VP9',
  'XE',
  'XF4',
  'YN',
  'YS',
  'YV0',
  'ZF'
]

export const VALID_LOCATIONS = {
  DX: true
}

NORTH_AMERICAN_ENTITIES.forEach(entity => {
  VALID_LOCATIONS[entity.toUpperCase()] = true
})

Object.keys(US_STATES).forEach(state => {
  VALID_LOCATIONS[state.toUpperCase()] = true
})

Object.keys(CANADIAN_PROVINCES).forEach(province => {
  VALID_LOCATIONS[province.toUpperCase()] = true
})

export const VALID_BANDS = [
  '160m',
  '80m',
  '40m',
  '20m',
  '15m',
  '10m'
]
