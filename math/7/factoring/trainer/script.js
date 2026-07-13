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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["identifyCommonFactorNumeric", "factorOutCommonFactorSimple", "factorOutCommonFactorWithVariable", "factorOutCommonBinomial"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["groupingAllPositive", "groupingOneSignFlip", "groupingBothSignsFlipped", "verifyGroupingResult"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["groupingRearranged", "combinedFactorThenGroup", "chooseCorrectPairing", "conceptCheckWhenToGroup"] }
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

function sup(n) {
    return String(n).split("").map(d => SUP_DIGITS[d] || d).join("");
}

// строит многочлен от одной переменной x из членов {coef, deg}
function polyStr(terms) {
    const nonZero = terms.filter(t => t.coef !== 0);
    if (nonZero.length === 0) return "0";

    let result = "";
    nonZero.forEach((t, i) => {
        const absCoef = Math.abs(t.coef);
        const letters = t.deg > 0 ? "x" + (t.deg > 1 ? sup(t.deg) : "") : "";
        const magStr = letters === "" ? String(absCoef) : (absCoef === 1 ? letters : absCoef + letters);

        if (i === 0) {
            result += (t.coef < 0 ? "−" : "") + magStr;
        } else {
            result += (t.coef < 0 ? " − " : " + ") + magStr;
        }
    });
    return result;
}

// строит ax±ay±bx±by (по знакам sy — столбец y, sb — строка b) в заданном порядке членов
function groupingExprStr(sy, sb, order) {
    const terms = [
        { label: "ax", sign: 1 },
        { label: "ay", sign: sy },
        { label: "bx", sign: sb },
        { label: "by", sign: sb * sy }
    ];
    const ordered = order.map(i => terms[i]);
    let result = "";
    ordered.forEach((t, i) => {
        if (i === 0) result += (t.sign < 0 ? "−" : "") + t.label;
        else result += (t.sign < 0 ? " − " : " + ") + t.label;
    });
    return result;
}

// строит (x±y)(a±b) по тем же знакам
function groupingFactoredStr(sy, sb) {
    const xy = sy > 0 ? "(x + y)" : "(x − y)";
    const ab = sb > 0 ? "(a + b)" : "(a − b)";
    return `${xy}${ab}`;
}

// численное значение ax±ay±bx±by при конкретных a,b,x,y
function evalGrouping(sy, sb, a, b, x, y) {
    return a * x + sy * a * y + sb * b * x + sb * sy * b * y;
}

// численное значение (x±y)(a±b) при конкретных a,b,x,y
function evalFactoredGrouping(sy, sb, a, b, x, y) {
    return (x + sy * y) * (a + sb * b);
}

const GROUPING_CONCEPT_POOL = [
    "Когда общего множителя нет у всех членов сразу, но есть у отдельных пар членов",
    "Метод группировки применяется только тогда, когда в многочлене ровно два члена",
    "Группировка нужна только если все члены уже имеют одинаковый знак",
    "Метод группировки заменяет вынесение общего множителя и используется всегда вместо него"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// kx+kb -> найти общий числовой множитель
function genIdentifyCommonFactorNumeric() {
    const k = rand(2, 9);
    const b = nonZeroRand(-9, 9);
    const expr = polyStr([{ coef: k, deg: 1 }, { coef: k * b, deg: 0 }]);
    const correct = numStr(k);

    const d1 = numStr(k * b);
    const d2 = numStr(k + 1);
    const d3 = numStr(b);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genIdentifyCommonFactorNumeric();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "identifyCommonFactorNumeric",
        taskHTML: `<p class="task-question">${expr}<br>Найдите наибольший общий числовой множитель членов этого многочлена.</p>`,
        correctValue: correct,
        options,
        signature: `identifyCommonFactorNumeric:${k}:${b}`,
        why: `У ${k}x и ${numStr(k * b)} общий множитель ${k}.`
    };
}

// kx+kb -> k(x+b)
function genFactorOutCommonFactorSimple() {
    const k = rand(2, 9);
    const b = nonZeroRand(-9, 9);
    const expr = polyStr([{ coef: k, deg: 1 }, { coef: k * b, deg: 0 }]);
    const correct = `${k}(x ${b >= 0 ? "+" : "−"} ${Math.abs(b)})`;

    const d1 = `${k}(x ${b >= 0 ? "−" : "+"} ${Math.abs(b)})`;
    const d2 = `(x ${b >= 0 ? "+" : "−"} ${Math.abs(b)})`;
    const d3 = `${k}(${k}x ${b >= 0 ? "+" : "−"} ${Math.abs(b)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFactorOutCommonFactorSimple();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "factorOutCommonFactorSimple",
        taskHTML: `<p class="task-question">${expr}<br>Вынесите общий множитель за скобки.</p>`,
        correctValue: correct,
        options,
        signature: `factorOutCommonFactorSimple:${k}:${b}`,
        why: `Выносим ${k}: ${k}x ÷ ${k} = x, ${numStr(k * b)} ÷ ${k} = ${numStr(b)}. Итог: ${correct}.`
    };
}

// kx²+kbx -> kx(x+b)
function genFactorOutCommonFactorWithVariable() {
    const k = rand(2, 9);
    const b = nonZeroRand(-9, 9);
    const expr = polyStr([{ coef: k, deg: 2 }, { coef: k * b, deg: 1 }]);
    const correct = `${k}x(x ${b >= 0 ? "+" : "−"} ${Math.abs(b)})`;

    const d1 = `${k}(x ${b >= 0 ? "+" : "−"} ${Math.abs(b)})`;
    const d2 = `${k}x(x ${b >= 0 ? "−" : "+"} ${Math.abs(b)})`;
    const d3 = `x(${k}x ${b >= 0 ? "+" : "−"} ${Math.abs(k * b)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFactorOutCommonFactorWithVariable();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "factorOutCommonFactorWithVariable",
        taskHTML: `<p class="task-question">${expr}<br>Вынесите общий множитель за скобки.</p>`,
        correctValue: correct,
        options,
        signature: `factorOutCommonFactorWithVariable:${k}:${b}`,
        why: `Общий множитель — ${k}x: ${k}x² ÷ ${k}x = x, ${numStr(k * b)}x ÷ ${k}x = ${numStr(b)}. Итог: ${correct}.`
    };
}

// p(x+y)+q(x+y) -> (x+y)(p+q)
function genFactorOutCommonBinomial() {
    const p = nonZeroRand(-9, 9);
    const q = nonZeroRand(-9, 9);
    if (p + q === 0) return genFactorOutCommonBinomial();
    const exprShown = `${numStr(p)}(x + y) ${q >= 0 ? "+" : "−"} ${Math.abs(q)}(x + y)`;
    const correct = `(x + y)(${numStr(p)} ${q >= 0 ? "+" : "−"} ${Math.abs(q)})`;

    const d1 = `(x + y)(${numStr(p)} ${q >= 0 ? "−" : "+"} ${Math.abs(q)})`;
    const d2 = `(x − y)(${numStr(p)} ${q >= 0 ? "+" : "−"} ${Math.abs(q)})`;
    const d3 = `(x + y)(${numStr(p + q + 1)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFactorOutCommonBinomial();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "factorOutCommonBinomial",
        taskHTML: `<p class="task-question">${exprShown}<br>Вынесите общий множитель за скобки.</p>`,
        correctValue: correct,
        options,
        signature: `factorOutCommonBinomial:${p}:${q}`,
        why: `Скобка (x + y) — общий множитель: выносим её, остаётся ${numStr(p)} ${q >= 0 ? "+" : "−"} ${Math.abs(q)}. Итог: ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// ax+ay+bx+by -> (x+y)(a+b)
function genGroupingAllPositive() {
    const expr = groupingExprStr(1, 1, [0, 1, 2, 3]);
    const correct = groupingFactoredStr(1, 1);

    const d1 = groupingFactoredStr(-1, 1);
    const d2 = groupingFactoredStr(1, -1);
    const d3 = groupingFactoredStr(-1, -1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genGroupingAllPositive();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "groupingAllPositive",
        taskHTML: `<p class="task-question">${expr}<br>Разложите на множители методом группировки.</p>`,
        correctValue: correct,
        options,
        signature: `groupingAllPositive`,
        why: `Группируем (ax + ay) + (bx + by) = a(x + y) + b(x + y) = ${correct}.`
    };
}

// ax−ay+bx−by или ax+ay−bx−by -> соответствующее разложение
function genGroupingOneSignFlip() {
    const [sy, sb] = pick([[-1, 1], [1, -1]]);
    const expr = groupingExprStr(sy, sb, [0, 1, 2, 3]);
    const correct = groupingFactoredStr(sy, sb);

    const d1 = groupingFactoredStr(-sy, sb);
    const d2 = groupingFactoredStr(sy, -sb);
    const d3 = groupingFactoredStr(-sy, -sb);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genGroupingOneSignFlip();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "groupingOneSignFlip",
        taskHTML: `<p class="task-question">${expr}<br>Разложите на множители методом группировки.</p>`,
        correctValue: correct,
        options,
        signature: `groupingOneSignFlip:${sy}:${sb}`,
        why: `Группируем по парам, следя за знаком: получаем ${correct}.`
    };
}

// ax−ay−bx+by -> (x−y)(a−b)
function genGroupingBothSignsFlipped() {
    const sy = -1, sb = -1;
    const expr = groupingExprStr(sy, sb, [0, 1, 2, 3]);
    const correct = groupingFactoredStr(sy, sb);

    const d1 = groupingFactoredStr(-sy, sb);
    const d2 = groupingFactoredStr(sy, -sb);
    const d3 = groupingFactoredStr(1, 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genGroupingBothSignsFlipped();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "groupingBothSignsFlipped",
        taskHTML: `<p class="task-question">${expr}<br>Разложите на множители методом группировки.</p>`,
        correctValue: correct,
        options,
        signature: `groupingBothSignsFlipped`,
        why: `Группируем: (ax − ay) + (−bx + by) = a(x − y) − b(x − y) = ${correct}.`
    };
}

// дано разложение (верное или ошибочное) -> верно/неверно
function genVerifyGroupingResult() {
    const sy = pick([1, -1]);
    const sb = pick([1, -1]);
    const expr = groupingExprStr(sy, sb, [0, 1, 2, 3]);

    const showCorrect = pick([true, false]);
    let shownSy, shownSb;
    if (showCorrect) {
        shownSy = sy; shownSb = sb;
    } else {
        [shownSy, shownSb] = pick([[-sy, sb], [sy, -sb], [-sy, -sb]]);
    }
    const shown = groupingFactoredStr(shownSy, shownSb);

    const a = 2, b = 3, x = 5, y = 7;
    const lhs = evalGrouping(sy, sb, a, b, x, y);
    const rhs = evalFactoredGrouping(shownSy, shownSb, a, b, x, y);
    const isActuallyCorrect = lhs === rhs;
    const correct = isActuallyCorrect ? "Верно" : "Неверно";

    const options = shuffle([
        { value: correct, correct: true },
        { value: correct === "Верно" ? "Неверно" : "Верно", correct: false }
    ]);

    return {
        kind: "verifyGroupingResult",
        taskHTML: `<p class="task-question">${expr} = ${shown}<br>Это разложение верное?</p>`,
        correctValue: correct,
        options,
        signature: `verifyGroupingResult:${sy}:${sb}:${shownSy}:${shownSb}`,
        why: `При a=2, b=3, x=5, y=7: левая часть = ${numStr(lhs)}, правая часть = ${numStr(rhs)}. ${isActuallyCorrect ? "Совпадает — разложение верное." : "Не совпадает — разложение неверное."}`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// то же выражение, но члены в перемешанном порядке
function genGroupingRearranged() {
    const sy = pick([1, -1]);
    const sb = pick([1, -1]);
    let order = shuffle([0, 1, 2, 3]);
    if (order.join() === "0,1,2,3") order = [2, 0, 3, 1];
    const expr = groupingExprStr(sy, sb, order);
    const correct = groupingFactoredStr(sy, sb);

    const d1 = groupingFactoredStr(-sy, sb);
    const d2 = groupingFactoredStr(sy, -sb);
    const d3 = groupingFactoredStr(-sy, -sb);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genGroupingRearranged();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "groupingRearranged",
        taskHTML: `<p class="task-question">${expr}<br>Разложите на множители методом группировки (сначала переставьте члены удобным образом).</p>`,
        correctValue: correct,
        options,
        signature: `groupingRearranged:${sy}:${sb}:${order.join("")}`,
        why: `Переставим члены так, чтобы получились пары с общим множителем, и разложим: ${correct}.`
    };
}

// 2ax+2ay+2bx+2by -> 2(x+y)(a+b)
function genCombinedFactorThenGroup() {
    const m = rand(2, 5);
    const sy = pick([1, -1]);
    const sb = pick([1, -1]);

    const labels = [`${m}ax`, `${m}ay`, `${m}bx`, `${m}by`];
    const signs = [1, sy, sb, sb * sy];
    let exprStr = "";
    labels.forEach((lab, i) => {
        if (i === 0) exprStr += (signs[i] < 0 ? "−" : "") + lab;
        else exprStr += (signs[i] < 0 ? " − " : " + ") + lab;
    });

    const xy = sy > 0 ? "(x + y)" : "(x − y)";
    const ab = sb > 0 ? "(a + b)" : "(a − b)";
    const correct = `${m}${xy}${ab}`;

    const d1 = `${xy}${ab}`;
    const d2 = `${m}${sy > 0 ? "(x − y)" : "(x + y)"}${ab}`;
    const d3 = `${m * 2}${xy}${ab}`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genCombinedFactorThenGroup();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "combinedFactorThenGroup",
        taskHTML: `<p class="task-question">${exprStr}<br>Разложите на множители (сначала вынесите общий числовой множитель, потом сгруппируйте).</p>`,
        correctValue: correct,
        options,
        signature: `combinedFactorThenGroup:${m}:${sy}:${sb}`,
        why: `Сначала выносим общий множитель ${m}, затем группируем внутри скобки. Итог: ${correct}.`
    };
}

// даны два члена -> какой общий множитель можно вынести из пары
function genChooseCorrectPairing() {
    const pairType = pick(["a", "b", "x", "y"]);
    let shownPair, correct;
    if (pairType === "a") { shownPair = "ax, ay"; correct = "a"; }
    else if (pairType === "b") { shownPair = "bx, by"; correct = "b"; }
    else if (pairType === "x") { shownPair = "ax, bx"; correct = "x"; }
    else { shownPair = "ay, by"; correct = "y"; }

    const otherLetter = pairType === "a" ? "b" : pairType === "b" ? "a" : pairType === "x" ? "y" : "x";

    const options = shuffle([
        { value: correct, correct: true },
        { value: "ab", correct: false },
        { value: "xy", correct: false },
        { value: otherLetter, correct: false }
    ]);

    return {
        kind: "chooseCorrectPairing",
        taskHTML: `<p class="task-question">${shownPair}<br>Какой общий множитель можно вынести из этой пары членов?</p>`,
        correctValue: correct,
        options,
        signature: `chooseCorrectPairing:${pairType}`,
        why: `Оба члена содержат ${correct} — это и есть общий множитель пары.`
    };
}

// концептуальный вопрос про метод группировки
function genConceptCheckWhenToGroup() {
    const correct = GROUPING_CONCEPT_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: GROUPING_CONCEPT_POOL[1], correct: false },
        { value: GROUPING_CONCEPT_POOL[2], correct: false },
        { value: GROUPING_CONCEPT_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptCheckWhenToGroup",
        taskHTML: `<p class="task-question">Когда стоит применять метод группировки вместо простого вынесения общего множителя?</p>`,
        correctValue: correct,
        options,
        signature: `conceptCheckWhenToGroup`,
        why: `Группировка нужна, когда единого множителя у всех членов нет, но он есть у отдельных пар.`
    };
}

const GENERATORS = {
    identifyCommonFactorNumeric: genIdentifyCommonFactorNumeric,
    factorOutCommonFactorSimple: genFactorOutCommonFactorSimple,
    factorOutCommonFactorWithVariable: genFactorOutCommonFactorWithVariable,
    factorOutCommonBinomial: genFactorOutCommonBinomial,
    groupingAllPositive: genGroupingAllPositive,
    groupingOneSignFlip: genGroupingOneSignFlip,
    groupingBothSignsFlipped: genGroupingBothSignsFlipped,
    verifyGroupingResult: genVerifyGroupingResult,
    groupingRearranged: genGroupingRearranged,
    combinedFactorThenGroup: genCombinedFactorThenGroup,
    chooseCorrectPairing: genChooseCorrectPairing,
    conceptCheckWhenToGroup: genConceptCheckWhenToGroup
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
            topic: "factoring"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
