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
            { text: 'Prepare nursery bed', offset: 1 },
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
            { text: 'Verify if seedlings are ready (Phase 2)', offset: 29 },
            { text: 'Apply pesticide on the entire field to eliminate remaining pests', offset: 29 },
        ],
        offset: 29,
        dashboardLabel: 'Treatment'
    },
    {
        title: '4. Transplanting',
        desc: 'Transplant the mature seedlings from the nursery to the prepared and treated field — this marks Day 0 of growth.',
        tip: 'Transplant only after the field is leveled, treated and seedlings are ready.',
        tasks: [
            { text: 'Transplant seedlings to main field at proper spacing and record transplanting date (start of 90-day growth period)', offset: 30 }
        ],
        offset: 30,
        dashboardLabel: 'Planting'
    },
    {
        title: '5. Fertilizer & Pesticide Management',
        desc: 'Apply fertilizers on schedule. Monitor crop condition regularly and apply pesticides only when needed based on pest presence.',
        tip: 'Pesticide application is situational - inspect your crops every 2 weeks and apply only if you observe pests, disease, or crop damage. Continue monitoring until near harvest. Fertilizer follows a fixed schedule.',
        tasks: [
            { text: 'Monitor crop condition every 2 weeks and apply pesticide only if needed (continue until near harvest)', offset: 44 },
            { text: 'Apply first fertilizer - wait 15 days for side dressing', offset: 45 },
            { text: 'Apply side dressing fertilizer - wait 15 days for top dressing fertilizer', offset: 60 },
            { text: 'Apply top dressing fertilizer', offset: 75 }
        ],
        resourcesPerHectare: {
            totalFertilizer: '8 bags',
            totalPesticide: '2 quarts',
            applications: [
                { day: 15, fertilizer: '3 bags' },
                { day: 30, fertilizer: '3 bags' },
                { day: 45, fertilizer: '2 bags' }
            ]
        },
        offset: 45,
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

/**
 * Determine if a specific task should be enabled for completion
 * Task is enabled only if:
 * 1. It's not already completed, AND
 * 2. All tasks with smaller offset values are completed
 * 
 * Succession is based purely on offset values (scheduled day numbers)
 * 
 * @param {number} stageIndex - Index of the stage
 * @param {number} taskIndex - Index of the task within the stage
 * @param {Array} taskCompletions - Array of completed tasks
 * @returns {boolean} - Whether this task can be marked as done
 */
function isTaskEnabled(stageIndex, taskIndex, taskCompletions) {
    // Check if already completed
    const isCompleted = taskCompletions.some(tc => 
        tc.stageIndex === stageIndex && tc.taskIndex === taskIndex
    );
    if (isCompleted) return false;
    
    // Get offset of this task
    const stage = RICE_CULTIVATION_STAGES[stageIndex];
    if (!stage || !stage.tasks[taskIndex]) return false;
    
    const task = stage.tasks[taskIndex];
    const thisTaskOffset = typeof task === 'object' && task.offset != null ? task.offset : stage.offset;
    
    // Get all incomplete tasks with their offsets
    const allIncompleteWithOffsets = [];
    RICE_CULTIVATION_STAGES.forEach((s, sIdx) => {
        s.tasks.forEach((t, tIdx) => {
            const isThisComplete = taskCompletions.some(tc =>
                tc.stageIndex === sIdx && tc.taskIndex === tIdx
            );
            if (!isThisComplete) {
                const taskOffset = typeof t === 'object' && t.offset != null ? t.offset : s.offset;
                allIncompleteWithOffsets.push({
                    stageIndex: sIdx,
                    taskIndex: tIdx,
                    offset: taskOffset
                });
            }
        });
    });
    
    // Sort by offset (smallest first)
    allIncompleteWithOffsets.sort((a, b) => a.offset - b.offset);
    
    // This task is enabled only if it's the first incomplete task by offset
    if (allIncompleteWithOffsets.length === 0) return false;
    
    const firstIncomplete = allIncompleteWithOffsets[0];
    return firstIncomplete.stageIndex === stageIndex && firstIncomplete.taskIndex === taskIndex;
}

// Export for use in other scripts
window.RiceStages = {
    STAGES: RICE_CULTIVATION_STAGES,
    TOTAL_DAYS: TOTAL_CULTIVATION_DAYS,
    getCurrentStageIndex,
    calculateProgress,
    getDashboardStages,
    isTaskEnabled
};

