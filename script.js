let currentSubject = "";
let currentLevel = "";
let currentSlide = 0;
let quizMode = "multiple";
let questionsList = [];
let questions = {};
let index = 0;
let correct = 0;
let isMuted = false;
let timer;
let timeLeft = 20;

// Matching mode tracking
const totalSets = 4;
const questionsPerSet = 5;
let score = 0;  // total correct answers

// Load sound elements
const correctSound = document.getElementById('correct-sound');
const wrongSound = document.getElementById('wrong-sound');
const tickSound = document.getElementById('tick-sound');
const levelupSound = document.getElementById('levelup-sound');

document.addEventListener("DOMContentLoaded", function() {
    setupThemeToggle();
    applySavedTheme();
    setupMuteToggle();
    loadMuteSetting();
    updateDiamondDisplay();
});

// Load subject dynamically
function loadSubject(subject) {
    currentSubject = subject;
    const script = document.createElement('script');
    script.src = `questions-${subject}.js`;
    script.onload = () => {
        if (subject === 'essential') {
            questions = essentialQuestions;
        } else if (subject === 'ngsl') {
            questions = ngslQuestions;
        } else if (subject === 'destination') {
            questions = destinationQuestions;
        }

        document.getElementById('subject-select').style.display = 'none';
        document.getElementById('mode-select').style.display = 'block';
        document.getElementById('level-select').style.display = 'none';
        document.getElementById('page-title').innerText = `${subject.toUpperCase()}`;
    };
    document.body.appendChild(script);
}


function chooseMode(mode) {
    quizMode = mode;

    // ✅ Highlight the selected mode button
    document.querySelectorAll('.mode-button').forEach(btn => btn.classList.remove('active-mode'));
    const activeBtn = document.querySelector(`.mode-button[data-mode="${mode}"]`);
    if (activeBtn) activeBtn.classList.add('active-mode');

    document.getElementById('level-select').style.display = 'block';
    document.getElementById('page-title').innerText = `${currentSubject.toUpperCase()}`;
    showLevels();
}


function showLevels() {
    const levelDiv = document.getElementById('levels');
    levelDiv.innerHTML = '';
    let levels = Object.keys(questions);

    levels.forEach((level, i) => {
        const button = document.createElement('button');
        button.className = 'level-button';
        button.innerText = i + 1;

        if (!isLevelUnlocked(currentSubject, i + 1, quizMode)) {
            button.disabled = true;
            const lock = document.createElement('span');
            lock.className = 'lock-icon';
            lock.innerText = '🔒';
            button.appendChild(lock);
        }

        button.onclick = () => startLevel(level);
        levelDiv.appendChild(button);
    });
}

function returnToSubjects() {
    // Stop timer if running (for multiple choice)
    clearInterval(timer);
    tickSound.pause();
    tickSound.currentTime = 0;

    // Reset global states
    index = 0;
    correct = 0;
    score = 0;
    questionsList = [];
    currentLevel = '';
    currentSlide = 0;

    // Hide all quiz sections
    document.getElementById('subject-select').style.display = '';
    document.getElementById('mode-select').style.display = 'none';
    document.getElementById('level-select').style.display = 'none';
    document.getElementById('quiz').style.display = 'none';
    document.getElementById('matching-quiz').style.display = 'none';
    document.getElementById('typing-quiz').style.display = 'none';
    document.getElementById('result').style.display = 'none';
    document.getElementById('nav-buttons').style.display = 'none';

    // Reset title
    document.getElementById('page-title').style.display = '';
    document.getElementById('page-title').innerText = `Target Vocabulary`;
}


function isLevelUnlocked(subject, levelNumber, mode) {
    return localStorage.getItem(`${subject}-${mode}-level${levelNumber}`) === 'passed' || levelNumber === 1;
}
function startLevel(levelName) {
    currentLevel = levelName;
    document.getElementById('level-select').style.display = 'none';
    document.getElementById('mode-select').style.display = 'none';
    document.getElementById('result').style.display = 'none';
    document.getElementById('page-title').style.display = 'none';

    let allQuestions = questions[currentLevel];
    questionsList = shuffleArray(allQuestions).slice(0, totalSets * questionsPerSet);

    if (quizMode === 'multiple') {
        index = 0;
        correct = 0;
        document.getElementById('quiz').style.display = 'block';
        showQuestion();
    } else if (quizMode === 'matching') {
        score = 0;
        currentSetIndex = 0;
        showMatchingQuizSets();
    } else if (quizMode === 'typing') {
        score = 0;
        showTypingQuiz();
    }
}

