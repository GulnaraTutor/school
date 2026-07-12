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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["findDFromSequence", "findNextTerm", "findQFromSequence", "findNextTermGeometric"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["arithmeticNthTerm", "geometricNthTerm", "arithmeticNeighborProperty", "arithmeticSumSimple"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["geometricSumSimple", "arithmeticFindD", "geometricFindQ", "wordProblemArithmeticOrGeometric"] }
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

function numStr(n) {
    return n < 0 ? `−${Math.abs(n)}` : `${n}`;
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

const SUBSCRIPTS = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const SUPERSCRIPTS = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

// aₙ — подстрочный индекс номера члена
function sub(n) {
    return String(n).split("").map(d => SUBSCRIPTS[d]).join("");
}

// qⁿ — надстрочный показатель степени
function sup(n) {
    return String(n).split("").map(d => SUPERSCRIPTS[d]).join("");
}

// оборачивает отрицательное число в скобки — чтобы не читалось как "5 + −3" или "−3²"
function pn(n) {
    return n < 0 ? `(${numStr(n)})` : `${numStr(n)}`;
}

// строит "5 + 10 − 3" из [5, 10, -3] — правильные знаки, без "+ −"
function sumExprStr(nums) {
    let s = numStr(nums[0]);
    for (let i = 1; i < nums.length; i++) {
        s += nums[i] < 0 ? ` − ${Math.abs(nums[i])}` : ` + ${nums[i]}`;
    }
    return s;
}

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// a₁, a₂ -> найти d
function genFindDFromSequence() {
    const a1 = rand(-9, 9);
    const d = nonZeroRand(-9, 9);
    const a2 = a1 + d;
    const correct = numStr(d);

    const vals = new Set([correct, numStr(a2), numStr(-d), numStr(d + 1)]);
    if (vals.size !== 4) return genFindDFromSequence();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(a2), correct: false },
        { value: numStr(-d), correct: false },
        { value: numStr(d + 1), correct: false }
    ]);

    return {
        kind: "findDFromSequence",
        taskHTML: `<p class="task-question">a₁ = ${numStr(a1)}, a₂ = ${numStr(a2)}<br>Найдите разность прогрессии d.</p>`,
        correctValue: correct,
        options,
        signature: `findDFromSequence:${a1}:${d}`,
        why: `d = a₂ − a₁ = ${numStr(a2)} − ${pn(a1)} = ${correct}.`
    };
}

// aₙ, d -> найти aₙ₊₁
function genFindNextTerm() {
    const an = rand(-9, 9);
    const d = nonZeroRand(-9, 9);
    const correct = numStr(an + d);

    const vals = new Set([correct, numStr(an - d), numStr(an), numStr(an + d + 1)]);
    if (vals.size !== 4) return genFindNextTerm();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(an - d), correct: false },
        { value: numStr(an), correct: false },
        { value: numStr(an + d + 1), correct: false }
    ]);

    return {
        kind: "findNextTerm",
        taskHTML: `<p class="task-question">aₙ = ${numStr(an)}, d = ${numStr(d)}<br>Найдите aₙ₊₁.</p>`,
        correctValue: correct,
        options,
        signature: `findNextTerm:${an}:${d}`,
        why: `aₙ₊₁ = aₙ + d = ${numStr(an)} + ${pn(d)} = ${correct}.`
    };
}

// b₁, b₂ -> найти q
function genFindQFromSequence() {
    const b1 = nonZeroRand(-9, 9);
    let q;
    do { q = nonZeroRand(-5, 5); } while (Math.abs(q) === 1);
    const b2 = b1 * q;
    const correct = numStr(q);

    const vals = new Set([correct, numStr(b2), numStr(-q), numStr(q + 1)]);
    if (vals.size !== 4) return genFindQFromSequence();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(b2), correct: false },
        { value: numStr(-q), correct: false },
        { value: numStr(q + 1), correct: false }
    ]);

    return {
        kind: "findQFromSequence",
        taskHTML: `<p class="task-question">b₁ = ${numStr(b1)}, b₂ = ${numStr(b2)}<br>Найдите знаменатель прогрессии q.</p>`,
        correctValue: correct,
        options,
        signature: `findQFromSequence:${b1}:${q}`,
        why: `q = b₂ / b₁ = ${numStr(b2)} / ${pn(b1)} = ${correct}.`
    };
}

