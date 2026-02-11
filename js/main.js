/**
 * Detect It Easy - Main JavaScript
 * Premium Redesign 2026
 * Liquid Glass Design System
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        GITHUB_REPO: 'horsicq/Detect-It-Easy',
        ANIMATION_THRESHOLD: 0.15,
        DEBOUNCE_DELAY: 100,
        PRELOADER_MIN_TIME: 1500
    };

    // Utility Functions
    const debounce = (fn, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    };

    const formatNumber = (num) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        }
        return num.toString();
    };

    // Preloader
    function initPreloader() {
        const preloader = document.querySelector('.preloader');
        const body = document.body;
        
        if (!preloader) return;

        const hidePreloader = () => {
            preloader.classList.add('hidden');
            body.classList.remove('loading');
            
            // Remove preloader after animation
            setTimeout(() => {
                preloader.remove();
            }, 600);
        };

        // Wait for minimum time and page load
        const startTime = Date.now();
        
        window.addEventListener('load', () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, CONFIG.PRELOADER_MIN_TIME - elapsed);
            
            setTimeout(hidePreloader, remaining);
        });

        // Fallback: hide after 5 seconds max
        setTimeout(hidePreloader, 5000);
    }

    // Fetch GitHub Statistics
    async function fetchGitHubStats() {
        try {
            const response = await fetch(`https://api.github.com/repos/${CONFIG.GITHUB_REPO}`);
            if (!response.ok) throw new Error('GitHub API error');
            
            const data = await response.json();
            
            // Update stats with animation
            animateStat('hero-stars', formatNumber(data.stargazers_count) + '+');
            animateStat('detailed-stars', formatNumber(data.stargazers_count));
            animateStat('detailed-forks', formatNumber(data.forks_count));
            animateStat('detailed-watchers', formatNumber(data.subscribers_count));
            animateStat('detailed-issues', data.open_issues_count.toString());
            
        } catch (error) {
            console.warn('Could not fetch GitHub stats:', error.message);
        }
    }

    function animateStat(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            el.style.transform = 'scale(0.8)';
            el.style.opacity = '0';
            
            setTimeout(() => {
                el.textContent = value;
                el.style.transform = 'scale(1)';
                el.style.opacity = '1';
            }, 150);
        }
    }

    // Scroll Reveal Animation
    function initScrollAnimations() {
        const revealElements = document.querySelectorAll('.section-reveal, .feature-card, .stat-card, .use-case-card, .partner-card, .os-item');
        
        if (!('IntersectionObserver' in window)) {
            revealElements.forEach(el => el.classList.add('visible'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    // Add staggered delay
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 50);
                    
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: CONFIG.ANIMATION_THRESHOLD,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            observer.observe(el);
        });
    }

    // Navbar Scroll Effect
    function initNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        let lastScroll = 0;
        let ticking = false;

        const updateNavbar = () => {
            const currentScroll = window.scrollY;
            
            if (currentScroll > 100) {
                navbar.style.background = 'rgba(17, 17, 19, 0.95)';
                navbar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
            } else {
                navbar.style.background = '';
                navbar.style.boxShadow = '';
            }
            
            lastScroll = currentScroll;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateNavbar);
                ticking = true;
            }
        }, { passive: true });
    }

    // Feature Cards Mouse Effect
    function initCardEffects() {
        document.querySelectorAll('.feature-card, .stat-card, .use-case-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                card.style.setProperty('--mouse-x', `${x}%`);
                card.style.setProperty('--mouse-y', `${y}%`);
            });

            // Tilt effect
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    // Button Ripple Effect - Liquid Glass Style
    function initButtonRipples() {
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

    // Smooth Scroll for Anchor Links
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Parallax Effect for Hero Background
    function initParallax() {
        const hero = document.querySelector('.hero');
        const orbs = document.querySelectorAll('.gradient-orb');
        
        if (!hero || orbs.length === 0) return;

        let rafId = null;

        const handleMouseMove = (e) => {
            if (rafId) return;
            
            rafId = requestAnimationFrame(() => {
                const rect = hero.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const mouseX = e.clientX - rect.left - centerX;
                const mouseY = e.clientY - rect.top - centerY;

                orbs.forEach((orb, index) => {
                    const speed = (index + 1) * 0.02;
                    const x = mouseX * speed;
                    const y = mouseY * speed;
                    orb.style.transform = `translate(${x}px, ${y}px)`;
                });
                
                rafId = null;
            });
        };

        hero.addEventListener('mousemove', handleMouseMove);
        hero.addEventListener('mouseleave', () => {
            orbs.forEach(orb => {
                orb.style.transition = 'transform 0.5s ease-out';
                orb.style.transform = '';
                setTimeout(() => {
                    orb.style.transition = '';
                }, 500);
            });
        });
    }

    // Counter Animation
    function initCounterAnimation() {
        const counters = document.querySelectorAll('.stat-value, .stat-number');
        
        const animateCounter = (el, target) => {
            const duration = 2000;
            const startTime = performance.now();
            const startValue = 0;
            
            const isNumber = !isNaN(parseInt(target));
            if (!isNumber) return;
            
            const numericTarget = parseInt(target.replace(/[^0-9]/g, ''));
            const suffix = target.replace(/[0-9]/g, '');
            
            const step = (currentTime) => {
                const progress = Math.min((currentTime - startTime) / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 4);
                const current = Math.floor(startValue + (numericTarget - startValue) * easeProgress);
                
                el.textContent = current.toLocaleString() + suffix;
                
                if (progress < 1) {
                    requestAnimationFrame(step);
                }
            };
            
            requestAnimationFrame(step);
        };

        counters.forEach(counter => {
            const target = counter.textContent;
            counter.dataset.target = target;
        });
    }

    // Initialize
    function init() {
        // Start preloader first
        initPreloader();
        
        // Fetch GitHub stats
        fetchGitHubStats();
        
        // Initialize effects after a small delay
        setTimeout(() => {
            initScrollAnimations();
            initNavbarScroll();
            initCardEffects();
            initButtonRipples();
            initSmoothScroll();
            initParallax();
            initCounterAnimation();
        }, 100);

        // Log initialization
        console.log('%c DIE Website Loaded ', 'background: linear-gradient(135deg, #FF6B4A, #E5533A); color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold;');
    }

    // Run immediately
    initPreloader();
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