function startQuiz(mode) {
    quizMode = mode;
    let allQuestions = questions[currentLevel];
    // Load 20 questions (4 sets of 5)
    questionsList = shuffleArray(allQuestions).slice(0, totalSets * questionsPerSet);
    document.getElementById('mode-select').style.display = 'none';
    document.getElementById('result').style.display = 'none';
    document.getElementById('page-title').style.display = 'none';

    if (quizMode === 'multiple') {
        index = 0;
        correct = 0;
        document.getElementById('quiz').style.display = 'block';
        showQuestion();
    } else if (quizMode === 'matching') {
        score = 0;
        showMatchingQuizSets();
    }
}

/* ============================
   MULTIPLE CHOICE LOGIC
============================ */

function showQuestion() {
    if (index >= questionsList.length) {
        finishQuiz();
        return;
    }

    const q = questionsList[index];
    document.getElementById('question-number').innerText = `${index + 1} - ${questionsList.length}`;
    document.getElementById('question-text').innerText = q.Question;
    const optionsDiv = document.getElementById('options');
    optionsDiv.innerHTML = '';

    let wrongs = shuffleArray(q.options).slice(0, 4);
    let allOptions = [...wrongs, q.RightAnswer];
    let options = shuffleArray(allOptions);

    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-button';
        btn.innerText = option;
        btn.onclick = () => selectAnswer(option);
        optionsDiv.appendChild(btn);
    });

    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timeLeft = 20;
    const timerBar = document.getElementById('timer-bar');
    timerBar.style.width = "100%";
    timerBar.classList.remove('red-flash');

    timer = setInterval(() => {
        timeLeft--;
        timerBar.style.width = `${(timeLeft / 20) * 100}%`;
        if (timeLeft === 4 && !isMuted) tickSound.play();
        if (timeLeft <= 5) timerBar.classList.add('red-flash');
        if (timeLeft <= 0) {
            clearInterval(timer);
            tickSound.pause();
            tickSound.currentTime = 0;
            autoNextQuestion();
        }
    }, 1000);
}

function selectAnswer(selected) {
    clearInterval(timer);
    if (!isMuted) {
        tickSound.pause();
        tickSound.currentTime = 0;
    }
    const buttons = document.querySelectorAll('#options button');
    const correctAnswer = questionsList[index].RightAnswer;

    buttons.forEach(btn => {
        btn.disabled = true;
        if (btn.innerText === correctAnswer) btn.classList.add('correct');
        else if (btn.innerText === selected) btn.classList.add('wrong');
    });

    if (selected === correctAnswer) {
        correct++;
        if (!isMuted) correctSound.play();
    } else {
        if (!isMuted) wrongSound.play();
    }

    setTimeout(() => {
        index++;
        showQuestion();
    }, 1000);
}

function autoNextQuestion() {
    const buttons = document.querySelectorAll('#options button');
    buttons.forEach(btn => btn.disabled = true);
    setTimeout(() => {
        index++;
        showQuestion();
    }, 1000);
}

function finishQuiz() {
    document.getElementById('quiz').style.display = 'none';
    const percentage = Math.round((correct / questionsList.length) * 100);
    let resultHTML = `<h2>You Scored: ${percentage}%</h2>`;

    let nextLevelButton = ''; // Prepare the next button separately

    if (percentage >= 90) {
    if (!isMuted) levelupSound.play();
    resultHTML += `<p>Great job! Next level unlocked.</p>`;
    unlockNextLevel();

    const currentLevelNum = parseInt(currentLevel.replace(/[^0-9]/g, ''));
    const nextLevelName = currentLevel.replace(currentLevelNum, currentLevelNum + 1);

    if (questions[nextLevelName]) {
        nextLevelButton = `
            <button id="next-button" onclick="startLevel('${nextLevelName}')">
                <img src="next.png" alt="Next">
            </button>
        `;
    }
} else {
    resultHTML += `<p>Keep practicing!</p>`;
}

// 💎 Award diamonds and show them
const diamonds = awardDiamonds(percentage);
resultHTML += `<p>You earned 💎 ${diamonds} diamond${diamonds !== 1 ? 's' : ''}!</p>`;
updateDiamondDisplay();

    // ✅ Output in correct order: Back - Retry - Next (even if Next is empty)
    resultHTML += `
    <div class="result-buttons">
        <button id="return-button" onclick="returnToLevels()">
            <img src="menu.png" alt="Levels" class="icon-btn">
        </button>
        <button id="retry-button" onclick="startLevel('${currentLevel}')">
            <img src="retry.png" alt="Retry" class="icon-btn">
        </button>
        ${nextLevelButton}
    </div>
`;

    document.getElementById('result').innerHTML = resultHTML;
    document.getElementById('result').style.display = 'block';
}


