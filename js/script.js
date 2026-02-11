// ============================================
// DETECT IT EASY - OPTIMIZED JAVASCRIPT
// GitHub API Integration + Performance Optimized
// ============================================

'use strict';

// === CONFIGURATION ===
const CONFIG = {
    GITHUB_API_URL: 'https://api.github.com/repos/horsicq/Detect-It-Easy',
    CACHE_KEY: 'die_github_stats',
    CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
    DEBUG: false // Set to true for development
};

// === UTILITY FUNCTIONS ===
const Utils = {
    // Debounce function for scroll events
    debounce(func, wait = 16) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function for frequent events
    throttle(func, limit = 100) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Format large numbers (10200 -> 10.2k)
    formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    },

    // Safe log (only in debug mode)
    log(...args) {
        if (CONFIG.DEBUG) {
            console.log(...args);
        }
    }
};

// === GITHUB API & CACHING ===
class GitHubStats {
    constructor() {
        this.stats = null;
        this.init();
    }

    async init() {
        await this.loadStats();
    }

    async loadStats() {
        const cached = this.getCachedStats();
        
        if (cached) {
            this.stats = cached.data;
            this.updateDOM();
            Utils.log('📊 Loaded stats from cache');
        } else {
            await this.fetchFromAPI();
        }
    }

    getCachedStats() {
        try {
            const cached = localStorage.getItem(CONFIG.CACHE_KEY);
            if (!cached) return null;

            const parsed = JSON.parse(cached);
            const now = Date.now();
            
            if (now - parsed.timestamp < CONFIG.CACHE_DURATION) {
                return parsed;
            }
            
            localStorage.removeItem(CONFIG.CACHE_KEY);
            return null;
        } catch (error) {
            Utils.log('Error reading cache:', error);
            return null;
        }
    }

    async fetchFromAPI() {
        try {
            Utils.log('📡 Fetching stats from GitHub API...');
            const response = await fetch(CONFIG.GITHUB_API_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            this.stats = {
                stars: data.stargazers_count,
                forks: data.forks_count,
                watchers: data.subscribers_count,
                openIssues: data.open_issues_count,
            };

            this.cacheStats(this.stats);
            this.updateDOM();
            
            Utils.log('✅ Stats fetched successfully:', this.stats);
        } catch (error) {
            Utils.log('❌ Error fetching GitHub stats:', error);
            this.showFallbackStats();
        }
    }

    cacheStats(stats) {
        try {
            const cacheData = {
                data: stats,
                timestamp: Date.now(),
            };
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            Utils.log('Error caching stats:', error);
        }
    }

    updateDOM() {
        if (!this.stats) return;

        // Hero section stats
        this.updateElement('github-stars', Utils.formatNumber(this.stats.stars));
        this.updateElement('github-forks', Utils.formatNumber(this.stats.forks));

        // Detailed stats section - animate only if element is visible
        const detailedStars = document.getElementById('detailed-stars');
        if (detailedStars && this.isElementInViewport(detailedStars)) {
            this.animateNumber('detailed-stars', this.stats.stars);
            this.animateNumber('detailed-forks', this.stats.forks);
            this.animateNumber('detailed-watchers', this.stats.watchers);
        } else {
            this.updateElement('detailed-stars', Utils.formatNumber(this.stats.stars));
            this.updateElement('detailed-forks', Utils.formatNumber(this.stats.forks));
            this.updateElement('detailed-watchers', Utils.formatNumber(this.stats.watchers));
        }
        this.updateElement('detailed-issues', this.stats.openIssues.toString());
    }

    isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    animateNumber(id, targetValue) {
        const element = document.getElementById(id);
        if (!element) return;

        const duration = 1500;
        const startTime = performance.now();
        const startValue = 0;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (easeOutQuart)
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);
            element.textContent = Utils.formatNumber(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = Utils.formatNumber(targetValue);
            }
        };

        requestAnimationFrame(animate);
    }

    showFallbackStats() {
        this.stats = {
            stars: 10200,
            forks: 879,
            watchers: 168,
            openIssues: 0,
        };
        this.updateDOM();
    }
}

// === SCROLL ANIMATIONS ===
class ScrollAnimations {
    constructor() {
        this.observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px',
        };
        this.init();
    }

    init() {
        this.observer = new IntersectionObserver(
            this.handleIntersection.bind(this),
            this.observerOptions
        );

        this.observeElements();
    }

    observeElements() {
        const elements = document.querySelectorAll(
            '.fade-in, .fade-in-up, .scroll-reveal'
        );
        
        elements.forEach((element, index) => {
            // Add stagger delay
            element.style.animationDelay = `${index * 0.1}s`;
            this.observer.observe(element);
        });
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                this.observer.unobserve(entry.target);
            }
        });
    }
}

