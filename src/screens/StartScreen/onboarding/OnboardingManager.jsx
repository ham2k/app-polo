import React, { useState } from 'react'
import { KeyboardAvoidingView } from 'react-native'
import { Portal } from 'react-native-paper'
import { WelcomeDialog } from './WelcomeDialog'
import { CallsignDialog } from './CallsignDialog'
import { ActivitiesDialog } from './ActivitiesDialog'
import { ConsentDialog } from './ConsentDialog'

export function OnboardingManager ({ settings, styles, onOnboardingDone }) {
  const [step, setStep] = useState('welcome')

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        {step === 'welcome' && (
          <WelcomeDialog
            settings={settings}
            styles={styles}
            onDialogPrevious={() => onOnboardingDone()}
            onDialogNext={() => setStep('callsign')}
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
      </KeyboardAvoidingView>
    </Portal>
  )
}
