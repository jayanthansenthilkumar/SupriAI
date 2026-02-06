/**
 * Database Usage Examples
 * Demonstrates how to use the database features in SupriAI
 */

// Example 1: Display browsing summary for today
async function displayTodaySummary() {
  try {
    const summary = await DatabaseQueryHelper.getBrowsingSummary('today');
    
    console.log('=== Today\'s Browsing Summary ===');
    console.log(`Total Tabs Opened: ${summary.totalTabs}`);
    console.log(`Unique Domains Visited: ${summary.uniqueDomains}`);
    console.log(`Total Active Time: ${summary.totalActiveTimeFormatted}`);
    console.log(`Total Visits: ${summary.totalVisits}`);
    
    if (summary.uniqueDomains > 0) {
      const avgTime = DatabaseQueryHelper.formatTime(summary.averageTimePerDomain);
      console.log(`Average Time per Domain: ${avgTime}`);
    }
    
    return summary;
  } catch (error) {
    console.error('Error displaying summary:', error);
  }
}

// Example 2: Show top 5 most visited domains this week
async function showTopDomains() {
  try {
    const topDomains = await DatabaseQueryHelper.getMostVisitedDomains(5, 'week');
    
    console.log('\n=== Top 5 Most Visited Domains (This Week) ===');
    topDomains.forEach((domain, index) => {
      const time = DatabaseQueryHelper.formatTime(domain.totalActiveTime);
      console.log(`${index + 1}. ${domain.domain}`);
      console.log(`   Visits: ${domain.visitCount} | Time: ${time} | Tabs: ${domain.tabCount}`);
    });
    
    return topDomains;
  } catch (error) {
    console.error('Error showing top domains:', error);
  }
}

// Example 3: Show domains where you spent the most time
async function showTimeConsumingDomains() {
  try {
    const domains = await DatabaseQueryHelper.getDomainsWithMostTime(5, 'week');
    
    console.log('\n=== Top 5 Time-Consuming Domains (This Week) ===');
    domains.forEach((domain, index) => {
      const time = DatabaseQueryHelper.formatTime(domain.totalActiveTime);
      const avgTimePerVisit = DatabaseQueryHelper.formatTime(
        domain.totalActiveTime / domain.visitCount
      );
      console.log(`${index + 1}. ${domain.domain}`);
      console.log(`   Total Time: ${time}`);
      console.log(`   Avg Time/Visit: ${avgTimePerVisit}`);
      console.log(`   Visits: ${domain.visitCount}`);
    });
    
    return domains;
  } catch (error) {
    console.error('Error showing time-consuming domains:', error);
  }
}

// Example 4: Get current session information
async function showCurrentSession() {
  try {
    const sessionData = await DatabaseQueryHelper.getCurrentSessionData();
    
    console.log('\n=== Current Session ===');
    console.log(`Session ID: ${sessionData.sessionId}`);
    console.log(`Tabs in Session: ${sessionData.tabs.length}`);
    
    if (sessionData.tabs.length > 0) {
      console.log('\nTabs:');
      sessionData.tabs.forEach((tab, index) => {
        const time = DatabaseQueryHelper.formatTime(tab.activeTime);
        console.log(`${index + 1}. ${tab.domain} - ${time}`);
      });
    }
    
    return sessionData;
  } catch (error) {
    console.error('Error showing current session:', error);
  }
}

// Example 5: Get tab history for a specific domain
async function getHistoryForDomain(domain) {
  try {
    const tabs = await DatabaseQueryHelper.getTabHistory(
      Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
      Date.now(),
      domain
    );
    
    console.log(`\n=== Tab History for ${domain} (Last 7 Days) ===`);
    console.log(`Total Tabs: ${tabs.length}`);
    
    if (tabs.length > 0) {
      const totalTime = tabs.reduce((sum, tab) => sum + tab.activeTime, 0);
      console.log(`Total Time: ${DatabaseQueryHelper.formatTime(totalTime)}`);
      
      console.log('\nRecent Tabs:');
      tabs.slice(0, 10).forEach((tab, index) => {
        const date = new Date(tab.timestamp).toLocaleString();
        const time = DatabaseQueryHelper.formatTime(tab.activeTime);
        console.log(`${index + 1}. ${tab.title || tab.url}`);
        console.log(`   Opened: ${date} | Active Time: ${time}`);
      });
    }
    
    return tabs;
  } catch (error) {
    console.error('Error getting domain history:', error);
  }
}

