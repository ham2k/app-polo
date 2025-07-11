/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const ARRL_SECTIONS = {
  AK: 'Alaska',
  AL: 'Alabama',
  AR: 'Arkansas',
  AZ: 'Arizona',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  EB: 'East Bay',
  EMA: 'Eastern Massachusetts',
  ENY: 'Eastern New York',
  EPA: 'Eastern Pennsylvania',
  EWA: 'Eastern Washington',
  GA: 'Georgia',
  IA: 'Iowa',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  LAX: 'Los Angeles',
  MDC: 'Maryland & DC',
  ME: 'Maine',
  MI: 'Michigan',
  MN: 'Minnesota',
  MO: 'Missouri',
  MS: 'Mississippi',
  MT: 'Montana',
  NC: 'North Carolina',
  ND: 'North Dakota',
  NE: 'Nebraska',
  NFL: 'Northern Florida',
  NH: 'New Hampshire',
  NLI: 'New York City & Long Island',
  NM: 'New Mexico',
  NNJ: 'Northern New Jersey',
  NNY: 'Northern New York',
  NTX: 'North Texas',
  NV: 'Nevada',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  ORG: 'Orange',
  PAC: 'Pacific',
  PR: 'Puerto Rico',
  RI: 'Rhode Island',
  SB: 'Santa Barbara',
  SC: 'South Carolina',
  SCV: 'Santa Clara Valley',
  SD: 'South Dakota',
  SDG: 'San Diego',
  SF: 'San Francisco',
  SFL: 'Southern Florida',
  SJV: 'San Joaquin Valley',
  SNJ: 'Southern New Jersey',
  STX: 'South Texas',
  SV: 'Sacramento Valley',
  TN: 'Tennessee',
  UT: 'Utah',
  VA: 'Virginia',
  VI: 'US Virgin Islands',
  VT: 'Vermont',
  WCF: 'West Central Florida',
  WI: 'Wisconsin',
  WMA: 'Western Massachusetts',
  WNY: 'Western New York',
  WPA: 'Western Pennsylvania',
  WTX: 'West Texas',
  WV: 'West Virginia',
  WWA: 'Western Washington',
  WY: 'Wyoming'
}

export const RAC_SECTIONS = {
  AB: 'Alberta',
  BC: 'British Columbia',
  GH: 'Golden Horseshoe',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland/Labrador',
  NS: 'Nova Scotia',
  ONE: 'Ontario East',
  ONN: 'Ontario North',
  ONS: 'Ontario South',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  TER: 'Territories'
}

export const ABBREVIATED_SECTION_NAMES = {
  AK: 'Alaska',
  AL: 'Alabama',
  AR: 'Arkansas',
  AZ: 'Arizona',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  EB: 'East Bay',
  EMA: 'Eastern Mass.',
  ENY: 'Eastern NY',
  EPA: 'Eastern Penn.',
  EWA: 'Eastern Wash.',
  GA: 'Georgia',
  IA: 'Iowa',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  LAX: 'Los Angeles',
  MDC: 'Maryland & DC',
  ME: 'Maine',
  MI: 'Michigan',
  MN: 'Minnesota',
  MO: 'Missouri',
  MS: 'Mississippi',
  MT: 'Montana',
  NC: 'North Carolina',
  ND: 'North Dakota',
  NE: 'Nebraska',
  NFL: 'Northern Florida',
  NH: 'New Hampshire',
  NLI: 'NYC & Long Is.',
  NM: 'New Mexico',
  NNJ: 'Northern NJ',
  NNY: 'Northern NY',
  NTX: 'North Texas',
  NV: 'Nevada',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  ORG: 'Orange',
  PAC: 'Pacific',
  PR: 'Puerto Rico',
  RI: 'Rhode Is.',
  SB: 'Santa Barbara',
  SC: 'South Carolina',
  SCV: 'Sta. Clara Val.',
  SD: 'South Dakota',
  SDG: 'San Diego',
  SF: 'San Francisco',
  SFL: 'Southern FL',
  SJV: 'San Joaquin Val.',
  SNJ: 'Southern NJ',
  STX: 'South Texas',
  SV: 'Sacramento Val.',
  TN: 'Tennessee',
  UT: 'Utah',
  VA: 'Virginia',
  VI: 'US Virgin Is.',
  VT: 'Vermont',
  WCF: 'W. Central Florida',
  WI: 'Wisconsin',
  WMA: 'Western Mass.',
  WNY: 'Western NY',
  WPA: 'Western Penn.',
  WTX: 'West Texas',
  WV: 'West Virginia',
  WWA: 'Western Wash.',
  WY: 'Wyoming',
  AB: 'Alberta',
  BC: 'British Col.',
  GH: 'Golden Horseshoe',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Nfld. & Lab.',
  NS: 'Nova Scotia',
  ONE: 'Ontario E.',
  ONN: 'Ontario N.',
  ONS: 'Ontario S.',
  PE: 'P.E.I.',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  TER: 'Territories'
}

export const FIELD_DAY_SECTIONS = { ...ARRL_SECTIONS, ...RAC_SECTIONS }

export const CALL_AREA_FOR_SECTION = {
  CT: 1,
  EMA: 1,
  ME: 1,
  NH: 1,
  RI: 1,
  VT: 1,
  WMA: 1,
  ENY: 2,
  NNY: 2,
  NLI: 2,
  SNJ: 2,
  NNJ: 2,
  WNY: 2,
  DE: 3,
  MDC: 3,
  EPA: 3,
  WPA: 3,
  AL: 4,
  SFL: 4,
  GA: 4,
  TN: 4,
  KY: 4,
  VA: 4,
  NC: 4,
  WCF: 4,
  NFL: 4,
  PR: 4,
  SC: 4,
  VI: 4,
  AR: 5,
  NTX: 5,
  LA: 5,
  OK: 5,
  MS: 5,
  STX: 5,
  NM: 5,
  WTX: 5,
  EB: 6,
  SDG: 6,
  LAX: 6,
  SF: 6,
  ORG: 6,
  SJV: 6,
  SB: 6,
  SV: 6,
  PAC: 6,
  AK: 7,
  NV: 7,
  AZ: 7,
  OR: 7,
  EWA: 7,
  UT: 7,
  ID: 7,
  WWA: 7,
  MT: 7,
  WY: 7,
  MI: 8,
  OH: 8,
  IL: 9,
  WI: 9,
  IN: 9,
  CO: 0,
  MO: 0,
  IA: 0,
  NE: 0,
  KS: 0,
  ND: 0,
  MN: 0,
  SD: 0,
  ONN: 'Canada',
  AB: 'Canada',
  ONE: 'Canada',
  BC: 'Canada',
  GH: 'Canada',
  MB: 'Canada',
  NB: 'Canada',
  NL: 'Canada',
  NS: 'Canada',
  PE: 'Canada',
  QC: 'Canada',
  SK: 'Canada',
  TER: 'Canada'
}
