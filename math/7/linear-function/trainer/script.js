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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["identifySlopeAndIntercept", "compareSteepness", "identifySpecialCase", "matchGraphDescriptionToFormula"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["findKFromTwoPoints", "findBFromKAndPoint", "findFormulaFromTwoPoints", "parallelLinesIdentify"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["identifyNotLinearFunction", "findFormulaFromPointAndSlope", "conceptCheckWhatKMeans", "conceptCheckSpecialCases"] }
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

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = rand(0, i);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function nonZeroRand(min, max) {
    let n;
    do { n = rand(min, max); } while (n === 0);
    return n;
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

function optionsAreUnique(options) {
    const seen = new Set();
    for (const o of options) {
        const key = valueKey(o.value);
        if (seen.has(key)) return false;
        seen.add(key);
    }
    return true;
}

function numStr(n) {
    return n < 0 ? `−${Math.abs(n)}` : `${n}`;
}

// ax + b (без "= 0"/сравнения)
function linExprStr(a, b) {
    let s = a === 1 ? "x" : a === -1 ? "−x" : `${numStr(a)}x`;
    if (b !== 0) s += ` ${b > 0 ? "+" : "−"} ${Math.abs(b)}`;
    return s;
}

const SPECIAL_CASE_POOL = ["Горизонтальная прямая", "Проходит через начало координат", "Обычная наклонная прямая, не через начало координат"];

const K_MEANING_POOL = [
    "k показывает наклон прямой: чем больше |k|, тем круче прямая; знак k определяет направление",
    "k всегда равен точке пересечения с осью x",
    "k влияет только на вертикальное положение прямой, а не на наклон",
    "k — это всегда целое положительное число"
];

const SPECIAL_CASES_CONCEPT_POOL = [
    "При k=0 график — горизонтальная прямая; при b=0 график проходит через начало координат",
    "При k=0 график — вертикальная прямая; при b=0 график — горизонтальная прямая",
    "Значения k и b никак не влияют на форму графика",
    "При k=0 функция перестаёт существовать"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// y=kx+b -> назвать k или b
function genIdentifySlopeAndIntercept() {
    const k = nonZeroRand(-9, 9);
    const b = rand(-9, 9);
    const askK = pick([true, false]);
    const correct = numStr(askK ? k : b);

    const other = numStr(askK ? b : k);
    const d2 = numStr((askK ? k : b) + 1);
    const d3 = numStr(-(askK ? k : b));

    const vals = new Set([correct, other, d2, d3]);
    if (vals.size !== 4) return genIdentifySlopeAndIntercept();

    const options = shuffle([
        { value: correct, correct: true },
        { value: other, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "identifySlopeAndIntercept",
        taskHTML: `<p class="task-question">y = ${linExprStr(k, b)}<br>Назовите ${askK ? "коэффициент наклона k" : "коэффициент b"}.</p>`,
        correctValue: correct,
        options,
        signature: `identifySlopeAndIntercept:${k}:${b}:${askK}`,
        why: askK ? `Коэффициент наклона — число перед x: k = ${correct}.` : `b — свободный член формулы: b = ${correct}.`
    };
}

// две функции -> какая прямая круче
function genCompareSteepness() {
    const k1 = nonZeroRand(-9, 9);
    let k2 = nonZeroRand(-9, 9);
    if (Math.abs(k1) === Math.abs(k2)) return genCompareSteepness();
    const b1 = rand(-9, 9), b2 = rand(-9, 9);
    const correct = Math.abs(k1) > Math.abs(k2) ? "Первая (y₁)" : "Вторая (y₂)";

    const options = shuffle([
        { value: correct, correct: true },
        { value: correct === "Первая (y₁)" ? "Вторая (y₂)" : "Первая (y₁)", correct: false }
    ]);

    return {
        kind: "compareSteepness",
        taskHTML: `<p class="task-question">y₁ = ${linExprStr(k1, b1)}<br>y₂ = ${linExprStr(k2, b2)}<br>Какая прямая круче (сильнее наклонена)?</p>`,
        correctValue: correct,
        options,
        signature: `compareSteepness:${k1}:${k2}`,
        why: `Чем больше |k|, тем круче прямая: |${numStr(k1)}| ${Math.abs(k1) > Math.abs(k2) ? ">" : "<"} |${numStr(k2)}|, значит ${correct.toLowerCase()} круче.`
    };
}

// y=kx+b (обычный/k=0/b=0) -> классифицировать
function genIdentifySpecialCase() {
    const caseType = pick(["k0", "b0", "general"]);
    let k, b, correct;
    if (caseType === "k0") { k = 0; b = nonZeroRand(-9, 9); correct = SPECIAL_CASE_POOL[0]; }
    else if (caseType === "b0") { k = nonZeroRand(-9, 9); b = 0; correct = SPECIAL_CASE_POOL[1]; }
    else { k = nonZeroRand(-9, 9); b = nonZeroRand(-9, 9); correct = SPECIAL_CASE_POOL[2]; }

    const options = shuffle(SPECIAL_CASE_POOL.map(v => ({ value: v, correct: v === correct })));

    return {
        kind: "identifySpecialCase",
        taskHTML: `<p class="task-question">y = ${linExprStr(k, b)}<br>Что можно сказать про эту прямую?</p>`,
        correctValue: correct,
        options,
        signature: `identifySpecialCase:${k}:${b}`,
        why: caseType === "k0" ? `k = 0, значит y всегда равно ${numStr(b)} — горизонтальная прямая.`
            : caseType === "b0" ? `b = 0, значит при x=0 получаем y=0 — прямая проходит через начало координат.`
            : `k ≠ 0 и b ≠ 0 — обычная наклонная прямая, не проходящая через начало координат.`
    };
}

// словесное описание графика -> выбрать формулу
function genMatchGraphDescriptionToFormula() {
    const b = nonZeroRand(-9, 9);
    const correct = `y = ${numStr(b)}`;
    const taskDesc = `Горизонтальная прямая, проходящая через точку (0; ${numStr(b)})`;

    const d1 = `x = ${numStr(b)}`;
    const d2 = `y = ${numStr(b)}x`;
    const d3 = `y = ${linExprStr(1, b)}`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genMatchGraphDescriptionToFormula();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "matchGraphDescriptionToFormula",
        taskHTML: `<p class="task-question">${taskDesc}<br>Какая формула соответствует этому описанию?</p>`,
        correctValue: correct,
        options,
        signature: `matchGraphDescriptionToFormula:${b}`,
        why: `Горизонтальная прямая через (0; ${numStr(b)}) — это y = ${numStr(b)} (k=0).`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// даны 2 точки -> найти k
function genFindKFromTwoPoints() {
    const k = nonZeroRand(-9, 9);
    const b = rand(-9, 9);
    const x1 = rand(-9, 9);
    let x2 = rand(-9, 9);
    if (x2 === x1) return genFindKFromTwoPoints();
    const y1 = k * x1 + b, y2 = k * x2 + b;
    const correct = numStr(k);

    const d1 = numStr(-k);
    const d2 = numStr(y2 - y1);
    const d3 = numStr(k + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindKFromTwoPoints();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findKFromTwoPoints",
        taskHTML: `<p class="task-question">Прямая проходит через точки (${numStr(x1)}; ${numStr(y1)}) и (${numStr(x2)}; ${numStr(y2)})<br>Найдите коэффициент наклона k.</p>`,
        correctValue: correct,
        options,
        signature: `findKFromTwoPoints:${k}:${b}:${x1}:${x2}`,
        why: `k = (y₂ − y₁) / (x₂ − x₁) = (${numStr(y2)} − (${numStr(y1)})) / (${numStr(x2)} − (${numStr(x1)})) = ${numStr(y2 - y1)} / ${numStr(x2 - x1)} = ${correct}.`
    };
}

// дано k и точка -> найти b
function genFindBFromKAndPoint() {
    const k = nonZeroRand(-9, 9);
    const x0 = rand(-9, 9);
    const b = rand(-9, 9);
    const y0 = k * x0 + b;
    const correct = numStr(b);

    const d1 = numStr(-b);
    const d2 = numStr(y0);
    const d3 = numStr(b + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindBFromKAndPoint();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findBFromKAndPoint",
        taskHTML: `<p class="task-question">y = ${numStr(k)}x + b. Прямая проходит через точку (${numStr(x0)}; ${numStr(y0)}).<br>Найдите b.</p>`,
        correctValue: correct,
        options,
        signature: `findBFromKAndPoint:${k}:${x0}:${b}`,
        why: `${numStr(y0)} = ${numStr(k)} · ${numStr(x0)} + b, значит b = ${numStr(y0)} − (${numStr(k * x0)}) = ${correct}.`
    };
}

// даны 2 точки -> найти полную формулу
function genFindFormulaFromTwoPoints() {
    const k = nonZeroRand(-9, 9);
    const b = rand(-9, 9);
    const x1 = rand(-9, 9);
    let x2 = rand(-9, 9);
    if (x2 === x1) return genFindFormulaFromTwoPoints();
    const y1 = k * x1 + b, y2 = k * x2 + b;
    const correct = `y = ${linExprStr(k, b)}`;

    const d1 = `y = ${linExprStr(-k, b)}`;
    const d2 = `y = ${linExprStr(k, -b)}`;
    const d3 = `y = ${linExprStr(k, b + 1)}`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindFormulaFromTwoPoints();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findFormulaFromTwoPoints",
        taskHTML: `<p class="task-question">Прямая проходит через точки (${numStr(x1)}; ${numStr(y1)}) и (${numStr(x2)}; ${numStr(y2)})<br>Найдите формулу этой линейной функции.</p>`,
        correctValue: correct,
        options,
        signature: `findFormulaFromTwoPoints:${k}:${b}:${x1}:${x2}`,
        why: `k = (${numStr(y2)} − (${numStr(y1)})) / (${numStr(x2)} − (${numStr(x1)})) = ${numStr(k)}. b = ${numStr(y1)} − ${numStr(k)} · ${numStr(x1)} = ${numStr(b)}. Формула: ${correct}.`
    };
}

// две функции -> параллельны их графики или нет
function genParallelLinesIdentify() {
    const k1 = nonZeroRand(-9, 9);
    const areParallel = pick([true, false]);
    const b1 = rand(-9, 9);
    let k2, b2;
    if (areParallel) {
        k2 = k1;
        do { b2 = rand(-9, 9); } while (b2 === b1);
    } else {
        do { k2 = nonZeroRand(-9, 9); } while (k2 === k1);
        b2 = rand(-9, 9);
    }
    const correct = areParallel ? "Да, параллельны" : "Нет, не параллельны";

    const options = shuffle([
        { value: correct, correct: true },
        { value: areParallel ? "Нет, не параллельны" : "Да, параллельны", correct: false }
    ]);

    return {
        kind: "parallelLinesIdentify",
        taskHTML: `<p class="task-question">y₁ = ${linExprStr(k1, b1)}<br>y₂ = ${linExprStr(k2, b2)}<br>Эти прямые параллельны?</p>`,
        correctValue: correct,
        options,
        signature: `parallelLinesIdentify:${k1}:${b1}:${k2}:${b2}`,
        why: areParallel
            ? `Коэффициенты наклона одинаковые (k=${numStr(k1)}), значит прямые параллельны.`
            : `Коэффициенты наклона разные (${numStr(k1)} и ${numStr(k2)}), значит прямые не параллельны.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// 4 формулы, найти нелинейную
function genIdentifyNotLinearFunction() {
    const k1 = nonZeroRand(-9, 9), b1 = rand(-9, 9);
    const k2 = nonZeroRand(-9, 9), b2 = rand(-9, 9);
    const k3 = nonZeroRand(-9, 9), b3 = rand(-9, 9);
    const fakeType = pick(["hyperbola", "quadratic"]);
    const fakeN = rand(2, 9);
    const fakeC = rand(1, 9);
    const fakeStr = fakeType === "hyperbola" ? `y = ${fakeN} ÷ x` : `y = x² ${fakeC >= 5 ? "+" : "−"} ${fakeC}`;

    const linear1 = `y = ${linExprStr(k1, b1)}`;
    const linear2 = `y = ${linExprStr(k2, b2)}`;
    const linear3 = `y = ${linExprStr(k3, b3)}`;
    const vals = new Set([linear1, linear2, linear3, fakeStr]);
    if (vals.size !== 4) return genIdentifyNotLinearFunction();

    const options = shuffle([
        { value: `y = ${linExprStr(k1, b1)}`, correct: false },
        { value: `y = ${linExprStr(k2, b2)}`, correct: false },
        { value: `y = ${linExprStr(k3, b3)}`, correct: false },
        { value: fakeStr, correct: true }
    ]);

    return {
        kind: "identifyNotLinearFunction",
        taskHTML: `<p class="task-question">Какая из этих функций НЕ является линейной?</p>`,
        correctValue: fakeStr,
        options,
        signature: `identifyNotLinearFunction:${fakeType}:${fakeN}:${fakeC}`,
        why: fakeType === "hyperbola"
            ? `В формуле ${fakeStr} переменная x стоит в знаменателе — это не линейная функция (гипербола).`
            : `В формуле ${fakeStr} переменная x во второй степени — это не линейная функция (квадратичная).`
    };
}

// дано k и точка (не y-пересечение) -> найти полную формулу
function genFindFormulaFromPointAndSlope() {
    const k = nonZeroRand(-9, 9);
    const x0 = nonZeroRand(-9, 9);
    const b = rand(-9, 9);
    const y0 = k * x0 + b;
    const correct = `y = ${linExprStr(k, b)}`;

    const d1 = `y = ${linExprStr(-k, b)}`;
    const d2 = `y = ${linExprStr(k, -b)}`;
    const d3 = `y = ${linExprStr(k, y0)}`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindFormulaFromPointAndSlope();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findFormulaFromPointAndSlope",
        taskHTML: `<p class="task-question">Коэффициент наклона k = ${numStr(k)}. Прямая проходит через точку (${numStr(x0)}; ${numStr(y0)}).<br>Найдите формулу.</p>`,
        correctValue: correct,
        options,
        signature: `findFormulaFromPointAndSlope:${k}:${x0}:${b}`,
        why: `b = y₀ − k·x₀ = ${numStr(y0)} − ${numStr(k)} · ${numStr(x0)} = ${numStr(b)}. Формула: ${correct}.`
    };
}

// концептуальный вопрос про смысл k
function genConceptCheckWhatKMeans() {
    const correct = K_MEANING_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: K_MEANING_POOL[1], correct: false },
        { value: K_MEANING_POOL[2], correct: false },
        { value: K_MEANING_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptCheckWhatKMeans",
        taskHTML: `<p class="task-question">Что означает коэффициент k в формуле y = kx + b?</p>`,
        correctValue: correct,
        options,
        signature: `conceptCheckWhatKMeans`,
        why: `k — коэффициент наклона: чем больше |k|, тем круче прямая, а знак k определяет направление.`
    };
}

// концептуальный вопрос про частные случаи
function genConceptCheckSpecialCases() {
    const correct = SPECIAL_CASES_CONCEPT_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: SPECIAL_CASES_CONCEPT_POOL[1], correct: false },
        { value: SPECIAL_CASES_CONCEPT_POOL[2], correct: false },
        { value: SPECIAL_CASES_CONCEPT_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptCheckSpecialCases",
        taskHTML: `<p class="task-question">Что происходит с графиком линейной функции y = kx + b в частных случаях k=0 и b=0?</p>`,
        correctValue: correct,
        options,
        signature: `conceptCheckSpecialCases`,
        why: `При k=0 график — горизонтальная прямая y=b; при b=0 график проходит через начало координат.`
    };
}

const GENERATORS = {
    identifySlopeAndIntercept: genIdentifySlopeAndIntercept,
    compareSteepness: genCompareSteepness,
    identifySpecialCase: genIdentifySpecialCase,
    matchGraphDescriptionToFormula: genMatchGraphDescriptionToFormula,
    findKFromTwoPoints: genFindKFromTwoPoints,
    findBFromKAndPoint: genFindBFromKAndPoint,
    findFormulaFromTwoPoints: genFindFormulaFromTwoPoints,
    parallelLinesIdentify: genParallelLinesIdentify,
    identifyNotLinearFunction: genIdentifyNotLinearFunction,
    findFormulaFromPointAndSlope: genFindFormulaFromPointAndSlope,
    conceptCheckWhatKMeans: genConceptCheckWhatKMeans,
    conceptCheckSpecialCases: genConceptCheckSpecialCases
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

    taskDisplayEl.innerHTML = task.taskHTML;

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
            taskHTML: currentTask.taskHTML,
            studentHTML: valueToHTML(opt.value),
            correctHTML: valueToHTML(currentTask.correctValue),
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
            <div class="mistake-num">Ошибка ${i + 1}</div>
            <div class="mistake-task">Задание: ${m.taskHTML}</div>
            <div class="mistake-your">Ваш ответ: ${m.studentHTML}</div>
            <div class="mistake-correct">Правильный ответ: ${m.correctHTML}</div>
            <div class="mistake-why">${m.why}</div>
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
            topic: "linear-function"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
