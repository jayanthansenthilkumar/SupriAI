/**
 * SupriAI - Complete Pages Functionality
 * Comprehensive implementation for Library, Reviews, Goals, Community pages
 */

// ==========================================
// LIBRARY PAGE - Complete Implementation
// ==========================================

let libraryFilter = 'all';
let libraryData = [];

async function loadLibraryData() {
    try {
        showLoadingState('libraryHistoryTable');
        
        // Load history
        const historyResponse = await fetch(`${API_URL}/api/history?days=30&limit=100`);
        const historyData = await historyResponse.json();

        if (historyData.status === 'success') {
            libraryData = historyData.history || [];
            renderLibraryHistory(libraryData);
            updateLibraryStats(libraryData);
        }

        // Load bookmarks
        const bookmarksResponse = await fetch(`${API_URL}/api/bookmarks`);
        const bookmarksData = await bookmarksResponse.json();

        if (bookmarksData.status === 'success') {
            renderBookmarks(bookmarksData.bookmarks || []);
        }

    } catch (e) {
        console.error("Failed to load library:", e);
        showError('libraryHistoryTable', 'Failed to load library data');
    }
}

function updateLibraryStats(history) {
    // Total items
    document.getElementById('libraryTotalItems').textContent = history.length;
    
    // Count bookmarks
    fetch(`${API_URL}/api/bookmarks`)
        .then(r => r.json())
        .then(data => {
            const count = data.bookmarks?.length || 0;
            document.getElementById('libraryBookmarks').textContent = count;
        });
    
    // This week count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = history.filter(h => new Date(h.timestamp) > weekAgo).length;
    document.getElementById('libraryThisWeek').textContent = thisWeek;
    
    // Top topic
    const topics = {};
    history.forEach(h => {
        topics[h.topic] = (topics[h.topic] || 0) + 1;
    });
    const topTopic = Object.keys(topics).sort((a, b) => topics[b] - topics[a])[0] || 'None';
    document.getElementById('libraryTopTopic').textContent = topTopic;
}

function renderLibraryHistory(history) {
    const tbody = document.getElementById('libraryHistoryTable');
    
    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #5f6368;">No learning history yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = history.map(item => {
        const duration = formatDuration(item.duration);
        const engagement = item.engagement_score || calculateEngagement(item);
        const date = formatDate(item.timestamp);
        const bookmarked = item.is_bookmarked ? '<i class="ri-bookmark-fill" style="color: #f9ab00;"></i>' : '';
        
        return `
            <tr>
                <td><span class="chip">${item.topic || 'General'}</span></td>
                <td>
                    <div style="max-width: 350px; overflow: hidden; text-overflow: ellipsis;">
                        ${bookmarked} ${item.title || 'Untitled'}
                    </div>
                    <div class="text-secondary" style="font-size: 0.8em;">${truncate(item.url, 50)}</div>
                </td>
                <td>${duration}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="progress-bar" style="width: 60px; height: 6px;">
                            <div class="fill" style="width: ${engagement}%"></div>
                        </div>
                        <span style="font-size: 0.9em;">${engagement}%</span>
                    </div>
                </td>
                <td>${date}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="icon-btn" onclick="bookmarkHistoryItem(${item.id})" title="Bookmark">
                            <i class="ri-bookmark-line"></i>
                        </button>
                        <button class="icon-btn" onclick="deleteHistoryItem(${item.id})" title="Delete">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderBookmarks(bookmarks) {
    const grid = document.getElementById('bookmarksGrid');
    
    if (!bookmarks || bookmarks.length === 0) {
        grid.innerHTML = `
            <div class="google-card" style="text-align: center; padding: 40px;">
                <i class="ri-bookmark-line" style="font-size: 48px; color: #dadce0;"></i>
                <p style="margin-top: 10px; color: #5f6368;">No bookmarks yet</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = bookmarks.map(bookmark => `
        <div class="google-card">
            <div class="card-header">
                <i class="ri-bookmark-fill" style="color: #f9ab00;"></i>
                <button class="icon-btn" onclick="deleteBookmark(${bookmark.id})">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
            <h3 style="font-size: 1.1rem; margin: 10px 0;">${bookmark.title || 'Untitled'}</h3>
            <p class="text-secondary" style="font-size: 0.85em; margin-bottom: 10px;">${bookmark.topic || 'General'} • ${formatDate(bookmark.created_at)}</p>
            ${bookmark.notes ? `<p style="color: #5f6368; line-height: 1.5; margin: 10px 0;">${truncate(bookmark.notes, 100)}</p>` : ''}
            <a href="${bookmark.url}" target="_blank" class="text-btn primary-text" style="margin-top: 10px; display: inline-block;">
                <i class="ri-external-link-line"></i> Open
            </a>
        </div>
    `).join('');
}