/* ============================
   MATCHING LOGIC (with slider/swipe)
============================ */

function showMatchingQuizSets() {
    document.getElementById('matching-quiz').style.display = 'block';

    const qCol = document.getElementById('slider-track');
    qCol.innerHTML = '';

    // Create all sets
    for (let setIndex = 0; setIndex < totalSets; setIndex++) {
        const setWrapper = document.createElement('div');
        setWrapper.className = 'set-group';
        setWrapper.dataset.setIndex = setIndex;

        const setTitle = document.createElement('h3');
        setTitle.innerText = `Set ${setIndex + 1}`;
        setWrapper.appendChild(setTitle);

        const setQuestions = questionsList.slice(
            setIndex * questionsPerSet,
            (setIndex + 1) * questionsPerSet
        );

        setQuestions.forEach((q, i) => {
            const row = document.createElement('div');
            row.className = 'match-row';

            const questionBox = document.createElement('div');
            questionBox.className = 'question-box';
            questionBox.innerText = q.Question;

            const arrow = document.createElement('div');
            arrow.className = 'arrow';
            arrow.innerText = '⇨';

            const answerSlot = document.createElement('div');
            answerSlot.className = 'answer-slot';
            answerSlot.dataset.correct = q.RightAnswer;
            answerSlot.dataset.index = (setIndex * questionsPerSet) + i;
            
            
            // Accept drop
            answerSlot.ondragover = (e) => {
                e.preventDefault();
                answerSlot.classList.add('drag-over');
            };
            answerSlot.ondragleave = () => {
                answerSlot.classList.remove('drag-over');
            };
            answerSlot.ondrop = (e) => handleDrop(e, answerSlot);

            // Allow dragging back out
            answerSlot.ondragstart = (e) => {
                if (answerSlot.innerText.trim() !== '') {
                    e.dataTransfer.setData("text", answerSlot.innerText);
                    e.dataTransfer.setData("from-slot", answerSlot.dataset.index);
                }
            };
            answerSlot.draggable = true;

            row.appendChild(questionBox);
            row.appendChild(arrow);
            row.appendChild(answerSlot);
            setWrapper.appendChild(row);
        });
        
        // Create the answer pool for this set
        const answersRow = document.createElement('div');
        answersRow.className = 'answers-row';
        const answers = shuffleArray(setQuestions.map(q => q.RightAnswer));
        answers.forEach((a) => {
        const draggable = document.createElement('div');
            draggable.className = 'match-draggable';
            draggable.draggable = true;
            draggable.innerText = a;
            draggable.ondragstart = e => {
                e.dataTransfer.setData("text", a);
            };
            answersRow.appendChild(draggable);
        });

        setWrapper.appendChild(answersRow);
        qCol.appendChild(setWrapper);
        
    }

    // Show the first slide
    showSlide(0);
    setupSwipe();
    updateNavButtons();
    document.getElementById('nav-buttons').style.display = 'block';
    document.getElementById('submit-matching').disabled = false;

}

function setupSwipe() {
    let startX = 0;
    const slider = document.getElementById('slider-container');

    slider.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });

    slider.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;
        if (diff > 50) {
            nextSet();
        } else if (diff < -50) {
            prevSet();
        }
    });
}

function showSlide(index) {
    const totalSlides = document.querySelectorAll('.set-group').length;
    if (index < 0 || index >= totalSlides) return;
    currentSlide = index;
    const offset = -index * 100;
    document.getElementById('slider-track').style.transform = `translateX(${offset}%)`;
    updateNavButtons();
}

function nextSet() {
    showSlide(currentSlide + 1);
}

function prevSet() {
    showSlide(currentSlide - 1);
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-matching');

    prevBtn.style.display = currentSlide === 0 ? 'none' : 'inline-block';
    nextBtn.style.display = currentSlide === (totalSets - 1) ? 'none' : 'inline-block';
    submitBtn.style.display = currentSlide === (totalSets - 1) ? 'inline-block' : 'none';
    submitBtn.disabled = false;
}