// bₙ, q -> найти bₙ₊₁
function genFindNextTermGeometric() {
    const bn = nonZeroRand(-9, 9);
    let q;
    do { q = nonZeroRand(-5, 5); } while (Math.abs(q) === 1);
    const correct = numStr(bn * q);

    const vals = new Set([correct, numStr(bn), numStr(bn + q), numStr(-bn * q)]);
    if (vals.size !== 4) return genFindNextTermGeometric();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(bn), correct: false },
        { value: numStr(bn + q), correct: false },
        { value: numStr(-bn * q), correct: false }
    ]);

    return {
        kind: "findNextTermGeometric",
        taskHTML: `<p class="task-question">bₙ = ${numStr(bn)}, q = ${numStr(q)}<br>Найдите bₙ₊₁.</p>`,
        correctValue: correct,
        options,
        signature: `findNextTermGeometric:${bn}:${q}`,
        why: `bₙ₊₁ = bₙ · q = ${numStr(bn)} · ${pn(q)} = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// a₁, d, n -> вычислить aₙ по формуле
function genArithmeticNthTerm() {
    const a1 = rand(-9, 9);
    const d = nonZeroRand(-9, 9);
    const n = rand(2, 8);
    const an = a1 + (n - 1) * d;
    const correct = numStr(an);

    const vals = new Set([correct, numStr(a1 + n * d), numStr(a1 - (n - 1) * d), numStr(an + 1)]);
    if (vals.size !== 4) return genArithmeticNthTerm();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(a1 + n * d), correct: false },
        { value: numStr(a1 - (n - 1) * d), correct: false },
        { value: numStr(an + 1), correct: false }
    ]);

    return {
        kind: "arithmeticNthTerm",
        taskHTML: `<p class="task-question">a₁ = ${numStr(a1)}, d = ${numStr(d)}<br>Найдите a${sub(n)}.</p>`,
        correctValue: correct,
        options,
        signature: `arithmeticNthTerm:${a1}:${d}:${n}`,
        why: `a${sub(n)} = a₁ + (${n} − 1)d = ${numStr(a1)} + ${n - 1} · ${pn(d)} = ${correct}.`
    };
}

// b₁, q, n -> вычислить bₙ по формуле
function genGeometricNthTerm() {
    const b1 = nonZeroRand(-6, 6);
    let q;
    do { q = nonZeroRand(-3, 3); } while (Math.abs(q) === 1);
    const n = rand(2, 4);
    const bn = b1 * Math.pow(q, n - 1);
    const correct = numStr(bn);

    const vals = new Set([correct, numStr(b1 * Math.pow(q, n)), numStr(b1 * (n - 1) * q), numStr(bn + 1)]);
    if (vals.size !== 4) return genGeometricNthTerm();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(b1 * Math.pow(q, n)), correct: false },
        { value: numStr(b1 * (n - 1) * q), correct: false },
        { value: numStr(bn + 1), correct: false }
    ]);

    return {
        kind: "geometricNthTerm",
        taskHTML: `<p class="task-question">b₁ = ${numStr(b1)}, q = ${numStr(q)}<br>Найдите b${sub(n)}.</p>`,
        correctValue: correct,
        options,
        signature: `geometricNthTerm:${b1}:${q}:${n}`,
        why: `b${sub(n)} = b₁ · q${sup(n - 1)} = ${numStr(b1)} · ${pn(q)}${sup(n - 1)} = ${correct}.`
    };
}

// aₖ₋₁, aₖ₊₁ -> найти aₖ (среднее арифметическое)
function genArithmeticNeighborProperty() {
    const ak = rand(-9, 9);
    const d = nonZeroRand(-9, 9);
    const prev = ak - d, next = ak + d;
    const correct = numStr(ak);

    const vals = new Set([correct, numStr(prev), numStr(next), numStr(prev + next)]);
    if (vals.size !== 4) return genArithmeticNeighborProperty();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(prev), correct: false },
        { value: numStr(next), correct: false },
        { value: numStr(prev + next), correct: false }
    ]);

    return {
        kind: "arithmeticNeighborProperty",
        taskHTML: `<p class="task-question">aₖ₋₁ = ${numStr(prev)}, aₖ₊₁ = ${numStr(next)}<br>Найдите aₖ.</p>`,
        correctValue: correct,
        options,
        signature: `arithmeticNeighborProperty:${ak}:${d}`,
        why: `aₖ = (aₖ₋₁ + aₖ₊₁) / 2 = (${numStr(prev)} + ${pn(next)}) / 2 = ${correct}.`
    };
}

// a₁, d, n -> вычислить Sₙ
function genArithmeticSumSimple() {
    const a1 = rand(-9, 9);
    const d = nonZeroRand(-9, 9);
    const n = rand(2, 6);
    const an = a1 + (n - 1) * d;
    const sn = n * (a1 + an) / 2;
    const correct = numStr(sn);

    const vals = new Set([correct, numStr(n * (a1 + an)), numStr(sn + d), numStr((a1 + an) / 2)]);
    if (vals.size !== 4) return genArithmeticSumSimple();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(n * (a1 + an)), correct: false },
        { value: numStr(sn + d), correct: false },
        { value: numStr((a1 + an) / 2), correct: false }
    ]);

    return {
        kind: "arithmeticSumSimple",
        taskHTML: `<p class="task-question">a₁ = ${numStr(a1)}, d = ${numStr(d)}, n = ${n}<br>Найдите S${sub(n)}.</p>`,
        correctValue: correct,
        options,
        signature: `arithmeticSumSimple:${a1}:${d}:${n}`,
        why: `a${sub(n)} = a₁ + (${n} − 1)d = ${numStr(a1)} + ${n - 1} · ${pn(d)} = ${numStr(an)}. S${sub(n)} = (a₁ + a${sub(n)}) / 2 · ${n} = (${numStr(a1)} + ${pn(an)}) / 2 · ${n} = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// b₁, q, n -> вычислить Sₙ прямым суммированием
function genGeometricSumSimple() {
    const b1 = nonZeroRand(-6, 6);
    let q;
    do { q = nonZeroRand(-3, 3); } while (Math.abs(q) === 1);
    const n = rand(2, 4);

    let sn = 0, term = b1;
    const terms = [];
    for (let i = 0; i < n; i++) {
        terms.push(term);
        sn += term;
        term *= q;
    }
    const correct = numStr(sn);
    const lastTerm = b1 * Math.pow(q, n - 1);

    const vals = new Set([correct, numStr(sn - b1), numStr(lastTerm), numStr(sn + q)]);
    if (vals.size !== 4) return genGeometricSumSimple();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(sn - b1), correct: false },
        { value: numStr(lastTerm), correct: false },
        { value: numStr(sn + q), correct: false }
    ]);

    return {
        kind: "geometricSumSimple",
        taskHTML: `<p class="task-question">b₁ = ${numStr(b1)}, q = ${numStr(q)}, n = ${n}<br>Найдите S${sub(n)}.</p>`,
        correctValue: correct,
        options,
        signature: `geometricSumSimple:${b1}:${q}:${n}`,
        why: `S${sub(n)} = ${sumExprStr(terms)} = ${correct}.`
    };
}

