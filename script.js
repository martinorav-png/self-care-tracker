// ================================
// Supabase Configuration
// ================================
const SUPABASE_URL = 'https://rjnbkoycknhqzjwogvmx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LLlWWs0FO2FdmQ3z79SSTg_yctpvcFw'; // Replace with your actual anon key

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
    filterButtons: document.querySelectorAll('.filter-btn')
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
        
        console.log('Task added to local state');
        return data[0];
    } catch (error) {
        console.error('Error adding task:', error);
        showError('Ülesande lisamine ebaõnnestus: ' + error.message);
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
        saveToLocalStorage();
    } catch (error) {
        console.error('Error deleting task:', error);
        showError('Ülesande kustutamine ebaõnnestus');
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
        alert('Viga ülesande lisamisel: ' + error.message);
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
        }
    } catch (error) {
        console.error('LocalStorage load failed:', error);
    }
}

// ================================
// Keyboard Navigation
// ================================
document.addEventListener('keydown', (e) => {
    // ESC to close form
    if (e.key === 'Escape' && !elements.addTaskForm.classList.contains('hidden')) {
        elements.cancelTask.click();
    }
});

// ================================
// Initialize App
// ================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initializing...');
    console.log('SUPABASE_URL:', SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
    
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