/**
 * Disk Scheduling Simulator
 * Master JavaScript Controller: High-Contrast Visualizations, Pedagogical Reasoner & Benchmark Suite
 */

(function () {
    'use strict';

    // =========================================================================
    // 1. Audio Feedback Controller (Web Audio API)
    // =========================================================================
    class SoundController {
        constructor() {
            this.enabled = true;
            this.audioCtx = null;
        }

        initContext() {
            if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                this.audioCtx = new AudioContextClass();
            }
        }

        playSeekSound(frequency = 520, duration = 0.04) {
            if (!this.enabled) return;
            try {
                this.initContext();
                if (!this.audioCtx) return;
                if (this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }

                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, this.audioCtx.currentTime + duration);

                gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start();
                osc.stop(this.audioCtx.currentTime + duration);
            } catch (e) {
                // Ignore audio policy errors
            }
        }

        playCompleteSound() {
            if (!this.enabled) return;
            [440, 554, 659, 880].forEach((freq, idx) => {
                setTimeout(() => this.playSeekSound(freq, 0.1), idx * 80);
            });
        }
    }

    const soundCtrl = new SoundController();

    // =========================================================================
    // 2. Pure Algorithm Engine
    // =========================================================================
    const Algorithms = {
        runFCFS(requests, initialHead) {
            const sequence = [initialHead];
            const steps = [];
            let currentHead = initialHead;
            let totalMovement = 0;
            const movements = [];

            for (let i = 0; i < requests.length; i++) {
                const next = requests[i];
                const dist = Math.abs(next - currentHead);
                totalMovement += dist;
                movements.push(dist);
                sequence.push(next);

                steps.push({
                    stepNumber: i + 1,
                    from: currentHead,
                    to: next,
                    distance: dist,
                    type: 'request',
                    direction: next >= currentHead ? 'RIGHT' : 'LEFT',
                    explanation: `Serviced request at track ${next}. Head moved from track ${currentHead} to ${next} (|${next} - ${currentHead}| = ${dist} tracks) strictly in FIFO order.`
                });
                currentHead = next;
            }

            return {
                algorithm: 'FCFS',
                name: 'First-Come First-Serve',
                sequence,
                movements,
                totalMovement,
                averageMovement: requests.length > 0 ? (totalMovement / requests.length) : 0,
                requestsServed: requests.length,
                steps
            };
        },

        runSSTF(requests, initialHead) {
            const sequence = [initialHead];
            const steps = [];
            let currentHead = initialHead;
            let totalMovement = 0;
            const movements = [];

            const pending = requests.map((track, id) => ({ id, track }));
            let stepIndex = 1;

            while (pending.length > 0) {
                let bestIdx = 0;
                let minDist = Math.abs(pending[0].track - currentHead);
                const candidates = [];

                for (let i = 0; i < pending.length; i++) {
                    const diff = Math.abs(pending[i].track - currentHead);
                    candidates.push({ track: pending[i].track, dist: diff });
                    if (diff < minDist) {
                        minDist = diff;
                        bestIdx = i;
                    }
                }

                const chosen = pending.splice(bestIdx, 1)[0];
                const next = chosen.track;
                const dist = Math.abs(next - currentHead);
                totalMovement += dist;
                movements.push(dist);
                sequence.push(next);

                const comparisonDetail = candidates
                    .map(c => `track ${c.track} (Δ=${c.dist})`)
                    .join(', ');

                steps.push({
                    stepNumber: stepIndex++,
                    from: currentHead,
                    to: next,
                    distance: dist,
                    type: 'request',
                    direction: next >= currentHead ? 'RIGHT' : 'LEFT',
                    candidates: candidates.sort((a, b) => a.dist - b.dist),
                    explanation: `Selected track ${next} because it has the minimum seek distance from current head ${currentHead} (${dist} tracks). Remaining evaluated candidates: [${comparisonDetail}].`
                });

                currentHead = next;
            }

            return {
                algorithm: 'SSTF',
                name: 'Shortest Seek Time First',
                sequence,
                movements,
                totalMovement,
                averageMovement: requests.length > 0 ? (totalMovement / requests.length) : 0,
                requestsServed: requests.length,
                steps
            };
        },

        runSCAN(requests, initialHead, diskSize, direction = 'RIGHT') {
            const sequence = [initialHead];
            const steps = [];
            let currentHead = initialHead;
            let totalMovement = 0;
            const movements = [];
            let stepIndex = 1;

            if (direction.toUpperCase() === 'RIGHT') {
                const right = requests.filter(r => r >= initialHead).sort((a, b) => a - b);
                const left = requests.filter(r => r < initialHead).sort((a, b) => b - a);

                for (const req of right) {
                    const dist = Math.abs(req - currentHead);
                    totalMovement += dist;
                    movements.push(dist);
                    sequence.push(req);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: currentHead,
                        to: req,
                        distance: dist,
                        type: 'request',
                        direction: 'RIGHT',
                        explanation: `Moving RIGHT: Serviced pending request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                    });
                    currentHead = req;
                }

                if (left.length > 0) {
                    const boundary = diskSize - 1;
                    if (currentHead !== boundary) {
                        const dist = Math.abs(boundary - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(boundary);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: boundary,
                            distance: dist,
                            type: 'boundary',
                            direction: 'RIGHT',
                            explanation: `Reached end of forward sweep. Head advances to physical disk boundary (track ${boundary}) before reversing direction (|${boundary} - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = boundary;
                    }

                    for (const req of left) {
                        const dist = Math.abs(req - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(req);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: req,
                            distance: dist,
                            type: 'request',
                            direction: 'LEFT',
                            explanation: `Reversed direction to LEFT: Serviced request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = req;
                    }
                }
            } else {
                const left = requests.filter(r => r <= initialHead).sort((a, b) => b - a);
                const right = requests.filter(r => r > initialHead).sort((a, b) => a - b);

                for (const req of left) {
                    const dist = Math.abs(req - currentHead);
                    totalMovement += dist;
                    movements.push(dist);
                    sequence.push(req);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: currentHead,
                        to: req,
                        distance: dist,
                        type: 'request',
                        direction: 'LEFT',
                        explanation: `Moving LEFT: Serviced pending request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                    });
                    currentHead = req;
                }

                if (right.length > 0) {
                    const boundary = 0;
                    if (currentHead !== boundary) {
                        const dist = Math.abs(boundary - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(boundary);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: boundary,
                            distance: dist,
                            type: 'boundary',
                            direction: 'LEFT',
                            explanation: `Reached end of backward sweep. Head advances to minimum disk boundary (track 0) before reversing direction (|${boundary} - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = boundary;
                    }

                    for (const req of right) {
                        const dist = Math.abs(req - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(req);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: req,
                            distance: dist,
                            type: 'request',
                            direction: 'RIGHT',
                            explanation: `Reversed direction to RIGHT: Serviced request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = req;
                    }
                }
            }

            return {
                algorithm: 'SCAN',
                name: 'SCAN (Elevator)',
                sequence,
                movements,
                totalMovement,
                averageMovement: requests.length > 0 ? (totalMovement / requests.length) : 0,
                requestsServed: requests.length,
                steps
            };
        },

        runCSCAN(requests, initialHead, diskSize, direction = 'RIGHT') {
            const sequence = [initialHead];
            const steps = [];
            let currentHead = initialHead;
            let totalMovement = 0;
            const movements = [];
            let stepIndex = 1;

            if (direction.toUpperCase() === 'RIGHT') {
                const right = requests.filter(r => r >= initialHead).sort((a, b) => a - b);
                const left = requests.filter(r => r < initialHead).sort((a, b) => a - b);

                for (const req of right) {
                    const dist = Math.abs(req - currentHead);
                    totalMovement += dist;
                    movements.push(dist);
                    sequence.push(req);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: currentHead,
                        to: req,
                        distance: dist,
                        type: 'request',
                        direction: 'RIGHT',
                        explanation: `Moving RIGHT: Serviced request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                    });
                    currentHead = req;
                }

                if (left.length > 0) {
                    const boundaryMax = diskSize - 1;
                    if (currentHead !== boundaryMax) {
                        const dist = Math.abs(boundaryMax - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(boundaryMax);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: boundaryMax,
                            distance: dist,
                            type: 'boundary',
                            direction: 'RIGHT',
                            explanation: `Head reached right edge: Advanced to boundary track ${boundaryMax} (|${boundaryMax} - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = boundaryMax;
                    }

                    const jumpDist = boundaryMax - 0;
                    totalMovement += jumpDist;
                    movements.push(jumpDist);
                    sequence.push(0);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: currentHead,
                        to: 0,
                        distance: jumpDist,
                        type: 'jump',
                        direction: 'JUMP',
                        explanation: `Circular return jump: Disk head resets across disk from track ${boundaryMax} to track 0 without servicing requests (${jumpDist} tracks counted in seek).`
                    });
                    currentHead = 0;

                    for (const req of left) {
                        const dist = Math.abs(req - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(req);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: req,
                            distance: dist,
                            type: 'request',
                            direction: 'RIGHT',
                            explanation: `Resumed unidirectional sweep RIGHT: Serviced request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = req;
                    }
                }
            } else {
                const left = requests.filter(r => r <= initialHead).sort((a, b) => b - a);
                const right = requests.filter(r => r > initialHead).sort((a, b) => b - a);

                for (const req of left) {
                    const dist = Math.abs(req - currentHead);
                    totalMovement += dist;
                    movements.push(dist);
                    sequence.push(req);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: currentHead,
                        to: req,
                        distance: dist,
                        type: 'request',
                        direction: 'LEFT',
                        explanation: `Moving LEFT: Serviced request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                    });
                    currentHead = req;
                }

                if (right.length > 0) {
                    if (currentHead !== 0) {
                        const dist = Math.abs(0 - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(0);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: 0,
                            distance: dist,
                            type: 'boundary',
                            direction: 'LEFT',
                            explanation: `Head reached left edge: Advanced to minimum boundary track 0 (|0 - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = 0;
                    }

                    const boundaryMax = diskSize - 1;
                    const jumpDist = boundaryMax - 0;
                    totalMovement += jumpDist;
                    movements.push(jumpDist);
                    sequence.push(boundaryMax);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: 0,
                        to: boundaryMax,
                        distance: jumpDist,
                        type: 'jump',
                        direction: 'JUMP',
                        explanation: `Circular return jump: Disk head resets across disk from track 0 to boundary ${boundaryMax} without servicing requests (${jumpDist} tracks counted in seek).`
                    });
                    currentHead = boundaryMax;

                    for (const req of right) {
                        const dist = Math.abs(req - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(req);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: req,
                            distance: dist,
                            type: 'request',
                            direction: 'LEFT',
                            explanation: `Resumed unidirectional sweep LEFT: Serviced request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = req;
                    }
                }
            }

            return {
                algorithm: 'C-SCAN',
                name: 'C-SCAN (Circular)',
                sequence,
                movements,
                totalMovement,
                averageMovement: requests.length > 0 ? (totalMovement / requests.length) : 0,
                requestsServed: requests.length,
                steps
            };
        },

        runLOOK(requests, initialHead, diskSize, direction = 'RIGHT') {
            const sequence = [initialHead];
            const steps = [];
            let currentHead = initialHead;
            let totalMovement = 0;
            const movements = [];
            let stepIndex = 1;

            if (direction.toUpperCase() === 'RIGHT') {
                const right = requests.filter(r => r >= initialHead).sort((a, b) => a - b);
                const left = requests.filter(r => r < initialHead).sort((a, b) => b - a);

                for (const req of right) {
                    const dist = Math.abs(req - currentHead);
                    totalMovement += dist;
                    movements.push(dist);
                    sequence.push(req);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: currentHead,
                        to: req,
                        distance: dist,
                        type: 'request',
                        direction: 'RIGHT',
                        explanation: `Moving RIGHT: Serviced pending request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                    });
                    currentHead = req;
                }

                if (left.length > 0) {
                    for (const req of left) {
                        const dist = Math.abs(req - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(req);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: req,
                            distance: dist,
                            type: 'request',
                            direction: 'LEFT',
                            explanation: `Reversed direction to LEFT: LOOK detected no further requests to the right and reversed immediately without traveling to disk boundary. Serviced track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = req;
                    }
                }
            } else {
                const left = requests.filter(r => r <= initialHead).sort((a, b) => b - a);
                const right = requests.filter(r => r > initialHead).sort((a, b) => a - b);

                for (const req of left) {
                    const dist = Math.abs(req - currentHead);
                    totalMovement += dist;
                    movements.push(dist);
                    sequence.push(req);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: currentHead,
                        to: req,
                        distance: dist,
                        type: 'request',
                        direction: 'LEFT',
                        explanation: `Moving LEFT: Serviced pending request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                    });
                    currentHead = req;
                }

                if (right.length > 0) {
                    for (const req of right) {
                        const dist = Math.abs(req - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(req);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: req,
                            distance: dist,
                            type: 'request',
                            direction: 'RIGHT',
                            explanation: `Reversed direction to RIGHT: LOOK turned immediately at lowest pending request. Serviced track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = req;
                    }
                }
            }

            return {
                algorithm: 'LOOK',
                name: 'LOOK',
                sequence,
                movements,
                totalMovement,
                averageMovement: requests.length > 0 ? (totalMovement / requests.length) : 0,
                requestsServed: requests.length,
                steps
            };
        },

        runCLOOK(requests, initialHead, diskSize, direction = 'RIGHT') {
            const sequence = [initialHead];
            const steps = [];
            let currentHead = initialHead;
            let totalMovement = 0;
            const movements = [];
            let stepIndex = 1;

            if (direction.toUpperCase() === 'RIGHT') {
                const right = requests.filter(r => r >= initialHead).sort((a, b) => a - b);
                const left = requests.filter(r => r < initialHead).sort((a, b) => a - b);

                for (const req of right) {
                    const dist = Math.abs(req - currentHead);
                    totalMovement += dist;
                    movements.push(dist);
                    sequence.push(req);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: currentHead,
                        to: req,
                        distance: dist,
                        type: 'request',
                        direction: 'RIGHT',
                        explanation: `Moving RIGHT: Serviced request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                    });
                    currentHead = req;
                }

                if (left.length > 0) {
                    const lowestLeft = left[0];
                    const jumpDist = Math.abs(lowestLeft - currentHead);
                    totalMovement += jumpDist;
                    movements.push(jumpDist);
                    sequence.push(lowestLeft);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: currentHead,
                        to: lowestLeft,
                        distance: jumpDist,
                        type: 'jump_and_serve',
                        direction: 'JUMP',
                        explanation: `C-LOOK Circular Jump: Head jumped directly from ${currentHead} to lowest pending track (${lowestLeft}) without hitting boundary (${jumpDist} tracks), servicing it immediately.`
                    });
                    currentHead = lowestLeft;

                    for (let i = 1; i < left.length; i++) {
                        const req = left[i];
                        const dist = Math.abs(req - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(req);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: req,
                            distance: dist,
                            type: 'request',
                            direction: 'RIGHT',
                            explanation: `Resumed sweep RIGHT: Serviced request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = req;
                    }
                }
            } else {
                const left = requests.filter(r => r <= initialHead).sort((a, b) => b - a);
                const right = requests.filter(r => r > initialHead).sort((a, b) => b - a);

                for (const req of left) {
                    const dist = Math.abs(req - currentHead);
                    totalMovement += dist;
                    movements.push(dist);
                    sequence.push(req);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: currentHead,
                        to: req,
                        distance: dist,
                        type: 'request',
                        direction: 'LEFT',
                        explanation: `Moving LEFT: Serviced request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                    });
                    currentHead = req;
                }

                if (right.length > 0) {
                    const highestRight = right[0];
                    const jumpDist = Math.abs(highestRight - currentHead);
                    totalMovement += jumpDist;
                    movements.push(jumpDist);
                    sequence.push(highestRight);
                    steps.push({
                        stepNumber: stepIndex++,
                        from: currentHead,
                        to: highestRight,
                        distance: jumpDist,
                        type: 'jump_and_serve',
                        direction: 'JUMP',
                        explanation: `C-LOOK Circular Jump: Head jumped directly from ${currentHead} to highest pending track (${highestRight}) (${jumpDist} tracks), servicing it immediately.`
                    });
                    currentHead = highestRight;

                    for (let i = 1; i < right.length; i++) {
                        const req = right[i];
                        const dist = Math.abs(req - currentHead);
                        totalMovement += dist;
                        movements.push(dist);
                        sequence.push(req);
                        steps.push({
                            stepNumber: stepIndex++,
                            from: currentHead,
                            to: req,
                            distance: dist,
                            type: 'request',
                            direction: 'LEFT',
                            explanation: `Resumed sweep LEFT: Serviced request at track ${req} (|${req} - ${currentHead}| = ${dist} tracks).`
                        });
                        currentHead = req;
                    }
                }
            }

            return {
                algorithm: 'C-LOOK',
                name: 'C-LOOK (Circular LOOK)',
                sequence,
                movements,
                totalMovement,
                averageMovement: requests.length > 0 ? (totalMovement / requests.length) : 0,
                requestsServed: requests.length,
                steps
            };
        },

        execute(algoKey, requests, initialHead, diskSize, direction) {
            switch (algoKey.toUpperCase()) {
                case 'FCFS': return this.runFCFS(requests, initialHead);
                case 'SSTF': return this.runSSTF(requests, initialHead);
                case 'SCAN': return this.runSCAN(requests, initialHead, diskSize, direction);
                case 'C-SCAN': return this.runCSCAN(requests, initialHead, diskSize, direction);
                case 'LOOK': return this.runLOOK(requests, initialHead, diskSize, direction);
                case 'C-LOOK': return this.runCLOOK(requests, initialHead, diskSize, direction);
                default: return this.runSSTF(requests, initialHead);
            }
        }
    };

    // =========================================================================
    // 3. Application State & DOM Bindings
    // =========================================================================
    const State = {
        requests: [98, 183, 37, 122, 14, 124, 65, 67],
        initialHead: 53,
        diskSize: 200,
        direction: 'RIGHT',
        selectedAlgo: 'SSTF',
        currentResult: null,
        currentStepIndex: 0,
        isPlaying: false,
        speedMultiplier: 1.0,
        timerId: null,
        educationalMode: true,
        viewMode: 'both',
        comparisonChartInstance: null
    };

    const elements = {
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        sunIcon: document.getElementById('sunIcon'),
        moonIcon: document.getElementById('moonIcon'),
        soundToggleBtn: document.getElementById('soundToggleBtn'),
        queueInput: document.getElementById('requestQueueInput'),
        initialHeadInput: document.getElementById('initialHeadInput'),
        diskSizeInput: document.getElementById('diskSizeInput'),
        dirLeft: document.getElementById('dirLeft'),
        dirRight: document.getElementById('dirRight'),
        directionGroup: document.getElementById('directionGroup'),
        directionHint: document.getElementById('directionHint'),
        randomQueueBtn: document.getElementById('randomQueueBtn'),
        algoCards: document.querySelectorAll('.algo-selector-card'),
        runSimulationBtn: document.getElementById('runSimulationBtn'),
        compareAllBtn: document.getElementById('compareAllBtn'),
        resetBtn: document.getElementById('resetBtn'),
        eduModeToggle: document.getElementById('eduModeToggle'),
        eduModeBadge: document.getElementById('eduModeBadge'),
        queueValidationMsg: document.getElementById('queueValidationMsg'),
        headValidationMsg: document.getElementById('headValidationMsg'),
        diskValidationMsg: document.getElementById('diskValidationMsg'),
        queueChipsContainer: document.getElementById('requestChipsContainer'),
        queueCountBadge: document.getElementById('queueCountBadge'),
        statusIndicator: document.getElementById('statusIndicator'),
        statusText: document.getElementById('statusText'),
        activeAlgoBadge: document.getElementById('activeAlgoBadge'),
        vizTabBtns: document.querySelectorAll('.view-tab-btn'),
        rulerStageWrap: document.getElementById('rulerStageWrap'),
        graphStageWrap: document.getElementById('graphStageWrap'),
        rulerRangeLabel: document.getElementById('rulerRangeLabel'),
        fullscreenBtn: document.getElementById('fullscreenBtn'),
        rulerCanvas: document.getElementById('rulerCanvas'),
        graphCanvas: document.getElementById('graphCanvas'),
        playPauseBtn: document.getElementById('playPauseBtn'),
        playPauseLabel: document.getElementById('playPauseLabel'),
        playIcon: document.getElementById('playIcon'),
        pauseIcon: document.getElementById('pauseIcon'),
        prevStepBtn: document.getElementById('prevStepBtn'),
        nextStepBtn: document.getElementById('nextStepBtn'),
        restartBtn: document.getElementById('restartBtn'),
        stepProgressLabel: document.getElementById('stepProgressLabel'),
        progressPercent: document.getElementById('progressPercent'),
        progressBarFill: document.getElementById('progressBarFill'),
        speedSlider: document.getElementById('speedSlider'),
        speedValueLabel: document.getElementById('speedValueLabel'),
        hudCurrentHead: document.getElementById('hudCurrentHead'),
        hudNextRequest: document.getElementById('hudNextRequest'),
        hudPrevHeadSub: document.getElementById('hudPrevHeadSub'),
        hudCurrentMovement: document.getElementById('hudCurrentMovement'),
        hudMovementFormula: document.getElementById('hudMovementFormula'),
        hudTotalMovement: document.getElementById('hudTotalMovement'),
        hudAvgMovement: document.getElementById('hudAvgMovement'),
        hudServedRatio: document.getElementById('hudServedRatio'),
        hudRemainingSub: document.getElementById('hudRemainingSub'),
        stepExplanationContent: document.getElementById('stepExplanationContent'),
        copyLogBtn: document.getElementById('copyLogBtn'),
        resultsCard: document.getElementById('resultsCard'),
        resultsAlgoTitle: document.getElementById('resultsAlgoTitle'),
        resInitialHead: document.getElementById('resInitialHead'),
        resTotalMovement: document.getElementById('resTotalMovement'),
        resAvgSeek: document.getElementById('resAvgSeek'),
        resServedCount: document.getElementById('resServedCount'),
        resSequenceChain: document.getElementById('resSequenceChain'),
        copyResultsBtn: document.getElementById('copyResultsBtn'),
        exportCsvBtn: document.getElementById('exportCsvBtn'),
        comparisonTableBody: document.getElementById('comparisonTableBody'),
        winnerText: document.getElementById('winnerText'),
        winnerMovementVal: document.getElementById('winnerMovementVal'),
        winnerExplanation: document.getElementById('winnerExplanation'),
        comparisonChart: document.getElementById('comparisonChart'),
        presetPills: document.querySelectorAll('.preset-btn'),
        toastContainer: document.getElementById('toastContainer')
    };

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 250);
        }, 3000);
    }

    // =========================================================================
    // 4. Input Validation & Parsing
    // =========================================================================
    function parseAndValidateInputs() {
        let isValid = true;

        const diskSizeVal = parseInt(elements.diskSizeInput.value, 10);
        if (isNaN(diskSizeVal) || diskSizeVal < 10 || diskSizeVal > 10000) {
            elements.diskValidationMsg.textContent = 'Disk size must be an integer between 10 and 10000.';
            elements.diskValidationMsg.classList.remove('hidden');
            isValid = false;
        } else {
            elements.diskValidationMsg.classList.add('hidden');
            State.diskSize = diskSizeVal;
        }

        const headVal = parseInt(elements.initialHeadInput.value, 10);
        if (isNaN(headVal) || headVal < 0 || headVal >= State.diskSize) {
            elements.headValidationMsg.textContent = `Head position must be between 0 and ${State.diskSize - 1}.`;
            elements.headValidationMsg.classList.remove('hidden');
            isValid = false;
        } else {
            elements.headValidationMsg.classList.add('hidden');
            State.initialHead = headVal;
        }

        const rawQueue = elements.queueInput.value.trim();
        if (!rawQueue) {
            elements.queueValidationMsg.textContent = 'Request queue cannot be empty.';
            elements.queueValidationMsg.classList.remove('hidden');
            isValid = false;
        } else {
            const tokens = rawQueue.split(/[,\s]+/).filter(t => t.length > 0);
            const parsedNumbers = [];
            let queueValid = true;
            let outOfBounds = [];

            for (const token of tokens) {
                if (!/^-?\d+$/.test(token)) {
                    queueValid = false;
                    elements.queueValidationMsg.textContent = `Invalid character or non-integer token: "${token}".`;
                    elements.queueValidationMsg.classList.remove('hidden');
                    isValid = false;
                    break;
                }
                const num = parseInt(token, 10);
                if (num < 0 || num >= State.diskSize) {
                    outOfBounds.push(num);
                }
                parsedNumbers.push(num);
            }

            if (queueValid) {
                if (outOfBounds.length > 0) {
                    elements.queueValidationMsg.textContent = `Track(s) [${outOfBounds.join(', ')}] are outside disk bounds [0, ${State.diskSize - 1}].`;
                    elements.queueValidationMsg.classList.remove('hidden');
                    isValid = false;
                } else if (parsedNumbers.length === 0) {
                    elements.queueValidationMsg.textContent = 'Enter at least one track cylinder request.';
                    elements.queueValidationMsg.classList.remove('hidden');
                    isValid = false;
                } else {
                    elements.queueValidationMsg.classList.add('hidden');
                    State.requests = parsedNumbers;
                }
            }
        }

        State.direction = elements.dirRight.checked ? 'RIGHT' : 'LEFT';
        return isValid;
    }

    function updateDirectionControlState() {
        const needsDirection = ['SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'].includes(State.selectedAlgo);
        if (needsDirection) {
            elements.directionGroup.classList.remove('disabled');
            elements.directionHint.textContent = `Active for ${State.selectedAlgo}`;
        } else {
            elements.directionGroup.classList.add('disabled');
            elements.directionHint.textContent = `Not applicable for ${State.selectedAlgo}`;
        }
    }

    // =========================================================================
    // 5. High-Contrast Canvas Renderers (Ruler & 2D Trajectory)
    // =========================================================================

    function setupCanvasDPI(canvas, width, height) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        return ctx;
    }

    // 5A. Horizontal Track Ruler Renderer (Spacious & High Contrast)
    function renderRulerCanvas(currentHeadPosition, targetTrack = null) {
        const canvas = elements.rulerCanvas;
        const rect = canvas.parentElement.getBoundingClientRect();
        const width = Math.max(rect.width, 320);
        const height = 135;
        const ctx = setupCanvasDPI(canvas, width, height);

        const paddingLeft = 55;
        const paddingRight = 55;
        const trackWidth = width - paddingLeft - paddingRight;
        const diskSize = State.diskSize;

        function getX(track) {
            return paddingLeft + (track / (diskSize - 1)) * trackWidth;
        }

        ctx.clearRect(0, 0, width, height);

        // Track Rail Bar
        const railY = 65;
        ctx.beginPath();
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#243048';
        ctx.lineCap = 'round';
        ctx.moveTo(paddingLeft, railY);
        ctx.lineTo(width - paddingRight, railY);
        ctx.stroke();

        // Ticks & High-Contrast Labels
        const numTicks = 10;
        ctx.font = 'bold 12px "Fira Code", monospace';
        ctx.textAlign = 'center';

        for (let i = 0; i <= numTicks; i++) {
            const trackVal = Math.round((i / numTicks) * (diskSize - 1));
            const x = getX(trackVal);

            ctx.beginPath();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.moveTo(x, railY - 12);
            ctx.lineTo(x, railY + 12);
            ctx.stroke();

            // Clear, high-contrast label
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(trackVal.toString(), x, railY + 30);
        }

        // Render Request Pins on Ruler
        const completedSet = new Set(
            State.currentResult
                ? State.currentResult.sequence.slice(1, State.currentStepIndex + 1)
                : []
        );

        State.requests.forEach((reqTrack) => {
            const rx = getX(reqTrack);
            const isCompleted = completedSet.has(reqTrack);
            const isCurrentTarget = (targetTrack === reqTrack);

            ctx.beginPath();
            ctx.arc(rx, railY, isCurrentTarget ? 9 : 6.5, 0, Math.PI * 2);

            if (isCurrentTarget) {
                ctx.fillStyle = '#38bdf8';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
            } else if (isCompleted) {
                ctx.fillStyle = '#10b981';
                ctx.strokeStyle = '#064e3b';
                ctx.lineWidth = 1.5;
            } else {
                ctx.fillStyle = '#94a3b8';
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 1.5;
            }
            ctx.fill();
            ctx.stroke();

            // Track Pin Label Above
            ctx.font = 'bold 11px "Fira Code", monospace';
            ctx.fillStyle = isCurrentTarget ? '#38bdf8' : (isCompleted ? '#34d399' : '#e2e8f0');
            ctx.fillText(reqTrack.toString(), rx, railY - 18);
        });

        // Glowing Read/Write Head Marker
        const headX = getX(currentHeadPosition);

        ctx.save();
        // Head Needle Pointer
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(headX, railY + 4);
        ctx.lineTo(headX - 9, railY - 30);
        ctx.lineTo(headX + 9, railY - 30);
        ctx.closePath();
        ctx.fill();

        // Arm Stem
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(headX - 2.5, 6, 5, railY - 34);

        // Center Pivot
        ctx.beginPath();
        ctx.arc(headX, railY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        // Current Head Position Badge at Top
        const badgeText = `Head: ${currentHeadPosition}`;
        ctx.font = 'bold 12px "Inter", sans-serif';
        const textWidth = ctx.measureText(badgeText).width;
        const bX = Math.max(paddingLeft, Math.min(width - paddingRight, headX));

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(bX - (textWidth / 2) - 8, 4, textWidth + 16, 20);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(badgeText, bX, 18);
    }

    // 5B. 2D Seek-Sequence Trajectory Chart Renderer (Spacious & Crisp)
    function renderGraphCanvas(stepIndex) {
        const canvas = elements.graphCanvas;
        const rect = canvas.parentElement.getBoundingClientRect();
        const width = Math.max(rect.width, 320);
        const height = 360;
        const ctx = setupCanvasDPI(canvas, width, height);

        if (!State.currentResult || !State.currentResult.sequence) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '15px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Click "Run Simulation" to generate seek trajectory diagram.', width / 2, height / 2);
            return;
        }

        const sequence = State.currentResult.sequence;
        const totalPoints = sequence.length;
        const diskSize = State.diskSize;

        const padLeft = 60;
        const padRight = 45;
        const padTop = 40;
        const padBottom = 45;

        const plotWidth = width - padLeft - padRight;
        const plotHeight = height - padTop - padBottom;

        function getX(track) {
            return padLeft + (track / (diskSize - 1)) * plotWidth;
        }

        function getY(seqIdx) {
            return padTop + (seqIdx / (totalPoints - 1 || 1)) * plotHeight;
        }

        ctx.clearRect(0, 0, width, height);

        // Horizontal Step Lines
        ctx.strokeStyle = '#243048';
        ctx.lineWidth = 1;
        for (let i = 0; i < totalPoints; i++) {
            const y = getY(i);
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(width - padRight, y);
            ctx.stroke();

            ctx.font = 'bold 11px "Fira Code", monospace';
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'right';
            ctx.fillText(`Step ${i}`, padLeft - 10, y + 4);
        }

        // Vertical Cylinder Track Grid Lines
        const numVTicks = 8;
        for (let j = 0; j <= numVTicks; j++) {
            const trackVal = Math.round((j / numVTicks) * (diskSize - 1));
            const x = getX(trackVal);

            ctx.beginPath();
            ctx.strokeStyle = '#1e293b';
            ctx.moveTo(x, padTop - 5);
            ctx.lineTo(x, height - padBottom);
            ctx.stroke();

            ctx.font = 'bold 12px "Fira Code", monospace';
            ctx.fillStyle = '#cbd5e1';
            ctx.textAlign = 'center';
            ctx.fillText(trackVal.toString(), x, height - padBottom + 20);
        }

        // X-Axis Title
        ctx.font = 'bold 12px "Inter", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('Disk Cylinder / Track Number →', width / 2, height - 8);

        // Trajectory Segments
        ctx.save();
        for (let k = 1; k <= stepIndex && k < totalPoints; k++) {
            const x0 = getX(sequence[k - 1]);
            const y0 = getY(k - 1);
            const x1 = getX(sequence[k]);
            const y1 = getY(k);

            const stepData = State.currentResult.steps[k - 1];
            const isJump = stepData && stepData.type.includes('jump');

            ctx.beginPath();
            ctx.lineWidth = isJump ? 2.5 : 3.5;

            if (isJump) {
                ctx.setLineDash([6, 6]);
                ctx.strokeStyle = '#fbbf24'; // Amber for circular jump
            } else {
                ctx.setLineDash([]);
                ctx.strokeStyle = '#38bdf8'; // Crisp Cyan for standard seek
            }

            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }
        ctx.restore();

        // Sequence Node Dots
        for (let m = 0; m <= stepIndex && m < totalPoints; m++) {
            const track = sequence[m];
            const nx = getX(track);
            const ny = getY(m);
            const isLatest = (m === stepIndex);
            const isInitial = (m === 0);

            ctx.beginPath();
            ctx.arc(nx, ny, isLatest ? 7.5 : 5.5, 0, Math.PI * 2);

            if (isLatest) {
                ctx.fillStyle = '#38bdf8';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
            } else if (isInitial) {
                ctx.fillStyle = '#818cf8';
                ctx.strokeStyle = '#312e81';
                ctx.lineWidth = 2;
            } else {
                ctx.fillStyle = '#10b981';
                ctx.strokeStyle = '#064e3b';
                ctx.lineWidth = 2;
            }

            ctx.fill();
            ctx.stroke();

            // Clear Node Label with Background Pill
            const labelStr = `${track}`;
            ctx.font = 'bold 11px "Fira Code", monospace';
            const lw = ctx.measureText(labelStr).width;
            const textOffsetX = nx > width - 80 ? -lw - 14 : 10;

            ctx.fillStyle = '#111827';
            ctx.fillRect(nx + textOffsetX - 3, ny - 9, lw + 6, 18);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(nx + textOffsetX - 3, ny - 9, lw + 6, 18);

            ctx.fillStyle = isLatest ? '#38bdf8' : '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(labelStr, nx + textOffsetX, ny + 4);
        }

        // Ghost Path for remaining steps
        if (stepIndex < totalPoints - 1) {
            ctx.save();
            ctx.setLineDash([3, 5]);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            for (let g = stepIndex + 1; g < totalPoints; g++) {
                const gx0 = getX(sequence[g - 1]);
                const gy0 = getY(g - 1);
                const gx1 = getX(sequence[g]);
                const gy1 = getY(g);

                ctx.beginPath();
                ctx.moveTo(gx0, gy0);
                ctx.lineTo(gx1, gy1);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(gx1, gy1, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = '#64748b';
                ctx.fill();
            }
            ctx.restore();
        }
    }

    function renderActiveVisualizations() {
        const currentPos = (State.currentResult && State.currentResult.sequence)
            ? State.currentResult.sequence[State.currentStepIndex]
            : State.initialHead;

        const nextTarget = (State.currentResult && State.currentResult.sequence && State.currentStepIndex < State.currentResult.sequence.length - 1)
            ? State.currentResult.sequence[State.currentStepIndex + 1]
            : null;

        renderRulerCanvas(currentPos, nextTarget);
        renderGraphCanvas(State.currentStepIndex);
        elements.rulerRangeLabel.textContent = `Tracks: 0 ─── ${State.diskSize - 1}`;
    }

    // =========================================================================
    // 6. Request Chips Renderer (Spacious & Clear)
    // =========================================================================
    function renderRequestChips() {
        elements.queueChipsContainer.innerHTML = '';
        elements.queueCountBadge.textContent = `${State.requests.length} Requests`;

        // Initial Head Chip
        const initChip = document.createElement('div');
        initChip.className = 'track-chip initial-chip';
        initChip.innerHTML = `<span>Head:</span> <strong>${State.initialHead}</strong>`;
        elements.queueChipsContainer.appendChild(initChip);

        const visitedCounts = {};
        if (State.currentResult) {
            for (let i = 1; i <= State.currentStepIndex; i++) {
                const t = State.currentResult.sequence[i];
                visitedCounts[t] = (visitedCounts[t] || 0) + 1;
            }
        }

        const nextTarget = (State.currentResult && State.currentStepIndex < State.currentResult.sequence.length - 1)
            ? State.currentResult.sequence[State.currentStepIndex + 1]
            : null;

        let occurrencesSeen = {};

        State.requests.forEach((reqTrack, idx) => {
            const chip = document.createElement('div');
            chip.className = 'track-chip';

            occurrencesSeen[reqTrack] = (occurrencesSeen[reqTrack] || 0) + 1;
            const hasBeenVisited = (visitedCounts[reqTrack] || 0) >= occurrencesSeen[reqTrack];
            const isTarget = (nextTarget === reqTrack && !hasBeenVisited);

            if (isTarget) {
                chip.classList.add('current-chip');
            } else if (hasBeenVisited) {
                chip.classList.add('completed-chip');
            }

            chip.textContent = reqTrack;
            chip.title = `Request #${idx + 1}: Cylinder ${reqTrack}`;
            elements.queueChipsContainer.appendChild(chip);
        });
    }

    // =========================================================================
    // 7. Telemetry HUD & Pedagogical Reasoner
    // =========================================================================
    function updateTelemetryHUD() {
        if (!State.currentResult) {
            elements.hudCurrentHead.textContent = State.initialHead;
            elements.hudNextRequest.textContent = State.requests[0] !== undefined ? State.requests[0] : 'None';
            elements.hudPrevHeadSub.textContent = `Moving from: ${State.initialHead}`;
            elements.hudCurrentMovement.textContent = '0 tracks';
            elements.hudMovementFormula.textContent = `|${State.initialHead} - ${State.initialHead}| = 0`;
            elements.hudTotalMovement.textContent = '0 tracks';
            elements.hudAvgMovement.textContent = 'Avg: 0.0 tracks/req';
            elements.hudServedRatio.textContent = `0 / ${State.requests.length}`;
            elements.hudRemainingSub.textContent = `${State.requests.length} Remaining`;

            elements.stepProgressLabel.textContent = `Step 0 of ${State.requests.length}`;
            elements.progressPercent.textContent = '0% Completed';
            elements.progressBarFill.style.width = '0%';
            return;
        }

        const stepIdx = State.currentStepIndex;
        const totalSteps = State.currentResult.steps.length;
        const currentHead = State.currentResult.sequence[stepIdx];

        elements.hudCurrentHead.textContent = currentHead;

        if (stepIdx < totalSteps) {
            const nextStep = State.currentResult.steps[stepIdx];
            elements.hudNextRequest.textContent = nextStep.to;
            elements.hudPrevHeadSub.textContent = `Moving from: ${nextStep.from}`;
        } else {
            elements.hudNextRequest.textContent = 'Complete';
            elements.hudPrevHeadSub.textContent = 'All requests served';
        }

        let cumMovement = 0;
        let lastMove = 0;
        let lastFrom = State.initialHead;
        let lastTo = State.initialHead;

        for (let i = 0; i < stepIdx; i++) {
            cumMovement += State.currentResult.steps[i].distance;
            if (i === stepIdx - 1) {
                lastMove = State.currentResult.steps[i].distance;
                lastFrom = State.currentResult.steps[i].from;
                lastTo = State.currentResult.steps[i].to;
            }
        }

        elements.hudCurrentMovement.textContent = `${lastMove} tracks`;
        elements.hudMovementFormula.textContent = `|${lastFrom} - ${lastTo}| = ${lastMove}`;
        elements.hudTotalMovement.textContent = `${cumMovement} tracks`;

        let servedCount = 0;
        for (let j = 0; j < stepIdx; j++) {
            if (State.currentResult.steps[j].type === 'request' || State.currentResult.steps[j].type === 'jump_and_serve') {
                servedCount++;
            }
        }

        const avgSoFar = servedCount > 0 ? (cumMovement / servedCount).toFixed(1) : '0.0';
        elements.hudAvgMovement.textContent = `Avg: ${avgSoFar} tracks/req`;
        elements.hudServedRatio.textContent = `${servedCount} / ${State.requests.length}`;
        elements.hudRemainingSub.textContent = `${Math.max(0, State.requests.length - servedCount)} Remaining`;

        const progressPct = totalSteps > 0 ? Math.round((stepIdx / totalSteps) * 100) : 0;
        elements.stepProgressLabel.textContent = `Step ${stepIdx} of ${totalSteps}`;
        elements.progressPercent.textContent = `${progressPct}% Completed`;
        elements.progressBarFill.style.width = `${progressPct}%`;
    }

    function updateStepExplanation() {
        if (!State.currentResult || State.currentResult.steps.length === 0) {
            elements.stepExplanationContent.innerHTML = `
                <div class="log-entry-card active">
                    <div class="log-step-badge">Start</div>
                    <div class="log-body">
                        <div class="log-heading">Simulation Initialized at Track ${State.initialHead}</div>
                        <p class="log-desc">Click <strong>Play</strong> or <strong>Next</strong> to start step-by-step arm movement.</p>
                    </div>
                </div>
            `;
            return;
        }

        elements.stepExplanationContent.innerHTML = '';
        const stepIdx = State.currentStepIndex;

        if (stepIdx === 0) {
            const startCard = document.createElement('div');
            startCard.className = 'log-entry-card active';
            startCard.innerHTML = `
                <div class="log-step-badge">Start</div>
                <div class="log-body">
                    <div class="log-heading">Initial Arm Position: Cylinder ${State.initialHead}</div>
                    <p class="log-desc">Queue: [${State.requests.join(', ')}]. Algorithm: <strong>${State.currentResult.name}</strong> (${State.direction}).</p>
                </div>
            `;
            elements.stepExplanationContent.appendChild(startCard);
            return;
        }

        State.currentResult.steps.slice(0, stepIdx).forEach((step, idx) => {
            const card = document.createElement('div');
            card.className = `log-entry-card ${idx === stepIdx - 1 ? 'active' : ''}`;

            let extraHtml = '';
            if (State.educationalMode && step.candidates && step.candidates.length > 0) {
                const matrixRows = step.candidates
                    .slice(0, 6)
                    .map(c => `Track ${c.track}: |${c.track} - ${step.from}| = ${c.dist} tracks`)
                    .join(' • ');
                extraHtml = `<div class="matrix-calc-box"><strong>Educational Analysis (Seek Distances):</strong><br>${matrixRows}</div>`;
            }

            card.innerHTML = `
                <div class="log-step-badge">Step ${step.stepNumber}</div>
                <div class="log-body">
                    <div class="log-heading">${step.from} → ${step.to} (${step.distance} tracks, ${step.direction || 'SWEEP'})</div>
                    <p class="log-desc">${step.explanation}</p>
                    ${extraHtml}
                </div>
            `;
            elements.stepExplanationContent.appendChild(card);
        });

        elements.stepExplanationContent.scrollTop = elements.stepExplanationContent.scrollHeight;
    }

    // =========================================================================
    // 8. Simulation Playback State Machine
    // =========================================================================
    function setSimulationStatus(status) {
        elements.statusIndicator.className = `status-dot ${status}`;
        switch (status) {
            case 'running':
                elements.statusText.textContent = 'Simulating Head Movement...';
                elements.playIcon.classList.add('hidden');
                elements.pauseIcon.classList.remove('hidden');
                elements.playPauseLabel.textContent = 'Pause';
                break;
            case 'paused':
                elements.statusText.textContent = 'Simulation Paused';
                elements.playIcon.classList.remove('hidden');
                elements.pauseIcon.classList.add('hidden');
                elements.playPauseLabel.textContent = 'Resume';
                break;
            case 'completed':
                elements.statusText.textContent = 'Simulation Completed';
                elements.playIcon.classList.remove('hidden');
                elements.pauseIcon.classList.add('hidden');
                elements.playPauseLabel.textContent = 'Replay';
                break;
            case 'idle':
            default:
                elements.statusText.textContent = 'Ready to Simulate';
                elements.playIcon.classList.remove('hidden');
                elements.pauseIcon.classList.add('hidden');
                elements.playPauseLabel.textContent = 'Play';
                break;
        }
    }

    function stepForward() {
        if (!State.currentResult) return;
        const totalSteps = State.currentResult.steps.length;

        if (State.currentStepIndex < totalSteps) {
            State.currentStepIndex++;
            const stepData = State.currentResult.steps[State.currentStepIndex - 1];
            soundCtrl.playSeekSound(400 + (stepData.to % 300));

            renderActiveVisualizations();
            renderRequestChips();
            updateTelemetryHUD();
            updateStepExplanation();

            if (State.currentStepIndex === totalSteps) {
                pauseSimulation();
                setSimulationStatus('completed');
                soundCtrl.playCompleteSound();
                displayResultsSummary();
            }
        }
    }

    function stepBackward() {
        if (!State.currentResult) return;
        if (State.currentStepIndex > 0) {
            State.currentStepIndex--;
            renderActiveVisualizations();
            renderRequestChips();
            updateTelemetryHUD();
            updateStepExplanation();
            setSimulationStatus('paused');
        }
    }

    function playSimulation() {
        if (!State.currentResult) {
            prepareSimulation();
        }

        if (State.currentStepIndex >= State.currentResult.steps.length) {
            State.currentStepIndex = 0;
            elements.resultsCard.classList.add('hidden');
        }

        State.isPlaying = true;
        setSimulationStatus('running');

        const baseInterval = 900;
        function loop() {
            if (!State.isPlaying) return;
            stepForward();
            if (State.currentStepIndex < State.currentResult.steps.length) {
                State.timerId = setTimeout(loop, baseInterval / State.speedMultiplier);
            }
        }

        State.timerId = setTimeout(loop, baseInterval / State.speedMultiplier);
    }

    function pauseSimulation() {
        State.isPlaying = false;
        if (State.timerId) {
            clearTimeout(State.timerId);
            State.timerId = null;
        }
        if (State.currentResult && State.currentStepIndex < State.currentResult.steps.length) {
            setSimulationStatus('paused');
        }
    }

    function restartSimulation() {
        pauseSimulation();
        State.currentStepIndex = 0;
        elements.resultsCard.classList.add('hidden');
        renderActiveVisualizations();
        renderRequestChips();
        updateTelemetryHUD();
        updateStepExplanation();
        setSimulationStatus('idle');
    }

    function prepareSimulation() {
        if (!parseAndValidateInputs()) {
            showToast('Please fix input validation errors.', 'error');
            return false;
        }

        State.currentResult = Algorithms.execute(
            State.selectedAlgo,
            State.requests,
            State.initialHead,
            State.diskSize,
            State.direction
        );

        State.currentStepIndex = 0;
        elements.activeAlgoBadge.textContent = `Algorithm: ${State.selectedAlgo}`;
        elements.resultsCard.classList.add('hidden');

        renderActiveVisualizations();
        renderRequestChips();
        updateTelemetryHUD();
        updateStepExplanation();
        setSimulationStatus('idle');

        return true;
    }

    // =========================================================================
    // 9. Results Panel & Exporters
    // =========================================================================
    function displayResultsSummary() {
        const res = State.currentResult;
        if (!res) return;

        elements.resultsAlgoTitle.textContent = `${res.name} Simulation Summary`;
        elements.resInitialHead.textContent = State.initialHead;
        elements.resTotalMovement.textContent = `${res.totalMovement} tracks`;
        elements.resAvgSeek.textContent = `${res.averageMovement.toFixed(1)} tracks/req`;
        elements.resServedCount.textContent = `${res.requestsServed} / ${res.requestsServed}`;
        elements.resSequenceChain.textContent = res.sequence.join(' → ');

        elements.resultsCard.classList.remove('hidden');
        elements.resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function copyResultsToClipboard() {
        if (!State.currentResult) return;
        const res = State.currentResult;
        const text = `
=== Disk Scheduling Simulation Results ===
Algorithm: ${res.name} (${res.algorithm})
Initial Head: ${State.initialHead}
Disk Size: ${State.diskSize} tracks
Direction: ${State.direction}
Service Sequence: ${res.sequence.join(' -> ')}
Total Head Movement: ${res.totalMovement} tracks
Average Seek Distance: ${res.averageMovement.toFixed(2)} tracks/request
Requests Serviced: ${res.requestsServed}
==========================================
        `.trim();

        navigator.clipboard.writeText(text).then(() => {
            showToast('Simulation results copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Unable to copy to clipboard.', 'error');
        });
    }

    function exportResultsToCSV() {
        if (!State.currentResult) return;
        const res = State.currentResult;
        let csv = 'Step,From,To,Distance,Type,Direction,Explanation\n';
        res.steps.forEach(s => {
            csv += `"${s.stepNumber}","${s.from}","${s.to}","${s.distance}","${s.type}","${s.direction || ''}","${s.explanation.replace(/"/g, '""')}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `disk_scheduling_${res.algorithm}_results.csv`;
        link.click();
        showToast('CSV export downloaded!', 'success');
    }

    // =========================================================================
    // 10. Compare All Algorithms & High-Contrast Chart.js
    // =========================================================================
    function compareAllAlgorithms() {
        if (!parseAndValidateInputs()) {
            showToast('Please fix input errors before comparing.', 'error');
            return;
        }

        const algoKeys = ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'];
        const results = algoKeys.map(key =>
            Algorithms.execute(key, State.requests, State.initialHead, State.diskSize, State.direction)
        );

        let minMovement = results[0].totalMovement;
        let bestAlgo = results[0];

        results.forEach(r => {
            if (r.totalMovement < minMovement) {
                minMovement = r.totalMovement;
                bestAlgo = r;
            }
        });

        // Populate Table
        elements.comparisonTableBody.innerHTML = '';
        results.forEach(r => {
            const tr = document.createElement('tr');
            const isWinner = (r.totalMovement === minMovement);
            if (isWinner) tr.classList.add('winner-row');

            let starvationHtml = '<span class="starvation-pill starvation-none">None</span>';
            if (r.algorithm === 'SSTF') {
                starvationHtml = '<span class="starvation-pill starvation-high">High</span>';
            }

            const algoTypes = {
                'FCFS': 'Fair / FIFO',
                'SSTF': 'Greedy / Shortest',
                'SCAN': 'Elevator / Sweep',
                'C-SCAN': 'Circular Sweep',
                'LOOK': 'Adaptive Sweep',
                'C-LOOK': 'Adaptive Circular'
            };

            tr.innerHTML = `
                <td>
                    <div class="algo-col-name">
                        <span>${r.algorithm}</span>
                        ${isWinner ? '<span class="pill-badge pill-success">Best</span>' : ''}
                    </div>
                </td>
                <td>${algoTypes[r.algorithm]}</td>
                <td class="seq-cell-val" title="${r.sequence.join(' → ')}">${r.sequence.join(' → ')}</td>
                <td class="movement-col-val ${isWinner ? 'best' : ''}"><strong>${r.totalMovement}</strong></td>
                <td>${r.averageMovement.toFixed(1)}</td>
                <td>${r.requestsServed}</td>
                <td>${starvationHtml}</td>
                <td>
                    <button type="button" class="btn btn-secondary btn-sm run-single-btn" data-algo="${r.algorithm}">
                        Simulate
                    </button>
                </td>
            `;

            elements.comparisonTableBody.appendChild(tr);
        });

        document.querySelectorAll('.run-single-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const algo = e.target.closest('button').dataset.algo;
                selectAlgorithm(algo);
                prepareSimulation();
                playSimulation();
                elements.rulerStageWrap.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Winner Breakdown
        elements.winnerText.textContent = `${bestAlgo.name} (${bestAlgo.totalMovement} tracks)`;
        elements.winnerMovementVal.textContent = `${bestAlgo.totalMovement} tracks`;
        elements.winnerExplanation.innerHTML = `
            <p>For the current request queue <code>[${State.requests.join(', ')}]</code>, <strong>${bestAlgo.name}</strong> yielded the lowest total seek distance of <strong>${bestAlgo.totalMovement} tracks</strong> (average ${bestAlgo.averageMovement.toFixed(1)} tracks/request).</p>
            <div class="note-box">
                <strong>Crucial Operating Systems Concept:</strong>
                No disk scheduling algorithm is universally "best". Performance depends entirely on the request distribution and track locality:
                <br>• <strong>SSTF</strong> minimizes seek overhead for clustered tracks but can starve far cylinders.
                <br>• <strong>SCAN / LOOK</strong> provide guaranteed bounded wait time and fairness for general workloads.
                <br>• <strong>C-SCAN / C-LOOK</strong> equalize waiting time across cylinders by treating the disk circularly.
            </div>
        `;

        renderComparisonBarChart(results, bestAlgo.algorithm);
        document.getElementById('comparison').scrollIntoView({ behavior: 'smooth' });
    }

    function renderComparisonBarChart(results, bestAlgoKey) {
        const labels = results.map(r => r.algorithm);
        const data = results.map(r => r.totalMovement);
        const backgroundColors = results.map(r => {
            if (r.algorithm === bestAlgoKey) return '#10b981'; // Green for winner
            if (r.algorithm === 'FCFS') return '#64748b';
            if (r.algorithm === 'SSTF') return '#f59e0b';
            if (r.algorithm === 'SCAN') return '#0284c7';
            if (r.algorithm === 'C-SCAN') return '#38bdf8';
            if (r.algorithm === 'LOOK') return '#6366f1';
            if (r.algorithm === 'C-LOOK') return '#ec4899';
            return '#0284c7';
        });

        if (window.Chart) {
            if (State.comparisonChartInstance) {
                State.comparisonChartInstance.destroy();
            }

            const ctx = elements.comparisonChart.getContext('2d');
            State.comparisonChartInstance = new window.Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total Head Movement (Tracks)',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderRadius: 6,
                        borderWidth: 1.5,
                        borderColor: '#334155'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600 },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => ` Total Seek Distance: ${context.parsed.y} tracks`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#1e293b' },
                            ticks: {
                                color: '#cbd5e1',
                                font: { family: 'Fira Code', size: 12 }
                            },
                            title: {
                                display: true,
                                text: 'Total Head Movement (Tracks)',
                                color: '#cbd5e1',
                                font: { size: 13, weight: 'bold' }
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#ffffff',
                                font: { family: 'Outfit', size: 14, weight: 'bold' }
                            }
                        }
                    }
                }
            });
        }
    }

    // =========================================================================
    // 11. Presets & Random Queue Generator
    // =========================================================================
    const Presets = {
        classic: {
            queue: '98, 183, 37, 122, 14, 124, 65, 67',
            head: 53,
            disk: 200,
            direction: 'RIGHT',
            algo: 'SSTF'
        },
        rightHeavy: {
            queue: '120, 150, 175, 130, 190, 160, 185, 145',
            head: 50,
            disk: 200,
            direction: 'RIGHT',
            algo: 'SCAN'
        },
        leftHeavy: {
            queue: '15, 32, 45, 10, 28, 5, 40, 18',
            head: 80,
            disk: 200,
            direction: 'LEFT',
            algo: 'LOOK'
        },
        duplicates: {
            queue: '0, 50, 50, 99, 50, 20, 20, 80',
            head: 50,
            disk: 100,
            direction: 'RIGHT',
            algo: 'SSTF'
        }
    };

    function loadPreset(key) {
        const p = Presets[key];
        if (!p) return;
        elements.queueInput.value = p.queue;
        elements.initialHeadInput.value = p.head;
        elements.diskSizeInput.value = p.disk;
        if (p.direction === 'LEFT') {
            elements.dirLeft.checked = true;
        } else {
            elements.dirRight.checked = true;
        }
        selectAlgorithm(p.algo);
        prepareSimulation();
        showToast(`Loaded "${key}" preset dataset.`, 'info');
    }

    function generateRandomQueue() {
        const diskSize = parseInt(elements.diskSizeInput.value, 10) || 200;
        const count = Math.floor(Math.random() * 5) + 8;
        const randomTracks = [];

        for (let i = 0; i < count; i++) {
            randomTracks.push(Math.floor(Math.random() * diskSize));
        }

        const randomHead = Math.floor(Math.random() * diskSize);

        elements.queueInput.value = randomTracks.join(', ');
        elements.initialHeadInput.value = randomHead;

        prepareSimulation();
        showToast(`Generated ${count} randomized cylinder requests.`, 'info');
    }

    function selectAlgorithm(algoKey) {
        State.selectedAlgo = algoKey;
        elements.algoCards.forEach(card => {
            if (card.dataset.algo === algoKey) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
        updateDirectionControlState();
    }

    // =========================================================================
    // 12. Event Listeners & Boot
    // =========================================================================
    function bindEventListeners() {
        // Theme toggle
        elements.themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', nextTheme);
            localStorage.setItem('disk_sim_theme', nextTheme);

            if (nextTheme === 'light') {
                elements.sunIcon.classList.remove('hidden');
                elements.moonIcon.classList.add('hidden');
            } else {
                elements.sunIcon.classList.add('hidden');
                elements.moonIcon.classList.remove('hidden');
            }
            renderActiveVisualizations();
        });

        // Sound toggle
        elements.soundToggleBtn.addEventListener('click', () => {
            soundCtrl.enabled = !soundCtrl.enabled;
            elements.soundToggleBtn.classList.toggle('active', soundCtrl.enabled);
            showToast(soundCtrl.enabled ? 'Audio feedback enabled' : 'Audio feedback muted', 'info');
        });

        // Algorithm cards
        elements.algoCards.forEach(card => {
            card.addEventListener('click', () => {
                selectAlgorithm(card.dataset.algo);
                prepareSimulation();
            });
        });

        elements.runSimulationBtn.addEventListener('click', () => {
            prepareSimulation();
            playSimulation();
        });

        elements.compareAllBtn.addEventListener('click', () => {
            compareAllAlgorithms();
        });

        elements.resetBtn.addEventListener('click', () => {
            loadPreset('classic');
            restartSimulation();
            showToast('Reset to default classic parameters.', 'info');
        });

        elements.randomQueueBtn.addEventListener('click', () => {
            generateRandomQueue();
        });

        elements.presetPills.forEach(pill => {
            pill.addEventListener('click', () => {
                loadPreset(pill.dataset.preset);
            });
        });

        elements.queueInput.addEventListener('input', () => prepareSimulation());
        elements.initialHeadInput.addEventListener('input', () => prepareSimulation());
        elements.diskSizeInput.addEventListener('input', () => prepareSimulation());
        elements.dirLeft.addEventListener('change', () => prepareSimulation());
        elements.dirRight.addEventListener('change', () => prepareSimulation());

        elements.eduModeToggle.addEventListener('change', () => {
            State.educationalMode = elements.eduModeToggle.checked;
            elements.eduModeBadge.textContent = State.educationalMode ? 'Educational Reasoning Active' : 'Compact Log';
            updateStepExplanation();
        });

        elements.playPauseBtn.addEventListener('click', () => {
            if (State.isPlaying) {
                pauseSimulation();
            } else {
                playSimulation();
            }
        });

        elements.nextStepBtn.addEventListener('click', () => {
            pauseSimulation();
            stepForward();
        });

        elements.prevStepBtn.addEventListener('click', () => {
            pauseSimulation();
            stepBackward();
        });

        elements.restartBtn.addEventListener('click', () => {
            restartSimulation();
        });

        elements.speedSlider.addEventListener('input', (e) => {
            State.speedMultiplier = parseFloat(e.target.value);
            elements.speedValueLabel.textContent = `${State.speedMultiplier.toFixed(2)}x`;
        });

        elements.vizTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.vizTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                State.viewMode = btn.dataset.view;

                if (State.viewMode === 'ruler') {
                    elements.rulerStageWrap.style.display = 'block';
                    elements.graphStageWrap.style.display = 'none';
                } else if (State.viewMode === 'graph') {
                    elements.rulerStageWrap.style.display = 'none';
                    elements.graphStageWrap.style.display = 'block';
                } else {
                    elements.rulerStageWrap.style.display = 'block';
                    elements.graphStageWrap.style.display = 'block';
                }
                renderActiveVisualizations();
            });
        });

        elements.fullscreenBtn.addEventListener('click', () => {
            const vizCard = document.querySelector('.visualizer-main-card');
            if (!document.fullscreenElement) {
                vizCard.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });

        elements.copyLogBtn.addEventListener('click', () => {
            if (!State.currentResult) return;
            const logText = State.currentResult.steps
                .slice(0, State.currentStepIndex)
                .map(s => `Step ${s.stepNumber}: ${s.from} -> ${s.to} (|${s.to} - ${s.from}| = ${s.distance}) - ${s.explanation}`)
                .join('\n');
            navigator.clipboard.writeText(logText).then(() => {
                showToast('Step log copied to clipboard!', 'success');
            });
        });

        elements.copyResultsBtn.addEventListener('click', copyResultsToClipboard);
        elements.exportCsvBtn.addEventListener('click', exportResultsToCSV);

        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            if (e.code === 'Space') {
                e.preventDefault();
                elements.playPauseBtn.click();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                elements.nextStepBtn.click();
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                elements.prevStepBtn.click();
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                elements.restartBtn.click();
            }
        });

        window.addEventListener('resize', () => {
            renderActiveVisualizations();
        });
    }

    function init() {
        const savedTheme = localStorage.getItem('disk_sim_theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            if (savedTheme === 'light') {
                elements.sunIcon.classList.remove('hidden');
                elements.moonIcon.classList.add('hidden');
            }
        }

        bindEventListeners();
        updateDirectionControlState();
        prepareSimulation();
        compareAllAlgorithms();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
