// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

/*
 * Whether an onboarded install is asked the Cloud Sync question on its own, once.
 *
 * Only an install whose sync is off without anyone having chosen that: the `ham2k-lofi`
 * flag was never set, and neither consent turns sync on in its place (the same rule
 * App.jsx uses for GLOBAL.syncEnabled). A flag set either way is a choice — by this
 * question during onboarding, or in the Sync settings — and an install syncing through
 * consent has nothing to be asked.
 */
export function cloudSyncPromptDue ({ lofiData, settings, askedCloudSyncOn }) {
  if (askedCloudSyncOn) return false
  if (lofiData?.enabled !== undefined) return false
  return !settings?.consentAppData && !settings?.consentOpData
}
