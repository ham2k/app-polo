// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { cloudSyncPromptDue } from './cloudSyncPrompt'

// The question exists to reach installs whose sync is off by default. Asking anyone
// else either nags an operator who already said no, or asks one who already syncs.
describe('cloudSyncPromptDue', () => {
  const notSyncing = { lofiData: {}, settings: { consentAppData: false, consentOpData: false } }

  it('asks an install whose sync is off and was never chosen', () => {
    expect(cloudSyncPromptDue(notSyncing)).toBe(true)
    // Consents never answered read the same as declined: App.jsx treats both as off.
    expect(cloudSyncPromptDue({ lofiData: undefined, settings: {} })).toBe(true)
  })

  it('never asks an operator who turned sync off', () => {
    expect(cloudSyncPromptDue({ ...notSyncing, lofiData: { enabled: false } })).toBe(false)
  })

  it('does not ask an install that already syncs, whether by the flag or by consent', () => {
    expect(cloudSyncPromptDue({ ...notSyncing, lofiData: { enabled: true } })).toBe(false)
    expect(cloudSyncPromptDue({ ...notSyncing, settings: { consentAppData: true } })).toBe(false)
    expect(cloudSyncPromptDue({ ...notSyncing, settings: { consentOpData: true } })).toBe(false)
  })

  it('asks once: an answer of any kind, Not now included, is final', () => {
    expect(cloudSyncPromptDue({ ...notSyncing, askedCloudSyncOn: 1761480000000 })).toBe(false)
  })
})