// Example 6: Compare browsing patterns across different time periods
async function compareBrowsingPatterns() {
  try {
    const today = await DatabaseQueryHelper.getBrowsingSummary('today');
    const week = await DatabaseQueryHelper.getBrowsingSummary('week');
    const month = await DatabaseQueryHelper.getBrowsingSummary('month');
    
    console.log('\n=== Browsing Pattern Comparison ===');
    console.log('\nToday:');
    console.log(`  Tabs: ${today.totalTabs} | Domains: ${today.uniqueDomains} | Time: ${today.totalActiveTimeFormatted}`);
    
    console.log('\nThis Week:');
    console.log(`  Tabs: ${week.totalTabs} | Domains: ${week.uniqueDomains} | Time: ${week.totalActiveTimeFormatted}`);
    
    console.log('\nThis Month:');
    console.log(`  Tabs: ${month.totalTabs} | Domains: ${month.uniqueDomains} | Time: ${month.totalActiveTimeFormatted}`);
    
    // Calculate daily averages
    const daysInWeek = 7;
    const daysInMonth = new Date().getDate();
    
    console.log('\nDaily Averages:');
    console.log(`  This Week: ${Math.round(week.totalTabs / daysInWeek)} tabs/day`);
    console.log(`  This Month: ${Math.round(month.totalTabs / daysInMonth)} tabs/day`);
    
    return { today, week, month };
  } catch (error) {
    console.error('Error comparing patterns:', error);
  }
}

// Example 7: Export browsing data
async function exportData() {
  try {
    console.log('\n=== Exporting Data ===');
    await DatabaseQueryHelper.downloadDataAsJSON();
    console.log('Data exported successfully!');
    console.log('Check your downloads folder for the JSON file.');
  } catch (error) {
    console.error('Error exporting data:', error);
  }
}

// Example 8: Clean up old data
async function cleanupOldData(daysToKeep = 30) {
  try {
    console.log(`\n=== Cleaning Up Data Older Than ${daysToKeep} Days ===`);
    const result = await DatabaseQueryHelper.clearOldData(daysToKeep);
    console.log(`Deleted ${result.deletedCount} old records`);
    return result;
  } catch (error) {
    console.error('Error cleaning up data:', error);
  }
}

// Example 9: Analyze productivity
async function analyzeProductivity() {
  try {
    const settings = await chrome.storage.local.get(['settings']);
    const productiveSites = settings.settings?.productiveSites || [];
    const socialSites = settings.settings?.socialSites || [];
    
    const weekStats = await DatabaseQueryHelper.getThisWeeksDomainStats();
    
    let productiveTime = 0;
    let socialTime = 0;
    let otherTime = 0;
    
    weekStats.forEach(stat => {
      if (productiveSites.some(site => stat.domain.includes(site))) {
        productiveTime += stat.totalActiveTime;
      } else if (socialSites.some(site => stat.domain.includes(site))) {
        socialTime += stat.totalActiveTime;
      } else {
        otherTime += stat.totalActiveTime;
      }
    });
    
    const totalTime = productiveTime + socialTime + otherTime;
    
    console.log('\n=== Productivity Analysis (This Week) ===');
    console.log(`Productive Sites: ${DatabaseQueryHelper.formatTime(productiveTime)} (${Math.round(productiveTime / totalTime * 100)}%)`);
    console.log(`Social Sites: ${DatabaseQueryHelper.formatTime(socialTime)} (${Math.round(socialTime / totalTime * 100)}%)`);
    console.log(`Other Sites: ${DatabaseQueryHelper.formatTime(otherTime)} (${Math.round(otherTime / totalTime * 100)}%)`);
    console.log(`Total Time: ${DatabaseQueryHelper.formatTime(totalTime)}`);
    
    return {
      productiveTime,
      socialTime,
      otherTime,
      totalTime,
      productivityRatio: productiveTime / totalTime
    };
  } catch (error) {
    console.error('Error analyzing productivity:', error);
  }
}

// Example 10: Create a simple dashboard
async function createDashboard() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           SupriAI Browsing Dashboard                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  await displayTodaySummary();
  await showTopDomains();
  await showTimeConsumingDomains();
  await analyzeProductivity();
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  End of Dashboard                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// Run the dashboard when this script is loaded
// Uncomment the line below to auto-run the dashboard
// createDashboard();

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    displayTodaySummary,
    showTopDomains,
    showTimeConsumingDomains,
    showCurrentSession,
    getHistoryForDomain,
    compareBrowsingPatterns,
    exportData,
    cleanupOldData,
    analyzeProductivity,
    createDashboard
  };
}
