// Utility Functions for MemoryMind AI Game

/**
 * Utility class containing helper functions
 */
class GameUtils {
    /**
     * Shuffle an array using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     * @returns {Array} - Shuffled array
     */
    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Generate a random number between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Random number
     */
    static randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Format time in MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} - Formatted time string
     */
    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Debounce function to limit function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} - Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Add CSS class with animation support
     * @param {HTMLElement} element - Element to add class to
     * @param {string} className - Class name to add
     * @param {number} duration - Duration in milliseconds (optional)
     */
    static addClassWithAnimation(element, className, duration = 0) {
        element.classList.add(className);
        if (duration > 0) {
            setTimeout(() => {
                element.classList.remove(className);
            }, duration);
        }
    }

    /**
     * Create a delay/sleep function
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} - Promise that resolves after delay
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get a random element from an array
     * @param {Array} array - Array to pick from
     * @returns {*} - Random element
     */
    static randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Check if device is mobile
     * @returns {boolean} - True if mobile device
     */
    static isMobile() {
        return window.innerWidth <= 768;
    }

    /**
     * Check if device supports touch
     * @returns {boolean} - True if touch is supported
     */
    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Animate element with CSS classes
     * @param {HTMLElement} element - Element to animate
     * @param {string} animationClass - Animation class name
     * @param {number} duration - Animation duration in milliseconds
     * @returns {Promise} - Promise that resolves when animation completes
     */
    static animateElement(element, animationClass, duration = 600) {
        return new Promise((resolve) => {
            element.classList.add(animationClass);
            setTimeout(() => {
                element.classList.remove(animationClass);
                resolve();
            }, duration);
        });
    }

    /**
     * Local storage helper functions
     */
    static storage = {
        /**
         * Save data to localStorage
         * @param {string} key - Storage key
         * @param {*} data - Data to save
         */
        save(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (error) {
                console.warn('Failed to save to localStorage:', error);
            }
        },

        /**
         * Load data from localStorage
         * @param {string} key - Storage key
         * @param {*} defaultValue - Default value if key doesn't exist
         * @returns {*} - Loaded data or default value
         */
        load(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('Failed to load from localStorage:', error);
                return defaultValue;
            }
        },

        /**
         * Remove data from localStorage
         * @param {string} key - Storage key
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn('Failed to remove from localStorage:', error);
            }
        }
    };

    /**
     * Event emitter for custom events
     */
    static eventEmitter = {
        events: {},

        /**
         * Subscribe to an event
         * @param {string} event - Event name
         * @param {Function} callback - Callback function
         */
        on(event, callback) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(callback);
        },

        /**
         * Unsubscribe from an event
         * @param {string} event - Event name
         * @param {Function} callback - Callback function to remove
         */
        off(event, callback) {
            if (this.events[event]) {
                this.events[event] = this.events[event].filter(cb => cb !== callback);
            }
        },

        /**
         * Emit an event
         * @param {string} event - Event name
         * @param {*} data - Data to pass to callbacks
         */
        emit(event, data) {
            if (this.events[event]) {
                this.events[event].forEach(callback => callback(data));
            }
        }
    };

    /**
     * Performance monitoring utilities
     */
    static performance = {
        timers: {},

        /**
         * Start a performance timer
         * @param {string} name - Timer name
         */
        start(name) {
            this.timers[name] = performance.now();
        },

        /**
         * End a performance timer and return duration
         * @param {string} name - Timer name
         * @returns {number} - Duration in milliseconds
         */
        end(name) {
            if (this.timers[name]) {
                const duration = performance.now() - this.timers[name];
                delete this.timers[name];
                return Math.round(duration * 100) / 100; // Round to 2 decimal places
            }
            return 0;
        }
    };

    /**
     * Accessibility helpers
     */
    static accessibility = {
        /**
         * Announce text to screen readers
         * @param {string} text - Text to announce
         */
        announce(text) {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.style.width = '1px';
            announcement.style.height = '1px';
            announcement.style.overflow = 'hidden';
            announcement.textContent = text;
            
            document.body.appendChild(announcement);
            
            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
        },

        /**
         * Set focus to element with optional delay
         * @param {HTMLElement} element - Element to focus
         * @param {number} delay - Delay in milliseconds
         */
        focus(element, delay = 0) {
            setTimeout(() => {
                if (element && typeof element.focus === 'function') {
                    element.focus();
                }
            }, delay);
        }
    };

    /**
     * Game-specific constants
     */
    static GAME_CONSTANTS = {
        SYMBOLS: ['⭐', '🔵', '🔺', '🟩'],
        SYMBOL_NAMES: ['star', 'circle', 'triangle', 'square'],
        DIFFICULTIES: {
            beginner: { rows: 4, cols: 4, aiAccuracy: 0.7 },
            intermediate: { rows: 4, cols: 6, aiAccuracy: 0.85 },
            advanced: { rows: 6, cols: 6, aiAccuracy: 0.95 },
            expert: { rows: 6, cols: 8, aiAccuracy: 0.98 }
        },
        ANIMATION_DURATIONS: {
            cardFlip: 600,
            cardMatch: 800,
            cardShake: 500,
            aiThinking: 1500
        },
        STORAGE_KEYS: {
            gameStats: 'memorymind_stats',
            difficulty: 'memorymind_difficulty',
            settings: 'memorymind_settings'
        }
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameUtils;
}

