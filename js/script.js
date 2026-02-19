// ============================================
// DETECT IT EASY - UNIFIED JAVASCRIPT
// GitHub API Integration + Performance Optimized
// All CDN-free, all data cached in LocalStorage
// ============================================

'use strict';

// === CONFIGURATION ===
const CONFIG = {
    GITHUB_REPO: 'horsicq/Detect-It-Easy',
    GITHUB_RELEASES_REPO: 'horsicq/DIE-engine',
    GITHUB_API: 'https://api.github.com',
    CACHE_PREFIX: 'die_',
    CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
    PRELOADER_MIN_TIME: 1500,
    ANIMATION_THRESHOLD: 0.15,
    DEBUG: false
};

// === UTILITY FUNCTIONS ===
const Utils = {
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

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        }
        return num.toString();
    },

    formatNumberFull(num) {
        return num.toLocaleString('en-US');
    },

    timeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);

        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'week', seconds: 604800 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 }
        ];

        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
            }
        }
        return 'just now';
    },

    isMobile() {
        return 'ontouchstart' in window || window.innerWidth <= 768;
    },

    log(...args) {
        if (CONFIG.DEBUG) {
            console.log('[DIE]', ...args);
        }
    }
};

// === CACHE MANAGER ===
class CacheManager {
    static get(key) {
        try {
            const raw = localStorage.getItem(CONFIG.CACHE_PREFIX + key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.timestamp > CONFIG.CACHE_DURATION) {
                localStorage.removeItem(CONFIG.CACHE_PREFIX + key);
                return null;
            }
            return parsed.data;
        } catch {
            return null;
        }
    }

    static set(key, data) {
        try {
            localStorage.setItem(CONFIG.CACHE_PREFIX + key, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch {
            Utils.log('Cache write failed for', key);
        }
    }

    static clearOld() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(CONFIG.CACHE_PREFIX)) {
                    try {
                        const parsed = JSON.parse(localStorage.getItem(key));
                        if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
                            localStorage.removeItem(key);
                        }
                    } catch { /* skip */ }
                }
            });
        } catch { /* skip */ }
    }
}

// === GITHUB API MODULE ===
class GitHubAPI {
    constructor() {
        this.repoStats = null;
        this.totalDownloads = null;
        this.commits = null;
        this.contributors = null;
        this.languages = null;
        this.latestRelease = null;
    }

    async init() {
        await Promise.all([
            this.loadRepoStats(),
            this.loadTotalDownloads(),
            this.loadCommits(),
            this.loadContributors(),
            this.loadLanguages(),
            this.loadLatestRelease()
        ]);
    }

