// script.js

// Global Variables
let originalCommutators = [];
let commutators = [];
let threshold = 4;
let numPairsPerStep = 1;
let mode = 'edge';
let wordType = 'object-word'; // Relevant for Letter Pair Mode
let edgeType = 'normal';
let showCommutator = false;
let currentStep = 0;
let totalSteps = 0;
let toRepeat = [];
let timerInterval = null;
let startTime = null;
let waitingForSecondAction = false;
let sessionActive = false; // Initialize to false to prevent unintended triggers
let sessionResults = {}; // Object to track pairs under threshold in the current session
let alternateFlag = false; // Flag to alternate between object and action words
let elapsed = 0;

const specialEdgePairs = [
    "MS", "SM", "ES", "SE", "CS", "SC", "OS", "SO", "SY", "QS",
    "JG", "GJ", "UG", "GU", "OG", "GO", "CG", "GC", "LG", "GL",
    "MG", "GM", "NV", "VN", "JR", "RJ", "PV", "VA", "DV", "VD",
    "QV", "VY", "LV", "VL", "HV", "VX", "OR", "RO", "CV", "VC",
    "IV", "VI", "MV", "VM", "EV", "VE", "OV", "VO", "QB", "BY",
    "TN", "NT"
];

// DOM Elements
const startScreen = document.getElementById('start-screen');
const practiceScreen = document.getElementById('practice-screen');
const endScreen = document.getElementById('end-screen');
const startForm = document.getElementById('start-form');
const progressBar = document.getElementById('progress-bar');
const pairDisplay = document.getElementById('pair-display');
const timerDisplay = document.getElementById('timer');
const statisticsDiv = document.getElementById('statistics'); // This will now display the summary
const repeatButton = document.getElementById('repeat-button');
const finishButton = document.getElementById('finish-button');
const repeatAllButton = document.getElementById('repeat-all-button');
const wordTypeGroup = document.getElementById('word-type-group');
const edgeTypeGroup = document.getElementById('edge-type-group');
const lettersGroup = document.getElementById('letters-group');
const thresholdGroup = document.getElementById('threshold-group');
const commutatorOptionGroup = document.getElementById('commutator-option-group');

// Feedback Buttons
const feedbackButtons = document.getElementById('feedback-buttons');
const failedButton = document.getElementById('failed-button');

// Event Listeners
startForm.addEventListener('submit', startPractice);
repeatButton.addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent any unintended event bubbling
    handleRepeat(true); 
});
repeatAllButton.addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent any unintended event bubbling
    handleRepeat(false);
});
finishButton.addEventListener('click', handleFinish);
document.getElementsByName('commutator-type').forEach(radio => {
    radio.addEventListener('change', handleModeChange);
});
document.getElementsByName('word-type').forEach(radio => {
    radio.addEventListener('change', handleWordTypeChange);
});
document.getElementsByName('edge-type').forEach(radio => {
    radio.addEventListener('change', handleEdgeTypeChange);
});

failedButton.addEventListener('touchstart', function(event) {
    event.stopPropagation(); // Prevent the 'practiceScreen' click from triggering handleNext(false)
    handleNext(true); // Treat as 'Failed'
});

// Function to Handle Mode Change
function handleModeChange(event) {
    mode = event.target.value;
    if (mode === 'letter-pair') {
        console.log("letter pair")
        wordTypeGroup.style.display = 'flex';
        edgeTypeGroup.style.display = 'none';
        lettersGroup.style.display = 'block'; // Show lettersGroup in "Letter Pair" mode
        thresholdGroup.style.display = 'block'; // Show thresholdGroup in "Letter Pair" mode
        commutatorOptionGroup.style.display = 'none';
    } else if (mode === 'edge') {
        wordTypeGroup.style.display = 'none';
        edgeTypeGroup.style.display = 'flex';
        lettersGroup.style.display = 'block';
        thresholdGroup.style.display = 'block';
        commutatorOptionGroup.style.display = 'block';
    } else {
        wordTypeGroup.style.display = 'none';
        edgeTypeGroup.style.display = 'none';
        lettersGroup.style.display = 'block';
        thresholdGroup.style.display = 'block';
        commutatorOptionGroup.style.display = 'block';
    }
}
// Function to Handle Word Type Change
function handleWordTypeChange(event) {
    wordType = event.target.value;
}

function handleEdgeTypeChange(event) {
    edgeType = event.target.value;
    console.log(edgeType)
}

