// =====================
// STATE
// =====================
let studentName = "";
let score = 0;
let lives = 0;
let roundNumber = 0;
let mistakes = [];
let currentTask = null;
let lastParams = null; // сигнатура предыдущего задания — чтобы числа не повторялись подряд
let locked = false;    // блокировка кликов, пока идёт переход между раундами

const TOTAL_ROUNDS = 15;
const START_LIVES = 3;

// =====================
// УРОВНИ СЛОЖНОСТИ
// =====================
const LEVELS = {
    novice: { label: "Лёгкий",   from: 1,  to: 5,  kinds: ["numeric", "monomial"] },
    middle: { label: "Средний",  from: 6,  to: 10, kinds: ["monomial", "visible", "factorout"] },
    pro:    { label: "Сложный",  from: 11, to: 15, kinds: ["factorout", "diffsquares"] }
};

function getLevelForRound(n) {
    if (n <= 5) return "novice";
    if (n <= 10) return "middle";
    return "pro";
}

// =====================
// ХЕЛПЕРЫ
// =====================
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
    return arr[rand(0, arr.length - 1)];
}

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = rand(0, i);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function valueKey(v) {
    return typeof v === "string" ? v : `${v.num}/${v.den}`;
}

function valueToHTML(v) {
    if (typeof v === "string") {
        return `<span class="task-plain">${v}</span>`;
    }
    return `<div class="frac"><span class="frac-num">${v.num}</span><span class="frac-den">${v.den}</span></div>`;
}

function valueToText(v) {
    return typeof v === "string" ? v : `${v.num} / ${v.den}`;
}

function optionsAreUnique(options) {
    const seen = new Set();
    for (const o of options) {
        const key = valueKey(o.value);
        if (seen.has(key)) return false;
        seen.add(key);
    }
    return true;
}

// =====================
// ГЕНЕРАТОРЫ ЗАДАНИЙ
// =====================
function genNumeric() {
    let p, q;
    do { p = rand(2, 9); q = rand(2, 9); } while (gcd(p, q) !== 1 || p === q);
    const g = rand(2, 6);
    const a = p * g, b = q * g;

    const correct = { num: `${p}`, den: `${q}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${p}`, den: `${b}` }, correct: false },
        { value: { num: `${a}`, den: `${q}` }, correct: false },
        { value: { num: `${q}`, den: `${p}` }, correct: false }
    ]);

    return {
        kind: "numeric",
        taskValue: { num: `${a}`, den: `${b}` },
        correctValue: correct,
        options,
        signature: `numeric:${a}:${b}`,
        why: `Общий множитель чисел ${a} и ${b} — это ${g}. Делим числитель и знаменатель на ${g}: ${a}÷${g}=${p}, ${b}÷${g}=${q}.`
    };
}

function genMonomial() {
    let p, q;
    do { p = rand(2, 9); q = rand(2, 9); } while (gcd(p, q) !== 1 || p === q);

    const correct = { num: `${p}`, den: `${q}y` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${p}`, den: `${q}` }, correct: false },
        { value: { num: `${p}x`, den: `${q}y` }, correct: false },
        { value: { num: `${q}`, den: `${p}y` }, correct: false }
    ]);

    return {
        kind: "monomial",
        taskValue: { num: `${p}x`, den: `${q}xy` },
        correctValue: correct,
        options,
        signature: `monomial:${p}:${q}`,
        why: `Общий множитель — x. Сокращаем: ${p}x÷x=${p}, ${q}xy÷x=${q}y.`
    };
}

function genVisible() {
    const p = rand(2, 9);
    const k = rand(2, 9);

    const correct = `${p}`;

    const options = shuffle([
        { value: correct, correct: true },
        { value: `${p}(x + ${k})`, correct: false },
        { value: `x + ${k}`, correct: false },
        { value: `${p}x`, correct: false }
    ]);

    return {
        kind: "visible",
        taskValue: { num: `${p}(x + ${k})`, den: `(x + ${k})` },
        correctValue: correct,
        options,
        signature: `visible:${p}:${k}`,
        why: `Скобка (x + ${k}) есть и в числителе, и в знаменателе — сокращаем её полностью, остаётся ${p}.`
    };
}

function genFactorout() {
    const p = rand(2, 6);
    const k = rand(2, 9);

    const correct = `x + ${k}`;

    const options = shuffle([
        { value: correct, correct: true },
        { value: `${p}x + ${k}`, correct: false },
        { value: `x + ${p * k}`, correct: false },
        { value: `${p}(x + ${k})`, correct: false }
    ]);

    return {
        kind: "factorout",
        taskValue: { num: `${p}x + ${p * k}`, den: `${p}` },
        correctValue: correct,
        options,
        signature: `factorout:${p}:${k}`,
        why: `Сначала выносим общий множитель в числителе: ${p}x + ${p * k} = ${p}(x + ${k}). Теперь ${p} сокращается со знаменателем, остаётся x + ${k}.`
    };
}

function genDiffSquares() {
    const n = rand(3, 9);

    const correct = { num: `a + ${n}`, den: `a − ${n}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `a + ${n}`, den: `a + ${n}` }, correct: false },
        { value: { num: `a − ${n}`, den: `a + ${n}` }, correct: false },
        { value: `a + ${n}`, correct: false }
    ]);

    return {
        kind: "diffsquares",
        taskValue: { num: `a² − ${n * n}`, den: `a² − ${2 * n}a + ${n * n}` },
        correctValue: correct,
        options,
        signature: `diffsquares:${n}`,
        why: `Числитель — разность квадратов: a²−${n * n} = (a−${n})(a+${n}). Знаменатель — квадрат разности: a²−${2 * n}a+${n * n} = (a−${n})². Один множитель (a−${n}) сокращается, остаётся (a+${n})/(a−${n}).`
    };
}