    // --- Repo Stats (stars, forks, watchers, issues) ---
    async loadRepoStats() {
        const cached = CacheManager.get('repo_stats');
        if (cached) {
            this.repoStats = cached;
            this.renderRepoStats();
            return;
        }
        try {
            const resp = await fetch(`${CONFIG.GITHUB_API}/repos/${CONFIG.GITHUB_REPO}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            this.repoStats = {
                stars: data.stargazers_count,
                forks: data.forks_count,
                watchers: data.subscribers_count,
                openIssues: data.open_issues_count
            };
            CacheManager.set('repo_stats', this.repoStats);
            this.renderRepoStats();
        } catch (e) {
            Utils.log('Repo stats fetch error:', e);
            this.repoStats = { stars: 10200, forks: 879, watchers: 168, openIssues: 0 };
            this.renderRepoStats();
        }
    }

    renderRepoStats() {
        if (!this.repoStats) return;
        const s = this.repoStats;
        this.updateEl('hero-stars', Utils.formatNumber(s.stars) + '+');
        this.updateEl('hero-forks', Utils.formatNumber(s.forks) + '+');
        this.updateEl('detailed-stars', Utils.formatNumberFull(s.stars));
        this.updateEl('detailed-forks', Utils.formatNumberFull(s.forks));
        this.updateEl('detailed-watchers', Utils.formatNumberFull(s.watchers));
        this.updateEl('detailed-issues', s.openIssues.toString());
    }

    // --- Total Downloads (all releases from DIE-engine) ---
    async loadTotalDownloads() {
        const cached = CacheManager.get('total_downloads');
        if (cached !== null) {
            this.totalDownloads = cached;
            this.renderDownloads();
            return;
        }
        try {
            let total = 0;
            let page = 1;
            let hasMore = true;
            while (hasMore) {
                const resp = await fetch(
                    `${CONFIG.GITHUB_API}/repos/${CONFIG.GITHUB_RELEASES_REPO}/releases?per_page=100&page=${page}`
                );
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const releases = await resp.json();
                if (releases.length === 0) {
                    hasMore = false;
                    break;
                }
                for (const release of releases) {
                    for (const asset of (release.assets || [])) {
                        total += asset.download_count || 0;
                    }
                }
                const linkHeader = resp.headers.get('Link');
                hasMore = linkHeader && linkHeader.includes('rel="next"');
                page++;
                if (page > 20) break; // safety limit
            }
            this.totalDownloads = total;
            CacheManager.set('total_downloads', total);
            this.renderDownloads();
        } catch (e) {
            Utils.log('Downloads fetch error:', e);
            this.totalDownloads = 1000000;
            this.renderDownloads();
        }
    }

    renderDownloads() {
        this.updateEl('hero-downloads', Utils.formatNumber(this.totalDownloads) + '+');
        this.updateEl('detailed-downloads', Utils.formatNumberFull(this.totalDownloads));
    }

    // --- Commits ---
    async loadCommits() {
        const cached = CacheManager.get('commits');
        if (cached) {
            this.commits = cached;
            this.renderCommits();
            return;
        }
        try {
            const resp = await fetch(
                `${CONFIG.GITHUB_API}/repos/${CONFIG.GITHUB_REPO}/commits?per_page=8`
            );
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            this.commits = data.map(c => ({
                sha: c.sha.substring(0, 7),
                message: (c.commit.message || '').split('\n')[0].substring(0, 80),
                date: c.commit.author.date,
                author: c.author ? c.author.login : c.commit.author.name,
                avatar: c.author ? c.author.avatar_url : null
            }));
            CacheManager.set('commits', this.commits);
            this.renderCommits();
        } catch (e) {
            Utils.log('Commits fetch error:', e);
        }
    }

    renderCommits() {
        const container = document.getElementById('commits-list');
        if (!container || !this.commits) return;
        container.innerHTML = this.commits.map(c => `
            <div class="commit-item">
                <div class="commit-line"></div>
                <div class="commit-dot"></div>
                <div class="commit-content">
                    <div class="commit-header">
                        ${c.avatar ? `<img class="commit-avatar" src="${c.avatar}" alt="${c.author}" width="24" height="24" loading="lazy">` : '<div class="commit-avatar-placeholder"></div>'}
                        <span class="commit-author">${c.author}</span>
                        <span class="commit-date">${Utils.timeAgo(c.date)}</span>
                    </div>
                    <p class="commit-message">${c.message}</p>
                    <code class="commit-sha">${c.sha}</code>
                </div>
            </div>
        `).join('');
    }

    // --- Contributors ---
    async loadContributors() {
        const cached = CacheManager.get('contributors');
        if (cached) {
            this.contributors = cached;
            this.renderContributors();
            return;
        }
        try {
            const resp = await fetch(
                `${CONFIG.GITHUB_API}/repos/${CONFIG.GITHUB_REPO}/contributors?per_page=12`
            );
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            this.contributors = data.map(c => ({
                login: c.login,
                avatar: c.avatar_url,
                contributions: c.contributions,
                url: c.html_url
            }));
            CacheManager.set('contributors', this.contributors);
            this.renderContributors();
        } catch (e) {
            Utils.log('Contributors fetch error:', e);
        }
    }

    renderContributors() {
        const container = document.getElementById('contributors-list');
        if (!container || !this.contributors) return;
        container.innerHTML = this.contributors.map(c => `
            <a href="${c.url}" target="_blank" class="contributor-item" title="${c.login} (${c.contributions} commits)">
                <img class="contributor-avatar" src="${c.avatar}" alt="${c.login}" width="40" height="40" loading="lazy">
                <span class="contributor-name">${c.login}</span>
            </a>
        `).join('');
    }

    // --- Languages ---
    async loadLanguages() {
        const cached = CacheManager.get('languages');
        if (cached) {
            this.languages = cached;
            this.renderLanguages();
            return;
        }
        try {
            const resp = await fetch(
                `${CONFIG.GITHUB_API}/repos/${CONFIG.GITHUB_REPO}/languages`
            );
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const total = Object.values(data).reduce((a, b) => a + b, 0);
            this.languages = Object.entries(data).map(([name, bytes]) => ({
                name,
                percent: ((bytes / total) * 100).toFixed(1)
            })).sort((a, b) => b.percent - a.percent);
            CacheManager.set('languages', this.languages);
            this.renderLanguages();
        } catch (e) {
            Utils.log('Languages fetch error:', e);
        }
    }

    renderLanguages() {
        const bar = document.getElementById('languages-bar');
        const legend = document.getElementById('languages-legend');
        if (!bar || !this.languages) return;

        const colors = {
            'C++': '#f34b7d', 'C': '#555555', 'JavaScript': '#f1e05a',
            'Python': '#3572A5', 'QMake': '#40d47e', 'Shell': '#89e051',
            'Batchfile': '#C1F12E', 'CMake': '#DA3434', 'NSIS': '#A9BF58',
            'Makefile': '#427819', 'HTML': '#e34c26', 'CSS': '#563d7c',
            'TypeScript': '#3178c6', 'Java': '#b07219', 'Ruby': '#701516'
        };
        const fallbackColors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

        bar.innerHTML = this.languages.map((l, i) => {
            const color = colors[l.name] || fallbackColors[i % fallbackColors.length];
            return `<div class="lang-segment" style="width:${l.percent}%;background:${color}" title="${l.name}: ${l.percent}%"></div>`;
        }).join('');

        if (legend) {
            legend.innerHTML = this.languages.slice(0, 6).map((l, i) => {
                const color = colors[l.name] || fallbackColors[i % fallbackColors.length];
                return `<span class="lang-item"><span class="lang-dot" style="background:${color}"></span>${l.name} <span class="lang-percent">${l.percent}%</span></span>`;
            }).join('');
        }
    }

    // --- Latest Release ---
    async loadLatestRelease() {
        const cached = CacheManager.get('latest_release');
        if (cached) {
            this.latestRelease = cached;
            this.renderLatestRelease();
            return;
        }
        try {
            const resp = await fetch(
                `${CONFIG.GITHUB_API}/repos/${CONFIG.GITHUB_RELEASES_REPO}/releases/latest`
            );
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            this.latestRelease = {
                tag: data.tag_name,
                name: data.name,
                date: data.published_at,
                url: data.html_url
            };
            CacheManager.set('latest_release', this.latestRelease);
            this.renderLatestRelease();
        } catch (e) {
            Utils.log('Latest release fetch error:', e);
        }
    }

    renderLatestRelease() {
        const el = document.getElementById('latest-release-badge');
        if (!el || !this.latestRelease) return;
        const r = this.latestRelease;
        el.innerHTML = `<a href="${r.url}" target="_blank" class="release-badge-link">
            <svg class="release-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span class="release-badge-text">${r.tag}</span>
            <span class="release-badge-date">${Utils.timeAgo(r.date)}</span>
        </a>`;
        el.style.display = 'inline-flex';
    }

    updateEl(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.textContent === value) return;
        el.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        el.style.transform = 'scale(0.85)';
        el.style.opacity = '0';
        setTimeout(() => {
            el.textContent = value;
            el.style.transform = 'scale(1)';
            el.style.opacity = '1';
        }, 150);
    }
}

// === PRELOADER ===
class Preloader {
    constructor() {
        this.el = document.querySelector('.preloader');
        if (!this.el) return;
        this.startTime = Date.now();
        this.bind();
    }

    bind() {
        const hide = () => {
            const elapsed = Date.now() - this.startTime;
            const remaining = Math.max(0, CONFIG.PRELOADER_MIN_TIME - elapsed);
            setTimeout(() => this.hide(), remaining);
        };

        if (document.readyState === 'complete') {
            hide();
        } else {
            window.addEventListener('load', hide);
        }
        setTimeout(() => this.hide(), 5000);
    }

    hide() {
        if (!this.el) return;
        this.el.classList.add('hidden');
        document.body.classList.remove('loading');
        setTimeout(() => this.el.remove(), 600);
        this.el = null;
    }
}

// === SCROLL ANIMATIONS ===
class ScrollAnimations {
    constructor() {
        this.observer = new IntersectionObserver(
            (entries) => this.onIntersect(entries),
            { threshold: CONFIG.ANIMATION_THRESHOLD, rootMargin: '0px 0px -50px 0px' }
        );
        this.observe();
    }

    observe() {
        document.querySelectorAll(
            '.fade-in, .fade-in-up, .scroll-reveal, .feature-card, .stat-card, .use-case-card, .partner-card, .os-item'
        ).forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = `opacity 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.04}s, transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.04}s`;
            this.observer.observe(el);
        });
    }

    onIntersect(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.classList.add('visible');
                this.observer.unobserve(entry.target);
            }
        });
    }
}

// === NAVBAR SCROLL ===
class NavbarScroll {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        if (!this.navbar) return;
        this.scrolled = false;
        window.addEventListener('scroll', Utils.debounce(() => this.update(), 10), { passive: true });
        this.update();
    }

    update() {
        const shouldScroll = window.pageYOffset > 50;
        if (shouldScroll !== this.scrolled) {
            this.scrolled = shouldScroll;
            this.navbar.style.background = shouldScroll ? 'rgba(10,10,10,0.9)' : '';
            this.navbar.style.boxShadow = shouldScroll ? '0 8px 32px rgba(0,0,0,0.4)' : '';
        }
    }
}

// === CARD TILT EFFECT ===
class CardTilt {
    constructor() {
        if (Utils.isMobile()) return;
        document.querySelectorAll('.feature-card, .use-case-card, .stat-card').forEach(card => {
            card.addEventListener('mousemove', Utils.throttle((e) => this.move(e, card), 16));
            card.addEventListener('mouseleave', () => this.leave(card));
            card.addEventListener('mouseenter', () => { card.style.transition = 'transform 0.1s ease-out'; });
        });
    }

    move(e, card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rx = (y - cy) / 40;
        const ry = (cx - x) / 40;
        card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    }

    leave(card) {
        card.style.transition = 'transform 0.4s cubic-bezier(0.4,0,0.2,1)';
        card.style.transform = '';
    }
}

// === PARALLAX (desktop only) ===
class Parallax {
    constructor() {
        if (Utils.isMobile()) return;
        this.hero = document.querySelector('.hero');
        this.orbs = document.querySelectorAll('.gradient-orb');
        if (!this.hero || !this.orbs.length) return;
        let raf = null;
        this.hero.addEventListener('mousemove', (e) => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                const rect = this.hero.getBoundingClientRect();
                const mx = e.clientX - rect.left - rect.width / 2;
                const my = e.clientY - rect.top - rect.height / 2;
                this.orbs.forEach((orb, i) => {
                    const speed = (i + 1) * 0.02;
                    orb.style.transform = `translate(${mx * speed}px, ${my * speed}px)`;
                });
                raf = null;
            });
        });
        this.hero.addEventListener('mouseleave', () => {
            this.orbs.forEach(orb => {
                orb.style.transition = 'transform 0.5s ease-out';
                orb.style.transform = '';
                setTimeout(() => { orb.style.transition = ''; }, 500);
            });
        });
    }
}

// === BUTTON RIPPLE ===
class ButtonRipple {
    constructor() {
        document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
                ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });
    }
}

// === SMOOTH SCROLL ===
class SmoothScroll {
    constructor() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
                }
            });
        });
    }
}

// === LAZY LOADER ===
class LazyLoader {
    constructor() {
        const imgs = document.querySelectorAll('img[data-src]');
        if ('loading' in HTMLImageElement.prototype) {
            imgs.forEach(img => { img.src = img.dataset.src; img.loading = 'lazy'; });
        } else {
            const obs = new IntersectionObserver(entries => {
                entries.forEach(e => { if (e.isIntersecting) { e.target.src = e.target.dataset.src; obs.unobserve(e.target); } });
            });
            imgs.forEach(img => obs.observe(img));
        }
    }
}

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    CacheManager.clearOld();

    new Preloader();

    const api = new GitHubAPI();
    api.init();

    setTimeout(() => {
        new ScrollAnimations();
        new NavbarScroll();
        new CardTilt();
        new Parallax();
        new ButtonRipple();
        new SmoothScroll();
        new LazyLoader();
    }, 100);

    Utils.log('All systems initialized');
});
