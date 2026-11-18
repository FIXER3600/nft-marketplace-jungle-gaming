module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview:lighthouse:desktop',
      startServerReadyPattern: 'Local:',
      url: ['http://127.0.0.1:4183/', 'http://127.0.0.1:4183/nfts/nft-001'],
      numberOfRuns: 3,
      settings: {
        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ],
        preset: 'desktop',
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttlingMethod: 'simulate',
      },
    },
  },
}
