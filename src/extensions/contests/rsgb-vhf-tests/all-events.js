// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { UHF_BANDS, SHF_BANDS, EHF_BANDS } from '@ham2k/lib-operation-data'
import { RSGB_VHF_MODES } from './RSGBVHFData'

export default [
  {
    key: 'RSGB-BACKPACKERS-1',
    name: '1st 144MHz Backpackers',
    short: '1st Backpackers',
    start: '2026-05-17 10:00Z',
    end: '2026-05-17 13:59Z',
    bands: ['2m'],
    modes: RSGB_VHF_MODES,
    selfSpotting: false,
    exchange: ['number', 'grid6', 'district'],
    bonus: { newGrid: 200, newDistrict: 200, newDXCC: 200 },
    classes: ['5B', '25H']
  },
  {
    key: 'RSGB-BACKPACKERS-2',
    name: '2nd 144MHz Backpackers',
    short: '2nd Backpackers',
    start: '2026-06-14 09:00Z',
    end: '2026-06-14 12:59Z',
    bands: ['2m'],
    modes: RSGB_VHF_MODES,
    selfSpotting: false,
    exchange: ['number', 'grid6'],
    bonus: { newGrid: 200, newDXCC: 200 },
    classes: ['5B', '25H']
  },
  {
    key: 'RSGB-BACKPACKERS-3',
    name: '3rd 144MHz Backpackers',
    short: '3rd Backpackers',
    start: '2026-07-05 10:00Z',
    end: '2026-07-05 13:59Z',
    bands: ['2m'],
    modes: RSGB_VHF_MODES,
    selfSpotting: false,
    exchange: ['number', 'grid6'],
    bonus: { newGrid: 500 },
    classes: ['5B', '25H']
  },
  {
    key: 'RSGB-BACKPACKERS-4',
    name: '4th 144MHz Backpackers',
    short: '4th Backpackers',
    start: '2026-08-01 14:00Z',
    end: '2026-08-01 17:59Z',
    bands: ['2m'],
    modes: RSGB_VHF_MODES,
    selfSpotting: false,
    exchange: ['number', 'grid6', 'district'],
    bonus: { newGrid: 200, newDistrict: 200, newDXCC: 200 },
    classes: ['5B', '25H']
  },
  {
    key: 'RSGB-BACKPACKERS-5',
    name: '5th 144MHz Backpackers',
    short: '5th Backpackers',
    start: '2026-09-06 10:00Z',
    end: '2026-09-06 13:59Z',
    bands: ['2m'],
    modes: RSGB_VHF_MODES,
    selfSpotting: false,
    exchange: ['number', 'grid6'],
    bonus: { newGrid: 500 },
    classes: ['5B', '25H']
  },
  {
    key: 'RSGB-70-AFS',
    name: '70MHz AFS Contest',
    short: '70MHz AFS',
    start: '2026-09-20 09:00Z',
    end: '2026-09-20 11:59Z',
    bands: ['4m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-50-AFS',
    name: '50MHz AFS Contest',
    short: '50MHz AFS',
    start: '2026-10-18 09:00Z',
    end: '2026-10-18 12:59Z',
    bands: ['6m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-144-AFS',
    name: '144MHz AFS',
    short: '144MHz AFS',
    start: '2026-12-06 10:00Z',
    end: '2026-12-06 13:59Z',
    bands: ['2m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-432-AFS',
    name: '432MHz AFS',
    short: '432MHz AFS',
    start: '2026-02-08 09:00Z',
    end: '2026-02-08 12:59Z',
    bands: ['70cm'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-144-432-MARCH',
    name: 'March 144 432MHz',
    short: 'March 144-432',
    start: '2026-03-07 14:00Z',
    end: '2026-03-08 13:59Z',
    bands: ['2m', '70cm'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-432-245-MAY',
    name: 'May 432MHz-245GHz',
    short: 'May 432MHz-245GHz',
    start: '2026-05-02 14:00Z',
    end: '2026-05-03 13:59Z',
    bands: [...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-432-245-OCT',
    name: 'October 432MHz-245GHz',
    short: 'Oct 432MHz-245GHz',
    start: '2026-10-03 14:00Z',
    end: '2026-10-04 13:59Z',
    bands: [...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-144-MAY',
    name: 'May 144MHz Contest',
    short: 'May 144MHz',
    start: '2026-05-16 14:00Z',
    end: '2026-05-17 13:59Z',
    bands: ['2m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-70-TROPHY',
    name: '70MHz Trophy Contest',
    short: '70MHz Trophy',
    start: '2026-07-18 14:00Z',
    end: '2026-07-18 19:59Z',
    bands: ['4m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-50-TROPHY',
    name: '50MHz Trophy Contest',
    short: '50MHz Trophy',
    start: '2026-06-20 14:00Z',
    end: '2026-06-21 13:59Z',
    bands: ['6m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-144-TROPHY',
    name: '144MHz Trophy Contest',
    short: '144MHz Trophy',
    start: '2026-09-05 14:00Z',
    end: '2026-09-06 13:59Z',
    bands: ['2m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-432-TROPHY',
    name: '432MHz Trophy Contest',
    short: '432MHz Trophy',
    start: '2026-05-02 14:00Z',
    end: '2026-05-02 19:59Z',
    bands: ['70cm'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-2300-TROPHY',
    name: '2.3GHz Trophy Contest',
    short: '2.3GHz Trophy',
    start: '2026-10-03 14:00Z',
    end: '2026-10-03 21:59Z',
    bands: ['13cm'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-1300-TROPHY',
    name: '1.3GHz Trophy Contest',
    short: '1.3GHz Trophy',
    start: '2026-10-03 14:00Z',
    end: '2026-10-03 21:59Z',
    bands: ['23cm'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-10G-TROPHY',
    name: '10GHz Trophy Contest',
    short: '10GHz Trophy',
    start: '2026-05-24 08:00Z',
    end: '2026-05-24 13:59Z',
    bands: ['3cm'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-70-CW',
    name: '70MHz Contest CW',
    short: '70MHz CW',
    start: '2026-05-10 09:00Z',
    end: '2026-05-10 11:59Z',
    bands: ['4m'],
    modes: ['CW']
  },
  {
    key: 'RSGB-50-CW',
    name: '50MHz Contest CW',
    short: '50MHz CW',
    start: '2026-06-28 09:00Z',
    end: '2026-06-28 11:59Z',
    bands: ['6m'],
    modes: ['CW']
  },
  {
    key: 'RSGB-144-LP',
    name: '144MHz Low Power Contest',
    short: '144MHz LP',
    start: '2026-08-01 14:00Z',
    end: '2026-08-01 17:59Z',
    bands: ['2m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-432-LP',
    name: '432MHz Low Power Contest',
    short: '432MHz LP',
    start: '2026-08-02 08:00Z',
    end: '2026-08-02 11:59Z',
    bands: ['70cm'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-144-MARCONI',
    name: '144MHz CW Marconi',
    short: '144 CW Marconi',
    start: '2026-11-07 14:00Z',
    end: '2026-11-08 13:59Z',
    bands: ['2m'],
    modes: ['CW']
  },
  {
    key: 'RSGB-70-XMAS',
    name: '70MHz Christmas Contest',
    short: '70MHz Xmas',
    start: '2026-12-28 15:00Z',
    end: '2026-12-28 16:59Z',
    bands: ['4m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-50-XMAS',
    name: '50MHz Christmas Contest',
    short: '50MHz Xmas',
    start: '2026-12-27 15:00Z',
    end: '2026-12-27 16:59Z',
    bands: ['6m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-144-XMAS',
    name: '144MHz Christmas Contest',
    short: '144MHz Xmas',
    start: '2026-12-29 15:00Z',
    end: '2026-12-29 16:59Z',
    bands: ['2m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-432-XMAS',
    name: '432MHz Christmas Contest',
    short: '432MHz Xmas',
    start: '2026-12-30 15:00Z',
    end: '2026-12-30 16:59Z',
    bands: ['70cm'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-144-FMAC-JAN',
    name: 'January 144MHz FMAC',
    short: 'Jan 144 FMAC',
    start: '2026-01-06 19:00Z',
    end: '2026-01-06 19:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-144-FMAC-FEB',
    name: 'February 144MHz FMAC',
    short: 'Feb 144 FMAC',
    start: '2026-02-03 19:00Z',
    end: '2026-02-03 19:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-144-FMAC-MAR',
    name: 'March 144MHz FMAC',
    short: 'Jan 144 FMAC',
    start: '2026-03-03 19:00Z',
    end: '2026-03-03 19:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-144-FMAC-APR',
    name: 'April 144MHz FMAC',
    short: 'Apr 144 FMAC',
    start: '2026-04-07 18:00Z',
    end: '2026-04-07 18:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-144-FMAC-MAY',
    name: 'May 144MHz FMAC',
    short: 'May 144 FMAC',
    start: '2026-05-05 18:00Z',
    end: '2026-05-05 18:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-144-FMAC-JUN',
    name: 'June 144MHz FMAC',
    short: 'Jun 144 FMAC',
    start: '2026-06-02 18:00Z',
    end: '2026-06-02 18:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-144-FMAC-JUL',
    name: 'July 144MHz FMAC',
    short: 'Jul 144 FMAC',
    start: '2026-07-07 18:00Z',
    end: '2026-07-07 18:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-144-FMAC-AUG',
    name: 'August 144MHz FMAC',
    short: 'Aug 144 FMAC',
    start: '2026-08-04 18:00Z',
    end: '2026-08-04 18:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-144-FMAC-SEP',
    name: 'September 144MHz FMAC',
    short: 'Sep 144 FMAC',
    start: '2026-09-01 18:00Z',
    end: '2026-09-01 18:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-144-FMAC-OCT',
    name: 'October 144MHz FMAC',
    short: 'Oct 144 FMAC',
    start: '2026-10-06 18:00Z',
    end: '2026-10-06 18:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-144-FMAC-NOV',
    name: 'November 144MHz FMAC',
    short: 'Nov 144 FMAC',
    start: '2026-11-03 19:00Z',
    end: '2026-11-03 19:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-144-FMAC-DEC',
    name: 'December 144MHz FMAC',
    short: 'Dec 144 FMAC',
    start: '2026-12-01 19:00Z',
    end: '2026-12-01 19:54Z',
    modes: ['FM'],
    bands: ['2m']
  },
  {
    key: 'RSGB-432-FMAC-JAN',
    name: 'January 432MHz FMAC',
    short: 'Jan 432 FMAC',
    start: '2026-01-13 19:00Z',
    end: '2026-01-13 19:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-FMAC-FEB',
    name: 'February 432MHz FMAC',
    short: 'Feb 432 FMAC',
    start: '2026-02-10 19:00Z',
    end: '2026-02-10 19:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-FMAC-MAR',
    name: 'March 432MHz FMAC',
    short: 'Mar 432 FMAC',
    start: '2026-03-10 19:00Z',
    end: '2026-03-10 19:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-FMAC-APR',
    name: 'April 432MHz FMAC',
    short: 'Apr 432 FMAC',
    start: '2026-04-14 18:00Z',
    end: '2026-04-14 18:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-FMAC-MAY',
    name: 'May 432MHz FMAC',
    short: 'May 432 FMAC',
    start: '2026-05-12 18:00Z',
    end: '2026-05-12 18:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-FMAC-JUN',
    name: 'June 432MHz FMAC',
    short: 'Jun 432 FMAC',
    start: '2026-06-09 18:00Z',
    end: '2026-06-09 18:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-FMAC-JUL',
    name: 'July 432MHz FMAC',
    short: 'Jul 432 FMAC',
    start: '2026-07-14 18:00Z',
    end: '2026-07-14 18:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-FMAC-AUG',
    name: 'August 432MHz FMAC',
    short: 'Aug 432 FMAC',
    start: '2026-08-11 18:00Z',
    end: '2026-08-11 18:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-FMAC-SEP',
    name: 'September 432MHz FMAC',
    short: 'Sep 432 FMAC',
    start: '2026-09-08 18:00Z',
    end: '2026-09-08 18:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-FMAC-OCT',
    name: 'October 432MHz FMAC',
    short: 'Oct 432 FMAC',
    start: '2026-10-13 18:00Z',
    end: '2026-10-13 18:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-FMAC-NOV',
    name: 'November 432MHz FMAC',
    short: 'Nov 432 FMAC',
    start: '2026-11-10 19:00Z',
    end: '2026-11-10 19:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-FMAC-DEC',
    name: 'December 432MHz FMAC',
    short: 'Dec 432 FMAC',
    start: '2026-12-08 19:00Z',
    end: '2026-12-08 19:54Z',
    modes: ['FM'],
    bands: ['70cm']
  },
  {
    key: 'RSGB-144-UKAC-JAN',
    name: 'January 144MHz UKAC',
    short: 'Jan 144 UKAC',
    start: '2026-01-06 20:00Z',
    end: '2026-01-06 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-144-UKAC-FEB',
    name: 'February 144MHz UKAC',
    short: 'Feb 144 UKAC',
    start: '2026-02-03 20:00Z',
    end: '2026-02-03 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-144-UKAC-MAR',
    name: 'March 144MHz UKAC',
    short: 'Mar 144 UKAC',
    start: '2026-03-03 20:00Z',
    end: '2026-03-03 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-144-UKAC-APR',
    name: 'April 144MHz UKAC',
    short: 'Apr 144 UKAC',
    start: '2026-04-07 19:00Z',
    end: '2026-04-07 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-144-UKAC-MAY',
    name: 'May 144MHz UKAC',
    short: 'May 144 UKAC',
    start: '2026-05-05 19:00Z',
    end: '2026-05-05 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-144-UKAC-JUN',
    name: 'June 144MHz UKAC',
    short: 'Jun 144 UKAC',
    start: '2026-06-02 19:00Z',
    end: '2026-06-02 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-144-UKAC-JUL',
    name: 'July 144MHz UKAC',
    short: 'Jul 144 UKAC',
    start: '2026-07-07 19:00Z',
    end: '2026-07-07 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-144-UKAC-AUG',
    name: 'August 144MHz UKAC',
    short: 'Aug 144 UKAC',
    start: '2026-08-04 19:00Z',
    end: '2026-08-04 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-144-UKAC-SEP',
    name: 'September 144MHz UKAC',
    short: 'Sep 144 UKAC',
    start: '2026-09-01 19:00Z',
    end: '2026-09-01 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-144-UKAC-OCT',
    name: 'October 144MHz UKAC',
    short: 'Oct 144 UKAC',
    start: '2026-10-06 19:00Z',
    end: '2026-10-06 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-144-UKAC-NOV',
    name: 'November 144MHz UKAC',
    short: 'Nov 144 UKAC',
    start: '2026-11-03 20:00Z',
    end: '2026-11-03 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-144-UKAC-DEC',
    name: 'December 144MHz UKAC',
    short: 'Dec 144 UKAC',
    start: '2026-12-01 20:00Z',
    end: '2026-12-01 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['2m']
  },
  {
    key: 'RSGB-432-UKAC-JAN',
    name: 'January 432MHz UKAC',
    short: 'Jan 432 UKAC',
    start: '2026-01-13 20:00Z',
    end: '2026-01-13 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-UKAC-FEB',
    name: 'February 432MHz UKAC',
    short: 'Feb 432 UKAC',
    start: '2026-02-10 20:00Z',
    end: '2026-02-10 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-UKAC-MAR',
    name: 'March 432MHz UKAC',
    short: 'Mar 432 UKAC',
    start: '2026-03-10 20:00Z',
    end: '2026-03-10 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-UKAC-APR',
    name: 'April 432MHz UKAC',
    short: 'Apr 432 UKAC',
    start: '2026-04-14 19:00Z',
    end: '2026-04-14 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-UKAC-MAY',
    name: 'May 432MHz UKAC',
    short: 'May 432 UKAC',
    start: '2026-05-12 19:00Z',
    end: '2026-05-12 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-UKAC-JUN',
    name: 'June 432MHz UKAC',
    short: 'Jun 432 UKAC',
    start: '2026-06-09 19:00Z',
    end: '2026-06-09 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-UKAC-JUL',
    name: 'July 432MHz UKAC',
    short: 'Jul 432 UKAC',
    start: '2026-07-14 19:00Z',
    end: '2026-07-14 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-UKAC-AUG',
    name: 'August 432MHz UKAC',
    short: 'Aug 432 UKAC',
    start: '2026-08-11 19:00Z',
    end: '2026-08-11 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-UKAC-SEP',
    name: 'September 432MHz UKAC',
    short: 'Sep 432 UKAC',
    start: '2026-09-08 19:00Z',
    end: '2026-09-08 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-UKAC-OCT',
    name: 'October 432MHz UKAC',
    short: 'Oct 432 UKAC',
    start: '2026-10-13 19:00Z',
    end: '2026-10-13 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-UKAC-NOV',
    name: 'November 432MHz UKAC',
    short: 'Nov 432 UKAC',
    start: '2026-11-10 20:00Z',
    end: '2026-11-10 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-432-UKAC-DEC',
    name: 'December 432MHz UKAC',
    short: 'Dec 432 UKAC',
    start: '2026-12-08 20:00Z',
    end: '2026-12-08 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['70cm']
  },
  {
    key: 'RSGB-70-UKAC-JAN',
    name: '70MHz UKAC',
    short: '70MHz UKAC',
    start: '2026-01-15 20:00Z',
    end: '2026-01-15 22:29Z',
    bands: ['4m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-70-UKAC-FEB',
    name: 'February 70MHz UKAC',
    short: 'Feb 70MHz UKAC',
    start: '2026-02-19 20:00Z',
    end: '2026-02-19 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['4m']
  },
  {
    key: 'RSGB-70-UKAC-MAR',
    name: 'March 70MHz UKAC',
    short: 'Mar 70MHz UKAC',
    start: '2026-03-19 20:00Z',
    end: '2026-03-19 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['4m']
  },
  {
    key: 'RSGB-70-UKAC-APR',
    name: 'April 70MHz UKAC',
    short: 'Apr 70MHz UKAC',
    start: '2026-04-16 19:00Z',
    end: '2026-04-16 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['4m']
  },
  {
    key: 'RSGB-70-UKAC-MAY',
    name: 'May 70MHz UKAC',
    short: 'May 70MHz UKAC',
    start: '2026-05-21 19:00Z',
    end: '2026-05-21 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['4m']
  },
  {
    key: 'RSGB-70-UKAC-JUN',
    name: 'June 70MHz UKAC',
    short: 'Jun 70MHz UKAC',
    start: '2026-06-18 19:00Z',
    end: '2026-06-18 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['4m']
  },
  {
    key: 'RSGB-70-UKAC-JUL',
    name: 'July 70MHz UKAC',
    short: 'Jul 70MHz UKAC',
    start: '2026-07-16 19:00Z',
    end: '2026-07-16 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['4m']
  },
  {
    key: 'RSGB-70-UKAC-AUG',
    name: 'August 70MHz UKAC',
    short: 'Aug 70MHz UKAC',
    start: '2026-08-20 19:00Z',
    end: '2026-08-20 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['4m']
  },
  {
    key: 'RSGB-70-UKAC-SEP',
    name: 'September 70MHz UKAC',
    short: 'Sep 70MHz UKAC',
    start: '2026-09-17 19:00Z',
    end: '2026-09-17 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['4m']
  },
  {
    key: 'RSGB-70-UKAC-OCT',
    name: 'October 70MHz UKAC',
    short: 'Oct 70MHz UKAC',
    start: '2026-10-15 19:00Z',
    end: '2026-10-15 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['4m']
  },
  {
    key: 'RSGB-70-UKAC-NOV',
    name: 'November 70MHz UKAC',
    short: 'Nov 70MHz UKAC',
    start: '2026-11-19 20:00Z',
    end: '2026-11-19 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['4m']
  },
  {
    key: 'RSGB-70-UKAC-DEC',
    name: 'December 70MHz UKAC',
    short: 'Dec 70MHz UKAC',
    start: '2026-12-17 20:00Z',
    end: '2026-12-17 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['4m']
  },
  {
    key: 'RSGB-50-UKAC-JAN',
    name: 'January 50MHz UKAC',
    short: 'Jan 50MHz UKAC',
    start: '2026-01-08 20:00Z',
    end: '2026-01-08 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['6m']
  },
  {
    key: 'RSGB-50-UKAC-FEB',
    name: '50MHz UKAC',
    short: '50MHz UKAC',
    start: '2026-02-12 20:00Z',
    end: '2026-02-12 22:29Z',
    bands: ['6m'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-50-UKAC-MAR',
    name: 'March 50MHz UKAC',
    short: 'Mar 50MHz UKAC',
    start: '2026-03-12 20:00Z',
    end: '2026-03-12 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['6m']
  },
  {
    key: 'RSGB-50-UKAC-APR',
    name: 'April 50MHz UKAC',
    short: 'Apr 50MHz UKAC',
    start: '2026-04-09 19:00Z',
    end: '2026-04-09 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['6m']
  },
  {
    key: 'RSGB-50-UKAC-MAY',
    name: 'May 50MHz UKAC',
    short: 'May 50MHz UKAC',
    start: '2026-05-14 19:00Z',
    end: '2026-05-14 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['6m']
  },
  {
    key: 'RSGB-50-UKAC-JUN',
    name: 'June 50MHz UKAC',
    short: 'Jun 50MHz UKAC',
    start: '2026-06-11 19:00Z',
    end: '2026-06-11 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['6m']
  },
  {
    key: 'RSGB-50-UKAC-JUL',
    name: 'July 50MHz UKAC',
    short: 'Jul 50MHz UKAC',
    start: '2026-07-09 19:00Z',
    end: '2026-07-09 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['6m']
  },
  {
    key: 'RSGB-50-UKAC-AUG',
    name: 'August 50MHz UKAC',
    short: 'Aug 50MHz UKAC',
    start: '2026-08-13 19:00Z',
    end: '2026-08-13 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['6m']
  },
  {
    key: 'RSGB-50-UKAC-SEP',
    name: 'September 50MHz UKAC',
    short: 'Sep 50MHz UKAC',
    start: '2026-09-10 19:00Z',
    end: '2026-09-10 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['6m']
  },
  {
    key: 'RSGB-50-UKAC-OCT',
    name: 'October 50MHz UKAC',
    short: 'Oct 50MHz UKAC',
    start: '2026-10-08 19:00Z',
    end: '2026-10-08 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['6m']
  },
  {
    key: 'RSGB-50-UKAC-NOV',
    name: 'November 50MHz UKAC',
    short: 'Nov 50MHz UKAC',
    start: '2026-11-12 20:00Z',
    end: '2026-11-12 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['6m']
  },
  {
    key: 'RSGB-50-UKAC-DEC',
    name: 'December 50MHz UKAC',
    short: 'Dec 50MHz UKAC',
    start: '2026-12-10 20:00Z',
    end: '2026-12-10 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['6m']
  },
  {
    key: 'RSGB-SHF-UKAC-JAN',
    name: 'SHF UKAC',
    short: 'SHF UKAC',
    start: '2026-01-27 19:30Z',
    end: '2026-01-27 22:29Z',
    bands: ['13cm', '9cm', '6cm', '3cm'],
    modes: RSGB_VHF_MODES
  },
  {
    key: 'RSGB-SHF-UKAC-FEB',
    name: 'February SHF UKAC',
    short: 'Feb SHF UKAC',
    start: '2026-02-24 19:30Z',
    end: '2026-02-24 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['13cm', '9cm', '6cm', '3cm']
  },
  {
    key: 'RSGB-SHF-UKAC-MAR',
    name: 'March SHF UKAC',
    short: 'Mar SHF UKAC',
    start: '2026-03-24 19:30Z',
    end: '2026-03-24 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['13cm', '9cm', '6cm', '3cm']
  },
  {
    key: 'RSGB-SHF-UKAC-APR',
    name: 'April SHF UKAC',
    short: 'Apr SHF UKAC',
    start: '2026-04-28 18:30Z',
    end: '2026-04-28 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['13cm', '9cm', '6cm', '3cm']
  },
  {
    key: 'RSGB-SHF-UKAC-MAY',
    name: 'May SHF UKAC',
    short: 'May SHF UKAC',
    start: '2026-05-26 18:30Z',
    end: '2026-05-26 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['13cm', '9cm', '6cm', '3cm']
  },
  {
    key: 'RSGB-SHF-UKAC-JUN',
    name: 'June SHF UKAC',
    short: 'Jun SHF UKAC',
    start: '2026-06-23 18:30Z',
    end: '2026-06-23 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['13cm', '9cm', '6cm', '3cm']
  },
  {
    key: 'RSGB-SHF-UKAC-JUL',
    name: 'July SHF UKAC',
    short: 'Jul SHF UKAC',
    start: '2026-07-28 18:30Z',
    end: '2026-07-28 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['13cm', '9cm', '6cm', '3cm']
  },
  {
    key: 'RSGB-SHF-UKAC-AUG',
    name: 'August SHF UKAC',
    short: 'Aug SHF UKAC',
    start: '2026-08-25 18:30Z',
    end: '2026-08-25 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['13cm', '9cm', '6cm', '3cm']
  },
  {
    key: 'RSGB-SHF-UKAC-SEP',
    name: 'September SHF UKAC',
    short: 'Sep SHF UKAC',
    start: '2026-09-22 18:30Z',
    end: '2026-09-22 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['13cm', '9cm', '6cm', '3cm']
  },
  {
    key: 'RSGB-SHF-UKAC-OCT',
    name: 'October SHF UKAC',
    short: 'Oct SHF UKAC',
    start: '2026-10-27 19:30Z',
    end: '2026-10-27 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['13cm', '9cm', '6cm', '3cm']
  },
  {
    key: 'RSGB-SHF-UKAC-NOV',
    name: 'November SHF UKAC',
    short: 'Nov SHF UKAC',
    start: '2026-11-24 19:30Z',
    end: '2026-11-24 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['13cm', '9cm', '6cm', '3cm']
  },
  {
    key: 'RSGB-1300-UKAC-JAN',
    name: 'January 1.3GHz UKAC',
    short: 'Jan 1.3GHz UKAC',
    start: '2026-01-20 20:00Z',
    end: '2026-01-20 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  },
  {
    key: 'RSGB-1300-UKAC-FEB',
    name: 'February 1.3GHz UKAC',
    short: 'Feb 1.3GHz UKAC',
    start: '2026-02-17 20:00Z',
    end: '2026-02-17 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  },
  {
    key: 'RSGB-1300-UKAC-MAR',
    name: 'March 1.3GHz UKAC',
    short: 'Mar 1.3GHz UKAC',
    start: '2026-03-17 20:00Z',
    end: '2026-03-17 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  },
  {
    key: 'RSGB-1300-UKAC-APR',
    name: 'April 1.3GHz UKAC',
    short: 'Apr 1.3GHz UKAC',
    start: '2026-04-21 19:00Z',
    end: '2026-04-21 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  },
  {
    key: 'RSGB-1300-UKAC-MAY',
    name: 'May 1.3GHz UKAC',
    short: 'May 1.3GHz UKAC',
    start: '2026-05-19 19:00Z',
    end: '2026-05-19 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  },
  {
    key: 'RSGB-1300-UKAC-JUN',
    name: 'June 1.3GHz UKAC',
    short: 'Jun 1.3GHz UKAC',
    start: '2026-06-16 19:00Z',
    end: '2026-06-16 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  },
  {
    key: 'RSGB-1300-UKAC-JUL',
    name: 'July 1.3GHz UKAC',
    short: 'Jul 1.3GHz UKAC',
    start: '2026-07-21 19:00Z',
    end: '2026-07-21 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  },
  {
    key: 'RSGB-1300-UKAC-AUG',
    name: 'August 1.3GHz UKAC',
    short: 'Aug 1.3GHz UKAC',
    start: '2026-08-18 19:00Z',
    end: '2026-08-18 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  },
  {
    key: 'RSGB-1300-UKAC-SEP',
    name: 'September 1.3GHz UKAC',
    short: 'Sep 1.3GHz UKAC',
    start: '2026-09-15 19:00Z',
    end: '2026-09-15 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  },
  {
    key: 'RSGB-1300-UKAC-OCT',
    name: 'October 1.3GHz UKAC',
    short: 'Oct 1.3GHz UKAC',
    start: '2026-10-20 19:00Z',
    end: '2026-10-20 21:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  },
  {
    key: 'RSGB-1300-UKAC-NOV',
    name: 'November 1.3GHz UKAC',
    short: 'Nov 1.3GHz UKAC',
    start: '2026-11-17 20:00Z',
    end: '2026-11-17 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  },
  {
    key: 'RSGB-1300-UKAC-DEC',
    name: 'December 1.3GHz UKAC',
    short: 'Dec 1.3GHz UKAC',
    start: '2026-12-15 20:00Z',
    end: '2026-12-15 22:29Z',
    modes: RSGB_VHF_MODES,
    bands: ['23cm']
  }
]