// === SMOOTH SCROLLING ===
class SmoothScroll {
    constructor() {
        this.init();
    }

    init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;

                e.preventDefault();
                const target = document.querySelector(href);
                
                if (target) {
                    const offsetTop = target.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth',
                    });
                }
            });
        });
    }
}

// === NAVBAR SCROLL EFFECT ===
class NavbarScroll {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        if (!this.navbar) return;
        
        this.scrolled = false;
        this.init();
    }

    init() {
        // Use debounced scroll handler
        const handleScroll = Utils.debounce(() => {
            this.updateNavbar();
        }, 10);

        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Initial check
        this.updateNavbar();
    }

    updateNavbar() {
        const currentScroll = window.pageYOffset;
        const shouldBeScrolled = currentScroll > 50;

        if (shouldBeScrolled !== this.scrolled) {
            this.scrolled = shouldBeScrolled;
            
            if (shouldBeScrolled) {
                this.navbar.style.background = 'rgba(10, 10, 10, 0.9)';
                this.navbar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
            } else {
                this.navbar.style.background = '';
                this.navbar.style.boxShadow = '';
            }
        }
    }
}

// === CARD TILT EFFECT (Optimized) ===
class CardTilt {
    constructor() {
        this.cards = document.querySelectorAll('.feature-card, .use-case-card, .stat-card');
        if (this.cards.length === 0) return;
        
        // Don't enable on touch devices
        if ('ontouchstart' in window) return;
        
        this.init();
    }

    init() {
        this.cards.forEach(card => {
            card.addEventListener('mousemove', Utils.throttle((e) => this.handleMouseMove(e, card), 16));
            card.addEventListener('mouseleave', () => this.handleMouseLeave(card));
            card.addEventListener('mouseenter', () => this.handleMouseEnter(card));
        });
    }

    handleMouseEnter(card) {
        card.style.transition = 'transform 0.1s ease-out';
    }

    handleMouseMove(e, card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Reduced intensity (40 instead of 20)
        const rotateX = (y - centerY) / 40;
        const rotateY = (centerX - x) / 40;
        
        // Update CSS variables for glow effect
        card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    }

    handleMouseLeave(card) {
        card.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        card.style.transform = '';
    }
}

// === LAZY LOADING ===
class LazyLoader {
    constructor() {
        this.init();
    }

    init() {
        // Native lazy loading for images
        const images = document.querySelectorAll('img[data-src]');
        
        if ('loading' in HTMLImageElement.prototype) {
            images.forEach(img => {
                img.src = img.dataset.src;
                img.loading = 'lazy';
            });
        } else {
            // Fallback with intersection observer
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        }
    }
}

// === STORAGE MANAGEMENT ===
class StorageManager {
    static clearOldCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('die_')) {
                    const item = localStorage.getItem(key);
                    if (item) {
                        const parsed = JSON.parse(item);
                        const age = Date.now() - parsed.timestamp;
                        
                        // Remove if older than 24 hours
                        if (age > 24 * 60 * 60 * 1000) {
                            localStorage.removeItem(key);
                            Utils.log(`🗑️ Removed old cache: ${key}`);
                        }
                    }
                }
            });
        } catch (error) {
            Utils.log('Error cleaning cache:', error);
        }
    }
}

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    Utils.log('🚀 Initializing Detect It Easy website...');

    // Clean old cache
    StorageManager.clearOldCache();

    // Initialize all modules
    new GitHubStats();
    new ScrollAnimations();
    new SmoothScroll();
    new NavbarScroll();
    new CardTilt();
    new LazyLoader();

    Utils.log('✅ All systems initialized!');
});

// === DEBUG API ===
if (CONFIG.DEBUG) {
    window.DIE = {
        version: '4.0.0',
        refreshStats: async () => {
            localStorage.removeItem(CONFIG.CACHE_KEY);
            const stats = new GitHubStats();
            await stats.fetchFromAPI();
            console.log('🔄 Stats refreshed!');
        },
        clearCache: () => {
            localStorage.removeItem(CONFIG.CACHE_KEY);
            console.log('🗑️ Cache cleared!');
        },
        enableDebug: () => {
            CONFIG.DEBUG = true;
            console.log('🔧 Debug mode enabled');
        }
    };
}
