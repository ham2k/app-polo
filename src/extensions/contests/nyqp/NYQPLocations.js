/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const US_STATES = {
  AK: 'Alaska',
  AL: 'Alabama',
  AR: 'Arkansas',
  AZ: 'Arizona',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  IA: 'Iowa',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  MA: 'Massachusetts',
  MD: 'Maryland',
  ME: 'Maine',
  MI: 'Michigan',
  MN: 'Minnesota',
  MO: 'Missouri',
  MS: 'Mississippi',
  MT: 'Montana',
  NC: 'North Carolina',
  ND: 'North Dakota',
  NE: 'Nebraska',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NV: 'Nevada',
  NY: 'New York',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VA: 'Virginia',
  VT: 'Vermont',
  WA: 'Washington',
  WI: 'Wisconsin',
  WV: 'West Virginia',
  WY: 'Wyoming'
}

export const CANADIAN_PROVINCES = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  YT: 'Yukon'
}

export const NY_COUNTIES = {
  ALB: 'Albany',
  ALL: 'Allegany',
  BRX: 'Bronx',
  BRM: 'Broome',
  CAT: 'Cattaraugus',
  CAY: 'Cayuga',
  CHA: 'Chautauqua',
  CHE: 'Chemung',
  CGO: 'Chenango',
  CLI: 'Clinton',
  COL: 'Columbia',
  COR: 'Cortland',
  DEL: 'Delaware',
  DUT: 'Dutchess',
  ERI: 'Erie',
  ESS: 'Essex',
  FRA: 'Franklin',
  FUL: 'Fulton',
  GEN: 'Genesee',
  GRE: 'Greene',
  HAM: 'Hamilton',
  HER: 'Herkimer',
  JEF: 'Jefferson',
  KIN: 'Kings',
  LEW: 'Lewis',
  LIV: 'Livingston',
  MAD: 'Madison',
  MON: 'Monroe',
  MTG: 'Montgomery',
  NAS: 'Nassau',
  NEW: 'New York',
  NIA: 'Niagara',
  ONE: 'Oneida',
  ONO: 'Onondaga',
  ONT: 'Ontario',
  ORA: 'Orange',
  ORL: 'Orleans',
  OSW: 'Oswego',
  OTS: 'Otsego',
  PUT: 'Putnam',
  QUE: 'Queens',
  REN: 'Rensselaer',
  RIC: 'Richmond',
  ROC: 'Rockland',
  SAR: 'Saratoga',
  SCH: 'Schenectady',
  SCO: 'Schoharie',
  SCU: 'Schuyler',
  SEN: 'Seneca',
  STL: 'St. Lawrence',
  STE: 'Steuben',
  SUF: 'Suffolk',
  SUL: 'Sullivan',
  TIO: 'Tioga',
  TOM: 'Tompkins',
  ULS: 'Ulster',
  WAR: 'Warren',
  WAS: 'Washington',
  WAY: 'Wayne',
  WES: 'Westchester',
  WYO: 'Wyoming',
  YAT: 'Yates'
}

export const NYQP_LOCATIONS = { DX: 'Other DX', ...US_STATES, ...CANADIAN_PROVINCES, ...NY_COUNTIES }
