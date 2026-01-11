/**
 * SupriAI Offline AI Engine
 * Provides AI-like functionality when offline using rule-based logic
 * Simulates intelligent responses without requiring backend ML models
 */

class OfflineAI {
    constructor(offlineManager, offlineAnalytics) {
        this.offlineManager = offlineManager;
        this.offlineAnalytics = offlineAnalytics;
        this.initializeKnowledgeBase();
    }

    // ==========================================
    // KNOWLEDGE BASE
    // ==========================================

    initializeKnowledgeBase() {
        this.knowledgeBase = {
            greetings: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'],
            stats: ['stats', 'statistics', 'analytics', 'report', 'summary', 'progress'],
            productivity: ['productivity', 'performance', 'efficiency', 'focus'],
            goals: ['goal', 'target', 'objective', 'aim'],
            recommendations: ['recommend', 'suggest', 'advice', 'tip', 'help'],
            motivation: ['motivate', 'inspire', 'encourage'],
            streak: ['streak', 'consistency', 'daily'],
            time: ['time', 'hours', 'minutes', 'duration'],
            categories: ['category', 'subject', 'topic', 'area'],
            patterns: ['pattern', 'habit', 'routine', 'schedule']
        };

        this.responses = {
            greetings: [
                "Hello! I'm your offline AI assistant. How can I help you today?",
                "Hi there! Even offline, I'm here to help you analyze your learning journey.",
                "Hey! Ready to explore your study analytics?"
            ],
            fallback: [
                "I'm working in offline mode. I can help you with: statistics, productivity insights, goal tracking, and recommendations.",
                "While offline, I can analyze your local data. Try asking about your stats, productivity, or patterns.",
                "I'm here to help! In offline mode, I can show you analytics, track your progress, and give you insights."
            ]
        };
    }

    // ==========================================
    // CHAT PROCESSING
    // ==========================================

    async processMessage(userMessage) {
        const messageLower = userMessage.toLowerCase();
        
        // Save message
        await this.offlineManager.saveChatMessage('user', userMessage);

        // Determine intent
        const intent = this.detectIntent(messageLower);
        
        // Generate response based on intent
        let response;
        
        switch (intent) {
            case 'greeting':
                response = this.getRandomResponse(this.responses.greetings);
                break;
            
            case 'stats':
                response = await this.generateStatsResponse();
                break;
            
            case 'productivity':
                response = await this.generateProductivityResponse();
                break;
            
            case 'goals':
                response = await this.generateGoalsResponse();
                break;
            
            case 'recommendations':
                response = await this.generateRecommendationsResponse();
                break;
            
            case 'motivation':
                response = await this.generateMotivationResponse();
                break;
            
            case 'streak':
                response = await this.generateStreakResponse();
                break;
            
            case 'categories':
                response = await this.generateCategoriesResponse();
                break;
            
            case 'patterns':
                response = await this.generatePatternsResponse();
                break;
            
            default:
                response = await this.generateSmartFallback(messageLower);
        }

        // Save AI response
        await this.offlineManager.saveChatMessage('assistant', response);
        
        return response;
    }

    detectIntent(message) {
        for (const [intent, keywords] of Object.entries(this.knowledgeBase)) {
            if (keywords.some(keyword => message.includes(keyword))) {
                return intent;
            }
        }
        return 'unknown';
    }

    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // ==========================================
    // RESPONSE GENERATORS
    // ==========================================

    async generateStatsResponse() {
        const todayStats = await this.offlineAnalytics.getTodayStats();
        const weeklyStats = await this.offlineAnalytics.getWeeklyStats();
        const weekTotal = weeklyStats.reduce((sum, day) => sum + day.time, 0);
        
        return `📊 **Your Statistics:**\n\n` +
               `**Today:** ${todayStats.totalTime} minutes across ${todayStats.sessions} sessions\n` +
               `**This Week:** ${weekTotal} minutes total\n` +
               `**Average:** ${Math.round(weekTotal / 7)} minutes per day\n\n` +
               `You're making great progress! 🎯`;
    }