function filterLibrary(filter) {
    libraryFilter = filter;
    
    // Update active button
    document.querySelectorAll('#view-library .chip').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    let filtered = libraryData;
    
    if (filter === 'bookmarks') {
        filtered = libraryData.filter(item => item.is_bookmarked);
    } else if (filter === 'recent') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = libraryData.filter(item => new Date(item.timestamp) > weekAgo);
    } else if (filter === 'favorites') {
        filtered = libraryData.filter(item => item.is_favorite);
    }
    
    renderLibraryHistory(filtered);
}

function searchLibrary() {
    const query = document.getElementById('librarySearch').value.toLowerCase();
    
    if (!query) {
        renderLibraryHistory(libraryData);
        return;
    }
    
    const filtered = libraryData.filter(item => 
        item.title?.toLowerCase().includes(query) ||
        item.url?.toLowerCase().includes(query) ||
        item.topic?.toLowerCase().includes(query)
    );
    
    renderLibraryHistory(filtered);
}

async function bookmarkHistoryItem(historyId) {
    try {
        const item = libraryData.find(h => h.id === historyId);
        if (!item) return;
        
        const response = await fetch(`${API_URL}/api/bookmarks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: item.url,
                title: item.title,
                topic: item.topic,
                notes: ''
            })
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            showNotification('Bookmarked successfully!', 'success');
            loadLibraryData();
        }
    } catch (e) {
        showNotification('Failed to bookmark', 'error');
    }
}

async function deleteBookmark(bookmarkId) {
    if (!confirm('Delete this bookmark?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/bookmarks/${bookmarkId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            showNotification('Bookmark deleted', 'success');
            loadLibraryData();
        }
    } catch (e) {
        showNotification('Failed to delete', 'error');
    }
}

function showAddBookmarkDialog() {
    Swal.fire({
        title: 'Add Bookmark',
        html: `
            <input id="bookmark-url" class="swal2-input" placeholder="URL">
            <input id="bookmark-title" class="swal2-input" placeholder="Title">
            <select id="bookmark-topic" class="swal2-input">
                <option value="">Select Topic</option>
                <option value="Programming">Programming</option>
                <option value="AI/ML">AI/ML</option>
                <option value="Web Development">Web Development</option>
                <option value="Data Science">Data Science</option>
                <option value="Design">Design</option>
                <option value="Other">Other</option>
            </select>
            <textarea id="bookmark-notes" class="swal2-textarea" placeholder="Notes (optional)"></textarea>
        `,
        showCancelButton: true,
        confirmButtonText: 'Save',
        preConfirm: () => {
            return {
                url: document.getElementById('bookmark-url').value,
                title: document.getElementById('bookmark-title').value,
                topic: document.getElementById('bookmark-topic').value,
                notes: document.getElementById('bookmark-notes').value
            };
        }
    }).then(async (result) => {
        if (result.isConfirmed && result.value.url) {
            try {
                const response = await fetch(`${API_URL}/api/bookmarks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result.value)
                });
                
                const data = await response.json();
                if (data.status === 'success') {
                    showNotification('Bookmark added!', 'success');
                    loadLibraryData();
                }
            } catch (e) {
                showNotification('Failed to add bookmark', 'error');
            }
        }
    });
}

