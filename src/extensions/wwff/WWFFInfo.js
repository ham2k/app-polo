/*
https://wwff.co/

https://wwff.co/wwff-data/wwff_directory.csv

https://wwff.co/wwff_cont/uploads/2023/04/WWFF-Global-Rules-V_5.9.pdf

For all WWFF activations, a minimum of 44 QSOs are required for the activity to
count towards WWFF activator awards. For some national awards lower
amounts of QSOs might suffice.

The 44 QSOs can be accrued over multiple activations. They do not have to be
attained during one activation.

Valid contacts will include an exchange between the activator and the hunter of
their respective call signs, a signal report, and wherever possible the WWFF
reference number.

Contacts with the same chaser using a club call sign, a vanity call sign, or a
special event call sign for example, are allowed and will count towards the 44
QSO threshold.

Rules for Hunters

For hunters to claim a park contact, the activator’s log must be uploaded to
WWFF Logsearch. There are instances where park activators do not provide
their logs for upload to Logsearch. Unfortunately, in these instances, the contact
will not count towards WWFF global awards
 */

export const Info = {
  key: 'wwff',
  icon: 'flower',
  name: 'World Wide Flora & Fauna',
  shortName: 'WWFF',
  infoURL: 'https://wwff.co/',
  huntingType: 'wwff',
  activationType: 'wwffActivation',
  descriptionPlaceholder: 'Enter WWFF reference',
  unknownReferenceName: 'Unknown Park',
  referenceRegex: /^[A-Z0-9]+FF-[0-9]{4,5}$/i
}
