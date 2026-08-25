module.exports = {
  preset: '@react-native/jest-preset',
  // The preset only transforms js/ts/tsx, so anything reaching a .jsx file — every UI
  // component in the app — fails to parse. Same babel-jest, one more extension.
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  // Agent worktrees hold full copies of the repo. Left in, their specs run alongside the real
  // ones and their package.json files collide in the Haste map.
  modulePathIgnorePatterns: ['<rootDir>/.claude/worktrees/', '<rootDir>/.orca/workspaces/']
}
