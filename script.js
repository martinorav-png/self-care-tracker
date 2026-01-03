// ================================
// Supabase Configuration
// ================================
const SUPABASE_URL = 'https://rjnbkoycknhqzjwogvmx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbmJrb3lja25ocXpqd29ndm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMTkyMDYsImV4cCI6MjA4MTg5NTIwNn0.-T1Mquq8WV3ZjkZlmqLd52GGupCaHlXYxrzcI5fVmg4';

// Initialize Supabase client
let db;

// Check if Supabase client is available
try {
    if (typeof window.supabase !== 'undefined') {
        console.log('Supabase library loaded');
        db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized:', db ? 'SUCCESS' : 'FAILED');
    } else {
        console.error('Supabase library not found! Check CDN script.');
    }
} catch (error) {
    console.error('Supabase initialization failed:', error);
}

// ================================
// State Management
// ================================
let tasks = [];
let currentFilter = 'all';
let streakData = {
    overall: 0,
    categories: {},
    lastUpdate: null,
    previousStreak: 0
};

// ================================
// DOM Elements
// ================================
const elements = {
    tasksList: document.getElementById('tasksList'),
    addTaskToggle: document.getElementById('addTaskToggle'),
    addTaskForm: document.getElementById('addTaskForm'),
    cancelTask: document.getElementById('cancelTask'),
    emptyState: document.getElementById('emptyState'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    completedToday: document.getElementById('completedToday'),
    totalToday: document.getElementById('totalToday'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    streakNumber: document.getElementById('streakNumber'),
    streakDetailsBtn: document.getElementById('streakDetailsBtn'),
    streakModal: document.getElementById('streakModal'),
    closeStreakModal: document.getElementById('closeStreakModal')
};

// ================================
// Supabase Functions
// ================================

/**
 * Fetch all tasks from Supabase
 */
async function fetchTasks() {
    try {
        showLoading(true);
        
        const { data, error } = await db
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        tasks = data || [];
        renderTasks();
        updateStats();
        calculateAndUpdateStreaks();
        
        showLoading(false);
        return data;
    } catch (error) {
        console.error('Error fetching tasks:', error);
        showError('Andmete laadimine ebaõnnestus');
        showLoading(false);
        
        // Fallback to localStorage
        loadFromLocalStorage();
    }
}

/**
 * Add new task to Supabase
 */
async function addTask(taskData) {
    console.log('addTask called with:', taskData);
    
    // Check if db is initialized
    if (!db) {
        const errorMsg = 'Supabase pole initsialiseeritud! Kontrolli API key\'d.';
        console.error(errorMsg);
        showError(errorMsg);
        throw new Error(errorMsg);
    }
    
    try {
        console.log('Sending to Supabase...');
        const { data, error } = await db
            .from('tasks')
            .insert([taskData])
            .select();
        
        console.log('Supabase response:', { data, error });
        
        if (error) throw error;
        
        tasks.unshift(data[0]);
        renderTasks();
        updateStats();
        saveToLocalStorage();
        
        // Show success toast
        showToast('Ülesanne lisatud!', 'success');
        
        console.log('Task added to local state');
        return data[0];
    } catch (error) {
        console.error('Error adding task:', error);
        showError('Ülesande lisamine ebaõnnestus: ' + error.message);
        showToast('Viga ülesande lisamisel', 'error');
        throw error;
    }
}

/**
 * Update task in Supabase
 */
async function updateTask(taskId, updates) {
    try {
        const { data, error } = await db
            .from('tasks')
            .update(updates)
            .eq('id', taskId)
            .select();
        
        if (error) throw error;
        
        // Update local state
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
        }
        
        renderTasks();
        updateStats();
        saveToLocalStorage();
        
        // Update streaks if task was completed
        if (updates.is_completed) {
            calculateAndUpdateStreaks();
        }
        
        return data[0];
    } catch (error) {
        console.error('Error updating task:', error);
        showError('Ülesande uuendamine ebaõnnestus');
        throw error;
    }
}

/**
 * Delete task from Supabase
 */
async function deleteTask(taskId) {
    try {
        const { error } = await db
            .from('tasks')
            .delete()
            .eq('id', taskId);
        
        if (error) throw error;
        
        tasks = tasks.filter(t => t.id !== taskId);
        renderTasks();
        updateStats();
        calculateAndUpdateStreaks();
        saveToLocalStorage();
        
        // Show success toast
        showToast('Ülesanne kustutatud', 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        showError('Ülesande kustutamine ebaõnnestus');
        showToast('Viga kustutamisel', 'error');
        throw error;
    }
}

/**
 * Toggle task completion
 */
async function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updates = {
        is_completed: !task.is_completed,
        completed_at: !task.is_completed ? new Date().toISOString() : null
    };
    
    await updateTask(taskId, updates);
    
    // Show confetti and toast when completing
    if (updates.is_completed) {
        createConfetti();
        showToast('Tubli töö! 🎉', 'success');
    }
}

// ================================
// Streak Functions
// ================================

/**
 * Calculate overall streak (consecutive days with at least 1 completed task)
 */
function calculateOverallStreak() {
    const completedTasks = tasks.filter(t => t.is_completed && t.completed_at);
    
    if (completedTasks.length === 0) return 0;
    
    // Get unique completion dates, sorted descending
    const completionDates = [...new Set(
        completedTasks.map(t => new Date(t.completed_at).toDateString())
    )].sort((a, b) => new Date(b) - new Date(a));
    
    if (completionDates.length === 0) return 0;
    
    // Check if there's activity today or yesterday (to maintain streak)
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    // Streak broken if most recent activity is neither today nor yesterday
    if (completionDates[0] !== today && completionDates[0] !== yesterday) {
        return 0;
    }
    
    // Count consecutive days
    let streak = 1;
    let currentDate = new Date(completionDates[0]);
    
    for (let i = 1; i < completionDates.length; i++) {
        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const expectedDate = prevDate.toDateString();
        
        if (completionDates[i] === expectedDate) {
            streak++;
            currentDate = new Date(completionDates[i]);
        } else {
            break;
        }
    }
    
    return streak;
}

/**
 * Calculate category-specific streaks
 */
function calculateCategoryStreaks() {
    const categories = ['health', 'productivity', 'social', 'rest', 'hobbies', 
                       'finance', 'household', 'learning', 'nutrition', 'other'];
    const categoryStreaks = {};
    
    categories.forEach(category => {
        const categoryTasks = tasks.filter(t => 
            t.category === category && t.is_completed && t.completed_at
        );
        
        if (categoryTasks.length === 0) {
            categoryStreaks[category] = 0;
            return;
        }
        
        // Get unique completion dates for this category
        const completionDates = [...new Set(
            categoryTasks.map(t => new Date(t.completed_at).toDateString())
        )].sort((a, b) => new Date(b) - new Date(a));
        
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        // Check if streak is active
        if (completionDates[0] !== today && completionDates[0] !== yesterday) {
            categoryStreaks[category] = 0;
            return;
        }
        
        // Count consecutive days
        let streak = 1;
        let currentDate = new Date(completionDates[0]);
        
        for (let i = 1; i < completionDates.length; i++) {
            const prevDate = new Date(currentDate);
            prevDate.setDate(prevDate.getDate() - 1);
            const expectedDate = prevDate.toDateString();
            
            if (completionDates[i] === expectedDate) {
                streak++;
                currentDate = new Date(completionDates[i]);
            } else {
                break;
            }
        }
        
        categoryStreaks[category] = streak;
    });
    
    return categoryStreaks;
}

/**
 * Calculate and update all streaks
 */
function calculateAndUpdateStreaks() {
    const previousStreak = streakData.overall;
    
    streakData.overall = calculateOverallStreak();
    streakData.categories = calculateCategoryStreaks();
    streakData.lastUpdate = new Date().toISOString();
    streakData.previousStreak = previousStreak;
    
    updateStreakDisplay();
    saveStreakData();
    
    // Check for milestone achievements
    checkStreakMilestone(previousStreak, streakData.overall);
}

/**
 * Update streak display in UI
 */
function updateStreakDisplay() {
    if (elements.streakNumber) {
        elements.streakNumber.textContent = streakData.overall;
    }
}

/**
 * Check if a streak milestone was achieved
 */
function checkStreakMilestone(previousStreak, currentStreak) {
    const milestones = [3, 7, 14, 30, 60, 100];
    
    for (const milestone of milestones) {
        if (previousStreak < milestone && currentStreak >= milestone) {
            // Milestone achieved!
            showMilestoneNotification(milestone);
            createMilestoneConfetti();
            break; // Only celebrate the first milestone
        }
    }
}

/**
 * Show milestone achievement notification
 */
function showMilestoneNotification(milestone) {
    const messages = {
        3: '3 päeva streak! Hea algus! 🔥',
        7: '1 NÄDAL STREAK! Imeline! 🔥🔥',
        14: '2 NÄDALAT! Sa oled legend! 🔥🔥🔥',
        30: '1 KUU STREAK!!! Uskumatu! 🏆🔥',
        60: '2 KUUD STREAK!!!! Absoluutselt uskumatu! 🏆🏆🔥',
        100: '100 PÄEVA STREAK!!!!! SA OLED KANGELANE! 🏆🏆🏆🔥'
    };
    
    showToast(messages[milestone] || `${milestone} päeva streak! 🔥`, 'streak');
}

/**
 * Create special confetti for milestones
 */
function createMilestoneConfetti() {
    // Double confetti for milestones!
    createConfetti();
    setTimeout(() => createConfetti(), 300);
}

/**
 * Render streak modal content
 */
function renderStreakModal() {
    // Update big streak number
    const streakNumberBig = document.getElementById('streakNumberBig');
    if (streakNumberBig) {
        streakNumberBig.textContent = streakData.overall;
    }
    
    // Render milestones
    const milestonesGrid = document.getElementById('milestonesGrid');
    if (milestonesGrid) {
        const milestones = [
            { days: 3, icon: '🔥', label: '3 päeva' },
            { days: 7, icon: '🔥🔥', label: '1 nädal' },
            { days: 14, icon: '🔥🔥🔥', label: '2 nädalat' },
            { days: 30, icon: '🏆', label: '1 kuu' },
            { days: 60, icon: '🏆🏆', label: '2 kuud' },
            { days: 100, icon: '👑', label: '100 päeva' }
        ];
        
        milestonesGrid.innerHTML = milestones.map(milestone => `
            <div class="milestone ${streakData.overall >= milestone.days ? 'achieved' : ''}">
                <span class="milestone-icon">${milestone.icon}</span>
                <span class="milestone-label">${milestone.label}</span>
            </div>
        `).join('');
    }
    
    // Render category streaks
    const categoryStreaksList = document.getElementById('categoryStreaksList');
    if (categoryStreaksList) {
        const categoryLabels = {
            health: 'Tervis',
            productivity: 'Produktiivsus',
            social: 'Sotsiaalne',
            rest: 'Puhkus',
            hobbies: 'Hobbid',
            finance: 'Rahandus',
            household: 'Kodutööd',
            learning: 'Õppimine',
            nutrition: 'Toitumine',
            other: 'Muu'
        };
        
        const categoryColors = {
            health: '#0ea5e9',
            productivity: '#f59e0b',
            social: '#ec4899',
            rest: '#8b5cf6',
            hobbies: '#a855f7',
            finance: '#10b981',
            household: '#f97316',
            learning: '#3b82f6',
            nutrition: '#84cc16',
            other: '#6b7280'
        };
        
        // Filter out categories with 0 streak and sort by streak descending
        const activeStreaks = Object.entries(streakData.categories)
            .filter(([_, streak]) => streak > 0)
            .sort((a, b) => b[1] - a[1]);
        
        if (activeStreaks.length === 0) {
            categoryStreaksList.innerHTML = `
                <p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-md);">
                    Kategooria streak'e pole veel. Alusta ülesannete täitmist!
                </p>
            `;
        } else {
            categoryStreaksList.innerHTML = activeStreaks.map(([category, streak]) => `
                <div class="category-streak-item" style="--category-color: ${categoryColors[category]}">
                    <span class="category-streak-name">${categoryLabels[category]}</span>
                    <span class="category-streak-count">
                        <span>🔥</span>
                        <span>${streak}</span>
                    </span>
                </div>
            `).join('');
        }
    }
}

/**
 * Show streak modal
 */
function showStreakModal() {
    renderStreakModal();
    elements.streakModal?.classList.remove('hidden');
}

/**
 * Hide streak modal
 */
function hideStreakModal() {
    elements.streakModal?.classList.add('hidden');
}

// ================================
// UI Rendering
// ================================

/**
 * Render all tasks
 */
function renderTasks() {
    const filteredTasks = currentFilter === 'all' 
        ? tasks 
        : tasks.filter(t => t.category === currentFilter);
    
    // Show empty state if no tasks
    if (filteredTasks.length === 0) {
        elements.emptyState.classList.remove('hidden');
        elements.tasksList.innerHTML = '';
        elements.tasksList.appendChild(elements.emptyState);
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    
    // Render tasks
    elements.tasksList.innerHTML = filteredTasks.map((task, index) => `
        <div class="task-card ${task.is_completed ? 'completed' : ''}" 
             data-category="${task.category}"
             data-task-id="${task.id}"
             role="listitem"
             style="animation-delay: ${index * 50}ms">
            <div class="task-header">
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    ${task.is_completed ? 'checked' : ''}
                    onchange="handleTaskToggle('${task.id}')"
                    aria-label="Märgi ${task.title} ${task.is_completed ? 'mittetehtuks' : 'tehtuks'}"
                >
                <div class="task-content">
                    <h3 class="task-title">${escapeHtml(task.title)}</h3>
                    ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
                    <div class="task-meta">
                        <span class="task-badge">${getCategoryLabel(task.category)}</span>
                        <span>·</span>
                        <span>${getRepeatLabel(task.repeat_type)}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button 
                        class="task-btn delete" 
                        onclick="handleTaskDelete('${task.id}')"
                        aria-label="Kustuta ${task.title}">
                        ×
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Update statistics
 */
function updateStats() {
    const today = new Date().toDateString();
    const todayTasks = tasks.filter(t => {
        const taskDate = new Date(t.created_at).toDateString();
        return taskDate === today || t.repeat_type === 'daily';
    });
    
    const completedCount = todayTasks.filter(t => t.is_completed).length;
    
    elements.completedToday.textContent = completedCount;
    elements.totalToday.textContent = todayTasks.length;
    
    // Update progress bar
    updateProgressBar();
}

// ================================
// Event Handlers
// ================================

/**
 * Handle form toggle
 */
elements.addTaskToggle.addEventListener('click', () => {
    const isExpanded = elements.addTaskToggle.getAttribute('aria-expanded') === 'true';
    
    elements.addTaskToggle.setAttribute('aria-expanded', !isExpanded);
    elements.addTaskForm.classList.toggle('hidden');
    elements.addTaskForm.setAttribute('aria-hidden', isExpanded);
    
    if (!isExpanded) {
        elements.addTaskForm.querySelector('input').focus();
    }
});

/**
 * Handle cancel button
 */
elements.cancelTask.addEventListener('click', () => {
    elements.addTaskToggle.setAttribute('aria-expanded', 'false');
    elements.addTaskForm.classList.add('hidden');
    elements.addTaskForm.setAttribute('aria-hidden', 'true');
    elements.addTaskForm.reset();
});

/**
 * Handle form submission
 */
elements.addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    console.log('Form submitted!');
    
    const formData = new FormData(e.target);
    const taskData = {
        title: formData.get('title'),
        description: formData.get('description') || null,
        category: formData.get('category'),
        repeat_type: formData.get('repeat_type'),
        is_completed: false,
        completed_at: null
    };
    
    console.log('Task data:', taskData);
    
    try {
        await addTask(taskData);
        e.target.reset();
        elements.addTaskToggle.click(); // Close form
        console.log('Task added successfully!');
    } catch (error) {
        console.error('Form submission error:', error);
    }
});

/**
 * Handle task toggle
 */
window.handleTaskToggle = async (taskId) => {
    await toggleTaskCompletion(taskId);
};

/**
 * Handle task delete
 */
window.handleTaskDelete = async (taskId) => {
    if (confirm('Kas oled kindel, et soovid selle ülesande kustutada?')) {
        await deleteTask(taskId);
    }
};

/**
 * Handle filter buttons
 */
elements.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active state
        elements.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update filter
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

/**
 * Handle streak details button
 */
elements.streakDetailsBtn?.addEventListener('click', () => {
    showStreakModal();
});

/**
 * Handle close streak modal
 */
elements.closeStreakModal?.addEventListener('click', () => {
    hideStreakModal();
});

/**
 * Handle click outside modal to close
 */
elements.streakModal?.addEventListener('click', (e) => {
    if (e.target === elements.streakModal) {
        hideStreakModal();
    }
});

// ================================
// Utility Functions
// ================================

/**
 * Show/hide loading state
 */
function showLoading(show) {
    elements.loadingState.classList.toggle('hidden', !show);
}

/**
 * Show error message
 */
function showError(message) {
    elements.errorState.classList.remove('hidden');
    elements.errorState.querySelector('p').textContent = message;
    
    setTimeout(() => {
        elements.errorState.classList.add('hidden');
    }, 5000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get category label in Estonian
 */
function getCategoryLabel(category) {
    const labels = {
        health: 'Tervis',
        productivity: 'Produktiivsus',
        social: 'Sotsiaalne',
        rest: 'Puhkus',
        hobbies: 'Hobbid',
        finance: 'Rahandus',
        household: 'Kodutööd',
        learning: 'Õppimine',
        nutrition: 'Toitumine',
        other: 'Muu'
    };
    return labels[category] || category;
}

/**
 * Get repeat type label in Estonian
 */
function getRepeatLabel(repeatType) {
    const labels = {
        daily: 'Iga päev',
        weekly: 'Iga nädal',
        custom: 'Kohandatud'
    };
    return labels[repeatType] || repeatType;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        streak: '🔥'
    };
    
    const icon = icons[type] || '✓';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove after animation
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Update progress bar
 */
function updateProgressBar() {
    const today = new Date().toDateString();
    const todayTasks = tasks.filter(t => {
        const taskDate = new Date(t.created_at).toDateString();
        return taskDate === today || t.repeat_type === 'daily';
    });
    
    const completedCount = todayTasks.filter(t => t.is_completed).length;
    const percentage = todayTasks.length > 0 ? (completedCount / todayTasks.length) * 100 : 0;
    
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }
}

// ================================
// LocalStorage Backup
// ================================

/**
 * Save tasks to localStorage as backup
 */
function saveToLocalStorage() {
    try {
        localStorage.setItem('tasks_backup', JSON.stringify(tasks));
    } catch (error) {
        console.error('LocalStorage save failed:', error);
    }
}

/**
 * Load tasks from localStorage
 */
function loadFromLocalStorage() {
    try {
        const backup = localStorage.getItem('tasks_backup');
        if (backup) {
            tasks = JSON.parse(backup);
            renderTasks();
            updateStats();
            calculateAndUpdateStreaks();
        }
    } catch (error) {
        console.error('LocalStorage load failed:', error);
    }
}

/**
 * Save streak data to localStorage
 */
function saveStreakData() {
    try {
        localStorage.setItem('streak_data', JSON.stringify(streakData));
    } catch (error) {
        console.error('Streak data save failed:', error);
    }
}

/**
 * Load streak data from localStorage
 */
function loadStreakData() {
    try {
        const data = localStorage.getItem('streak_data');
        if (data) {
            streakData = JSON.parse(data);
            updateStreakDisplay();
        }
    } catch (error) {
        console.error('Streak data load failed:', error);
    }
}

// ================================
// Confetti Animation
// ================================
function createConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confettiCount = 50;
    const confetti = [];
    const colors = ['#7c3aed', '#a78bfa', '#ec4899', '#0ea5e9', '#10b981', '#ff6b35'];
    
    for (let i = 0; i < confettiCount; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 4,
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }
    
    function updateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confetti.forEach((piece, index) => {
            piece.y += piece.speedY;
            piece.x += piece.speedX;
            piece.rotation += piece.rotationSpeed;
            
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate((piece.rotation * Math.PI) / 180);
            ctx.fillStyle = piece.color;
            ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
            ctx.restore();
            
            // Remove if off screen
            if (piece.y > canvas.height) {
                confetti.splice(index, 1);
            }
        });
        
        if (confetti.length > 0) {
            requestAnimationFrame(updateConfetti);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    updateConfetti();
}

// ================================
// Keyboard Navigation
// ================================
document.addEventListener('keydown', (e) => {
    // ESC to close form or modal
    if (e.key === 'Escape') {
        if (!elements.addTaskForm.classList.contains('hidden')) {
            elements.cancelTask.click();
        } else if (!elements.streakModal?.classList.contains('hidden')) {
            hideStreakModal();
        }
    }
});

// ================================
// Dark Mode
// ================================
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle?.querySelector('.theme-icon');

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (themeIcon) {
    themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// Toggle theme
themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (themeIcon) {
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
});

// ================================
// Initialize App
// ================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initializing...');
    console.log('SUPABASE_URL:', SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
    
    // Load saved data
    loadStreakData();
    
    // Check if Supabase is configured
    if (SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
        console.error('⚠️ Supabase pole konfigureeritud! Palun lisa oma API key script.js faili.');
        showError('Supabase pole konfigureeritud. Lisa API key script.js faili.');
        loadFromLocalStorage(); // Use localStorage as fallback
        return;
    }
    
    // Check if db is initialized
    if (!db) {
        console.error('⚠️ Supabase client pole initsialiseeritud!');
        showError('Supabase client pole initsialiseeritud. Kontrolli console\'i.');
        loadFromLocalStorage();
        return;
    }
    
    console.log('Supabase configured correctly, fetching tasks...');
    
    // Fetch initial data
    await fetchTasks();
    
    // Set up realtime subscription (optional, for multi-device sync)
    const subscription = db
        .channel('tasks_channel')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'tasks' },
            (payload) => {
                console.log('Realtime update:', payload);
                fetchTasks(); // Refresh when data changes
            }
        )
        .subscribe();
    
    console.log('App initialized successfully!');
});