/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*
https://sotawatch.sota.org.uk/en/

https://www.sotadata.org.uk/summitslist.csv

https://sotastore.blob.core.windows.net/docs/SOTA-General-Rules-June-2022.pdf

At least one QSO must be made from the Summit to qualify an activation.

In order for the activation to qualify for the points attributed to that Summit, a minimum of four
QSOs must be made, each of which must be with a different station.

QSOs must comprise an exchange of callsigns and signal reports; it is strongly recommended that
the summit identifier be given during each contact.

Activator points accrue to the operator regardless of the callsign used. The operator must
be entitled to use the callsign. Multiple operators of the same station may claim activator
points. Each individual operator must make the minimum number of QSOs stated above
in order to claim Activator points.

The Activator claims the Summit points on an expedition basis

Rules for Chasers

With effect from 01-Jan-2004, only one QSO with a given Summit on any one day (defined as 00:00 to 23:59 UTC) counts for points.

 */

export const Info = {
  key: 'sota',
  icon: 'image-filter-hdr',
  name: 'Summits on the Air',
  shortName: 'SOTA',
  doubleContact: 'Summit-to-Summit',
  shortNameDoubleContact: 'S2S',
  infoURL: 'https://www.sota.org.uk/',
  huntingType: 'sota',
  activationType: 'sotaActivation',
  descriptionPlaceholder: 'Enter SOTA reference',
  unknownReferenceName: 'Unknown Summit',
  referenceRegex: /^[A-Z0-9]{1,3}\/[A-Z]{2}-[0-9]{3,}$/i,
  scoring: {
    activates: 'daily', // but points for activating that ref only accrue once per calendar year
    allowsMultipleReferences: false,
    qsosToActivate: 4,
    uniquePer: ['day', 'ref'],
    referenceLabel: 'summit',
    ref2refLabel: 'S2S',
    activatorQSOLabel: 'activator QSO',
    activatorQSOsLabel: 'activator QSOs',
    hunterQSOLabel: 'hunter QSO',
    hunterQSOsLabel: 'hunter QSOs',
    referenceActivatedLabel: 'summit activated',
    referencesActivatedLabel: 'summits activated',
    referenceHuntedLabel: 'summit hunted',
    referencesHuntedLabel: 'summits hunted',
  }
}