// Function to Start Practice
function startPractice(event) {
    event.preventDefault();

    const letters = document.getElementById('letters').value.trim().toUpperCase();
    threshold = parseFloat(document.getElementById('threshold').value);
    numPairsPerStep = parseInt(document.getElementById('num-pairs').value);
    showCommutator = document.getElementById('show-comm').checked;
    if (mode === 'letter-pair') {
        showCommutator = true;
    }

    // Input Validation
    if (!/^[A-Z]+$/.test(letters)) {
        alert('Please enter valid starting letters containing only A-Z.');
        return;
    }

    if (isNaN(threshold) || threshold <= 0) {
        alert('Please enter a valid positive number for the time threshold.');
        return;
    }

    if (isNaN(numPairsPerStep) || numPairsPerStep <= 0) {
        alert('Please enter a valid positive integer for the number of pairs per step.');
        return;
    }

    const startingLetters = new Set(letters);

    // Load Commutators
    const jsonFile = mode === 'edge' ? 'processed_edge_commutators.json' : mode === 'corner' ? 'processed_corner_commutators.json' : 'processed_letter_pairs.json';
    console.log(jsonFile)

    fetch(jsonFile)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${jsonFile}`);
            }
            return response.json();
        })
        .then(data => {
            if (mode === 'edge' && edgeType === 'special-edge') {
                commutators = Object.keys(data)
                .filter(key => specialEdgePairs.includes(key.toUpperCase()))
                .map(key => ({
                    pair: key,
                    commutator: data[key].commutator || 'N/A',
                    words: data[key].words || 'N/A',
                    object_word: data[key].object_word || 'N/A',
                    action_word: data[key].action_word || 'N/A'
                }));
            } else {
                commutators = Object.keys(data)
                .filter(key => startingLetters.has(key[0].toUpperCase()))
                .map(key => ({
                    pair: key,
                    commutator: data[key].commutator || 'N/A',
                    words: data[key].words || 'N/A',
                    object_word: data[key].object_word || 'N/A',
                    action_word: data[key].action_word || 'N/A'
                }));
            }
            
            if (commutators.length === 0) {
                alert(`No commutators found starting with letters: ${Array.from(startingLetters).join(', ')}`);
                return;
            }

            originalCommutators = [...commutators];

            if (numPairsPerStep > commutators.length) {
                alert(`Number of pairs per step (${numPairsPerStep}) exceeds total available pairs (${commutators.length}). All pairs will be shown in one step.`);
                numPairsPerStep = commutators.length;
            }

            // Initialize Training Data
            commutators = shuffleArray(commutators);
            totalSteps = Math.ceil(commutators.length / numPairsPerStep);
            progressBar.max = totalSteps;
            progressBar.value = 0;
            currentStep = 0;
            toRepeat = [];
            sessionResults = {}; // Reset sessionResults for the current session
            sessionActive = true; // Activate session
            alternateFlag = false; // Reset alternation flag

            // Show Practice Screen
            startScreen.classList.remove('active');
            endScreen.classList.remove('active');
            practiceScreen.classList.add('active');

            // Start First Step
            showNextStep();
        })
        .catch(error => {
            alert(error.message);
        });
}

// Function to Shuffle Array using Fisher-Yates Algorithm
function shuffleArray(array) {
    // Use Fisher-Yates Shuffle for better randomness
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Function to Show Next Step
function showNextStep() {
    if (currentStep >= totalSteps) {
        endTraining();
        return;
    }

    // Clear Previous Display
    pairDisplay.innerHTML = '';
    waitingForSecondAction = false;

    // Determine Pairs for Current Step
    const startIdx = currentStep * numPairsPerStep;
    const endIdx = startIdx + numPairsPerStep;
    const currentPairs = commutators.slice(startIdx, endIdx);

    // Display Each Pair or Words based on Mode
    currentPairs.forEach(comm => {
        const pairElement = document.createElement('div');
        pairElement.classList.add('pair');

        if (mode === 'letter-pair') {
            pairElement.textContent = comm.pair;
        } else {
            const displayText = mode === 'edge' ? comm.pair : comm.words;
            pairElement.textContent = displayText;
        }

        pairDisplay.appendChild(pairElement);
    });

    // Update Progress Bar
    progressBar.value = currentStep;

    startTimer();
}

// Function to Start Timer
function startTimer() {
    if (timerInterval) return; // Prevent multiple timers
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 10); // Update every 10 milliseconds for higher precision
}

// Function to Update Timer Display
function updateTimer() {
    if (!sessionActive) return; // Prevent Timer Update if Session Ended

    const elapsed = (Date.now() - startTime) / 1000; // in seconds
    const minutes = Math.floor(elapsed / 60);
    const seconds = (elapsed % 60).toFixed(2);
    timerDisplay.textContent = `${pad(minutes)}:${pad(seconds)}`;

    // Update Timer Color Based on Threshold
    if (elapsed < threshold) {
        timerDisplay.style.color = 'green';
    } else if (elapsed < threshold * 1.5) {
        timerDisplay.style.color = 'orange';
    } else {
        timerDisplay.style.color = 'red';
    }
}

// Function to Pad Numbers with Leading Zeros
function pad(num) {
    return num.toString().padStart(2, '0');
}

// Function to Stop Timer and Return Elapsed Time
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        const elapsed = (Date.now() - startTime) / 1000; // in seconds
        return elapsed;
    }
    return 0;
}

// Function to Handle Next Action (Spacebar Press or Touch)
function handleNext(failed) {
    if (!sessionActive) return; // Ignore if session has ended

    if (!waitingForSecondAction) {
        elapsed = stopTimer();

        if (showCommutator) {
            if (mode === 'letter-pair') {
                const comm = commutators[currentStep];
                let displayedWord = '';

                if (wordType === 'object-word') {
                    displayedWord = comm.object_word;
                } else if (wordType === 'action-word') {
                    displayedWord = comm.action_word;
                } else if (wordType === 'alternate-word') {
                    // Alternate between object and action words
                    displayedWord = alternateFlag ? comm.action_word : comm.object_word;
                    alternateFlag = !alternateFlag; // Toggle for next pair
                }

                displayWord(displayedWord);

                feedbackButtons.style.display = 'flex';
            } else {
                displayCommutator();
            }

            waitingForSecondAction = true;
            return;
        }
    }

    recordResult(elapsed, failed);
    feedbackButtons.style.display = 'none';

    currentStep++;
    showNextStep();
}

// Function to Handle Spacebar Press
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        event.preventDefault(); // Prevent default spacebar scrolling
        handleNext(false);
    }
});

// Function to Handle Touch Events on Mobile (Attach to Practice Screen Only)
practiceScreen.addEventListener('touchstart', function(event) {
    event.preventDefault(); // Prevent default touch actions
    handleNext(false);
}, { passive: false });

// Function to Display Commutator
function displayCommutator() {
    const startIdx = currentStep * numPairsPerStep;
    const endIdx = startIdx + numPairsPerStep;
    const currentPairs = commutators.slice(startIdx, endIdx);

    pairDisplay.innerHTML = '';
    currentPairs.forEach(comm => {
        const commText = comm.commutator;
        const commElement = document.createElement('div');
        commElement.classList.add('commutator');
        commElement.textContent = commText;
        pairDisplay.appendChild(commElement);
    });
}

// Function to Display Word (For Letter Pair Mode)
function displayWord(word) {
    // Clear the pair display to show only the word
    pairDisplay.innerHTML = '';

    const wordElement = document.createElement('div');
    wordElement.classList.add('commutator', 'word'); // Add 'word' class for specific styling
    wordElement.textContent = word;
    pairDisplay.appendChild(wordElement);
}

// Function to Record Results
function recordResult(elapsed, failed) {
    const currentPairs = commutators.slice(currentStep * numPairsPerStep, currentStep * numPairsPerStep + numPairsPerStep);

    currentPairs.forEach(comm => {

        // Queue for repetition if exceeded threshold and not already in queue
        if (elapsed > threshold || failed) {
            if (!toRepeat.find(c => c.pair === comm.pair)) {
                toRepeat.push(comm);
            }
        } else {
            sessionResults[comm.pair] = true;
        }
    });
}

// Function to End Training
function endTraining() {
    sessionActive = false; // Set Session Flag to False
    stopTimer(); // Ensure Timer is Stopped
    progressBar.value = totalSteps;
    practiceScreen.classList.remove('active');
    endScreen.classList.add('active');

    // Calculate number of pairs under threshold
    const underThreshold = Object.keys(sessionResults).length;
    const totalSessionPairs = commutators.length;

    // Display summary based on mode
    statisticsDiv.innerHTML = `<p>Result: <strong>${underThreshold}</strong> / <strong>${totalSessionPairs}</strong></p>`;

    finishButton.style.display = 'inline-block';

    // Conditionally show the "Repeat Failed Pairs" or "Repeat All Pairs" button
    if (toRepeat.length > 0) {
        repeatButton.style.display = 'inline-block'; // Show "Repeat Failed Pairs"
        repeatAllButton.style.display = 'none';      // Hide "Repeat All Pairs"
    } else {
        repeatButton.style.display = 'none';          // Hide "Repeat Failed Pairs"
        repeatAllButton.style.display = 'inline-block'; // Show "Repeat All Pairs"
    }
}

// Function to Restart Session
function restartSession() {
    // Reset Variables
    commutators = [];
    threshold = 4;
    numPairsPerStep = 1;
    mode = 'edge';
    wordType = 'object-word';
    showCommutator = false;
    currentStep = 0;
    totalSteps = 0;
    toRepeat = [];
    sessionResults = {}; // Reset sessionResults
    timerInterval = null;
    startTime = null;
    waitingForSecondAction = false;
    sessionActive = false;
    alternateFlag = false; // Reset alternation flag

    // Reset UI
    endScreen.classList.remove('active');
    practiceScreen.classList.remove('active');
    startScreen.classList.add('active');
    statisticsDiv.innerHTML = '';
}

// Function to Handle Repeat Button Click
function handleRepeat(repeatFailed) {
    if (toRepeat.length === 0 && repeatFailed) return;


    commutators = repeatFailed ? toRepeat : originalCommutators;
    commutators = shuffleArray(commutators);
    totalSteps = Math.ceil(commutators.length / numPairsPerStep);
    progressBar.max = totalSteps;
    progressBar.value = 0;
    currentStep = 0;
    toRepeat = [];
    sessionResults = {}; // Reset sessionResults
    sessionActive = true; // Re-activate Session
    alternateFlag = false; // Reset alternation flag

    // Switch Screens
    endScreen.classList.remove('active');
    practiceScreen.classList.add('active');

    // Display the repeated pairs
    showNextStep();
}

// Function to Handle Finish Button Click
function handleFinish() {
    // Reset the session and return to the start screen
    restartSession();
}
