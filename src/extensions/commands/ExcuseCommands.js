// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { newEventQSO } from '../../store/qsos'

const Info = {
  key: 'commands-excuse',
  name: 'Excuse Commands'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: ExcuseCommandHook })
  }
}

export default Extension

const ExcuseCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-excuse',
  match: /^(EXCUSE)$/i,
  describeCommand: (match, { operation, t }) => {
    if (!operation) return ''
    return t?.('extensions.commands-excuse.prompt', 'Log a random excuse?') || 'Log a random excuse?'
  },
  invokeCommand: (match, { operation, dispatch, t }) => {
    if (!operation) return ''

    const excuse = EXCUSES[Math.floor(Math.random() * EXCUSES.length)]

    const event = {
      event: 'note',
      command: 'EXCUSE',
      icon: 'sticker-text-outline',
      note: excuse,
      operatorCall: operation?.local?.operatorCall
    }
    dispatch(newEventQSO({ uuid: operation.uuid, event }))

    return t?.('extensions.commands-excuse.confirm', 'Excuse logged: ‘{{excuse}}’', { excuse }) || `Excuse logged: ‘${excuse}’`
  }
}

const EXCUSES = [
  'Taking out the trash',
  'Walking the dog',
  'In the shower',
  'On a work call',
  'Fixing the garage door',
  'Looking for my keys',
  'Helping the neighbor with something',
  'On hold with the bank',
  'Refilling the bird feeder',
  'Checking the mail',
  'Untangling the garden hose',
  'Looking for a lost sock',
  'On a video call',
  'Charging my phone',
  'Cleaning out the gutters',
  'Doing the dishes',
  'Folding laundry',
  'Checking the tire pressure',
  'Talking to the mailman',
  'Sorting recycling',
  'On the phone with the dentist',
  'Looking for a phone charger',
  'Watering the plants',
  'Sweeping the porch',
  'Fixing a leaky faucet',
  'Setting up the router',
  'Doing paperwork',
  'On hold with customer service',
  'Cleaning the car',
  'Rotating the tires',
  'Sorting through old boxes',
  'Looking for the TV remote',
  'Checking on dinner',
  'In a meeting',
  'Reading emails',
  'On a conference call',
  'Restarting the computer',
  'Updating the software',
  'Checking the weather forecast',
  'Talking to a delivery driver',
  'Signing for a package',
  'Looking for reading glasses',
  'Untangling extension cords',
  'Organizing the garage',
  'Sorting the mail',
  'On the phone with the insurance company',
  'Filling out a form',
  'Checking the oil in the car',
  'Replacing a lightbulb',
  'Looking for the flashlight',
  'Checking the fuse box',
  'On the phone with a friend',
  'Taking a phone call from work',
  'Scheduling an appointment',
  'Looking for the tape measure',
  'Measuring for new curtains',
  'Talking to the neighbor about the fence',
  'Checking the mailbox',
  'Reorganizing the pantry',
  'Sorting through paperwork',
  'On hold with tech support',
  'Reviewing the budget',
  'Checking bank statements',
  'Paying bills',
  'On a call with the accountant',
  'Looking for a stamp',
  'Wrapping a package',
  'Taking the recycling out',
  'Checking the smoke detector batteries',
  'Adjusting the thermostat',
  'On the phone with the vet',
  'Feeding the cat',
  'Cleaning the litter box',
  'Refilling the water bowl',
  'Checking on the kids',
  'Helping with homework',
  'Reading a bedtime story',
  'Tucking the kids in',
  'On the phone with school',
  'Signing a permission slip',
  'Packing a lunch',
  'Doing meal prep',
  'Checking the recipe',
  'Stirring something on the stove',
  'Taking bread out of the oven',
  'Doing a load of dishes',
  'Wiping down the counters',
  'Vacuuming the living room',
  'Dusting the shelves',
  'Making the bed',
  'Changing the sheets',
  'Looking for a spare battery',
  'Checking the smoke alarm',
  'Reading the instruction manual',
  'On hold with the cable company',
  'Rebooting the modem',
  'Checking the Wi-Fi signal',
  'Looking for the spare key',
  'Locking up the shed',
  'Bringing in the trash bins'
]
