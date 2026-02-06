# Tabs Tracker - Browser Extension 🖥️

As a developer I constantly find myself with multiple tabs active which definitely has impact on my device (Chrome tabs are memory killers 🔪). At the same there are momemts when I log on to youtube and then without even knowing just surfing videos one after other. To tackle such obstacles, I have developed **Tab Tracker** - A powerful browser extension that helps you understand and manage your browsing habits through intuitive visualizations and smart tab management features.

## Demo

[![Watch how Tabs Tracker works](https://img.youtube.com/vi/NYsOK1AgWF4/0.jpg)](https://www.youtube.com/watch?v=-NYsOK1AgWF4)

## 🌟 Features

### 1. Time Tracking & Analytics

- **Visual Time Distribution**: Interactive pie chart showing time spent on different websites
- **Daily Activity Patterns**: Line graph displaying your browsing activity throughout the day
- **Productivity Analysis**: Doughnut chart categorizing your time into:
  - Productive time (work/learning related sites)
  - Social media time
  - Other activities

### 2. Smart Tab Management

- **Tab Groups**: Automatically groups tabs by domain
  - Shows number of open tabs per domain
  - Displays total time spent on each domain
  - Quick actions to manage grouped tabs

- **Inactive Tab Detection**:
  - Identifies tabs inactive for more than 5 minutes
  - Option to close inactive tabs individually
  - Helps reduce browser memory usage

### 3. Time Limits & Notifications

- **Custom Time Limits**: Set time limits for specific websites
- **Visual Warnings**: Clear indicators when time limits are exceeded
- **Quick Actions**: Easy options to close time-exceeded tabs
- **Sorted Display**: Prioritizes showing time-exceeded tabs at the top

### 4. Customizable Settings

- **Time Limits Management**:
  - Add/remove time limits for any domain
  - Customize duration for each site

- **Site Categorization**:
  - Define productive sites
  - Specify social media sites
  - Flexible categorization for accurate productivity tracking

## 🎯 Why Use Tabs Tracker?

1. **Productivity Enhancement**:
   - Understand your browsing patterns
   - Identify time-consuming websites
   - Make informed decisions about your online time

2. **Resource Management**:
   - Reduce browser clutter
   - Manage memory usage
   - Keep your browsing organized

3. **Digital Wellbeing**:
   - Set healthy browsing limits
   - Balance productive and leisure time
   - Avoid excessive social media use

## 🚀 Getting Started

### Installation

1. ⭐ the repository first.
2. Download this repo as zip file or clone the repo.
3. **Configure API Keys** (Required for AI features):
   - Open `config/keys.js`
   - Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key
   - See `config/README.md` for detailed instructions
4. Go to `chrome://extensions/` >> Turn on developer mode >> Load unpacked >> Select the repo directory
5. The extension will automatically start tracking your tab usage
6. Access the dashboard by clicking the extension icon
7. Configure your preferences in the Settings tab:
   - Set up time limits
   - Define productive/social sites
   - Customize tracking preferences

## 🛠️ Technical Details

Built using:

- JavaScript
- Chrome Extension APIs
- Chart.js for visualizations
- Local Storage for data persistence

Key APIs used:

- `chrome.tabs`
- `chrome.storage`
- `chrome.windows`
- `chrome.runtime`

## 🔜 Future Enhancements

1. **Advanced Analytics**:
   - Weekly/Monthly reports
   - Export data functionality
   - Custom date range analysis

2. **Smart Features**:
   - AI-powered productivity suggestions
   - Automatic tab organization
   - Smart tab suspension

3. **Customization**:
   - Custom themes
   - Configurable dashboard layouts
   - More chart types and visualizations

4. **Integration**:
   - Calendar integration
   - Task management tools
   - Cross-device sync

5. **Gamification**:
   - Productivity streaks
   - Achievement system
   - Daily/weekly goals

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests

---

Made with ❤️ for better browsing habits
