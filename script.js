// ================================
// Supabase Configuration
// ================================
const SUPABASE_URL = 'https://rjnbkoycknhqzjwogvmx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbmJrb3lja25ocXpqd29ndm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMTkyMDYsImV4cCI6MjA4MTg5NTIwNn0.-T1Mquq8WV3ZjkZlmqLd52GGupCaHlXYxrzcI5fVmg4';

// Initialize Supabase client
let db;

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
window.streakData = streakData; // Make globally accessible from start

// Sound Settings
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
let audioContext = null;

// Quick Add Templates
const quickAddTemplates = {
    water: { title: 'Joo 2L vett', description: 'Hoia keha hüdreeritud', category: 'health', repeat_type: 'daily' },
    outside: { title: 'Käi 20min väljas', description: 'Värsket õhku ja liikumist', category: 'health', repeat_type: 'daily' },
    break: { title: 'Tee 10min pause', description: 'Puhka ja lõõgastu', category: 'rest', repeat_type: 'daily' },
    exercise: { title: 'Treening 30min', description: 'Keha liigutamine', category: 'health', repeat_type: 'daily' },
    meditate: { title: 'Mediteeri 10min', description: 'Rahusta mõtteid', category: 'rest', repeat_type: 'daily' },
    sleep: { title: 'Maga 8h', description: 'Kvaliteetne uni', category: 'rest', repeat_type: 'daily' }
};

// ================================
// Achievements System
// ================================
const achievements = [
    {
        id: 'first_task',
        title: 'Esimene samm',
        description: 'Lisa oma esimene ülesanne',
        icon: '🎯',
        check: (data) => data.totalTasks >= 1
    },
    {
        id: 'first_complete',
        title: 'Tehtud!',
        description: 'Täida oma esimene ülesanne',
        icon: '✅',
        check: (data) => data.completedTasks >= 1
    },
    {
        id: 'streak_3',
        title: 'Sütib!',
        description: 'Saavuta 3 päeva streak',
        icon: '🔥',
        check: (data) => data.currentStreak >= 3
    },
    {
        id: 'streak_7',
        title: 'Nädal täis',
        description: 'Saavuta 7 päeva streak',
        icon: '🔥🔥',
        check: (data) => data.currentStreak >= 7
    },
    {
        id: 'streak_30',
        title: 'Kuu kangelane',
        description: 'Saavuta 30 päeva streak',
        icon: '🏆',
        check: (data) => data.currentStreak >= 30
    },
    {
        id: 'early_bird',
        title: 'Varajane lind',
        description: 'Täida 5 ülesannet enne kella 9 hommikul',
        icon: '🌅',
        check: (data) => data.earlyCompletions >= 5
    },
    {
        id: 'night_owl',
        title: 'Öökull',
        description: 'Täida 5 ülesannet pärast kella 22',
        icon: '🦉',
        check: (data) => data.lateCompletions >= 5
    },
    {
        id: 'productive_day',
        title: 'Produktiivne päev',
        description: 'Täida 10 ülesannet ühel päeval',
        icon: '⚡',
        check: (data) => data.maxTasksPerDay >= 10
    },
    {
        id: 'all_categories',
        title: 'Tasakaalustatud',
        description: 'Täida vähemalt 1 ülesanne igas kategoorias',
        icon: '🎨',
        check: (data) => data.categoriesCompleted >= 10
    },
    {
        id: 'century',
        title: 'Saja päeva reis',
        description: 'Täida 100 ülesannet kokku',
        icon: '💯',
        check: (data) => data.completedTasks >= 100
    },
    {
        id: 'quick_start',
        title: 'Kiire start',
        description: 'Kasuta quick add nuppu 10 korda',
        icon: '⚡',
        check: (data) => data.quickAdds >= 10
    },
    {
        id: 'organized',
        title: 'Organiseeritud',
        description: 'Kasuta kõiki 10 kategooriat',
        icon: '📋',
        check: (data) => data.categoriesUsed >= 10
    }
];