const GENERATORS = {
    numeric: genNumeric,
    monomial: genMonomial,
    visible: genVisible,
    factorout: genFactorout,
    diffsquares: genDiffSquares
};

function generateTask() {

    const levelKey = getLevelForRound(roundNumber);
    const cfg = LEVELS[levelKey];

    let result;
    let attempts = 0;

    do {
        const kind = pick(cfg.kinds);
        result = GENERATORS[kind]();
        attempts++;
    } while (
        attempts < 20 &&
        (!optionsAreUnique(result.options) || (lastParams && lastParams === result.signature))
    );

    lastParams = result.signature;
    currentTask = result;

    return { ...result, levelLabel: cfg.label };
}

// =====================
// DOM
// =====================
const loginScreen = document.getElementById("loginScreen");
const gameScreen = document.getElementById("gameScreen");
const startBtn = document.getElementById("startBtn");
const nameInput = document.getElementById("studentName");

const livesEl = document.getElementById("lives");
const statsEl = document.getElementById("stats");
const levelTagEl = document.getElementById("levelTag");
const taskDisplayEl = document.getElementById("taskDisplay");
const optionsEl = document.getElementById("options");

const resultScreen = document.getElementById("resultScreen");
const resultEmoji = document.getElementById("resultEmoji");
const resultMessage = document.getElementById("resultMessage");
const resultScore = document.getElementById("resultScore");
const playAgainBtn = document.getElementById("playAgainBtn");
const reviewMistakesBtn = document.getElementById("reviewMistakesBtn");

const mistakesScreen = document.getElementById("mistakesScreen");
const mistakesList = document.getElementById("mistakesList");
const backToResultBtn = document.getElementById("backToResultBtn");
const playAgainBtn2 = document.getElementById("playAgainBtn2");

// =====================
// СТАРТ
// =====================
startBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) {
        nameInput.focus();
        return;
    }
    studentName = name;
    loginScreen.style.display = "none";
    gameScreen.style.display = "block";
    resetGame();
});

nameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") startBtn.click();
});

function resetGame() {
    score = 0;
    lives = START_LIVES;
    roundNumber = 0;
    mistakes = [];
    lastParams = null;
    newRound();
}

function updateUI() {
    livesEl.textContent = "❤️".repeat(Math.max(lives, 0)) + "🖤".repeat(START_LIVES - Math.max(lives, 0));
    statsEl.textContent = `${score} / ${TOTAL_ROUNDS}`;
}

function newRound() {

    if (lives <= 0) {
        endGame("lose");
        return;
    }

    if (roundNumber >= TOTAL_ROUNDS) {
        endGame("win");
        return;
    }

    roundNumber++;
    locked = false;
    updateUI();

    const task = generateTask();
    levelTagEl.textContent = task.levelLabel + " уровень";

    taskDisplayEl.innerHTML = valueToHTML(task.taskValue);

    optionsEl.innerHTML = "";
    task.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("option-btn");
        btn.innerHTML = valueToHTML(opt.value);
        btn.addEventListener("click", () => handleAnswer(opt, btn));
        optionsEl.appendChild(btn);
    });
}

