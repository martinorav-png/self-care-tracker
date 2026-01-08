// ================================
// THEME SWITCHER - 5 Themes
// ================================

class ThemeSwitcher {
    constructor() {
        this.currentTheme = 'light';
        this.themes = ['light', 'dark', 'cyberpunk', 'forest', 'ocean'];
        this.init();
    }

    init() {
        // Load saved theme
        const savedTheme = localStorage.getItem('app_theme') || 'light';
        this.setTheme(savedTheme, false);

        // Setup button listeners
        this.setupListeners();

        console.log('🎨 Theme Switcher initialized! Current theme:', savedTheme);
    }

    setupListeners() {
        const themeButtons = document.querySelectorAll('.theme-btn');
        
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.getAttribute('data-theme');
                this.setTheme(theme, true);
            });
        });

        // Keyboard shortcut: Ctrl/Cmd + K to cycle themes
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.cycleTheme();
            }
        });
    }

    setTheme(theme, save = true) {
        if (!this.themes.includes(theme)) {
            console.warn('Invalid theme:', theme);
            return;
        }

        // Remove old theme
        if (this.currentTheme !== 'light') {
            document.documentElement.removeAttribute('data-theme');
        }

        // Set new theme
        if (theme !== 'light') {
            document.documentElement.setAttribute('data-theme', theme);
        }

        this.currentTheme = theme;

        // Update button active states
        this.updateActiveButton(theme);

        // Save to localStorage
        if (save) {
            localStorage.setItem('app_theme', theme);
        }

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themechange', { 
            detail: { theme } 
        }));

        console.log('🎨 Theme changed to:', theme);
    }

    updateActiveButton(theme) {
        const themeButtons = document.querySelectorAll('.theme-btn');
        
        themeButtons.forEach(btn => {
            const btnTheme = btn.getAttribute('data-theme');
            if (btnTheme === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    cycleTheme() {
        const currentIndex = this.themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % this.themes.length;
        const nextTheme = this.themes[nextIndex];
        
        this.setTheme(nextTheme, true);
        
        // Show toast notification
        if (typeof showToast === 'function') {
            const themeNames = {
                'light': '🌞 Light',
                'dark': '🌙 Dark',
                'cyberpunk': '🌆 Cyberpunk',
                'forest': '🌲 Forest',
                'ocean': '🌊 Ocean'
            };
            showToast(`Theme: ${themeNames[nextTheme]}`, 'success');
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getThemeInfo(theme) {
        const themeInfo = {
            'light': {
                name: 'Light',
                icon: '🌞',
                description: 'Clean and bright',
                colors: {
                    primary: '#7c3aed',
                    background: '#ffffff'
                }
            },
            'dark': {
                name: 'Dark',
                icon: '🌙',
                description: 'Easy on the eyes',
                colors: {
                    primary: '#a78bfa',
                    background: '#0a0a0a'
                }
            },
            'cyberpunk': {
                name: 'Cyberpunk',
                icon: '🌆',
                description: 'Neon future vibes',
                colors: {
                    primary: '#00d4ff',
                    background: '#0a0e27'
                }
            },
            'forest': {
                name: 'Forest',
                icon: '🌲',
                description: 'Natural and calm',
                colors: {
                    primary: '#22c55e',
                    background: '#f0fdf4'
                }
            },
            'ocean': {
                name: 'Ocean',
                icon: '🌊',
                description: 'Cool and fresh',
                colors: {
                    primary: '#0ea5e9',
                    background: '#f0f9ff'
                }
            }
        };
        
        return themeInfo[theme] || themeInfo['light'];
    }
}

// Initialize theme switcher
let themeSwitcher;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeSwitcher = new ThemeSwitcher();
        window.themeSwitcher = themeSwitcher;
    });
} else {
    themeSwitcher = new ThemeSwitcher();
    window.themeSwitcher = themeSwitcher;
}

// Export for global access
window.ThemeSwitcher = ThemeSwitcher;