function handleDrop(e, slot) {
    e.preventDefault();
    slot.classList.remove('drag-over');
    const data = e.dataTransfer.getData("text");
    const fromSlot = e.dataTransfer.getData("from-slot");

    // ✅ 1. If the slot already has an answer, put it back to the pool
    const existingAnswer = slot.innerText.trim();
    if (existingAnswer !== '' && existingAnswer !== data) {
        const answersRow = slot.closest('.set-group').querySelector('.answers-row');
        const draggable = document.createElement('div');
        draggable.className = 'match-draggable';
        draggable.draggable = true;
        draggable.innerText = existingAnswer;
        draggable.ondragstart = (e) => {
            e.dataTransfer.setData("text", existingAnswer);
        };
        answersRow.appendChild(draggable);
    }

    // ✅ 2. If coming from another slot: clear previous slot
    if (fromSlot !== '') {
        const prevSlot = document.querySelector(`.answer-slot[data-index='${fromSlot}']`);
        if (prevSlot) prevSlot.innerText = '';
    }

    // ✅ 3. If coming from the pool: remove from pool
    if (!fromSlot) {
        const poolAnswers = document.querySelectorAll('.match-draggable');
        poolAnswers.forEach(answer => {
            if (answer.innerText === data) {
                answer.remove();
            }
        });
    }

    // ✅ 4. Drop the new data into this slot
    slot.innerText = data;
}

function submitMatching() {
    const slots = document.querySelectorAll('.answer-slot');
    let totalCorrect = 0;

    slots.forEach(slot => {
        if (slot.innerText === slot.dataset.correct) {
            slot.classList.add('correct');
            totalCorrect++;
        } else {
            slot.classList.add('wrong');
        }

        // 🔒 Lock the answer slot
        slot.ondrop = null;
        slot.ondragover = null;
        slot.ondragleave = null;
        slot.ondragstart = null;
        slot.draggable = false;
        slot.style.pointerEvents = 'none';
    });

    // 🔒 Disable all answer pool items
    document.querySelectorAll('.match-draggable').forEach(el => {
        el.draggable = false;
        el.style.cursor = 'default';
    });

    const percentage = Math.round((totalCorrect / (totalSets * questionsPerSet)) * 100);
    let resultHTML = `<h2>Your Score: ${percentage}%</h2>`;

    if (percentage >= 90) {
        if (!isMuted) levelupSound.play();
        resultHTML += `<p>Excellent! Next level unlocked.</p>`;
        unlockNextLevel();
    } else {
        resultHTML += `<p>Keep practicing!</p>`;
    }

    // 💎 Add this line
    const diamonds = awardDiamonds(percentage);
    resultHTML += `<p>You earned 💎 ${diamonds} diamond${diamonds !== 1 ? 's' : ''}!</p>`;
    updateDiamondDisplay();

    resultHTML += `
        <div class="result-buttons">
            <button id="return-button" onclick="returnToLevels()">
                <img src="menu.png" alt="Level" class="icon-btn">
            </button>
            <button id="retry-button" onclick="startLevel('${currentLevel}')">
                <img src="retry.png" alt="Retry" class="icon-btn">
            </button>
            ${percentage >= 90 ? `
                <button id="next-button" onclick="startLevel('${getNextLevelName()}')">
                    <img src="next.png" alt="Next" class="icon-btn">
                </button>` : ''}
        </div>
    `;

    document.getElementById('result').innerHTML = resultHTML;
    document.getElementById('result').style.display = 'block';

    // 🔒 Disable or hide the submit button
    const submitBtn = document.getElementById('submit-matching');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.display = 'none';
    }
}


/* ============================
   UTILITIES
============================ */

function unlockNextLevel() {
    const levelNum = parseInt(currentLevel.replace(/[^0-9]/g, ''));
    localStorage.setItem(`${currentSubject}-${quizMode}-level${levelNum + 1}`, 'passed');
}

function shuffleArray(array) {
    let arr = array.slice();  // make a copy
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


function returnToLevels() {
    document.getElementById('result').style.display = 'none';
    document.getElementById('quiz').style.display = 'none';
    document.getElementById('matching-quiz').style.display = 'none';
    document.getElementById('typing-quiz').style.display = 'none';
    document.getElementById('level-select').style.display = 'block';
    document.getElementById('page-title').innerText = `Choose a Level (${currentSubject.toUpperCase()})`;
    showLevels();
}

function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            saveThemePreference();
        });
    }
}