function exportLibraryCSV() {
    const csv = [
        ['Topic', 'Title', 'URL', 'Duration', 'Engagement', 'Date'],
        ...libraryData.map(item => [
            item.topic || '',
            item.title || '',
            item.url || '',
            item.duration || 0,
            item.engagement_score || 0,
            item.timestamp || ''
        ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}


// ==========================================
// NOTES/REVIEWS PAGE - Complete Implementation
// ==========================================

let notesData = [];

async function loadNotesData() {
    try {
        const response = await fetch(`${API_URL}/api/notes`);
        const data = await response.json();

        if (data.status === 'success') {
            notesData = data.notes || [];
            renderNotes(notesData);
        }
    } catch (e) {
        console.error("Failed to load notes:", e);
    }
}

function renderNotes(notes) {
    const grid = document.getElementById('notesGrid');
    
    if (!notes || notes.length === 0) {
        grid.innerHTML = `
            <div class="google-card" style="text-align: center; padding: 60px;">
                <i class="ri-sticky-note-line" style="font-size: 48px; color: #dadce0;"></i>
                <p style="margin-top: 10px; color: #5f6368;">No notes yet. Create your first learning note above!</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = notes.map(note => {
        const categoryColors = {
            reflection: '#1a73e8',
            tip: '#f9ab00',
            problem: '#188038',
            resource: '#d93025',
            idea: '#9334e6'
        };
        
        const color = categoryColors[note.category] || '#5f6368';
        const tags = note.tags ? note.tags.split(',').map(t => t.trim()) : [];
        
        return `
            <div class="google-card">
                <div class="card-header">
                    <span class="chip" style="background: ${color}22; color: ${color};">${note.category || 'Note'}</span>
                    <div>
                        <button class="icon-btn" onclick="editNote(${note.id})"><i class="ri-edit-line"></i></button>
                        <button class="icon-btn" onclick="deleteNote(${note.id})"><i class="ri-delete-bin-line"></i></button>
                    </div>
                </div>
                <h3 style="font-size: 1.1rem; margin: 10px 0;">${note.title || 'Untitled'}</h3>
                <p style="color: #5f6368; line-height: 1.6; margin: 10px 0;">${truncate(note.content, 200)}</p>
                ${tags.length > 0 ? `
                    <div style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
                        ${tags.map(tag => `<span class="chip" style="font-size: 0.75rem; padding: 4px 8px;">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="text-secondary" style="font-size: 0.8em; margin-top: 10px;">
                    <i class="ri-time-line"></i> ${formatDate(note.created_at)}
                </div>
            </div>
        `;
    }).join('');
}

async function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const category = document.getElementById('noteCategory').value;
    const content = document.getElementById('noteContent').value.trim();
    const tags = document.getElementById('noteTags').value.trim();
    
    if (!content) {
        showNotification('Please enter note content', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title || 'Untitled Note',
                category: category,
                content: content,
                tags: tags
            })
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            showNotification('Note saved successfully!', 'success');
            clearNoteForm();
            loadNotesData();
        }
    } catch (e) {
        showNotification('Failed to save note', 'error');
    }
}

function clearNoteForm() {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteCategory').value = 'reflection';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteTags').value = '';
}

async function editNote(noteId) {
    const note = notesData.find(n => n.id === noteId);
    if (!note) return;
    
    Swal.fire({
        title: 'Edit Note',
        html: `
            <input id="edit-title" class="swal2-input" value="${note.title || ''}" placeholder="Title">
            <select id="edit-category" class="swal2-input">
                <option value="reflection" ${note.category === 'reflection' ? 'selected' : ''}>Reflection</option>
                <option value="tip" ${note.category === 'tip' ? 'selected' : ''}>Tip/Trick</option>
                <option value="problem" ${note.category === 'problem' ? 'selected' : ''}>Problem Solved</option>
                <option value="resource" ${note.category === 'resource' ? 'selected' : ''}>Resource Note</option>
                <option value="idea" ${note.category === 'idea' ? 'selected' : ''}>Idea</option>
            </select>
            <textarea id="edit-content" class="swal2-textarea" placeholder="Content">${note.content || ''}</textarea>
            <input id="edit-tags" class="swal2-input" value="${note.tags || ''}" placeholder="Tags">
        `,
        showCancelButton: true,
        confirmButtonText: 'Update',
        width: 600,
        preConfirm: () => {
            return {
                title: document.getElementById('edit-title').value,
                category: document.getElementById('edit-category').value,
                content: document.getElementById('edit-content').value,
                tags: document.getElementById('edit-tags').value
            };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API_URL}/api/notes/${noteId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result.value)
                });
                
                const data = await response.json();
                if (data.status === 'success') {
                    showNotification('Note updated!', 'success');
                    loadNotesData();
                }
            } catch (e) {
                showNotification('Failed to update note', 'error');
            }
        }
    });
}

async function deleteNote(noteId) {
    if (!confirm('Delete this note?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/notes/${noteId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            showNotification('Note deleted', 'success');
            loadNotesData();
        }
    } catch (e) {
        showNotification('Failed to delete note', 'error');
    }
}

function searchNotes() {
    const query = document.getElementById('notesSearch').value.toLowerCase();
    
    if (!query) {
        renderNotes(notesData);
        return;
    }
    
    const filtered = notesData.filter(note => 
        note.title?.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query) ||
        note.tags?.toLowerCase().includes(query)
    );
    
    renderNotes(filtered);
}

function filterNotes() {
    const filter = document.getElementById('notesFilter').value;
    
    if (filter === 'all') {
        renderNotes(notesData);
        return;
    }
    
    const filtered = notesData.filter(note => note.category === filter);
    renderNotes(filtered);
}


// ==========================================
// GOALS PAGE - Complete Implementation
// ==========================================

let goalsData = { active: [], completed: [] };

async function loadGoalsData() {
    try {
        // Load active goals
        const response = await fetch(`${API_URL}/api/goals?active=true`);
        const data = await response.json();

        if (data.status === 'success') {
            goalsData.active = data.goals || [];
            renderActiveGoals(goalsData.active);
        }
        
        // Load completed goals
        const completedResponse = await fetch(`${API_URL}/api/goals?active=false`);
        const completedData = await completedResponse.json();
        
        if (completedData.status === 'success') {
            goalsData.completed = completedData.goals || [];
            renderCompletedGoals(goalsData.completed);
        }

        // Load achievements
        const achievementsResponse = await fetch(`${API_URL}/api/achievements`);
        const achievementsData = await achievementsResponse.json();

        if (achievementsData.status === 'success') {
            renderAchievements(achievementsData.achievements || []);
        }
        
        // Load user stats
        loadGoalStats();

    } catch (e) {
        console.error("Failed to load goals:", e);
    }
}

async function loadGoalStats() {
    try {
        const userResponse = await fetch(`${API_URL}/api/user`);
        const userData = await userResponse.json();
        
        if (userData.status === 'success' && userData.user) {
            document.getElementById('streakDays').textContent = userData.user.streak_days || 0;
            document.getElementById('totalPoints').textContent = userData.user.total_points || 0;
        }
        
        // Load this week stats
        const statsResponse = await fetch(`${API_URL}/api/stats/week`);
        const statsData = await statsResponse.json();
        
        if (statsData.status === 'success') {
            document.getElementById('weekGoalsCompleted').textContent = statsData.goals_completed || 0;
            document.getElementById('weekLearningHours').textContent = (statsData.total_minutes / 60).toFixed(1) + 'h';
            document.getElementById('weekSessions').textContent = statsData.sessions || 0;
        }
    } catch (e) {
        console.error("Failed to load goal stats:", e);
    }
}

function renderActiveGoals(goals) {
    const container = document.getElementById('activeGoalsList');
    
    if (!goals || goals.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #5f6368;">
                <i class="ri-target-line" style="font-size: 48px; color: #dadce0;"></i>
                <p style="margin-top: 10px;">No active goals. Create your first goal!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = goals.map(goal => {
        const progress = Math.round((goal.current_value / goal.target_value) * 100);
        const iconMap = {
            daily: 'ri-calendar-line',
            weekly: 'ri-calendar-week-line',
            monthly: 'ri-calendar-month-line',
            custom: 'ri-target-line'
        };
        const icon = iconMap[goal.frequency] || 'ri-target-line';
        
        return `
            <div class="goal-item">
                <div class="goal-info">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <div class="goal-icon" style="background:#e8f0fe; color:#1a73e8; padding:8px; border-radius:50%;">
                            <i class="${icon}"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500;">${goal.title || 'Untitled Goal'}</div>
                            <div class="text-secondary" style="font-size: 0.85rem;">${goal.frequency || 'Custom'} Target</div>
                        </div>
                    </div>
                    <span style="font-weight: 600; color: #1a73e8;">${goal.current_value || 0}/${goal.target_value}</span>
                </div>
                <div class="progress-bar">
                    <div class="fill" style="width: ${Math.min(progress, 100)}%"></div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 5px; margin-top: 8px;">
                    <button class="text-btn" onclick="updateGoalProgress(${goal.id})">
                        <i class="ri-add-circle-line"></i> Update Progress
                    </button>
                    <button class="icon-btn" onclick="deleteGoal(${goal.id})">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderCompletedGoals(goals) {
    const container = document.getElementById('completedGoalsList');
    
    if (!goals || goals.length === 0) {
        container.innerHTML = `
            <div class="google-card" style="text-align: center; padding: 40px;">
                <p style="color: #5f6368;">No completed goals yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = goals.map(goal => `
        <div class="google-card">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="ri-checkbox-circle-fill" style="color: #188038; font-size: 24px;"></i>
                <div>
                    <h3 style="font-size: 1rem; margin: 0;">${goal.title}</h3>
                    <p class="text-secondary" style="font-size: 0.85em; margin: 3px 0 0 0;">
                        Completed ${formatDate(goal.completed_at)}
                    </p>
                </div>
            </div>
            <div class="progress-bar">
                <div class="fill" style="width: 100%; background: #188038;"></div>
            </div>
        </div>
    `).join('');
}

function renderAchievements(achievements) {
    const container = document.getElementById('achievementsList');
    
    if (!achievements || achievements.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #5f6368;">
                <i class="ri-trophy-line" style="font-size: 32px; color: #dadce0;"></i>
                <p style="margin-top: 10px; font-size: 0.9em;">Keep learning to unlock achievements!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = achievements.map(achievement => `
        <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
            <i class="${achievement.badge_icon}" style="font-size: 24px; color: #f9ab00;"></i>
            <div style="flex: 1;">
                <div style="font-weight: 500; font-size: 0.9em;">${achievement.badge_name}</div>
                <div class="text-secondary" style="font-size: 0.75em;">${achievement.description}</div>
            </div>
        </div>
    `).join('');
}

function showCreateGoalDialog() {
    Swal.fire({
        title: 'Create New Goal',
        html: `
            <input id="goal-title" class="swal2-input" placeholder="Goal title">
            <select id="goal-frequency" class="swal2-input">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
            </select>
            <input id="goal-target" class="swal2-input" type="number" placeholder="Target value" min="1">
            <input id="goal-unit" class="swal2-input" placeholder="Unit (e.g., minutes, articles, sessions)">
        `,
        showCancelButton: true,
        confirmButtonText: 'Create',
        preConfirm: () => {
            return {
                title: document.getElementById('goal-title').value,
                frequency: document.getElementById('goal-frequency').value,
                target_value: parseInt(document.getElementById('goal-target').value),
                unit: document.getElementById('goal-unit').value
            };
        }
    }).then(async (result) => {
        if (result.isConfirmed && result.value.title && result.value.target_value) {
            try {
                const response = await fetch(`${API_URL}/api/goals`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...result.value,
                        current_value: 0,
                        is_active: true
                    })
                });
                
                const data = await response.json();
                if (data.status === 'success') {
                    showNotification('Goal created!', 'success');
                    loadGoalsData();
                }
            } catch (e) {
                showNotification('Failed to create goal', 'error');
            }
        }
    });
}

async function updateGoalProgress(goalId) {
    const goal = goalsData.active.find(g => g.id === goalId);
    if (!goal) return;
    
    Swal.fire({
        title: 'Update Progress',
        text: `Current: ${goal.current_value} / ${goal.target_value} ${goal.unit || ''}`,
        input: 'number',
        inputLabel: 'Add to progress',
        inputPlaceholder: 'Enter amount',
        showCancelButton: true
    }).then(async (result) => {
        if (result.isConfirmed && result.value) {
            try {
                const newValue = goal.current_value + parseInt(result.value);
                const response = await fetch(`${API_URL}/api/goals/${goalId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_value: newValue,
                        is_active: newValue < goal.target_value
                    })
                });
                
                const data = await response.json();
                if (data.status === 'success') {
                    showNotification('Progress updated!', 'success');
                    loadGoalsData();
                    
                    // Check if goal completed
                    if (newValue >= goal.target_value) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Goal Completed!',
                            text: `Congratulations! You achieved: ${goal.title}`,
                            confirmButtonText: 'Awesome!'
                        });
                    }
                }
            } catch (e) {
                showNotification('Failed to update progress', 'error');
            }
        }
    });
}