// a₁, aₙ (n известно) -> найти d
function genArithmeticFindD() {
    const a1 = rand(-9, 9);
    const d = nonZeroRand(-9, 9);
    const n = rand(2, 8);
    const an = a1 + (n - 1) * d;
    const correct = numStr(d);

    const vals = new Set([correct, numStr(an - a1), numStr(-d), numStr(d + 1)]);
    if (vals.size !== 4) return genArithmeticFindD();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(an - a1), correct: false },
        { value: numStr(-d), correct: false },
        { value: numStr(d + 1), correct: false }
    ]);

    return {
        kind: "arithmeticFindD",
        taskHTML: `<p class="task-question">a₁ = ${numStr(a1)}, a${sub(n)} = ${numStr(an)}<br>Найдите разность d.</p>`,
        correctValue: correct,
        options,
        signature: `arithmeticFindD:${a1}:${d}:${n}`,
        why: `a${sub(n)} = a₁ + (n − 1)d, значит d = (a${sub(n)} − a₁) / (n − 1) = (${numStr(an)} − ${pn(a1)}) / ${n - 1} = ${correct}.`
    };
}

// b₁, bₙ (n известно, небольшое) -> найти q
function genGeometricFindQ() {
    const b1 = nonZeroRand(-6, 6);
    let q;
    do { q = nonZeroRand(-4, 4); } while (Math.abs(q) === 1);
    const n = rand(2, 3);
    const bn = b1 * Math.pow(q, n - 1);
    const correct = numStr(q);

    const vals = new Set([correct, numStr(bn - b1), numStr(-q), numStr(q + 1)]);
    if (vals.size !== 4) return genGeometricFindQ();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(bn - b1), correct: false },
        { value: numStr(-q), correct: false },
        { value: numStr(q + 1), correct: false }
    ]);

    return {
        kind: "geometricFindQ",
        taskHTML: `<p class="task-question">b₁ = ${numStr(b1)}, b${sub(n)} = ${numStr(bn)}<br>Найдите знаменатель q.</p>`,
        correctValue: correct,
        options,
        signature: `geometricFindQ:${b1}:${q}:${n}`,
        why: n === 2
            ? `b₂ = b₁ · q, значит q = b₂ / b₁ = ${numStr(bn)} / ${pn(b1)} = ${correct}.`
            : `b${sub(n)} = b₁ · q${sup(n - 1)} = ${numStr(b1)} · q${sup(n - 1)}, значит q${sup(n - 1)} = ${Math.pow(q, n - 1)}, откуда q = ${correct}.`
    };
}

