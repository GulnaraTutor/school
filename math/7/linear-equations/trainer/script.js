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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["solveSimpleAddSubtract", "solveSimpleMultiply", "identifyOppositeOperation", "signFlipOnTransfer"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["solveTwoStepEquation", "solveVariablesBothSides", "divideWholeEquationFirst", "solveWithNegativeCoefficient"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["solveWithBracketsSimple", "solveWithBracketsBothSides", "solveWithBracketsAndCommonFactor", "conceptCheckLinearEquationAlgorithm"] }
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

const SIGN_FLIP_POOL = [
    "Знак члена меняется на противоположный",
    "Знак члена остаётся без изменений",
    "Знак меняется только у чисел, но не у членов с x",
    "Знак меняется только при переносе положительных членов"
];

const ALGORITHM_ORDER_POOL = [
    "Раскрыть скобки → перенести x в одну сторону, числа в другую → привести подобные → разделить на коэффициент при x",
    "Сначала разделить на коэффициент при x, потом раскрыть скобки",
    "Перенести числа, не раскрывая скобки, потом сразу посчитать ответ",
    "Порядок действий не важен, результат будет одинаковым при любом порядке"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// x±b=c -> найти x
function genSolveSimpleAddSubtract() {
    const x0 = rand(-9, 9);
    const b = nonZeroRand(-9, 9);
    const c = x0 + b;
    const correct = numStr(x0);

    const d1 = numStr(c + b);
    const d2 = numStr(-x0);
    const d3 = numStr(x0 + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveSimpleAddSubtract();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveSimpleAddSubtract",
        taskHTML: `<p class="task-question">x ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${numStr(c)}<br>Найдите x.</p>`,
        correctValue: correct,
        options,
        signature: `solveSimpleAddSubtract:${x0}:${b}`,
        why: `x = ${numStr(c)} ${b >= 0 ? "−" : "+"} ${Math.abs(b)} = ${correct}.`
    };
}

// kx=c -> найти x
function genSolveSimpleMultiply() {
    const x0 = nonZeroRand(-9, 9);
    const k = nonZeroRand(-9, 9);
    const c = k * x0;
    const correct = numStr(x0);

    const d1 = numStr(c + k);
    const d2 = numStr(c * k);
    const d3 = numStr(-x0);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveSimpleMultiply();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveSimpleMultiply",
        taskHTML: `<p class="task-question">${numStr(k)}x = ${numStr(c)}<br>Найдите x.</p>`,
        correctValue: correct,
        options,
        signature: `solveSimpleMultiply:${x0}:${k}`,
        why: `x = ${numStr(c)} ÷ (${numStr(k)}) = ${correct}.`
    };
}

// дано начало уравнения -> какое действие выполнить
function genIdentifyOppositeOperation() {
    const opType = pick(["add", "subtract", "multiply", "divide"]);
    const n = rand(2, 9);
    let taskExpr, correct;
    if (opType === "add") { taskExpr = `x + ${n} = …`; correct = `Вычесть ${n} из обеих частей`; }
    else if (opType === "subtract") { taskExpr = `x − ${n} = …`; correct = `Прибавить ${n} к обеим частям`; }
    else if (opType === "multiply") { taskExpr = `${n}x = …`; correct = `Разделить обе части на ${n}`; }
    else { taskExpr = `x ÷ ${n} = …`; correct = `Умножить обе части на ${n}`; }

    const allOptions = [`Вычесть ${n} из обеих частей`, `Прибавить ${n} к обеим частям`, `Разделить обе части на ${n}`, `Умножить обе части на ${n}`];
    const distractors = allOptions.filter(o => o !== correct);

    const options = shuffle([
        { value: correct, correct: true },
        ...distractors.map(v => ({ value: v, correct: false }))
    ]);

    return {
        kind: "identifyOppositeOperation",
        taskHTML: `<p class="task-question">${taskExpr}<br>Какое действие нужно выполнить над обеими частями, чтобы найти x?</p>`,
        correctValue: correct,
        options,
        signature: `identifyOppositeOperation:${opType}:${n}`,
        why: `Чтобы избавиться от действия в уравнении, выполняем обратное действие: ${correct.toLowerCase()}.`
    };
}

// концептуальный вопрос про смену знака при переносе
function genSignFlipOnTransfer() {
    const correct = SIGN_FLIP_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: SIGN_FLIP_POOL[1], correct: false },
        { value: SIGN_FLIP_POOL[2], correct: false },
        { value: SIGN_FLIP_POOL[3], correct: false }
    ]);

    return {
        kind: "signFlipOnTransfer",
        taskHTML: `<p class="task-question">Что происходит со знаком члена при переносе через знак равенства из одной части уравнения в другую?</p>`,
        correctValue: correct,
        options,
        signature: `signFlipOnTransfer`,
        why: `Перенос через знак равенства равносилен вычитанию (или прибавлению) этого члена к обеим частям, поэтому знак меняется на противоположный.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// kx±b=c -> найти x
function genSolveTwoStepEquation() {
    const x0 = rand(-9, 9);
    const k = nonZeroRand(-9, 9);
    const b = nonZeroRand(-9, 9);
    const c = k * x0 + b;
    const correct = numStr(x0);

    const d1 = numStr(c);
    const d2 = numStr(c + b);
    const d3 = numStr(x0 + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveTwoStepEquation();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveTwoStepEquation",
        taskHTML: `<p class="task-question">${numStr(k)}x ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${numStr(c)}<br>Найдите x.</p>`,
        correctValue: correct,
        options,
        signature: `solveTwoStepEquation:${x0}:${k}:${b}`,
        why: `${numStr(k)}x = ${numStr(c)} ${b >= 0 ? "−" : "+"} ${Math.abs(b)} = ${numStr(c - b)}. x = ${numStr(c - b)} ÷ (${numStr(k)}) = ${correct}.`
    };
}

// kx±b=mx±c (x в обеих частях) -> найти x
function genSolveVariablesBothSides() {
    const x0 = rand(-9, 9);
    const k = nonZeroRand(-9, 9);
    let m = nonZeroRand(-9, 9);
    if (k === m) return genSolveVariablesBothSides();
    const b = nonZeroRand(-9, 9);
    const c = (k - m) * x0 + b;
    const correct = numStr(x0);

    const d1 = numStr(-x0);
    const d2 = numStr(x0 + 1);
    const d3 = numStr(b - c);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveVariablesBothSides();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveVariablesBothSides",
        taskHTML: `<p class="task-question">${numStr(k)}x ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${numStr(m)}x ${c >= 0 ? "+" : "−"} ${Math.abs(c)}<br>Найдите x.</p>`,
        correctValue: correct,
        options,
        signature: `solveVariablesBothSides:${x0}:${k}:${m}:${b}`,
        why: `Переносим x в одну сторону, числа — в другую: (${numStr(k)} − (${numStr(m)}))x = ${numStr(c)} − (${numStr(b)}), то есть ${numStr(k - m)}x = ${numStr(c - b)}. x = ${correct}.`
    };
}

// уравнение, где все члены делятся на общий множитель -> сначала поделить
function genDivideWholeEquationFirst() {
    const k = rand(2, 6);
    const x0 = rand(-6, 6);
    const a = nonZeroRand(-6, 6);
    const bInner = nonZeroRand(-6, 6);
    const cInner = a * x0 + bInner;
    const correct = numStr(x0);

    const d1 = numStr(k * x0);
    const d2 = numStr(x0 + 1);
    const d3 = numStr(-x0);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genDivideWholeEquationFirst();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "divideWholeEquationFirst",
        taskHTML: `<p class="task-question">${numStr(k * a)}x ${k * bInner >= 0 ? "+" : "−"} ${Math.abs(k * bInner)} = ${numStr(k * cInner)}<br>Сначала разделите обе части на общий множитель ${k}, затем найдите x.</p>`,
        correctValue: correct,
        options,
        signature: `divideWholeEquationFirst:${k}:${x0}:${a}:${bInner}`,
        why: `Делим обе части на ${k}: ${numStr(a)}x ${bInner >= 0 ? "+" : "−"} ${Math.abs(bInner)} = ${numStr(cInner)}. Отсюда x = ${correct}.`
    };
}

// kx±b=c с отрицательным k -> найти x
function genSolveWithNegativeCoefficient() {
    const x0 = rand(-9, 9);
    const k = -rand(2, 9);
    const b = nonZeroRand(-9, 9);
    const c = k * x0 + b;
    const correct = numStr(x0);

    const d1 = numStr(-x0);
    const d2 = numStr(c - b);
    const d3 = numStr(x0 + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveWithNegativeCoefficient();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveWithNegativeCoefficient",
        taskHTML: `<p class="task-question">${numStr(k)}x ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${numStr(c)}<br>Найдите x.</p>`,
        correctValue: correct,
        options,
        signature: `solveWithNegativeCoefficient:${x0}:${k}:${b}`,
        why: `${numStr(k)}x = ${numStr(c - b)}. x = ${numStr(c - b)} ÷ (${numStr(k)}) = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// k(x±b)=c -> раскрыть скобки, найти x
function genSolveWithBracketsSimple() {
    const x0 = rand(-9, 9);
    const k = nonZeroRand(-9, 9);
    const b = nonZeroRand(-9, 9);
    const c = k * (x0 + b);
    const correct = numStr(x0);

    const d1 = numStr(c);
    const d2 = numStr(-x0);
    const d3 = numStr(x0 + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveWithBracketsSimple();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveWithBracketsSimple",
        taskHTML: `<p class="task-question">${numStr(k)}(x ${b >= 0 ? "+" : "−"} ${Math.abs(b)}) = ${numStr(c)}<br>Найдите x.</p>`,
        correctValue: correct,
        options,
        signature: `solveWithBracketsSimple:${x0}:${k}:${b}`,
        why: `Раскрываем скобки: ${numStr(k)}x ${k * b >= 0 ? "+" : "−"} ${Math.abs(k * b)} = ${numStr(c)}. Отсюда x = ${correct}.`
    };
}

// k(x±p)=mx±c -> раскрыть скобки, найти x
function genSolveWithBracketsBothSides() {
    const x0 = rand(-9, 9);
    const k = nonZeroRand(-6, 6);
    let m = nonZeroRand(-6, 6);
    if (k === m) return genSolveWithBracketsBothSides();
    const p = nonZeroRand(-6, 6);
    const c2 = k * (x0 + p) - m * x0;
    const correct = numStr(x0);

    const d1 = numStr(-x0);
    const d2 = numStr(x0 + 1);
    const d3 = numStr(p);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveWithBracketsBothSides();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveWithBracketsBothSides",
        taskHTML: `<p class="task-question">${numStr(k)}(x ${p >= 0 ? "+" : "−"} ${Math.abs(p)}) = ${numStr(m)}x ${c2 >= 0 ? "+" : "−"} ${Math.abs(c2)}<br>Найдите x.</p>`,
        correctValue: correct,
        options,
        signature: `solveWithBracketsBothSides:${x0}:${k}:${m}:${p}`,
        why: `Раскрываем скобки: ${numStr(k)}x ${k * p >= 0 ? "+" : "−"} ${Math.abs(k * p)} = ${numStr(m)}x ${c2 >= 0 ? "+" : "−"} ${Math.abs(c2)}. Переносим x в одну сторону: (${numStr(k)} − (${numStr(m)}))x = ${numStr(c2)} − (${numStr(k * p)}). x = ${correct}.`
    };
}