let unlockedAchievements = JSON.parse(localStorage.getItem('unlocked_achievements') || '[]');

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
    closeStreakModal: document.getElementById('closeStreakModal'),
    soundToggle: document.getElementById('soundToggle'),
    exportBtn: document.getElementById('exportBtn'),
    exportModal: document.getElementById('exportModal'),
    closeExportModal: document.getElementById('closeExportModal')
};

// ================================
// Audio Functions
// ================================
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
        console.log('Web Audio API not supported');
    }
}

function playSound(type) {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'success':
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'complete':
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
            break;
        case 'milestone':
            for (let i = 0; i < 3; i++) {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.frequency.value = 523.25 * (i + 1);
                gain.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.3);
                osc.start(audioContext.currentTime + i * 0.1);
                osc.stop(audioContext.currentTime + i * 0.1 + 0.3);
            }
            break;
        case 'delete':
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('soundEnabled', soundEnabled);
    updateSoundButton();
    if (soundEnabled) playSound('success');
}

function updateSoundButton() {
    const soundBtn = elements.soundToggle;
    if (soundBtn) {
        soundBtn.classList.toggle('muted', !soundEnabled);
        soundBtn.querySelector('.header-btn-icon').textContent = soundEnabled ? '🔊' : '🔇';
    }
}

// ================================
// Achievement Functions
// ================================
function checkAchievements() {
    const completedTasks = tasks.filter(t => t.is_completed);
    
    // Early bird (before 9 AM)
    const earlyCompletions = completedTasks.filter(t => {
        if (!t.completed_at) return false;
        const hour = new Date(t.completed_at).getHours();
        return hour < 9;
    }).length;
    
    // Night owl (after 10 PM)
    const lateCompletions = completedTasks.filter(t => {
        if (!t.completed_at) return false;
        const hour = new Date(t.completed_at).getHours();
        return hour >= 22;
    }).length;
    
    // Max tasks per day
    const tasksByDay = {};
    completedTasks.forEach(t => {
        if (!t.completed_at) return;
        const day = new Date(t.completed_at).toDateString();
        tasksByDay[day] = (tasksByDay[day] || 0) + 1;
    });
    const maxTasksPerDay = Math.max(0, ...Object.values(tasksByDay));
    
    // Categories completed
    const categoriesWithCompletions = new Set(completedTasks.map(t => t.category));
    const categoriesCompleted = categoriesWithCompletions.size;
    
    // Categories used (including uncompleted)
    const categoriesUsed = new Set(tasks.map(t => t.category)).size;
    
    // Quick adds
    const quickAdds = parseInt(localStorage.getItem('quick_add_count') || '0');
    
    const data = {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        currentStreak: streakData.overall,
        earlyCompletions,
        lateCompletions,
        maxTasksPerDay,
        categoriesCompleted,
        categoriesUsed,
        quickAdds
    };
    
    achievements.forEach(achievement => {
        if (!unlockedAchievements.includes(achievement.id)) {
            if (achievement.check(data)) {
                unlockedAchievements.push(achievement.id);
                localStorage.setItem('unlocked_achievements', JSON.stringify(unlockedAchievements));
                localStorage.setItem(`achievement_${achievement.id}_date`, new Date().toISOString());
                showAchievementUnlock(achievement);
            }
        }
    });
}

function showAchievementUnlock(achievement) {
    const toast = document.getElementById('achievementToast');
    const title = toast.querySelector('.achievement-toast-title');
    const description = toast.querySelector('.achievement-toast-description');
    const icon = toast.querySelector('.achievement-toast-icon');
    
    title.textContent = achievement.title;
    description.textContent = achievement.description;
    icon.textContent = achievement.icon;
    
    toast.classList.remove('hidden');
    playSound('milestone');
    createMilestoneConfetti();
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
}

