/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const EXTENSION_CATEGORIES = {
  core: 'Core Features',
  locationBased: 'Location-based Activities',
  fieldOps: 'Field Operations',
  lookup: 'Data Lookup',
  contests: 'Contests',
  other: 'Other Features'
}

export const EXTENSION_CATEGORIES_ORDER = ['locationBased', 'fieldOps', 'contests', 'lookup', 'core', 'other']

// We don't care for really precise location. For our purposes, a 6-digit grid is precise enough.
// But depending on the source, the location might not be accurate.
// For example, a grid from the POTA database might be off by miles (and even more in a few cases like the Appalachian Trail)
// These values are meant to label different locations sources for the same contact, in order to pick the most accurate.
export const LOCATION_ACCURACY = {
  EXACT: 0, // We believe this is the right grid6. Confirmed by contact, or GPS
  ACCURATE: 2, // The location might actually be in a neighboring grid, but it's close enough. Data for a SOTA summit, for example.
  REASONABLE: 10, // The location might be off by a dozen grids, like most POTA parks.
  VAGUE: 100, // The location is not well known, beyond general state or province
  NO_LOCATION: 1000
}