    async generateProductivityResponse() {
        const productivity = await this.offlineAnalytics.getProductivityScore(7);
        const categoryBreakdown = await this.offlineAnalytics.getCategoryBreakdown(7);
        
        let response = `💼 **Productivity Analysis:**\n\n`;
        response += `**Score:** ${productivity.score}% (${productivity.category})\n`;
        response += `**Productive Time:** ${productivity.productiveTime} minutes\n`;
        response += `**Total Time:** ${productivity.totalTime} minutes\n\n`;
        
        if (productivity.score >= 80) {
            response += `Excellent work! You're highly productive! 🌟`;
        } else if (productivity.score >= 60) {
            response += `Good productivity! Keep up the momentum! 💪`;
        } else {
            response += `Let's work on boosting your productivity. Focus on educational content! 📚`;
        }
        
        if (categoryBreakdown.length > 0) {
            response += `\n\n**Top Category:** ${categoryBreakdown[0].category} (${categoryBreakdown[0].percentage}%)`;
        }
        
        return response;
    }

    async generateGoalsResponse() {
        const goals = await this.offlineManager.getGoals();
        const todayStats = await this.offlineAnalytics.getTodayStats();
        
        let response = `🎯 **Your Goals:**\n\n`;
        
        if (goals.length === 0) {
            response += `You haven't set any goals yet. Set a daily time goal to stay motivated!\n\n`;
            response += `**Today's Activity:** ${todayStats.totalTime} minutes`;
        } else {
            goals.forEach((goal, index) => {
                const progress = goal.target ? Math.round((todayStats.totalTime / goal.target) * 100) : 0;
                response += `${index + 1}. ${goal.title || 'Daily Goal'}\n`;
                response += `   Progress: ${progress}% (${todayStats.totalTime}/${goal.target} min)\n`;
            });
        }
        
        return response;
    }

    async generateRecommendationsResponse() {
        const recommendations = await this.offlineAnalytics.generateOfflineRecommendations();
        
        let response = `💡 **Smart Recommendations:**\n\n`;
        
        if (recommendations.length === 0) {
            response += `You're doing great! Keep up the consistent learning. 🌟`;
        } else {
            recommendations.forEach((rec, index) => {
                const emoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
                response += `${emoji} **${rec.title}**\n`;
                response += `   ${rec.message}\n\n`;
            });
        }
        
        return response;
    }

    async generateMotivationResponse() {
        const streak = await this.offlineAnalytics.calculateStreak();
        const productivity = await this.offlineAnalytics.getProductivityScore(7);
        
        const motivationalQuotes = [
            "Success is the sum of small efforts repeated day in and day out. 💪",
            "The expert in anything was once a beginner. Keep learning! 🌟",
            "Your dedication today builds your success tomorrow. 🚀",
            "Every minute of learning is an investment in yourself. 💎",
            "Consistency is the key to mastery. Keep going! 🔥"
        ];
        
        let response = `🌟 **Motivation Boost!**\n\n`;
        response += `${this.getRandomResponse(motivationalQuotes)}\n\n`;
        
        if (streak.current > 0) {
            response += `🔥 You're on a ${streak.current}-day streak! Amazing!\n`;
        }
        
        if (productivity.score >= 70) {
            response += `💼 Your productivity is ${productivity.category.toLowerCase()}!\n`;
        }
        
        response += `\nKeep pushing forward! You're doing fantastic! 🎯`;
        
        return response;
    }

    async generateStreakResponse() {
        const streak = await this.offlineAnalytics.calculateStreak();
        
        let response = `🔥 **Streak Status:**\n\n`;
        response += `**Current Streak:** ${streak.current} days\n`;
        response += `**Longest Streak:** ${streak.longest} days\n`;
        response += `**Total Active Days:** ${streak.totalDays} days\n\n`;
        
        if (streak.current === 0) {
            response += `Start your streak today! Consistency is key to success. 💪`;
        } else if (streak.current === streak.longest) {
            response += `🎉 Personal record! You're on your longest streak ever!`;
        } else {
            response += `Keep it going! Only ${streak.longest - streak.current} more days to beat your record! 🚀`;
        }
        
        return response;
    }

    async generateCategoriesResponse() {
        const categories = await this.offlineAnalytics.getCategoryBreakdown(7);
        
        let response = `📚 **Category Breakdown (Last 7 Days):**\n\n`;
        
        if (categories.length === 0) {
            response += `No activity recorded yet. Start learning to see your breakdown! 📖`;
        } else {
            categories.slice(0, 5).forEach((cat, index) => {
                const bar = '▓'.repeat(Math.round(cat.percentage / 5));
                response += `${index + 1}. **${cat.category}**\n`;
                response += `   ${bar} ${cat.percentage}% (${cat.time} min)\n\n`;
            });
            
            if (categories[0].percentage > 60) {
                response += `💡 Tip: Consider diversifying your learning areas!`;
            }
        }
        
        return response;
    }

