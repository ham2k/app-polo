/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState } from 'react'
import { WelcomeDialog } from './WelcomeDialog'
import { CallsignDialog } from './CallsignDialog'
import { ActivitiesDialog } from './ActivitiesDialog'
import { ConsentDialog } from './ConsentDialog'
import { AccountDialog } from './AccountDialog'
import { AccountVerificationDialog } from './AccountVerificationDialog'

export function OnboardingManager ({ settings, styles, onOnboardingDone }) {
  const [step, setStep] = useState('welcome')

  return (
    <>
      {step === 'welcome' && (
        <WelcomeDialog
          settings={settings}
          styles={styles}
          onDialogPrevious={() => onOnboardingDone()}
          onDialogNext={() => setStep('callsign')}
          onAccountConnect={() => setStep('account')}
        />
      )}
      {step === 'account' && (
        <AccountDialog
          settings={settings}
          styles={styles}
          onDialogPrevious={() => setStep('welcome')}
          onDialogNext={() => setStep('accountVerification')}
        />
      )}
      {step === 'accountVerification' && (
        <AccountVerificationDialog
          settings={settings}
          styles={styles}
          onDialogPrevious={() => setStep('account')}
          onDialogNext={() => onOnboardingDone()}
          onAccountReady={() => onOnboardingDone}
        />
      )}
      {step === 'callsign' && (
        <CallsignDialog
          settings={settings}
          styles={styles}
          onDialogPrevious={() => setStep('welcome')}
          onDialogNext={() => setStep('activities')}
        />
      )}
      {step === 'activities' && (
        <ActivitiesDialog
          settings={settings}
          styles={styles}
          onDialogPrevious={() => setStep('callsign')}
          onDialogNext={() => setStep('consent')}
        />
      )}
      {step === 'consent' && (
        <ConsentDialog
          settings={settings}
          styles={styles}
          onDialogPrevious={() => setStep('activities')}
          onDialogNext={() => onOnboardingDone()}
          nextLabel={'Done'}
        />
      )}
    </>
  )
}