function renderAchievements() {
    const grid = document.getElementById('achievementsGrid');
    const unlockedCount = document.getElementById('achievementsUnlocked');
    const totalCount = document.getElementById('achievementsTotal');
    
    unlockedCount.textContent = unlockedAchievements.length;
    totalCount.textContent = achievements.length;
    
    grid.innerHTML = achievements.map(achievement => {
        const isUnlocked = unlockedAchievements.includes(achievement.id);
        const unlockedDate = isUnlocked ? localStorage.getItem(`achievement_${achievement.id}_date`) : null;
        
        return `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <span class="achievement-icon">${achievement.icon}</span>
                <h4 class="achievement-title">${achievement.title}</h4>
                <p class="achievement-description">${achievement.description}</p>
                ${isUnlocked && unlockedDate ? `<p class="achievement-unlocked-date">Avatud: ${new Date(unlockedDate).toLocaleDateString('et-EE')}</p>` : ''}
            </div>
        `;
    }).join('');
}

// ================================
// Heatmap Functions
// ================================
function renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 84); // 12 weeks ago
    
    // Count tasks per day
    const tasksByDay = {};
    tasks.filter(t => t.is_completed && t.completed_at).forEach(task => {
        const day = new Date(task.completed_at).toDateString();
        tasksByDay[day] = (tasksByDay[day] || 0) + 1;
    });
    
    // Create grid
    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';
    
    // Generate cells for past 12 weeks (84 days)
    for (let i = 0; i < 84; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toDateString();
        const count = tasksByDay[dateStr] || 0;
        
        // Determine level (0-4)
        let level = 0;
        if (count >= 1) level = 1;
        if (count >= 3) level = 2;
        if (count >= 5) level = 3;
        if (count >= 8) level = 4;
        
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.setAttribute('data-level', level);
        cell.setAttribute('data-count', count);
        cell.setAttribute('data-plural', count === 1 ? '' : 'i');
        cell.setAttribute('data-date', date.toLocaleDateString('et-EE'));
        
        grid.appendChild(cell);
    }
    
    container.innerHTML = '';
    container.appendChild(grid);
}