    async generatePatternsResponse() {
        const patterns = await this.offlineAnalytics.detectPatterns();
        
        let response = `🔍 **Your Learning Patterns:**\n\n`;
        response += `**Most Active Time:** ${patterns.peakHour}\n`;
        response += `**Most Active Day:** ${patterns.peakDay}\n\n`;
        response += `💡 **Insight:** Schedule your most important learning sessions during your peak times for maximum effectiveness!\n\n`;
        
        // Add weekly pattern visualization
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        response += `**Weekly Pattern:**\n`;
        patterns.weeklyDistribution.forEach((minutes, index) => {
            const hours = (minutes / 60).toFixed(1);
            const bar = '▓'.repeat(Math.round(minutes / 20));
            response += `${days[index]}: ${bar} ${hours}h\n`;
        });
        
        return response;
    }

    async generateSmartFallback(message) {
        // Try to provide contextual help based on message content
        if (message.includes('help')) {
            return this.generateHelpResponse();
        }
        
        if (message.includes('how') || message.includes('what')) {
            return await this.generateInsightsResponse();
        }
        
        return this.getRandomResponse(this.responses.fallback);
    }

    generateHelpResponse() {
        return `🤖 **Offline AI Assistant - Available Commands:**\n\n` +
               `📊 **Analytics:** "Show my stats", "productivity report"\n` +
               `🎯 **Goals:** "Show my goals", "track my progress"\n` +
               `🔥 **Streak:** "What's my streak?", "consistency report"\n` +
               `📚 **Categories:** "Category breakdown", "what am I learning?"\n` +
               `🔍 **Patterns:** "Show my patterns", "when am I most active?"\n` +
               `💡 **Tips:** "Give me recommendations", "motivate me"\n\n` +
               `I'm working in offline mode, but I can still provide deep insights from your local data! 🚀`;
    }

    async generateInsightsResponse() {
        const insights = await this.offlineAnalytics.generateInsights();
        
        let response = `💡 **Quick Insights:**\n\n`;
        insights.forEach(insight => {
            response += `${insight}\n`;
        });
        
        return response;
    }

    // ==========================================
    // SMART SUGGESTIONS
    // ==========================================

    async getSuggestedQuestions() {
        const streak = await this.offlineAnalytics.calculateStreak();
        const todayStats = await this.offlineAnalytics.getTodayStats();
        
        const suggestions = [
            "Show me my weekly statistics",
            "How productive am I?",
            "What are my learning patterns?"
        ];
        
        if (streak.current > 0) {
            suggestions.push("What's my current streak?");
        }
        
        if (todayStats.totalTime > 0) {
            suggestions.push("How am I doing today?");
        }
        
        suggestions.push("Give me some motivation");
        
        return suggestions;
    }

    // ==========================================
    // CONTEXTUAL RESPONSES
    // ==========================================

    async generateContextualGreeting() {
        const hour = new Date().getHours();
        const todayStats = await this.offlineAnalytics.getTodayStats();
        
        let greeting;
        if (hour < 12) {
            greeting = "Good morning!";
        } else if (hour < 18) {
            greeting = "Good afternoon!";
        } else {
            greeting = "Good evening!";
        }
        
        let response = `${greeting} ☀️\n\n`;
        
        if (todayStats.totalTime > 0) {
            response += `You've logged ${todayStats.totalTime} minutes today. `;
            
            if (todayStats.totalTime >= 60) {
                response += `Great job! 🎯`;
            } else {
                response += `Keep going! 💪`;
            }
        } else {
            response += `Ready to start your learning session? Let's make today count! 🚀`;
        }
        
        return response;
    }

    // ==========================================
    // SIMPLE NLP HELPERS
    // ==========================================

    extractNumber(message) {
        const match = message.match(/\d+/);
        return match ? parseInt(match[0]) : null;
    }

    extractTimeframe(message) {
        if (message.includes('today')) return 1;
        if (message.includes('week') || message.includes('7 days')) return 7;
        if (message.includes('month') || message.includes('30 days')) return 30;
        return 7; // default
    }
}

// ==========================================
// EXPORT
// ==========================================

if (typeof window !== 'undefined') {
    window.OfflineAI = OfflineAI;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineAI;
}
