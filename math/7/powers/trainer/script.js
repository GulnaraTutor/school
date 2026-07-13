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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["computeSimplePower", "identifyBaseExponent", "signOfPower", "multiplyPowersSameBase"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["dividePowersSameBase", "powerOfPower", "powerOfProduct", "powerOfQuotient"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["combinedRulesChain", "computeWithNegativeBase", "solveExponentEquation", "conceptCheckSignRule"] }
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

const SUP_DIGITS = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

// юникод-надстрочные цифры для показателя степени (работает для любого целого n)
function sup(n) {
    return String(n).split("").map(d => SUP_DIGITS[d] || d).join("");
}

const SIGN_CONCEPT_POOL = [
    "Отрицательное число в нечётной степени остаётся отрицательным, в чётной — становится положительным",
    "Знак результата всегда совпадает со знаком основания, независимо от показателя",
    "Отрицательное число в любой степени всегда даёт отрицательный результат",
    "Знак результата зависит только от показателя степени, а не от знака основания"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// aⁿ прямое вычисление
function genComputeSimplePower() {
    const a = rand(2, 9);
    const n = rand(2, 4);
    const correct = Math.pow(a, n);

    const d1 = a * n;
    const d2 = Math.pow(a, n - 1);
    const d3 = Math.pow(a, n + 1);

    const vals = new Set([correct, d1, d2, d3].map(numStr));
    if (vals.size !== 4) return genComputeSimplePower();

    const options = shuffle([
        { value: numStr(correct), correct: true },
        { value: numStr(d1), correct: false },
        { value: numStr(d2), correct: false },
        { value: numStr(d3), correct: false }
    ]);

    return {
        kind: "computeSimplePower",
        taskHTML: `<p class="task-question">Вычислите: ${a}${sup(n)}</p>`,
        correctValue: numStr(correct),
        options,
        signature: `computeSimplePower:${a}:${n}`,
        why: `${a}${sup(n)} = ${Array(n).fill(a).join(" · ")} = ${correct}.`
    };
}

// дано aⁿ -> назвать основание или показатель
function genIdentifyBaseExponent() {
    const a = rand(2, 12);
    const n = rand(2, 6);
    const askBase = pick([true, false]);
    const correct = numStr(askBase ? a : n);

    const other = numStr(askBase ? n : a);
    const d2 = numStr((askBase ? a : n) + 1);
    const d3 = numStr(Math.pow(a, n));

    const vals = new Set([correct, other, d2, d3]);
    if (vals.size !== 4) return genIdentifyBaseExponent();

    const options = shuffle([
        { value: correct, correct: true },
        { value: other, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "identifyBaseExponent",
        taskHTML: `<p class="task-question">${a}${sup(n)}<br>Назовите ${askBase ? "основание" : "показатель"} степени.</p>`,
        correctValue: correct,
        options,
        signature: `identifyBaseExponent:${a}:${n}:${askBase}`,
        why: askBase
            ? `Основание — число, которое умножается само на себя: ${a}.`
            : `Показатель — количество множителей: ${n}.`
    };
}

// дано (−a)ⁿ -> знак результата (без вычисления величины)
function genSignOfPower() {
    const a = rand(2, 9);
    const n = rand(2, 7);
    const isEven = n % 2 === 0;
    const correct = isEven ? "Положительный" : "Отрицательный";

    const options = shuffle([
        { value: correct, correct: true },
        { value: isEven ? "Отрицательный" : "Положительный", correct: false }
    ]);

    return {
        kind: "signOfPower",
        taskHTML: `<p class="task-question">Каким будет знак результата: (−${a})${sup(n)}?</p>`,
        correctValue: correct,
        options,
        signature: `signOfPower:${a}:${n}`,
        why: `Показатель ${n} ${isEven ? "чётный" : "нечётный"}, значит результат ${correct.toLowerCase()}.`
    };
}

// aᵐ · aⁿ -> показатель результата
function genMultiplyPowersSameBase() {
    const m = rand(2, 8);
    const n = rand(2, 8);
    const correct = numStr(m + n);

    const d1 = numStr(m * n);
    const d2 = numStr(Math.abs(m - n));
    const d3 = numStr(m + n + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genMultiplyPowersSameBase();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "multiplyPowersSameBase",
        taskHTML: `<p class="task-question">aᵐ · aⁿ, где m = ${m}, n = ${n}.<br>Чему равен показатель степени результата?</p>`,
        correctValue: correct,
        options,
        signature: `multiplyPowersSameBase:${m}:${n}`,
        why: `При умножении степеней с одинаковым основанием показатели складываются: ${m} + ${n} = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// aᵐ ÷ aⁿ (m>n) -> показатель результата
function genDividePowersSameBase() {
    const n = rand(2, 6);
    const diff = rand(1, 6);
    const m = n + diff;
    const correct = numStr(m - n);

    const d1 = numStr(m + n);
    const d2 = numStr(n - m);
    const d3 = numStr(m - n + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genDividePowersSameBase();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "dividePowersSameBase",
        taskHTML: `<p class="task-question">aᵐ ÷ aⁿ, где m = ${m}, n = ${n}.<br>Чему равен показатель степени результата?</p>`,
        correctValue: correct,
        options,
        signature: `dividePowersSameBase:${m}:${n}`,
        why: `При делении степеней с одинаковым основанием показатели вычитаются: ${m} − ${n} = ${correct}.`
    };
}

// (aᵐ)ⁿ -> показатель результата
function genPowerOfPower() {
    const m = rand(2, 6);
    const n = rand(2, 5);
    const correct = numStr(m * n);

    const d1 = numStr(m + n);
    const d2 = numStr(m * n + 1);
    const d3 = numStr(Math.pow(m, n));

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genPowerOfPower();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "powerOfPower",
        taskHTML: `<p class="task-question">(aᵐ)ⁿ, где m = ${m}, n = ${n}.<br>Чему равен показатель степени результата?</p>`,
        correctValue: correct,
        options,
        signature: `powerOfPower:${m}:${n}`,
        why: `При возведении степени в степень показатели перемножаются: ${m} · ${n} = ${correct}.`
    };
}

// (a·b)ⁿ -> прямое вычисление
function genPowerOfProduct() {
    const a = rand(2, 6);
    const b = rand(2, 6);
    const n = rand(2, 3);
    const correct = Math.pow(a, n) * Math.pow(b, n);

    const d1 = Math.pow(a * b, n + 1);
    const d2 = Math.pow(a, n) + Math.pow(b, n);
    const d3 = Math.pow(a, n) * Math.pow(b, n - 1);

    const vals = new Set([correct, d1, d2, d3].map(numStr));
    if (vals.size !== 4) return genPowerOfProduct();

    const options = shuffle([
        { value: numStr(correct), correct: true },
        { value: numStr(d1), correct: false },
        { value: numStr(d2), correct: false },
        { value: numStr(d3), correct: false }
    ]);

    return {
        kind: "powerOfProduct",
        taskHTML: `<p class="task-question">(${a} · ${b})${sup(n)}<br>Вычислите значение.</p>`,
        correctValue: numStr(correct),
        options,
        signature: `powerOfProduct:${a}:${b}:${n}`,
        why: `(${a} · ${b})${sup(n)} = ${a}${sup(n)} · ${b}${sup(n)} = ${Math.pow(a, n)} · ${Math.pow(b, n)} = ${correct}.`
    };
}

// (a÷b)ⁿ -> результат дробью через .frac
function genPowerOfQuotient() {
    const a = rand(2, 9);
    const b = rand(2, 9);
    if (a === b) return genPowerOfQuotient();
    const n = rand(2, 3);
    const num = Math.pow(a, n);
    const den = Math.pow(b, n);
    const correct = { num, den };

    const d1 = { num: Math.pow(a, n + 1), den };
    const d2 = { num, den: Math.pow(b, n - 1) };
    const d3 = { num: den, den: num };

    const vals = new Set([correct, d1, d2, d3].map(valueKey));
    if (vals.size !== 4) return genPowerOfQuotient();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "powerOfQuotient",
        taskHTML: `<p class="task-question">(${a} ÷ ${b})${sup(n)}<br>Вычислите значение (дробь можно не сокращать).</p>`,
        correctValue: correct,
        options,
        signature: `powerOfQuotient:${a}:${b}:${n}`,
        why: `(${a} ÷ ${b})${sup(n)} = ${a}${sup(n)} ÷ ${b}${sup(n)} = ${num} ÷ ${den}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// aᵐ · aⁿ ÷ aᵏ -> итоговый показатель
function genCombinedRulesChain() {
    const m = rand(2, 6);
    const n = rand(2, 6);
    const k = rand(1, m + n - 1);
    const correct = numStr(m + n - k);

    const d1 = numStr(m + n + k);
    const d2 = numStr(m - n + k);
    const d3 = numStr(m + n - k + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genCombinedRulesChain();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "combinedRulesChain",
        taskHTML: `<p class="task-question">aᵐ · aⁿ ÷ aᵏ, где m = ${m}, n = ${n}, k = ${k}.<br>Чему равен показатель степени результата?</p>`,
        correctValue: correct,
        options,
        signature: `combinedRulesChain:${m}:${n}:${k}`,
        why: `Сначала складываем показатели умножения: ${m} + ${n} = ${m + n}. Потом вычитаем показатель деления: ${m + n} − ${k} = ${correct}.`
    };
}

// (−a)ⁿ полное вычисление с правильным знаком
function genComputeWithNegativeBase() {
    const a = rand(2, 6);
    const n = rand(2, 5);
    const magnitude = Math.pow(a, n);
    const isEven = n % 2 === 0;
    const correct = isEven ? magnitude : -magnitude;

    const d1 = isEven ? -magnitude : magnitude;
    const d2 = magnitude + a;
    const d3 = -(magnitude + a);

    const vals = new Set([correct, d1, d2, d3].map(numStr));
    if (vals.size !== 4) return genComputeWithNegativeBase();

    const options = shuffle([
        { value: numStr(correct), correct: true },
        { value: numStr(d1), correct: false },
        { value: numStr(d2), correct: false },
        { value: numStr(d3), correct: false }
    ]);

    return {
        kind: "computeWithNegativeBase",
        taskHTML: `<p class="task-question">Вычислите: (−${a})${sup(n)}</p>`,
        correctValue: numStr(correct),
        options,
        signature: `computeWithNegativeBase:${a}:${n}`,
        why: `Показатель ${n} ${isEven ? "чётный" : "нечётный"}, значит результат ${isEven ? "положительный" : "отрицательный"}. ${a}${sup(n)} = ${magnitude}, значит (−${a})${sup(n)} = ${numStr(correct)}.`
    };
}

// aᵏˣ = aᵐ (k делит m нацело по построению) -> найти x
function genSolveExponentEquation() {
    const a = rand(2, 9);
    const k = rand(2, 5);
    const x0 = rand(2, 8);
    const m = k * x0;
    const correct = numStr(x0);

    const d1 = numStr(m);
    const d2 = numStr(x0 + 1);
    const d3 = numStr(k);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveExponentEquation();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveExponentEquation",
        taskHTML: `<p class="task-question">${a}${sup(k)}ˣ = ${a}${sup(m)}<br>Найдите x.</p>`,
        correctValue: correct,
        options,
        signature: `solveExponentEquation:${a}:${k}:${x0}:${m}`,
        why: `Основания одинаковые, значит показатели равны: ${k}x = ${m}, откуда x = ${m} ÷ ${k} = ${correct}.`
    };
}

// концептуальный вопрос про знак степени
function genConceptCheckSignRule() {
    const correct = SIGN_CONCEPT_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: SIGN_CONCEPT_POOL[1], correct: false },
        { value: SIGN_CONCEPT_POOL[2], correct: false },
        { value: SIGN_CONCEPT_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptCheckSignRule",
        taskHTML: `<p class="task-question">Как знак основания и чётность показателя влияют на знак результата степени?</p>`,
        correctValue: correct,
        options,
        signature: `conceptCheckSignRule`,
        why: `Отрицательное основание в чётной степени даёт положительный результат (минусы попарно уничтожаются), а в нечётной — отрицательный (один минус остаётся без пары).`
    };
}

const GENERATORS = {
    computeSimplePower: genComputeSimplePower,
    identifyBaseExponent: genIdentifyBaseExponent,
    signOfPower: genSignOfPower,
    multiplyPowersSameBase: genMultiplyPowersSameBase,
    dividePowersSameBase: genDividePowersSameBase,
    powerOfPower: genPowerOfPower,
    powerOfProduct: genPowerOfProduct,
    powerOfQuotient: genPowerOfQuotient,
    combinedRulesChain: genCombinedRulesChain,
    computeWithNegativeBase: genComputeWithNegativeBase,
    solveExponentEquation: genSolveExponentEquation,
    conceptCheckSignRule: genConceptCheckSignRule
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
            topic: "powers"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
