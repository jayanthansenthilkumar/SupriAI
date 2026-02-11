// Initialize default settings
const defaultSettings = {
  siteLimits: {
    'www.youtube.com': 2,
    'facebook.com': 30,
    'twitter.com': 20
  },
  productiveSites: [
    'github.com',
    'stackoverflow.com',
    'docs.google.com',
    'linkedin.com'
  ],
  socialSites: [
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'www.youtube.com'
  ]
};

// Initialize settings in storage if not exists
chrome.storage.local.get(['settings'], ({ settings }) => {
  if (!settings) {
    chrome.storage.local.set({ settings: defaultSettings });
  }
}); 