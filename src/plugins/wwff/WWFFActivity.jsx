const ACTIVITY = {
  key: 'wwff',
  comingSoon: true,
  icon: 'flower',
  name: 'World Wide Flora & Fauna',
  shortName: 'WWFF',
  infoURL: 'https://wwff.co/',
  exchangeShortLabel: 'W2W',
  huntingType: 'wwff',
  activationType: 'wwffActivation',
  description: (operation) => 'COMING SOON!',
  descriptionPlaceholder: 'Enter WWWF reference'
}

const ThisActivity = {
  ...ACTIVITY,
  MainExchangePanel: null,
  OptionalExchangePanel: null
}

export default ThisActivity