// ka(x±p)=kc (скобка + общий множитель) -> найти x
function genSolveWithBracketsAndCommonFactor() {
    const x0 = rand(-6, 6);
    const a = nonZeroRand(-5, 5);
    const p = nonZeroRand(-5, 5);
    const innerC = a * (x0 + p);
    const k = rand(2, 4);
    const correct = numStr(x0);

    const d1 = numStr(-x0);
    const d2 = numStr(x0 + 1);
    const d3 = numStr(k * x0);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveWithBracketsAndCommonFactor();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveWithBracketsAndCommonFactor",
        taskHTML: `<p class="task-question">${numStr(k * a)}(x ${p >= 0 ? "+" : "−"} ${Math.abs(p)}) = ${numStr(k * innerC)}<br>Сначала разделите обе части на общий множитель ${k}, затем найдите x.</p>`,
        correctValue: correct,
        options,
        signature: `solveWithBracketsAndCommonFactor:${x0}:${a}:${p}:${k}`,
        why: `Делим на ${k}: ${numStr(a)}(x ${p >= 0 ? "+" : "−"} ${Math.abs(p)}) = ${numStr(innerC)}. Раскрываем скобки и решаем: x = ${correct}.`
    };
}

// концептуальный вопрос про порядок шагов алгоритма
function genConceptCheckLinearEquationAlgorithm() {
    const correct = ALGORITHM_ORDER_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: ALGORITHM_ORDER_POOL[1], correct: false },
        { value: ALGORITHM_ORDER_POOL[2], correct: false },
        { value: ALGORITHM_ORDER_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptCheckLinearEquationAlgorithm",
        taskHTML: `<p class="task-question">Каков правильный порядок действий при решении линейного уравнения со скобками и x в обеих частях?</p>`,
        correctValue: correct,
        options,
        signature: `conceptCheckLinearEquationAlgorithm`,
        why: `Сначала раскрываем скобки, затем переносим все x в одну сторону, а числа — в другую, приводим подобные и делим на коэффициент при x.`
    };
}

const GENERATORS = {
    solveSimpleAddSubtract: genSolveSimpleAddSubtract,
    solveSimpleMultiply: genSolveSimpleMultiply,
    identifyOppositeOperation: genIdentifyOppositeOperation,
    signFlipOnTransfer: genSignFlipOnTransfer,
    solveTwoStepEquation: genSolveTwoStepEquation,
    solveVariablesBothSides: genSolveVariablesBothSides,
    divideWholeEquationFirst: genDivideWholeEquationFirst,
    solveWithNegativeCoefficient: genSolveWithNegativeCoefficient,
    solveWithBracketsSimple: genSolveWithBracketsSimple,
    solveWithBracketsBothSides: genSolveWithBracketsBothSides,
    solveWithBracketsAndCommonFactor: genSolveWithBracketsAndCommonFactor,
    conceptCheckLinearEquationAlgorithm: genConceptCheckLinearEquationAlgorithm
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
            topic: "linear-equations"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
