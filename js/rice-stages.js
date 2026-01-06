/**
 * Rice Cultivation Stages and Progress Calculation
 * Shared between dashboard and rice-guide for consistency
 */

const RICE_CULTIVATION_STAGES = [
    {
        title: '1. Land Cultivation Phase',
        desc: 'Prepare the field through deep plowing and leveling to create ideal soil conditions for rice transplanting.',
        tip: 'Start land cultivation at the beginning of your planting season. Coordinate with seed preparation (Phase 2).',
        tasks: [
            { text: 'Perform deep plowing (deep tillage to break soil and incorporate organic matter and wait for soil to settle)', offset: 0 },
            { text: 'Level the field (create uniform water depth and smooth surface)', offset: 25 }
        ],
        offset: 0,
        dashboardLabel: 'Land Prep'
    },
    {
        title: '2. Seed Preparation Phase',
        desc: 'Prepare high-quality seedlings while land cultivation is ongoing; seedlings should be 25 days old by transplanting.',
        tip: 'Start seed soaking 1 week after plowing begins.',
        tasks: [
            { text: 'Start soaking seeds (soak 2 days)', offset: 3 },
            { text: 'Transfer sprouted seeds to nursery bed. Nurture seedlings in nursery for 25 days', offset: 5 },
            { text: 'Seedlings ready for transplanting (25 days old)', offset: 30 }
        ],
        offset: 3,
        dashboardLabel: 'Seeds'
    },
    {
        title: '3. Pre-Transplantation (Field Treatment)',
        desc: 'Treat the leveled field with pesticide to remove remaining pests before transplanting the seedlings.',
        tip: 'Perform this step only after field leveling and seedlings readiness — schedule shown below.',
        tasks: [
            { text: 'Verify soil is leveled (Phase 1)', offset: 25 },
            { text: 'Verify seedlings are ready (Phase 2)', offset: 30 },
            { text: 'Apply pesticide on the entire field to eliminate remaining pests', offset: 30 },
        ],
        offset: 30,
        dashboardLabel: 'Treatment'
    },
    {
        title: '4. Transplanting',
        desc: 'Transplant the mature seedlings from the nursery to the prepared and treated field — this marks Day 0 of growth.',
        tip: 'Transplant only after the field is leveled, treated and seedlings are ready.',
        tasks: [
            { text: 'Transplant seedlings to main field', offset: 31 },
            { text: 'Plant at proper spacing for optimal growth', offset: 31 },
            { text: 'Record transplanting date (start of 90-day growth period)', offset: 31 }
        ],
        offset: 31,
        dashboardLabel: 'Planting'
    },
    {
        title: '5. Fertilizer & Pesticide Management',
        desc: 'Apply fertilizers and pesticides on a schedule after transplanting. Resources calculated per hectare.',
        tip: 'Monitor the condition of the rice crop.',
        tasks: [
            { text: 'Apply basal fertilizer (3 bags/ha) - wait 15 days for side dressing', offset: 31 },
            { text: 'Apply pesticide every 2 weeks and adjust applications as needed', offset: 46 },
            { text: 'Apply side dressing (3 bags/ha) - wait 30 days for top dressing ', offset: 46 },
            { text: 'Apply top dressing (2 bags/ha)', offset: 76 }
        ],
        resourcesPerHectare: {
            totalFertilizer: '8 bags',
            totalPesticide: '2 quarts',
            applications: [
                { day: 15, fertilizer: '3 bags' },
                { day: 45, fertilizer: '3 bags' },
                { day: 90, fertilizer: '2 bags' }
            ]
        },
        offset: 46,
        dashboardLabel: 'Growth'
    },
    {
        title: '6. Harvesting',
        desc: 'Rice is ready to harvest ~90 days after transplanting when grains reach optimal maturity.',
        tip: 'Harvest when grains are golden yellow; then dry and store properly.',
        tasks: [
            { text: 'Inspect crop maturity (look for golden grains)', offset: 113 },
            { text: 'Harvest your rice crops with reaper', offset: 120 },
            { text: 'Dry grains to proper moisture content', offset: 121 },
            { text: 'Store dried grains in clean, dry bags', offset: 123 }
        ],
        offset: 113,
        dashboardLabel: 'Harvest'
    }
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const TOTAL_CULTIVATION_DAYS = 123; // From rice-guide timeline

/**
 * Get current stage index based on days elapsed
 */
function getCurrentStageIndex(startDate) {
    const start = new Date(startDate);
    const today = new Date();
    const daysElapsed = Math.max(0, Math.floor((today - start) / MS_PER_DAY));

    let currentIdx = 0;
    RICE_CULTIVATION_STAGES.forEach((stage, index) => {
        if (daysElapsed >= stage.offset) {
            currentIdx = index;
        }
    });

    return currentIdx;
}

/**
 * Calculate accurate progress based on rice cultivation timeline
 */
function calculateProgress(startDate) {
    const start = new Date(startDate);
    const today = new Date();
    const daysElapsed = Math.max(0, Math.floor((today - start) / MS_PER_DAY));

    // Progress is based on days elapsed, capped at 100%
    const percentage = Math.min((daysElapsed / TOTAL_CULTIVATION_DAYS) * 100, 100);

    return {
        percentage: percentage,
        daysElapsed: daysElapsed,
        totalDays: TOTAL_CULTIVATION_DAYS,
        isComplete: daysElapsed >= TOTAL_CULTIVATION_DAYS,
        currentStageIndex: getCurrentStageIndex(startDate)
    };
}

/**
 * Get simplified stages for dashboard display
 */
function getDashboardStages() {
    return RICE_CULTIVATION_STAGES.map(stage => ({
        title: stage.title.split('. ')[1] || stage.title, // Remove numbering
        offset: stage.offset,
        label: stage.dashboardLabel
    }));
}

// Export for use in other scripts
window.RiceStages = {
    STAGES: RICE_CULTIVATION_STAGES,
    TOTAL_DAYS: TOTAL_CULTIVATION_DAYS,
    getCurrentStageIndex,
    calculateProgress,
    getDashboardStages
};
