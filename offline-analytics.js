/**
 * SupriAI Offline Analytics Engine
 * Provides local analytics, insights, and ML-like functionality when offline
 */

class OfflineAnalytics {
    constructor(offlineManager) {
        this.offlineManager = offlineManager;
    }

    // ==========================================
    // TIME ANALYTICS
    // ==========================================

    async getTodayStats() {
        const logs = await this.offlineManager.getAll(STORES.ACTIVITY_LOGS);
        const today = new Date().toISOString().split('T')[0];
        
        const todayLogs = logs.filter(log => {
            const logDate = new Date(log.timestamp).toISOString().split('T')[0];
            return logDate === today;
        });

        const totalTime = todayLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        const sessionsCount = todayLogs.length;
        
        return {
            totalTime: Math.round(totalTime / 60), // Convert to minutes
            sessions: sessionsCount,
            averageSession: sessionsCount > 0 ? Math.round(totalTime / sessionsCount / 60) : 0
        };
    }

    async getWeeklyStats() {
        const logs = await this.offlineManager.getAll(STORES.ACTIVITY_LOGS);
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        const weekLogs = logs.filter(log => log.timestamp >= weekAgo);
        
        // Group by date
        const dailyData = {};
        weekLogs.forEach(log => {
            const date = new Date(log.timestamp).toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { time: 0, sessions: 0 };
            }
            dailyData[date].time += log.duration || 0;
            dailyData[date].sessions++;
        });

