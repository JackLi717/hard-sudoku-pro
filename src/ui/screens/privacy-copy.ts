/** One English privacy notice is used in every app language. */
export const PRIVACY_COPY = {
  title: 'Privacy',
  sections: [
    {
      title: 'Data on this device',
      body: 'Puzzles, progress, settings, hint balances, daily reward dates and streaks, and Premium status are stored locally. No app account is required.',
    },
    {
      title: 'Optional rewarded ads',
      body: 'Google Mobile Ads and its consent system are used only for optional rewarded ads where available. The app requests non-personalized ads, does not request tracking permission and does not read IDFA.',
    },
    {
      title: 'Store purchases',
      body: 'Apple or Google processes purchases and restoration. The app stores only the resulting Premium entitlement locally and does not send receipts to its own server.',
    },
    {
      title: 'Game analytics and crash diagnostics',
      body: 'The app automatically sends game usage and crash data, including necessary installation identifiers and device information, to Google Analytics for Firebase and Firebase Crashlytics. We use Google reports to understand usage, improve the game and fix issues. This monitoring does not access your contacts, photos or precise location. Uninstalling stops future transmissions but does not automatically delete data already received by Google. Privacy enquiries: admin@readytradie.com.',
    },
  ],
  managePrivacy: 'Manage ad privacy choices',
  privacyUpdated:
    'The privacy form was closed and your latest choice was applied.',
  privacyOptionsUnavailable: 'Privacy options are unavailable right now.',
  privacyNotRequired:
    'The advertising consent provider does not currently require a privacy-options form for this store context.',
} as const;
