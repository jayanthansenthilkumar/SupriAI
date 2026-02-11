const achievements = {
  tabManager: {
    title: 'Tab Manager',
    description: 'Close 10 inactive tabs',
    points: 50,
    progress: 0,
    target: 10
  },
  focusedBrowser: {
    title: 'Focused Browser',
    description: 'Keep under 5 tabs open for 1 hour',
    points: 100,
    progress: 0,
    target: 60 // minutes
  },
  productiveDay: {
    title: 'Productive Day',
    description: 'Spend more time on productive sites than social media',
    points: 200,
    progress: 0,
    target: 1
  }
};
const productiveSites = [
  'github.com',
  'stackoverflow.com',
  'docs.google.com',
  'linkedin.com',
  'medium.com',
  'dev.to',
  'freecodecamp.org',
  'udemy.com'
];
const socialSites = [
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'www.youtube.com'
];
// Add to popup.js:
function updateAchievements() {
  let points = 0;
  const stats = {
    productiveTime: 0,
    socialTime: 0,
    closedTabs: 0
  };
  // Calculate times
  Object.values(tabData).forEach(tab => {
    if (productiveSites.includes(tab.domain)) {
      stats.productiveTime += tab.totalActiveTime;
    } else if (socialSites.includes(tab.domain)) {
      stats.socialTime += tab.totalActiveTime;
    }
  });
  // Update achievements
  if (stats.productiveTime > stats.socialTime) {
    achievements.productiveDay.progress++;
    if (achievements.productiveDay.progress >= achievements.productiveDay.target) {
      points += achievements.productiveDay.points;
    }
  }
  return points;
}