        // Fill missing dates
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            result.push({
                date: dateStr,
                time: dailyData[dateStr] ? Math.round(dailyData[dateStr].time / 60) : 0,
                sessions: dailyData[dateStr] ? dailyData[dateStr].sessions : 0
            });
        }

        return result;
    }

    // ==========================================
    // CATEGORY ANALYTICS
    // ==========================================

    async getCategoryBreakdown(days = 7) {
        const logs = await this.offlineManager.getAll(STORES.ACTIVITY_LOGS);
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        const recentLogs = logs.filter(log => log.timestamp >= cutoff);
        
        const categories = {};
        recentLogs.forEach(log => {
            const cat = log.category || 'Other';
            if (!categories[cat]) {
                categories[cat] = { time: 0, count: 0 };
            }
            categories[cat].time += log.duration || 0;
            categories[cat].count++;
        });

        // Convert to array and sort by time
        const result = Object.entries(categories).map(([name, data]) => ({
            category: name,
            time: Math.round(data.time / 60),
            sessions: data.count,
            percentage: 0
        }));

        const totalTime = result.reduce((sum, item) => sum + item.time, 0);
        result.forEach(item => {
            item.percentage = totalTime > 0 ? Math.round((item.time / totalTime) * 100) : 0;
        });

        return result.sort((a, b) => b.time - a.time);
    }

    async getTopWebsites(limit = 10, days = 7) {
        const history = await this.offlineManager.getAll(STORES.BROWSING_HISTORY);
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        const recentHistory = history.filter(item => item.timestamp >= cutoff);
        
        const websites = {};
        recentHistory.forEach(item => {
            const url = item.url || item.domain || 'Unknown';
            if (!websites[url]) {
                websites[url] = { visits: 0, time: 0 };
            }
            websites[url].visits++;
            websites[url].time += item.duration || 0;
        });

        const result = Object.entries(websites).map(([url, data]) => ({
            url,
            visits: data.visits,
            time: Math.round(data.time / 60)
        }));

        return result.sort((a, b) => b.time - a.time).slice(0, limit);
    }

    // ==========================================
    // PRODUCTIVITY ANALYTICS
    // ==========================================

    async getProductivityScore(days = 7) {
        const logs = await this.offlineManager.getAll(STORES.ACTIVITY_LOGS);
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        const recentLogs = logs.filter(log => log.timestamp >= cutoff);
        
        // Define productive categories
        const productiveCategories = ['Education', 'Work', 'Development', 'Research', 'Learning'];
        
        let productiveTime = 0;
        let totalTime = 0;
        
        recentLogs.forEach(log => {
            const duration = log.duration || 0;
            totalTime += duration;
            
            if (productiveCategories.includes(log.category)) {
                productiveTime += duration;
            }
        });

        const score = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;
        
        return {
            score,
            productiveTime: Math.round(productiveTime / 60),
            totalTime: Math.round(totalTime / 60),
            category: this.getScoreCategory(score)
        };
    }

    getScoreCategory(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Average';
        if (score >= 20) return 'Below Average';
        return 'Needs Improvement';
    }

    // ==========================================
    // STREAK TRACKING
    // ==========================================

    async calculateStreak() {
        const logs = await this.offlineManager.getAll(STORES.ACTIVITY_LOGS);
        
        // Group by date
        const dates = new Set();
        logs.forEach(log => {
            const date = new Date(log.timestamp).toISOString().split('T')[0];
            dates.add(date);
        });

        // Sort dates
        const sortedDates = Array.from(dates).sort().reverse();
        
        // Calculate current streak
        let currentStreak = 0;
        const today = new Date().toISOString().split('T')[0];
        
        if (sortedDates[0] === today || sortedDates[0] === this.getYesterday()) {
            let checkDate = new Date();
            
            for (const dateStr of sortedDates) {
                const expectedDate = checkDate.toISOString().split('T')[0];
                
                if (dateStr === expectedDate) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        // Calculate longest streak
        let longestStreak = 0;
        let tempStreak = 0;
        let prevDate = null;

        for (const dateStr of sortedDates) {
            const currentDate = new Date(dateStr);
            
            if (prevDate === null || this.isConsecutiveDay(prevDate, currentDate)) {
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 1;
            }
            
            prevDate = currentDate;
        }

        return {
            current: currentStreak,
            longest: longestStreak,
            totalDays: dates.size
        };
    }

    getYesterday() {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    }

    isConsecutiveDay(date1, date2) {
        const diff = Math.abs(date1 - date2);
        return diff === 24 * 60 * 60 * 1000;
    }

    // ==========================================
    // PATTERN DETECTION
    // ==========================================

    async detectPatterns() {
        const logs = await this.offlineManager.getAll(STORES.ACTIVITY_LOGS);
        const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        const recentLogs = logs.filter(log => log.timestamp >= last30Days);
        
        // Hour of day analysis
        const hourlyActivity = new Array(24).fill(0);
        recentLogs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            hourlyActivity[hour] += log.duration || 0;
        });

        const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
        
        // Day of week analysis
        const weekdayActivity = new Array(7).fill(0);
        recentLogs.forEach(log => {
            const day = new Date(log.timestamp).getDay();
            weekdayActivity[day] += log.duration || 0;
        });

        const peakDay = weekdayActivity.indexOf(Math.max(...weekdayActivity));
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return {
            peakHour: `${peakHour}:00 - ${peakHour + 1}:00`,
            peakDay: dayNames[peakDay],
            hourlyDistribution: hourlyActivity.map(minutes => Math.round(minutes / 60)),
            weeklyDistribution: weekdayActivity.map(minutes => Math.round(minutes / 60))
        };
    }

    // ==========================================
    // RECOMMENDATIONS (OFFLINE)
    // ==========================================

    async generateOfflineRecommendations() {
        const categoryBreakdown = await this.getCategoryBreakdown(7);
        const productivity = await this.getProductivityScore(7);
        const patterns = await this.detectPatterns();
        const streak = await this.calculateStreak();

        const recommendations = [];

        // Productivity-based recommendations
        if (productivity.score < 50) {
            recommendations.push({
                type: 'productivity',
                title: 'Boost Your Productivity',
                message: `Your productivity score is ${productivity.score}%. Try focusing more on educational content.`,
                priority: 'high'
            });
        }

        // Streak-based recommendations
        if (streak.current === 0 && streak.longest > 0) {
            recommendations.push({
                type: 'streak',
                title: 'Rebuild Your Streak',
                message: `You had a ${streak.longest}-day streak before. Let's start a new one today!`,
                priority: 'medium'
            });
        } else if (streak.current > 0) {
            recommendations.push({
                type: 'streak',
                title: 'Keep Your Streak Going!',
                message: `Great job! You're on a ${streak.current}-day streak. Don't break it!`,
                priority: 'medium'
            });
        }

        // Pattern-based recommendations
        recommendations.push({
            type: 'pattern',
            title: 'Optimize Your Schedule',
            message: `You're most active at ${patterns.peakHour} on ${patterns.peakDay}s. Plan important tasks then.`,
            priority: 'low'
        });

        // Balance recommendations
        const topCategory = categoryBreakdown[0];
        if (topCategory && topCategory.percentage > 70) {
            recommendations.push({
                type: 'balance',
                title: 'Diversify Your Activities',
                message: `${topCategory.percentage}% of your time is in ${topCategory.category}. Try exploring other areas.`,
                priority: 'medium'
            });
        }

        return recommendations;
    }

    // ==========================================
    // GOALS TRACKING
    // ==========================================

    async trackGoalProgress(goalId, targetMinutes) {
        const todayStats = await this.getTodayStats();
        const progress = (todayStats.totalTime / targetMinutes) * 100;
        
        return {
            progress: Math.min(progress, 100),
            currentMinutes: todayStats.totalTime,
            targetMinutes,
            remaining: Math.max(targetMinutes - todayStats.totalTime, 0)
        };
    }

    // ==========================================
    // EXPORT DATA
    // ==========================================

    async exportAnalytics() {
        const weeklyStats = await this.getWeeklyStats();
        const categoryBreakdown = await this.getCategoryBreakdown(30);
        const productivity = await this.getProductivityScore(30);
        const streak = await this.calculateStreak();
        const patterns = await this.detectPatterns();

        return {
            generated: new Date().toISOString(),
            period: '30 days',
            weeklyStats,
            categoryBreakdown,
            productivity,
            streak,
            patterns
        };
    }

    // ==========================================
    // SMART INSIGHTS
    // ==========================================

    async generateInsights() {
        const todayStats = await this.getTodayStats();
        const weeklyStats = await this.getWeeklyStats();
        const productivity = await this.getProductivityScore(7);
        const streak = await this.calculateStreak();

        const insights = [];

        // Today vs yesterday
        if (weeklyStats.length >= 2) {
            const today = weeklyStats[weeklyStats.length - 1];
            const yesterday = weeklyStats[weeklyStats.length - 2];
            
            if (today.time > yesterday.time) {
                const increase = ((today.time - yesterday.time) / yesterday.time * 100).toFixed(0);
                insights.push(`📈 You're ${increase}% more active today than yesterday!`);
            } else if (yesterday.time > 0) {
                const decrease = ((yesterday.time - today.time) / yesterday.time * 100).toFixed(0);
                insights.push(`📉 You're ${decrease}% less active today. Let's catch up!`);
            }
        }

        // Weekly trend
        const weekTotal = weeklyStats.reduce((sum, day) => sum + day.time, 0);
        const weekAverage = Math.round(weekTotal / 7);
        insights.push(`📊 Your weekly average is ${weekAverage} minutes per day`);

        // Productivity insight
        insights.push(`💼 Productivity score: ${productivity.score}% (${productivity.category})`);

        // Streak insight
        if (streak.current > 0) {
            insights.push(`🔥 ${streak.current}-day streak! Keep going!`);
        }

        return insights;
    }
}

// ==========================================
// EXPORT
// ==========================================

if (typeof window !== 'undefined') {
    window.OfflineAnalytics = OfflineAnalytics;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineAnalytics;
}
