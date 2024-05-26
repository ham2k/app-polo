/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { distanceOnEarth, bearingOnEarth } from './geoTools'

const ROOSA_GAP_FIRETOWER = { lat: 41.6174, lon: -74.4267 }
const STATUE_OF_LIBERTY = { lat: 40.6889, lon: -74.0444 }
const BOUVET = { lat: -54.4247, lon: 3.4048 }
const MARKET_REEF = { lat: 60.3008, lon: 19.1319 }

describe('distanceOnEarth', () => {
  it('should calculate distance between two coordinates', () => {
    expect(distanceOnEarth(ROOSA_GAP_FIRETOWER, STATUE_OF_LIBERTY).toFixed(2)).toEqual('108.09')
    expect(distanceOnEarth(ROOSA_GAP_FIRETOWER, STATUE_OF_LIBERTY, { units: 'miles' }).toFixed(2)).toEqual('67.17')

    expect(distanceOnEarth(ROOSA_GAP_FIRETOWER, BOUVET).toFixed(2)).toEqual('12970.70')
    expect(distanceOnEarth(ROOSA_GAP_FIRETOWER, BOUVET, { units: 'miles' }).toFixed(2)).toEqual('8059.71')

    expect(distanceOnEarth(ROOSA_GAP_FIRETOWER, MARKET_REEF).toFixed(2)).toEqual('6267.36')
    expect(distanceOnEarth(ROOSA_GAP_FIRETOWER, MARKET_REEF, { units: 'miles' }).toFixed(2)).toEqual('3894.40')
  })
})

describe('bearingOnEarth', () => {
  it('should calculate distance between two coordinates', () => {
    expect(bearingOnEarth(ROOSA_GAP_FIRETOWER, STATUE_OF_LIBERTY).toFixed(2)).toEqual('162.65')
    expect(bearingOnEarth(ROOSA_GAP_FIRETOWER, BOUVET).toFixed(2)).toEqual('140.48')
    expect(bearingOnEarth(ROOSA_GAP_FIRETOWER, MARKET_REEF).toFixed(2)).toEqual('36.44')
  })
})
