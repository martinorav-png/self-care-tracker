// ================================
// BALATRO MUSIC PLAYER
// ================================

class MusicPlayer {
    constructor() {
        this.audio = null;
        this.isPlaying = false;
        this.volume = 0.3; // 30% volume default
        this.init();
    }

    init() {
        // Create audio element
        this.audio = new Audio('balatro-theme.mp3');
        this.audio.loop = true;
        this.audio.volume = this.volume;

        // Load saved preferences
        const savedVolume = localStorage.getItem('music_volume');
        const savedPlaying = localStorage.getItem('music_playing');

        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
            this.audio.volume = this.volume;
        }

        // Note: Can't autoplay due to browser restrictions
        // User must interact first

        // Setup UI
        this.setupUI();
        this.attachEventListeners();

        console.log('🎵 Balatro Music Player initialized!');
    }

    setupUI() {
        // Update volume slider
        const volumeSlider = document.getElementById('musicVolume');
        if (volumeSlider) {
            volumeSlider.value = this.volume * 100;
        }

        // Update play button state
        this.updatePlayButton();
    }

    attachEventListeners() {
        const playBtn = document.getElementById('musicPlayBtn');
        const volumeSlider = document.getElementById('musicVolume');
        const minimizeBtn = document.getElementById('musicMinimize');
        const playerContainer = document.getElementById('musicPlayer');

        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlay());
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value / 100);
            });
        }

        if (minimizeBtn && playerContainer) {
            minimizeBtn.addEventListener('click', () => {
                playerContainer.classList.toggle('minimized');
                minimizeBtn.textContent = playerContainer.classList.contains('minimized') ? '◀' : '▶';
            });
        }

        // Handle audio events
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });

        this.audio.addEventListener('error', (e) => {
            console.error('Music player error:', e);
            this.showError();
        });
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.audio.play()
            .then(() => {
                this.isPlaying = true;
                this.updatePlayButton();
                localStorage.setItem('music_playing', 'true');
            })
            .catch(error => {
                console.error('Failed to play music:', error);
                this.showError();
            });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        localStorage.setItem('music_playing', 'false');
    }

    setVolume(value) {
        this.volume = value;
        this.audio.volume = value;
        localStorage.setItem('music_volume', value);

        // Update volume icon
        const volumeIcon = document.querySelector('.volume-icon');
        if (volumeIcon) {
            if (value === 0) {
                volumeIcon.textContent = '🔇';
            } else if (value < 0.5) {
                volumeIcon.textContent = '🔉';
            } else {
                volumeIcon.textContent = '🔊';
            }
        }
    }

    updatePlayButton() {
        const playBtn = document.getElementById('musicPlayBtn');
        if (playBtn) {
            playBtn.innerHTML = this.isPlaying 
                ? '<span class="play-icon">⏸️</span>' 
                : '<span class="play-icon">▶️</span>';
            playBtn.setAttribute('aria-label', this.isPlaying ? 'Pause music' : 'Play music');
        }
    }

    showError() {
        const playerTitle = document.querySelector('.music-player-title');
        if (playerTitle) {
            playerTitle.textContent = '⚠️ MP3 not found';
            playerTitle.style.color = '#ef4444';
            setTimeout(() => {
                playerTitle.textContent = '🎴 Balatro Theme';
                playerTitle.style.color = '';
            }, 3000);
        }
    }
}

// Initialize music player when DOM is ready
let musicPlayer;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        musicPlayer = new MusicPlayer();
    });
} else {
    musicPlayer = new MusicPlayer();
}

// Export for global access
window.MusicPlayer = MusicPlayer;
window.musicPlayer = musicPlayer;