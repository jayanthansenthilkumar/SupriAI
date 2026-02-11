/**
 * Database Query Helper
 * Provides easy-to-use functions for querying tab history from the popup
 */

class DatabaseQueryHelper {
  /**
   * Get tab history for a specific date range
   */
  static async getTabHistory(startDate, endDate, domain = null) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'getTabHistory',
        startDate,
        endDate,
        domain
      }, (response) => {
        if (response && response.success) {
          resolve(response.tabs);
        } else {
          reject(new Error(response?.error || 'Failed to get tab history'));
        }
      });
    });
  }

  /**
   * Get domain statistics for a date range
   */
  static async getDomainStats(startDate, endDate) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'getDomainStats',
        startDate,
        endDate
      }, (response) => {
        if (response && response.success) {
          resolve(response.stats);
        } else {
          reject(new Error(response?.error || 'Failed to get domain stats'));
        }
      });
    });
  }

  /**
   * Get current session data
   */
  static async getCurrentSessionData() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'getSessionData'
      }, (response) => {
        if (response && response.success) {
          resolve({
            tabs: response.tabs,
            sessionId: response.sessionId
          });
        } else {
          reject(new Error(response?.error || 'Failed to get session data'));
        }
      });
    });
  }

  /**
   * Get session data by session ID
   */
  static async getSessionData(sessionId) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'getSessionData',
        sessionId
      }, (response) => {
        if (response && response.success) {
          resolve({
            tabs: response.tabs,
            sessionId: response.sessionId
          });
        } else {
          reject(new Error(response?.error || 'Failed to get session data'));
        }
      });
    });
  }

  /**
   * Export all data to JSON
   */
  static async exportData() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'exportData'
      }, (response) => {
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Failed to export data'));
        }
      });
    });
  }

  /**
   * Clear old data (older than specified days)
   */
  static async clearOldData(daysToKeep = 30) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'clearOldData',
        daysToKeep
      }, (response) => {
        if (response && response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response?.error || 'Failed to clear old data'));
        }
      });
    });
  }

  /**
   * Get tabs visited today
   */
  static async getTodaysTabs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getTabHistory(today.getTime(), tomorrow.getTime());
  }

  /**
   * Get tabs visited this week
   */
  static async getThisWeeksTabs() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return this.getTabHistory(weekStart.getTime(), Date.now());
  }

  /**
   * Get tabs visited this month
   */
  static async getThisMonthsTabs() {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    return this.getTabHistory(monthStart.getTime(), Date.now());
  }

  /**
   * Get domain stats for today
   */
  static async getTodaysDomainStats() {
    const today = new Date().toISOString().split('T')[0];
    return this.getDomainStats(today, today);
  }

  /**
   * Get domain stats for this week
   */
  static async getThisWeeksDomainStats() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const startDate = weekStart.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    return this.getDomainStats(startDate, endDate);
  }

  /**
   * Get domain stats for this month
   */
  static async getThisMonthsDomainStats() {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startDate = monthStart.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    return this.getDomainStats(startDate, endDate);
  }

  /**
   * Get most visited domains
   */
  static async getMostVisitedDomains(limit = 10, dateRange = 'week') {
    let stats;
    
    switch (dateRange) {
      case 'today':
        stats = await this.getTodaysDomainStats();
        break;
      case 'week':
        stats = await this.getThisWeeksDomainStats();
        break;
      case 'month':
        stats = await this.getThisMonthsDomainStats();
        break;
      default:
        stats = await this.getThisWeeksDomainStats();
    }

    // Aggregate stats by domain
    const domainMap = new Map();
    
    stats.forEach(stat => {
      if (domainMap.has(stat.domain)) {
        const existing = domainMap.get(stat.domain);
        existing.visitCount += stat.visitCount;
        existing.totalActiveTime += stat.totalActiveTime;
        existing.tabCount += stat.tabCount;
      } else {
        domainMap.set(stat.domain, {
          domain: stat.domain,
          visitCount: stat.visitCount,
          totalActiveTime: stat.totalActiveTime,
          tabCount: stat.tabCount
        });
      }
    });

    // Convert to array and sort by visit count
    const sortedDomains = Array.from(domainMap.values())
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, limit);

    return sortedDomains;
  }

  /**
   * Get domains with most time spent
   */
  static async getDomainsWithMostTime(limit = 10, dateRange = 'week') {
    let stats;
    
    switch (dateRange) {
      case 'today':
        stats = await this.getTodaysDomainStats();
        break;
      case 'week':
        stats = await this.getThisWeeksDomainStats();
        break;
      case 'month':
        stats = await this.getThisMonthsDomainStats();
        break;
      default:
        stats = await this.getThisWeeksDomainStats();
    }

    // Aggregate stats by domain
    const domainMap = new Map();
    
    stats.forEach(stat => {
      if (domainMap.has(stat.domain)) {
        const existing = domainMap.get(stat.domain);
        existing.visitCount += stat.visitCount;
        existing.totalActiveTime += stat.totalActiveTime;
        existing.tabCount += stat.tabCount;
      } else {
        domainMap.set(stat.domain, {
          domain: stat.domain,
          visitCount: stat.visitCount,
          totalActiveTime: stat.totalActiveTime,
          tabCount: stat.tabCount
        });
      }
    });

    // Convert to array and sort by total active time
    const sortedDomains = Array.from(domainMap.values())
      .sort((a, b) => b.totalActiveTime - a.totalActiveTime)
      .slice(0, limit);

    return sortedDomains;
  }

  /**
   * Download data as JSON file
   */
  static async downloadDataAsJSON() {
    try {
      const data = await this.exportData();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supri-ai-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error downloading data:', error);
      throw error;
    }
  }

  /**
   * Format time in milliseconds to human-readable format
   */
  static formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get browsing summary for a date range
   */
  static async getBrowsingSummary(dateRange = 'today') {
    let tabs, stats;

    switch (dateRange) {
      case 'today':
        tabs = await this.getTodaysTabs();
        stats = await this.getTodaysDomainStats();
        break;
      case 'week':
        tabs = await this.getThisWeeksTabs();
        stats = await this.getThisWeeksDomainStats();
        break;
      case 'month':
        tabs = await this.getThisMonthsTabs();
        stats = await this.getThisMonthsDomainStats();
        break;
      default:
        tabs = await this.getTodaysTabs();
        stats = await this.getTodaysDomainStats();
    }

    const totalTabs = tabs.length;
    const uniqueDomains = new Set(tabs.map(tab => tab.domain)).size;
    const totalActiveTime = stats.reduce((sum, stat) => sum + stat.totalActiveTime, 0);
    const totalVisits = stats.reduce((sum, stat) => sum + stat.visitCount, 0);

    return {
      totalTabs,
      uniqueDomains,
      totalActiveTime,
      totalActiveTimeFormatted: this.formatTime(totalActiveTime),
      totalVisits,
      averageTimePerDomain: uniqueDomains > 0 ? totalActiveTime / uniqueDomains : 0,
      tabs,
      stats
    };
  }
}