function saveThemePreference() {
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

function setupMuteToggle() {
    const muteButton = document.getElementById('mute-toggle');
    const muteIcon = document.getElementById('mute-icon');
    
    muteButton.addEventListener('click', () => {
        isMuted = !isMuted;
        muteIcon.src = isMuted ? 'unmute.png' : 'mute.png';  // 🔄 switch images
        localStorage.setItem('mute', isMuted ? 'true' : 'false');
    });
}

function loadMuteSetting() {
    const muteSetting = localStorage.getItem('mute');
    const muteIcon = document.getElementById('mute-icon');
    
    if (muteSetting === 'true') {
        isMuted = true;
        muteIcon.src = 'unmute.png';  // 👈 set to unmute icon if muted
    } else {
        isMuted = false;
        muteIcon.src = 'mute.png';    // 👈 default to mute icon
    }
}

function getNextLevelName() {
    const currentLevelNum = parseInt(currentLevel.replace(/[^0-9]/g, ''));
    return currentLevel.replace(currentLevelNum, currentLevelNum + 1);
}
function showTypingQuiz() {
    const container = document.getElementById('typing-questions');
    container.innerHTML = '';
    document.getElementById('typing-quiz').style.display = 'block';
    document.getElementById('submit-typing').disabled = false;

    questionsList.forEach((q, index) => {
        const firstLetter = q.RightAnswer.trim()[0];
        const totalLength = q.RightAnswer.length;

        // Create row wrapper
        const row = document.createElement('div');
        row.className = 'typing-row-horizontal';

        // Question side
        const questionWrapper = document.createElement('div');
        questionWrapper.className = 'typing-question-wrapper';

        const number = document.createElement('div');
        number.className = 'question-number';
        number.innerText = `${index + 1}.`;

        const questionBox = document.createElement('div');
        questionBox.className = 'typing-question-box';
        questionBox.innerText = q.Question;

        questionWrapper.appendChild(number);
        questionWrapper.appendChild(questionBox);

        // Input field
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'typing-input';
        input.maxLength = totalLength;
        let hint = '';
        const trimmedAnswer = q.RightAnswer.trim();

        for (let i = 0; i < trimmedAnswer.length; i++) {
            if (i === 0) {
                hint += trimmedAnswer[i];
            } else {
                hint += trimmedAnswer[i] === ' ' ? '   ' : ' _';
            }
        }
        input.placeholder = hint;
        input.dataset.answer = q.RightAnswer.toLowerCase();

        input.addEventListener('input', () => {
            input.value = input.value.toLowerCase();
        });

        // Combine into row
        row.appendChild(questionWrapper);
        row.appendChild(input);
        container.appendChild(row);
    });
}

function submitTyping() {
    const inputs = document.querySelectorAll('.typing-input');
    let totalCorrect = 0;

    inputs.forEach(input => {
        const userAnswer = input.value.trim().toLowerCase();
        const correctAnswer = input.dataset.answer;

        if (userAnswer === correctAnswer) {
            input.classList.add('correct');
            totalCorrect++;
        } else {
            input.classList.add('wrong');
        
            // 👇 Create and show the correct answer
            const correctDiv = document.createElement('div');
            correctDiv.className = 'correct-answer-hint';
            correctDiv.innerText = `${correctAnswer}`;
            input.parentNode.appendChild(correctDiv);
        }
        
        input.disabled = true;
    });

    const percentage = Math.round((totalCorrect / inputs.length) * 100);
    let resultHTML = `<h2>Your Score: ${percentage}%</h2>`;

    if (percentage >= 90) {
        if (!isMuted) levelupSound.play();
        resultHTML += `<p>Excellent! Next level unlocked.</p>`;
        unlockNextLevel();
    } else {
        resultHTML += `<p>Keep practicing!</p>`;
    }

    // 💎 Add this line
    const diamonds = awardDiamonds(percentage);
    resultHTML += `<p>You earned 💎 ${diamonds} diamond${diamonds !== 1 ? 's' : ''}!</p>`;
    updateDiamondDisplay();

    resultHTML += `
        <div class="result-buttons">
            <button id="return-button" onclick="returnToLevels()">
                <img src="menu.png" alt="Level" class="icon-btn">
            </button>
            <button id="retry-button" onclick="startLevel('${currentLevel}')">
                <img src="retry.png" alt="Retry" class="icon-btn">
            </button>
            ${percentage >= 90 ? `
                <button id="next-button" onclick="startLevel('${getNextLevelName()}')">
                    <img src="next.png" alt="Next" class="icon-btn">
                </button>` : ''}
        </div>
    `;

    document.getElementById('result').innerHTML = resultHTML;
    document.getElementById('result').style.display = 'block';
    document.getElementById('submit-typing').disabled = true;
}
function awardDiamonds(score) {
    let diamondsEarned = 0;

    if (score >= 90) {
        diamondsEarned = 3;
    } else if (score >= 75) {
        diamondsEarned = 2;
    } else if (score >= 50) {
        diamondsEarned = 1;
    }

    const current = parseInt(localStorage.getItem('diamonds') || '0');
    localStorage.setItem('diamonds', current + diamondsEarned);

    return diamondsEarned;
}
function updateDiamondDisplay() {
    const count = localStorage.getItem('diamonds') || '0';
    const display = document.getElementById('diamond-count');
    if (display) {
        display.innerText = count;
    }
}
