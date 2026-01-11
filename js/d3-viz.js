

/**
 * D3 Visualizations Stub
 * This is a placeholder class - the project uses Chart.js for visualizations.
 * This class provides empty implementations to prevent errors if D3 methods are called.
 */
export class D3Visualizations {
    constructor() {
        this.colors = {
            primary: '#1a73e8',
            success: '#34A853',
            warning: '#FBBC05',
            danger: '#EA4335',
            info: '#4285F4',
            categories: [
                '#4285F4', '#EA4335', '#FBBC05', '#34A853',
                '#A142F4', '#24C1E0', '#FA7B17', '#F439A0',
                '#9334E6', '#4285F4'
            ]
        };

        this.d3Available = false;
        // Silent initialization - Chart.js is the primary visualization library
    }

    createCategoryPieChart(data, containerId) {
        // Handled by Chart.js in dashboard
        return null;
    }

    createTimelineChart(data, containerId) {
        // Handled by Chart.js in dashboard
        return null;
    }

    createNetworkGraph(data, containerId) {
        // Not implemented - using Chart.js alternatives
        return null;
    }

    createHeatmap(data, containerId) {
        // Not implemented - using Chart.js alternatives
        return null;
    }

    createSankeyDiagram(data, containerId) {
        // Not implemented - using Chart.js alternatives
        return null;
    }

    createForceDirectedGraph(data, containerId) {
        // Not implemented - using Chart.js alternatives
        return null;
    }

    updateTheme(isDark) {
        // Theme handled by CSS variables
        return null;
    }

    destroy() {
        // No cleanup needed
        return null;
    }
}

// Helper function for time formatting
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

function formatTimeShort(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor(ms / (1000 * 60));
    return `${minutes}m`;
}