// ================================
// Export/Import Functions
// ================================
function exportToJSON() {
    const dataToExport = {
        tasks: tasks,
        streakData: streakData,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `paevaplaan-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Andmed eksporditud JSON-na! 💾', 'success');
    playSound('success');
}

function exportToCSV() {
    const headers = ['ID', 'Pealkiri', 'Kirjeldus', 'Kategooria', 'Kordus', 'Täidetud', 'Loodud', 'Täidetud kuupäev'];
    const rows = tasks.map(task => [
        task.id,
        `"${task.title.replace(/"/g, '""')}"`,
        `"${(task.description || '').replace(/"/g, '""')}"`,
        getCategoryLabel(task.category),
        getRepeatLabel(task.repeat_type),
        task.is_completed ? 'Jah' : 'Ei',
        new Date(task.created_at).toLocaleString('et-EE'),
        task.completed_at ? new Date(task.completed_at).toLocaleString('et-EE') : ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const BOM = '\uFEFF';
    const dataBlob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `paevaplaan-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Andmed eksporditud CSV-na! 📊', 'success');
    playSound('success');
}

async function importFromJSON(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.tasks || !Array.isArray(data.tasks)) {
            throw new Error('Vigane JSON formaat');
        }
        
        let importedCount = 0;
        
        for (const task of data.tasks) {
            const exists = tasks.some(t => t.id === task.id);
            if (!exists) {
                try {
                    const taskData = {
                        title: task.title,
                        description: task.description || null,
                        category: task.category,
                        repeat_type: task.repeat_type,
                        is_completed: task.is_completed || false,
                        completed_at: task.completed_at || null
                    };
                    
                    const { data: newTask, error } = await db
                        .from('tasks')
                        .insert([taskData])
                        .select();
                    
                    if (!error && newTask) {
                        tasks.unshift(newTask[0]);
                        importedCount++;
                    }
                } catch (error) {
                    console.error('Error importing task:', error);
                }
            }
        }
        
        renderTasks();
        updateStats();
        calculateAndUpdateStreaks();
        saveToLocalStorage();
        checkAchievements();
        
        showToast(`Imporditud ${importedCount} ülesannet! 📥`, 'success');
        playSound('success');
        hideExportModal();
    } catch (error) {
        console.error('Import error:', error);
        showToast('Viga importimisel! Kontrolli faili. ❌', 'error');
    }
}

// ================================
// Reset All Data
// ================================
async function resetAllData() {
    const confirmation = confirm(
        '⚠️ HOIATUS!\n\n' +
        'See KUSTUTAB:\n' +
        '• Kõik task\'id Supabase\'ist\n' +
        '• Kõik achievement\'id\n' +
        '• Kõik streak\'id\n' +
        '• Kogu statistika\n\n' +
        'Kas oled KINDEL?'
    );
    
    if (!confirmation) return;
    
    const doubleCheck = confirm('Viimane kinnitus! Kas TÕESTI tahad KÕIK kustutada?');
    
    if (!doubleCheck) return;
    
    try {
        showToast('Kustutan andmeid... ⏳', 'success');
        
        // 1. Delete all tasks from Supabase
        if (db) {
            const { error } = await db
                .from('tasks')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            
            if (error) {
                console.error('Supabase delete error:', error);
            }
        }
        
        // 2. Clear all localStorage
        localStorage.removeItem('tasks_backup');
        localStorage.removeItem('streak_data');
        localStorage.removeItem('unlocked_achievements');
        localStorage.removeItem('quick_add_count');
        
        // Clear all achievement dates
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('achievement_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        showToast('Kõik andmed kustutatud! Laen lehe uuesti... 🔄', 'success');
        playSound('success');
        
        // 3. Reload page after 2 seconds
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Reset error:', error);
        showToast('Viga resetimisel! ❌', 'error');
    }
}

// ================================
// Quick Add Functions
// ================================
async function handleQuickAdd(templateKey) {
    const template = quickAddTemplates[templateKey];
    if (!template) return;
    
    const btn = document.querySelector(`[data-template="${templateKey}"]`);
    btn?.classList.add('adding');
    
    try {
        await addTask(template);
        playSound('success');
        
        // Track quick adds
        const currentCount = parseInt(localStorage.getItem('quick_add_count') || '0');
        localStorage.setItem('quick_add_count', currentCount + 1);
        checkAchievements();
    } catch (error) {
        console.error('Quick add error:', error);
    } finally {
        setTimeout(() => btn?.classList.remove('adding'), 300);
    }
}

// ================================
// Supabase Functions
// ================================
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
        checkAchievements();
        
        showLoading(false);
        return data;
    } catch (error) {
        console.error('Error fetching tasks:', error);
        showError('Andmete laadimine ebaõnnestus');
        showLoading(false);
        loadFromLocalStorage();
    }
}

async function addTask(taskData) {
    if (!db) {
        const errorMsg = 'Supabase pole initsialiseeritud!';
        console.error(errorMsg);
        showError(errorMsg);
        throw new Error(errorMsg);
    }
    
    try {
        const { data, error } = await db
            .from('tasks')
            .insert([taskData])
            .select();
        
        if (error) throw error;
        
        tasks.unshift(data[0]);
        renderTasks();
        updateStats();
        saveToLocalStorage();
        checkAchievements();
        
        showToast('Ülesanne lisatud! ✅', 'success');
        playSound('success');
        
        return data[0];
    } catch (error) {
        console.error('Error adding task:', error);
        showError('Ülesande lisamine ebaõnnestus: ' + error.message);
        showToast('Viga ülesande lisamisel ❌', 'error');
        throw error;
    }
}

async function updateTask(taskId, updates) {
    try {
        const { data, error } = await db
            .from('tasks')
            .update(updates)
            .eq('id', taskId)
            .select();
        
        if (error) throw error;
        
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
        }
        
        renderTasks();
        updateStats();
        saveToLocalStorage();
        
        if (updates.is_completed) {
            calculateAndUpdateStreaks();
            checkAchievements();
        }
        
        return data[0];
    } catch (error) {
        console.error('Error updating task:', error);
        showError('Ülesande uuendamine ebaõnnestus');
        throw error;
    }
}

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
        checkAchievements();
        
        showToast('Ülesanne kustutatud 🗑️', 'success');
        playSound('delete');
    } catch (error) {
        console.error('Error deleting task:', error);
        showError('Ülesande kustutamine ebaõnnestus');
        showToast('Viga kustutamisel ❌', 'error');
        throw error;
    }
}

async function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updates = {
        is_completed: !task.is_completed,
        completed_at: !task.is_completed ? new Date().toISOString() : null
    };
    
    await updateTask(taskId, updates);
    
    if (updates.is_completed) {
        createConfetti();
        showToast('Tubli töö! 🎉', 'success');
        playSound('complete');
        
        // Add sparkle effect if AnimationPack is available
        if (window.AnimationPack) {
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                window.AnimationPack.createSparkles(taskElement, 8);
            }
        }
    }
}

// ================================
// Streak Functions
// ================================
function calculateOverallStreak() {
    const completedTasks = tasks.filter(t => t.is_completed && t.completed_at);
    
    if (completedTasks.length === 0) return 0;
    
    const completionDates = [...new Set(
        completedTasks.map(t => new Date(t.completed_at).toDateString())
    )].sort((a, b) => new Date(b) - new Date(a));
    
    if (completionDates.length === 0) return 0;
    
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (completionDates[0] !== today && completionDates[0] !== yesterday) {
        return 0;
    }
    
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
        
        const completionDates = [...new Set(
            categoryTasks.map(t => new Date(t.completed_at).toDateString())
        )].sort((a, b) => new Date(b) - new Date(a));
        
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (completionDates[0] !== today && completionDates[0] !== yesterday) {
            categoryStreaks[category] = 0;
            return;
        }
        
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

function calculateAndUpdateStreaks() {
    const previousStreak = streakData.overall;
    
    streakData.overall = calculateOverallStreak();
    streakData.categories = calculateCategoryStreaks();
    streakData.lastUpdate = new Date().toISOString();
    streakData.previousStreak = previousStreak;
    
    window.streakData = streakData; // Make globally accessible
    
    updateStreakDisplay();
    saveStreakData();
    
    // Update 3D plant
    updatePlantWithStreak(streakData.overall);
    
    checkStreakMilestone(previousStreak, streakData.overall);
}

function updateStreakDisplay() {
    if (elements.streakNumber) {
        // Animate streak number if AnimationPack is available
        if (window.AnimationPack) {
            const currentStreak = parseInt(elements.streakNumber.textContent) || 0;
            if (currentStreak !== streakData.overall) {
                window.AnimationPack.animateNumber(elements.streakNumber, streakData.overall, 800);
                
                // Add pulse animation to streak badge
                const streakBadge = document.querySelector('.streak-badge');
                if (streakBadge) {
                    window.AnimationPack.pulseElement(streakBadge);
                }
            } else {
                elements.streakNumber.textContent = streakData.overall;
            }
        } else {
            elements.streakNumber.textContent = streakData.overall;
        }
    }
}

function checkStreakMilestone(previousStreak, currentStreak) {
    const milestones = [3, 7, 14, 30, 60, 100];
    
    for (const milestone of milestones) {
        if (previousStreak < milestone && currentStreak >= milestone) {
            showMilestoneNotification(milestone);
            createMilestoneConfetti();
            playSound('milestone');
            
            // Add particle burst effect if AnimationPack is available
            if (window.AnimationPack) {
                const streakBadge = document.querySelector('.streak-badge');
                if (streakBadge) {
                    const rect = streakBadge.getBoundingClientRect();
                    const x = rect.left + rect.width / 2;
                    const y = rect.top + rect.height / 2;
                    window.AnimationPack.particleBurst(x, y, '#ff6b35', 20);
                }
            }
            
            break;
        }
    }
}

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

function createMilestoneConfetti() {
    createConfetti();
    setTimeout(() => createConfetti(), 300);
}

function renderStreakModal() {
    const streakNumberBig = document.getElementById('streakNumberBig');
    if (streakNumberBig) {
        streakNumberBig.textContent = streakData.overall;
    }
    
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

function showStreakModal() {
    renderStreakModal();
    elements.streakModal?.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function hideStreakModal() {
    elements.streakModal?.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function showExportModal() {
    elements.exportModal?.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function hideExportModal() {
    elements.exportModal?.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function showHeatmapModal() {
    renderHeatmap();
    document.getElementById('heatmapModal')?.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function showAchievementsModal() {
    renderAchievements();
    document.getElementById('achievementsModal')?.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function showKeyboardModal() {
    document.getElementById('keyboardModal')?.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

// ================================
// UI Rendering
// ================================
function renderTasks() {
    const filteredTasks = currentFilter === 'all' 
        ? tasks 
        : tasks.filter(t => t.category === currentFilter);
    
    if (filteredTasks.length === 0) {
        elements.emptyState.classList.remove('hidden');
        elements.tasksList.innerHTML = '';
        elements.tasksList.appendChild(elements.emptyState);
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    
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

function updateStats() {
    const today = new Date().toDateString();
    const todayTasks = tasks.filter(t => {
        const taskDate = new Date(t.created_at).toDateString();
        return taskDate === today || t.repeat_type === 'daily';
    });
    
    const completedCount = todayTasks.filter(t => t.is_completed).length;
    
    // Animate numbers if AnimationPack is available
    if (window.AnimationPack) {
        const currentCompleted = parseInt(elements.completedToday.textContent) || 0;
        const currentTotal = parseInt(elements.totalToday.textContent) || 0;
        
        if (currentCompleted !== completedCount) {
            window.AnimationPack.animateNumber(elements.completedToday, completedCount, 500);
        } else {
            elements.completedToday.textContent = completedCount;
        }
        
        if (currentTotal !== todayTasks.length) {
            window.AnimationPack.animateNumber(elements.totalToday, todayTasks.length, 500);
        } else {
            elements.totalToday.textContent = todayTasks.length;
        }
    } else {
        elements.completedToday.textContent = completedCount;
        elements.totalToday.textContent = todayTasks.length;
    }
    
    updateProgressBar();
}

// ================================
// Event Handlers
// ================================
elements.addTaskToggle.addEventListener('click', () => {
    const isExpanded = elements.addTaskToggle.getAttribute('aria-expanded') === 'true';
    
    elements.addTaskToggle.setAttribute('aria-expanded', !isExpanded);
    elements.addTaskForm.classList.toggle('hidden');
    elements.addTaskForm.setAttribute('aria-hidden', isExpanded);
    
    if (!isExpanded) {
        elements.addTaskForm.querySelector('input').focus();
    }
});

elements.cancelTask.addEventListener('click', () => {
    elements.addTaskToggle.setAttribute('aria-expanded', 'false');
    elements.addTaskForm.classList.add('hidden');
    elements.addTaskForm.setAttribute('aria-hidden', 'true');
    elements.addTaskForm.reset();
});

elements.addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const taskData = {
        title: formData.get('title'),
        description: formData.get('description') || null,
        category: formData.get('category'),
        repeat_type: formData.get('repeat_type'),
        is_completed: false,
        completed_at: null
    };
    
    try {
        await addTask(taskData);
        e.target.reset();
        elements.addTaskToggle.click();
    } catch (error) {
        console.error('Form submission error:', error);
    }
});

window.handleTaskToggle = async (taskId) => {
    await toggleTaskCompletion(taskId);
};

window.handleTaskDelete = async (taskId) => {
    if (confirm('Kas oled kindel, et soovid selle ülesande kustutada?')) {
        await deleteTask(taskId);
    }
};

elements.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

elements.streakDetailsBtn?.addEventListener('click', () => {
    showStreakModal();
});

elements.closeStreakModal?.addEventListener('click', () => {
    hideStreakModal();
});

elements.streakModal?.addEventListener('click', (e) => {
    if (e.target === elements.streakModal) {
        hideStreakModal();
    }
});

elements.soundToggle?.addEventListener('click', toggleSound);

elements.exportBtn?.addEventListener('click', showExportModal);

elements.closeExportModal?.addEventListener('click', hideExportModal);

elements.exportModal?.addEventListener('click', (e) => {
    if (e.target === elements.exportModal) {
        hideExportModal();
    }
});

document.getElementById('exportJsonBtn')?.addEventListener('click', exportToJSON);
document.getElementById('exportCsvBtn')?.addEventListener('click', exportToCSV);

document.getElementById('importJsonBtn')?.addEventListener('click', () => {
    document.getElementById('importFileInput')?.click();
});

document.getElementById('importFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) {
        await importFromJSON(file);
        e.target.value = '';
    }
});

document.getElementById('resetAllBtn')?.addEventListener('click', resetAllData);

document.querySelectorAll('.quick-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const template = btn.dataset.template;
        handleQuickAdd(template);
    });
});

// New modal event listeners
document.getElementById('heatmapBtn')?.addEventListener('click', showHeatmapModal);
document.getElementById('closeHeatmapModal')?.addEventListener('click', () => {
    document.getElementById('heatmapModal')?.classList.add('hidden');
    document.body.classList.remove('modal-open');
});

document.getElementById('achievementsBtn')?.addEventListener('click', showAchievementsModal);
document.getElementById('closeAchievementsModal')?.addEventListener('click', () => {
    document.getElementById('achievementsModal')?.classList.add('hidden');
    document.body.classList.remove('modal-open');
});

document.getElementById('keyboardBtn')?.addEventListener('click', showKeyboardModal);
document.getElementById('closeKeyboardModal')?.addEventListener('click', () => {
    document.getElementById('keyboardModal')?.classList.add('hidden');
    document.body.classList.remove('modal-open');
});

// ================================
// Keyboard Shortcuts
// ================================
document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    const key = e.key.toLowerCase();
    
    switch(key) {
        case 'f1':
            e.preventDefault();
            showKeyboardModal();
            break;
        case 'escape':
            // Close all modals
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.classList.add('hidden');
            });
            document.body.classList.remove('modal-open');
            if (!elements.addTaskForm?.classList.contains('hidden')) {
                elements.cancelTask?.click();
            }
            break;
        case 'n':
            e.preventDefault();
            if (elements.addTaskToggle) {
                elements.addTaskToggle.click();
            }
            break;
        case 's':
            e.preventDefault();
            showStreakModal();
            break;
        case 'h':
            e.preventDefault();
            showHeatmapModal();
            break;
        case 'a':
            e.preventDefault();
            showAchievementsModal();
            break;
        case 'd':
            e.preventDefault();
            if (window.themeSwitcher) {
                window.themeSwitcher.cycleTheme();
            }
            break;
        case 'm':
            e.preventDefault();
            toggleSound();
            break;
        case 'e':
            e.preventDefault();
            showExportModal();
            break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
            e.preventDefault();
            const templates = ['water', 'outside', 'break', 'exercise', 'meditate', 'sleep'];
            const templateKey = templates[parseInt(key) - 1];
            handleQuickAdd(templateKey);
            break;
    }
});

// ================================
// Utility Functions
// ================================
function showLoading(show) {
    elements.loadingState.classList.toggle('hidden', !show);
}

function showError(message) {
    elements.errorState.classList.remove('hidden');
    elements.errorState.querySelector('p').textContent = message;
    
    setTimeout(() => {
        elements.errorState.classList.add('hidden');
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

function getRepeatLabel(repeatType) {
    const labels = {
        daily: 'Iga päev',
        weekly: 'Iga nädal',
        custom: 'Kohandatud'
    };
    return labels[repeatType] || repeatType;
}

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
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

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
// LocalStorage
// ================================
function saveToLocalStorage() {
    try {
        localStorage.setItem('tasks_backup', JSON.stringify(tasks));
    } catch (error) {
        console.error('LocalStorage save failed:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const backup = localStorage.getItem('tasks_backup');
        if (backup) {
            tasks = JSON.parse(backup);
            renderTasks();
            updateStats();
            calculateAndUpdateStreaks();
            checkAchievements();
        }
    } catch (error) {
        console.error('LocalStorage load failed:', error);
    }
}

function saveStreakData() {
    try {
        localStorage.setItem('streak_data', JSON.stringify(streakData));
    } catch (error) {
        console.error('Streak data save failed:', error);
    }
}

function loadStreakData() {
    try {
        const data = localStorage.getItem('streak_data');
        if (data) {
            streakData = JSON.parse(data);
            window.streakData = streakData; // Make globally accessible
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
// Dark Mode
// ================================
// ================================
// Theme Toggle
// ================================
// Now handled by theme-switcher.js

// ================================
// Initialize App
// ================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initializing...');
    
    // Initialize audio
    initAudio();
    updateSoundButton();
    
    // Load saved data
    loadStreakData();
    
    if (!db) {
        console.error('⚠️ Supabase client pole initsialiseeritud!');
        showError('Supabase client pole initsialiseeritud.');
        loadFromLocalStorage();
        return;
    }
    
    console.log('Supabase configured, fetching tasks...');
    
    await fetchTasks();
    
    const subscription = db
        .channel('tasks_channel')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'tasks' },
            (payload) => {
                console.log('Realtime update:', payload);
                fetchTasks();
            }
        )
        .subscribe();
    
    console.log('App initialized successfully!');
});

// ================================
// 3D PLANT INTEGRATION
// ================================
let plant3D = null;

function initPlant() {
    // Wait for Three.js to be loaded
    if (typeof THREE === 'undefined') {
        console.log('⏳ Waiting for Three.js...');
        setTimeout(initPlant, 100);
        return;
    }

    const currentStreak = streakData.overall || 0;
    
    try {
        plant3D = new Plant3D('plant3dContainer', currentStreak);
        window.plant3D = plant3D; // Make globally accessible for demo mode
        updatePlantStageLabel(currentStreak);
        console.log('🌱 3D Plant initialized with streak:', currentStreak);
    } catch (error) {
        console.error('Failed to initialize 3D plant:', error);
    }
}

function updatePlantStageLabel(streak) {
    const stageElement = document.getElementById('plantStage');
    if (!stageElement) return;

    let icon, label;
    
    if (streak === 0) {
        icon = '🌰';
        label = 'Seeme';
    } else if (streak <= 3) {
        icon = '🌱';
        label = 'Idand';
    } else if (streak <= 7) {
        icon = '🪴';
        label = 'Noor taim';
    } else if (streak <= 14) {
        icon = '🌿';
        label = 'Kasvab';
    } else if (streak <= 29) {
        icon = '🌳';
        label = 'Tugev taim';
    } else if (streak <= 59) {
        icon = '🌸';
        label = 'Pungad';
    } else {
        icon = '🌺';
        label = 'Täisõis!';
    }

    stageElement.innerHTML = `
        <span class="growth-stage-icon">${icon}</span>
        <span>${label}</span>
    `;
}

function updatePlantWithStreak(newStreak) {
    if (plant3D) {
        const oldStage = plant3D.getGrowthStage(plant3D.streak);
        const newStage = plant3D.getGrowthStage(newStreak);
        
        plant3D.updateStreak(newStreak);
        updatePlantStageLabel(newStreak);
        
        // Add shine effect if grew to new stage
        if (newStage > oldStage) {
            const container = document.getElementById('plant3dContainer');
            if (container) {
                container.classList.add('growing');
                setTimeout(() => {
                    container.classList.remove('growing');
                }, 2000);
            }
            
            // Show toast notification
            showToast(`🌱 Sinu taim kasvas! (${getStageLabel(newStage)})`, 'success');
        }
    }
}

function getStageLabel(stage) {
    const labels = ['Seeme', 'Idand', 'Noor taim', 'Kasvab', 'Tugev taim', 'Pungad', 'Täisõis'];
    return labels[stage] || 'Taim';
}

// Export plant functions globally for plant-3d.js
window.initPlant = initPlant;
window.updatePlantWithStreak = updatePlantWithStreak;
window.updatePlantStageLabel = updatePlantStageLabel;