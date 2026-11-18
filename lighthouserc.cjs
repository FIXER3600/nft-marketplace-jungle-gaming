module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview:lighthouse:mobile',
      startServerReadyPattern: 'Local:',
      url: ['http://127.0.0.1:4182/', 'http://127.0.0.1:4182/nfts/nft-001'],
      numberOfRuns: 3,
      settings: {
        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ],
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttlingMethod: 'simulate',
      },
    },
  },
}