async function deleteGoal(goalId) {
    if (!confirm('Delete this goal?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/goals/${goalId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            showNotification('Goal deleted', 'success');
            loadGoalsData();
        }
    } catch (e) {
        showNotification('Failed to delete goal', 'error');
    }
}


// ==========================================
// COMMUNITY PAGE - Complete Implementation
// ==========================================

async function loadCommunityData() {
    try {
        // Load leaderboard
        const leaderboardResponse = await fetch(`${API_URL}/api/community/leaderboard?limit=10`);
        const leaderboardData = await leaderboardResponse.json();
        
        if (leaderboardData.status === 'success') {
            renderLeaderboard(leaderboardData.leaderboard || [], leaderboardData.user_rank || {});
        }
        
        // Load community stats
        const statsResponse = await fetch(`${API_URL}/api/community/stats`);
        const statsData = await statsResponse.json();
        
        if (statsData.status === 'success') {
            renderCommunityStats(statsData.stats || {});
        }
        
    } catch (e) {
        console.error("Failed to load community data:", e);
    }
}

function renderLeaderboard(leaderboard, userRank) {
    const container = document.getElementById('leaderboardList');
    
    if (!container) return;
    
    if (!leaderboard || leaderboard.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #5f6368;">
                <i class="ri-trophy-line" style="font-size: 48px; color: #dadce0;"></i>
                <p style="margin-top: 10px;">No leaderboard data yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = leaderboard.map((user, index) => {
        const rankColors = ['#f9ab00', '#c0c0c0', '#cd7f32'];
        const rankColor = rankColors[index] || '#5f6368';
        const medals = ['🥇', '🥈', '🥉'];
        const medal = medals[index] || '';
        
        return `
            <div class="leaderboard-item" style="display: flex; align-items: center; padding: 15px; background: ${index < 3 ? '#f8f9fa' : 'white'}; border-radius: 8px; margin-bottom: 10px;">
                <div style="font-size: 1.5em; font-weight: 700; color: ${rankColor}; width: 50px; text-align: center;">
                    ${medal || user.rank}
                </div>
                <div style="width: 40px; height: 40px; background: #1a73e8; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 15px;">
                    ${user.avatar_initial || user.display_name?.charAt(0) || 'U'}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${user.display_name || 'User ' + user.id}</div>
                    <div class="text-secondary" style="font-size: 0.85em;">
                        ${user.sessions || 0} sessions • ${user.total_minutes || 0} minutes
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.3em; font-weight: 600; color: #1a73e8;">${user.total_points || 0}</div>
                    <div class="text-secondary" style="font-size: 0.85em;">points</div>
                </div>
                <div style="margin-left: 15px;">
                    <div style="color: #f9ab00; font-weight: 600;">${user.streak_days || 0}🔥</div>
                </div>
            </div>
        `;
    }).join('');
    
    // Show user rank if not in top 10
    if (userRank && userRank.rank > 10) {
        container.innerHTML += `
            <div style="border-top: 2px dashed #dadce0; margin: 20px 0; padding-top: 20px;">
                <div class="text-secondary" style="text-align: center; margin-bottom: 10px;">Your Rank</div>
                <div class="leaderboard-item" style="display: flex; align-items: center; padding: 15px; background: #e8f0fe; border-radius: 8px;">
                    <div style="font-size: 1.5em; font-weight: 700; color: #5f6368; width: 50px; text-align: center;">
                        ${userRank.rank}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">${userRank.display_name || 'You'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.3em; font-weight: 600; color: #1a73e8;">${userRank.total_points || 0}</div>
                        <div class="text-secondary" style="font-size: 0.85em;">points</div>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderCommunityStats(stats) {
    const elements = {
        'communityTotalUsers': stats.total_users || 0,
        'communityLearningHours': stats.total_learning_hours || 0,
        'communityAchievements': stats.total_achievements || 0,
        'communityActiveToday': stats.active_today || 0
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}


// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatDuration(seconds) {
    if (!seconds) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString();
}

function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
}

function calculateEngagement(item) {
    // Simple engagement calculation
    const duration = item.duration || 0;
    const scrollDepth = item.scroll_depth || 0;
    const interactions = item.interactions || 0;
    
    return Math.min(Math.round((duration / 60 + scrollDepth * 50 + interactions * 10) / 3), 100);
}

function showLoadingState(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;"><i class="ri-loader-4-line spinning" style="font-size: 32px; color: #1a73e8;"></i><p style="margin-top: 10px; color: #5f6368;">Loading...</p></td></tr>';
    }
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #d93025;">${message}</td></tr>`;
    }
}

function showNotification(message, type = 'info') {
    const colors = {
        success: '#188038',
        error: '#d93025',
        info: '#1a73e8',
        warning: '#f9ab00'
    };
    
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: type,
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: colors[type] + '11',
        color: colors[type]
    });
}

function changeLeaderboardTimeframe(timeframe) {
    fetch(`${API_URL}/api/community/leaderboard?timeframe=${timeframe}&limit=10`)
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                renderLeaderboard(data.leaderboard || [], data.user_rank || {});
            }
        })
        .catch(e => console.error('Failed to load leaderboard:', e));
}

console.log('✅ Pages Functionality Loaded - Library, Reviews, Goals, Community');