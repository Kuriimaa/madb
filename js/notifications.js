/**
 * Notification System for MADB (MagtanimAyDiBiro)
 * Handles stage reminders and browser notifications
 */

const NotificationManager = {
    NOTIFICATION_STORAGE_KEY: 'notificationSettings',
    LAST_NOTIFICATION_KEY: 'lastNotificationCheck',

    /**
     * Request notification permission from user
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('[Notifications] Not supported in this browser');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            console.log('[Notifications] Permission:', permission);
            return permission === 'granted';
        }

        return false;
    },

    /**
     * Check if notifications are enabled
     */
    isEnabled() {
        if (!('Notification' in window)) {
            return false;
        }
        return Notification.permission === 'granted';
    },

    /**
     * Show a browser notification
     */
    show(title, options = {}) {
        if (!this.isEnabled()) {
            console.log('[Notifications] Not enabled, skipping:', title);
            return null;
        }

        const defaultOptions = {
            icon: '/icon-192x192.svg',
            badge: '/icon-192x192.svg',
            vibrate: [200, 100, 200],
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);
            console.log('[Notifications] Shown:', title);
            return notification;
        } catch (error) {
            console.error('[Notifications] Error showing notification:', error);
            return null;
        }
    },

    /**
     * Calculate days until a specific date
     */
    daysUntil(targetDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);
        
        const diffMs = target - today;
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    },

    /**
     * Get upcoming stages for a farm
     */
    getUpcomingStages(farmInfo, stages) {
        if (!farmInfo || !farmInfo.startDate) {
            return [];
        }

        const startDate = new Date(farmInfo.startDate);
        const upcoming = [];

        stages.forEach(stage => {
            const stageDate = new Date(startDate);
            stageDate.setDate(stageDate.getDate() + stage.offset);
            
            const daysUntil = this.daysUntil(stageDate);
            
            // Include stages happening today, tomorrow, or in next 3 days
            if (daysUntil >= 0 && daysUntil <= 3) {
                upcoming.push({
                    stage: stage,
                    date: stageDate,
                    daysUntil: daysUntil,
                    farmName: farmInfo.name
                });
            }
        });

        return upcoming;
    },

    /**
     * Check if we should show notifications today
     */
    shouldCheckToday() {
        try {
            const lastCheck = localStorage.getItem(this.LAST_NOTIFICATION_KEY);
            if (!lastCheck) return true;

            const today = new Date().toDateString();
            const lastCheckDate = new Date(lastCheck).toDateString();

            return today !== lastCheckDate;
        } catch (error) {
            return true;
        }
    },

    /**
     * Mark that we've checked notifications today
     */
    markCheckedToday() {
        try {
            localStorage.setItem(this.LAST_NOTIFICATION_KEY, new Date().toISOString());
        } catch (error) {
            console.error('[Notifications] Error saving check date:', error);
        }
    },

    /**
     * Check farm for upcoming stages and notify
     */
    async checkFarmStages(farmInfo, stages) {
        if (!farmInfo || farmInfo.completed) {
            return [];
        }

        const upcoming = this.getUpcomingStages(farmInfo, stages);
        
        if (upcoming.length === 0) {
            return [];
        }

        // Only show notifications if we haven't checked today
        if (this.shouldCheckToday() && this.isEnabled()) {
            upcoming.forEach(item => {
                let message = '';
                let urgency = 'normal';

                if (item.daysUntil === 0) {
                    message = `Today: ${item.stage.title}`;
                    urgency = 'high';
                } else if (item.daysUntil === 1) {
                    message = `Tomorrow: ${item.stage.title}`;
                    urgency = 'high';
                } else {
                    message = `In ${item.daysUntil} days: ${item.stage.title}`;
                }

                this.show(`🌾 ${item.farmName}`, {
                    body: message,
                    tag: `stage-${item.stage.offset}`,
                    requireInteraction: urgency === 'high',
                    data: {
                        farmId: farmInfo.id,
                        stageOffset: item.stage.offset
                    }
                });
            });

            this.markCheckedToday();
        }

        return upcoming;
    },

    /**
     * Check all active farms for upcoming stages
     */
    async checkAllFarms(stages) {
        try {
            const farms = await IndexedDBStorage.getActiveFarms();
            const allUpcoming = [];

            for (const farm of farms) {
                const upcoming = await this.checkFarmStages(farm, stages);
                allUpcoming.push(...upcoming);
            }

            return allUpcoming;
        } catch (error) {
            console.error('[Notifications] Error checking farms:', error);
            return [];
        }
    },

    /**
     * Format upcoming stage for display
     */
    formatUpcoming(upcoming) {
        if (upcoming.daysUntil === 0) {
            return {
                text: `Today: ${upcoming.stage.title}`,
                class: 'urgent',
                icon: '🔔'
            };
        } else if (upcoming.daysUntil === 1) {
            return {
                text: `Tomorrow: ${upcoming.stage.title}`,
                class: 'warning',
                icon: '⏰'
            };
        } else {
            return {
                text: `In ${upcoming.daysUntil} days: ${upcoming.stage.title}`,
                class: 'info',
                icon: '📅'
            };
        }
    },

    /**
     * Create in-app notification banner HTML
     */
    createBannerHTML(upcoming) {
        const formatted = this.formatUpcoming(upcoming);
        return `
            <div class="notification-banner ${formatted.class}">
                <span class="notification-icon">${formatted.icon}</span>
                <div class="notification-content">
                    <strong>${upcoming.farmName}</strong>
                    <div>${formatted.text}</div>
                    ${upcoming.stage.desc ? `<small>${upcoming.stage.desc}</small>` : ''}
                </div>
            </div>
        `;
    }
};

// Export for use in other scripts
window.NotificationManager = NotificationManager;

console.log('[Notifications] NotificationManager loaded');