// текстовая задача — арифметическая или геометрическая прогрессия (случайно)
function genWordProblemArithmeticOrGeometric() {
    const isArithmetic = pick([true, false]);

    if (isArithmetic) {
        const a1 = rand(2, 10) * 100;
        const d = rand(2, 8) * 50;
        const n = rand(3, 7);
        const an = a1 + (n - 1) * d;
        const correct = numStr(an);

        const vals = new Set([correct, numStr(a1 + n * d), numStr(a1 * n), numStr(an + d)]);
        if (vals.size !== 4) return genWordProblemArithmeticOrGeometric();

        const options = shuffle([
            { value: correct, correct: true },
            { value: numStr(a1 + n * d), correct: false },
            { value: numStr(a1 * n), correct: false },
            { value: numStr(an + d), correct: false }
        ]);

        return {
            kind: "wordProblemArithmeticOrGeometric",
            taskHTML: `<p class="task-question">Каждый месяц Аня откладывает на ${d} рублей больше, чем в предыдущий. В первый месяц она отложила ${a1} рублей. Сколько рублей она отложит в ${n}-й месяц?</p>`,
            correctValue: correct,
            options,
            signature: `wordProblemArithmeticOrGeometric:arith:${a1}:${d}:${n}`,
            why: `Это арифметическая прогрессия: a₁ = ${a1}, d = ${d}. a${sub(n)} = a₁ + (${n} − 1)d = ${a1} + ${n - 1} · ${d} = ${correct}.`
        };
    } else {
        const b1 = rand(2, 10);
        const q = rand(2, 3);
        const n = rand(3, 5);
        const bn = b1 * Math.pow(q, n - 1);
        const correct = numStr(bn);

        const vals = new Set([correct, numStr(b1 * q * n), numStr(b1 + q * (n - 1)), numStr(bn + q)]);
        if (vals.size !== 4) return genWordProblemArithmeticOrGeometric();

        const options = shuffle([
            { value: correct, correct: true },
            { value: numStr(b1 * q * n), correct: false },
            { value: numStr(b1 + q * (n - 1)), correct: false },
            { value: numStr(bn + q), correct: false }
        ]);

        return {
            kind: "wordProblemArithmeticOrGeometric",
            taskHTML: `<p class="task-question">Число подписчиков блогера каждую неделю увеличивается в ${q} раза. В первую неделю у него было ${b1} подписчиков. Сколько подписчиков будет на ${n}-й неделе?</p>`,
            correctValue: correct,
            options,
            signature: `wordProblemArithmeticOrGeometric:geom:${b1}:${q}:${n}`,
            why: `Это геометрическая прогрессия: b₁ = ${b1}, q = ${q}. b${sub(n)} = b₁ · q${sup(n - 1)} = ${b1} · ${q}${sup(n - 1)} = ${correct}.`
        };
    }
}

const GENERATORS = {
    findDFromSequence: genFindDFromSequence,
    findNextTerm: genFindNextTerm,
    findQFromSequence: genFindQFromSequence,
    findNextTermGeometric: genFindNextTermGeometric,
    arithmeticNthTerm: genArithmeticNthTerm,
    geometricNthTerm: genGeometricNthTerm,
    arithmeticNeighborProperty: genArithmeticNeighborProperty,
    arithmeticSumSimple: genArithmeticSumSimple,
    geometricSumSimple: genGeometricSumSimple,
    arithmeticFindD: genArithmeticFindD,
    geometricFindQ: genGeometricFindQ,
    wordProblemArithmeticOrGeometric: genWordProblemArithmeticOrGeometric
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
            topic: "progressions"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
