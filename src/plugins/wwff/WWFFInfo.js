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

export const INFO = {
  key: 'wwff',
  icon: 'flower',
  name: 'World Wide Flora & Fauna',
  shortName: 'WWFF',
  infoURL: 'https://wwff.co/',
  huntingType: 'wwff',
  activationType: 'wwffActivation',
  descriptionPlaceholder: 'Enter WWFF reference',
  referenceRegex: /^[A-Z0-9]+FF-[0-9]{4,5}$/
}