function handleAnswer(opt, btn) {

    if (locked) return;
    locked = true;

    const allBtns = optionsEl.querySelectorAll(".option-btn");
    allBtns.forEach(b => b.disabled = true);

    if (opt.correct) {

        btn.classList.add("correct");
        score++;

    } else {

        btn.classList.add("wrong");

        allBtns.forEach((b, i) => {
            if (currentTask.options[i].correct) b.classList.add("correct");
        });

        lives--;

        mistakes.push({
            task: valueToText(currentTask.taskValue),
            studentAnswer: valueToText(opt.value),
            correctAnswer: valueToText(currentTask.correctValue),
            why: currentTask.why
        });
    }

    updateUI();

    setTimeout(newRound, 1000);
}

// =====================
// РЕАКЦИИ ПО СЧЁТУ (эмодзи + подпись)
// =====================
const REACTIONS = [
    { min: 15, max: 15, emoji: "😎", text: name => `Имба! Легенда школы!` },
    { min: 13, max: 14, emoji: "👑", text: name => `+10000 к ауре!` },
    { min: 10, max: 12, emoji: "🤓", text: name => `Ну норм, ${name}. Не Эйнштейн, но и не трагедия` },
    { min: 7,  max: 9,  emoji: "😿", text: name => `Ну... бывает. Нажимай «Попробовать ещё раз»` },
    { min: 4,  max: 6,  emoji: "🙀", text: name => `Всё пропало, ${name}! Мы провалим все контрольные!` },
    { min: 0,  max: 3,  emoji: "💀", text: name => `${name}, это кринж. Зовите директора!` }
];

function getReaction(finalScore) {
    return REACTIONS.find(r => finalScore >= r.min && finalScore <= r.max) || REACTIONS[REACTIONS.length - 1];
}

function endGame(status) {

    sendResult(status);

    const reaction = getReaction(score);

    resultEmoji.textContent = reaction.emoji;
    resultMessage.textContent = reaction.text(studentName);
    resultScore.textContent = `Результат: ${score} / ${TOTAL_ROUNDS}`;

    reviewMistakesBtn.style.display = mistakes.length > 0 ? "inline-block" : "none";

    gameScreen.style.display = "none";
    resultScreen.style.display = "flex";
}

function goToLogin() {
    mistakesScreen.style.display = "none";
    resultScreen.style.display = "none";
    loginScreen.style.display = "flex";
    nameInput.value = "";
}

playAgainBtn.addEventListener("click", goToLogin);
playAgainBtn2.addEventListener("click", goToLogin);

reviewMistakesBtn.addEventListener("click", () => {
    renderMistakes();
    resultScreen.style.display = "none";
    mistakesScreen.style.display = "flex";
});

backToResultBtn.addEventListener("click", () => {
    mistakesScreen.style.display = "none";
    resultScreen.style.display = "flex";
});

function renderMistakes() {

    mistakesList.innerHTML = "";

    mistakes.forEach((m, i) => {

        const card = document.createElement("div");
        card.classList.add("mistake-item");

        card.innerHTML = `
            <div class="mistake-task">Ошибка ${i + 1}: ${m.task}</div>
            <div class="mistake-your">Ваш ответ: ${m.studentAnswer}</div>
            <div class="mistake-correct">Правильный ответ: ${m.correctAnswer}</div>
            <div style="margin-top:10px; font-size:15px; color:#555; background:#eef6ff; border-radius:10px; padding:10px 14px;">${m.why}</div>
        `;

        mistakesList.appendChild(card);
    });
}

// =====================
// ОТПРАВКА РЕЗУЛЬТАТА НА СЕРВЕР
// =====================
function sendResult(status) {
    fetch("https://script.google.com/macros/s/AKfycbzW3CPziLkHUCvFAq1WsVX5Mh_WTViiM_Xj8MINOzUeOb2ba6cP2bQYz0RKLERh2A/exec", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: studentName,
            score: score,
            roundsCompleted: roundNumber,
            status: status,
            topic: "reduce-fractions"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
