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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["identifyCoefficients", "checkIfPointIsSolution", "findMissingCoordinate", "classifyGraphType"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["convertToSlopeForm", "findXIntercept", "findYIntercept", "equationOfVerticalOrHorizontalLine"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["specialCaseWholePlaneOrNoSolution", "identifyParallelFromGeneralForm", "pointOnVerticalOrHorizontalLine", "conceptCheckGeneralForm"] }
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

// ax + by (без "= c"); опускает отсутствующее слагаемое, если коэффициент = 0
function twoVarExprStr(a, b) {
    const parts = [];
    if (a !== 0) {
        parts.push(a === 1 ? "x" : a === -1 ? "−x" : `${numStr(a)}x`);
    }
    if (b !== 0) {
        if (parts.length === 0) {
            parts.push(b === 1 ? "y" : b === -1 ? "−y" : `${numStr(b)}y`);
        } else {
            parts.push(`${b > 0 ? "+" : "−"} ${Math.abs(b) === 1 ? "y" : `${Math.abs(b)}y`}`);
        }
    }
    return parts.join(" ");
}

const GENERAL_FORM_CONCEPT_POOL = [
    "Если b ≠ 0, уравнение можно переписать в виде y = kx + m — это обычная линейная функция",
    "Уравнение ax + by = c всегда имеет ровно одно решение (x; y)",
    "Если a = 0 и b = 0, уравнение всегда имеет бесконечно много решений",
    "График уравнения ax + by = c всегда проходит через начало координат"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// ax+by=c -> назвать a, b или c
function genIdentifyCoefficients() {
    const a = nonZeroRand(-9, 9);
    const b = nonZeroRand(-9, 9);
    const c = rand(-9, 9);
    const which = pick(["a", "b", "c"]);
    const trueVal = which === "a" ? a : which === "b" ? b : c;
    const correct = numStr(trueVal);

    const other1 = numStr(which === "a" ? b : which === "b" ? a : a);
    const other2 = numStr(which === "a" ? c : which === "b" ? c : b);
    const d3 = numStr(-trueVal);

    const vals = new Set([correct, other1, other2, d3]);
    if (vals.size !== 4) return genIdentifyCoefficients();

    const options = shuffle([
        { value: correct, correct: true },
        { value: other1, correct: false },
        { value: other2, correct: false },
        { value: d3, correct: false }
    ]);

    const label = which === "a" ? "коэффициент a" : which === "b" ? "коэффициент b" : "число c";

    return {
        kind: "identifyCoefficients",
        taskHTML: `<p class="task-question">${twoVarExprStr(a, b)} = ${numStr(c)}<br>Назовите ${label}.</p>`,
        correctValue: correct,
        options,
        signature: `identifyCoefficients:${a}:${b}:${c}:${which}`,
        why: `В уравнении ax + by = c: a = ${numStr(a)}, b = ${numStr(b)}, c = ${numStr(c)}. Значит ${which} = ${correct}.`
    };
}

// ax+by=c, точка -> является ли решением
function genCheckIfPointIsSolution() {
    const a = nonZeroRand(-9, 9);
    const b = nonZeroRand(-9, 9);
    const x0 = rand(-9, 9);
    const y0 = rand(-9, 9);
    const trueC = a * x0 + b * y0;
    const isSolution = pick([true, false]);
    const c = isSolution ? trueC : trueC + nonZeroRand(-5, 5);
    const correct = isSolution ? "Да, является" : "Нет, не является";

    const options = shuffle([
        { value: correct, correct: true },
        { value: isSolution ? "Нет, не является" : "Да, является", correct: false }
    ]);

    const computed = a * x0 + b * y0;

    return {
        kind: "checkIfPointIsSolution",
        taskHTML: `<p class="task-question">${twoVarExprStr(a, b)} = ${numStr(c)}<br>Является ли точка (${numStr(x0)}; ${numStr(y0)}) решением этого уравнения?</p>`,
        correctValue: correct,
        options,
        signature: `checkIfPointIsSolution:${a}:${b}:${x0}:${y0}:${c}`,
        why: `Подставим точку: ${numStr(a)}·${numStr(x0)} + (${numStr(b)}·${numStr(y0)}) = ${numStr(computed)}. ${computed === c ? `Это равно ${numStr(c)}, значит точка — решение.` : `Это не равно ${numStr(c)}, значит точка не является решением.`}`
    };
}

// ax+by=c, дана одна координата -> найти другую
function genFindMissingCoordinate() {
    const a = nonZeroRand(-9, 9);
    const b = nonZeroRand(-9, 9);
    const x0 = rand(-9, 9);
    const y0 = rand(-9, 9);
    const c = a * x0 + b * y0;
    const askX = pick([true, false]);
    const answerVal = askX ? x0 : y0;
    const correct = numStr(answerVal);

    const d1 = numStr(-answerVal);
    const d2 = numStr(askX ? y0 : x0);
    const d3 = numStr(answerVal + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindMissingCoordinate();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    const knownLabel = askX ? `y = ${numStr(y0)}` : `x = ${numStr(x0)}`;
    const findLabel = askX ? "x" : "y";

    return {
        kind: "findMissingCoordinate",
        taskHTML: `<p class="task-question">${twoVarExprStr(a, b)} = ${numStr(c)}<br>Известно, что ${knownLabel}. Найдите ${findLabel}.</p>`,
        correctValue: correct,
        options,
        signature: `findMissingCoordinate:${a}:${b}:${x0}:${y0}:${askX}`,
        why: askX
            ? `Подставим y = ${numStr(y0)}: ${numStr(a)}x + (${numStr(b)}·${numStr(y0)}) = ${numStr(c)}, откуда x = ${correct}.`
            : `Подставим x = ${numStr(x0)}: (${numStr(a)}·${numStr(x0)}) ${b > 0 ? "+" : "−"} ${Math.abs(b)}y = ${numStr(c)}, откуда y = ${correct}.`
    };
}

// ax+by=c -> классифицировать тип графика
function genClassifyGraphType() {
    const caseType = pick(["slant", "vertical", "horizontal"]);
    let a, b, c;
    if (caseType === "slant") { a = nonZeroRand(-9, 9); b = nonZeroRand(-9, 9); c = rand(-9, 9); }
    else if (caseType === "vertical") { a = nonZeroRand(-9, 9); b = 0; c = rand(-9, 9); }
    else { a = 0; b = nonZeroRand(-9, 9); c = rand(-9, 9); }

    const correct = caseType === "slant" ? "Наклонная прямая" : caseType === "vertical" ? "Вертикальная прямая" : "Горизонтальная прямая";

    const options = shuffle([
        { value: "Наклонная прямая", correct: correct === "Наклонная прямая" },
        { value: "Вертикальная прямая", correct: correct === "Вертикальная прямая" },
        { value: "Горизонтальная прямая", correct: correct === "Горизонтальная прямая" }
    ]);

    return {
        kind: "classifyGraphType",
        taskHTML: `<p class="task-question">${twoVarExprStr(a, b)} = ${numStr(c)}<br>Каким будет график этого уравнения?</p>`,
        correctValue: correct,
        options,
        signature: `classifyGraphType:${caseType}:${a}:${b}:${c}`,
        why: caseType === "slant" ? `a ≠ 0 и b ≠ 0 — это уравнение прямой общего вида, наклонная прямая.`
            : caseType === "vertical" ? `b = 0, уравнение имеет вид ax = c — вертикальная прямая (координата x одна и та же у всех точек).`
            : `a = 0, уравнение имеет вид by = c — горизонтальная прямая (координата y одна и та же у всех точек).`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// ax+by=c (b≠0) -> перевести в y=kx+m, найти k
function genConvertToSlopeForm() {
    const k = nonZeroRand(-9, 9);
    const b = nonZeroRand(-6, 6);
    const m = rand(-9, 9);
    const a = -k * b;
    const c = m * b;

    const correct = numStr(k);
    const d1 = numStr(-k);
    const d2 = numStr(m);
    const d3 = numStr(k + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genConvertToSlopeForm();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "convertToSlopeForm",
        taskHTML: `<p class="task-question">${twoVarExprStr(a, b)} = ${numStr(c)}<br>Запишите уравнение в виде y = kx + m. Чему равен коэффициент k?</p>`,
        correctValue: correct,
        options,
        signature: `convertToSlopeForm:${a}:${b}:${c}`,
        why: `Выразим y: ${numStr(b)}y = ${numStr(c)} − (${numStr(a)})x → y = ${linExprStr(k, m)}. Значит k = ${correct}.`
    };
}

// ax+by=c -> точка пересечения с осью x
function genFindXIntercept() {
    const a = nonZeroRand(-9, 9);
    const b = nonZeroRand(-9, 9);
    const x0 = rand(-9, 9);
    const c = a * x0;

    const correct = `(${numStr(x0)}; 0)`;
    const d1 = `(0; ${numStr(x0)})`;
    const d2 = `(${numStr(-x0)}; 0)`;
    const d3 = `(${numStr(x0 + 1)}; 0)`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindXIntercept();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findXIntercept",
        taskHTML: `<p class="task-question">${twoVarExprStr(a, b)} = ${numStr(c)}<br>Найдите точку пересечения графика с осью x.</p>`,
        correctValue: correct,
        options,
        signature: `findXIntercept:${a}:${b}:${x0}`,
        why: `При y = 0: ${numStr(a)}x = ${numStr(c)}, откуда x = ${numStr(x0)}. Точка пересечения: ${correct}.`
    };
}

// ax+by=c -> точка пересечения с осью y
function genFindYIntercept() {
    const a = nonZeroRand(-9, 9);
    const b = nonZeroRand(-9, 9);
    const y0 = rand(-9, 9);
    const c = b * y0;

    const correct = `(0; ${numStr(y0)})`;
    const d1 = `(${numStr(y0)}; 0)`;
    const d2 = `(0; ${numStr(-y0)})`;
    const d3 = `(0; ${numStr(y0 + 1)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindYIntercept();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findYIntercept",
        taskHTML: `<p class="task-question">${twoVarExprStr(a, b)} = ${numStr(c)}<br>Найдите точку пересечения графика с осью y.</p>`,
        correctValue: correct,
        options,
        signature: `findYIntercept:${a}:${b}:${y0}`,
        why: `При x = 0: ${numStr(b)}y = ${numStr(c)}, откуда y = ${numStr(y0)}. Точка пересечения: ${correct}.`
    };
}

// словесное описание вертикальной/горизонтальной прямой -> уравнение
function genEquationOfVerticalOrHorizontalLine() {
    const isVertical = pick([true, false]);
    const n = rand(-9, 9);
    const correct = isVertical ? `x = ${numStr(n)}` : `y = ${numStr(n)}`;
    const taskDesc = isVertical
        ? `Все точки прямой имеют абсциссу x = ${numStr(n)} (ордината y — любая)`
        : `Все точки прямой имеют ординату y = ${numStr(n)} (абсцисса x — любая)`;

    const d1 = isVertical ? `y = ${numStr(n)}` : `x = ${numStr(n)}`;
    const d2 = `x + y = ${numStr(n)}`;
    const d3 = `${numStr(n)}x = 0`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genEquationOfVerticalOrHorizontalLine();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "equationOfVerticalOrHorizontalLine",
        taskHTML: `<p class="task-question">${taskDesc}.<br>Какое уравнение задаёт эту прямую?</p>`,
        correctValue: correct,
        options,
        signature: `equationOfVerticalOrHorizontalLine:${isVertical}:${n}`,
        why: isVertical
            ? `Координата x одинакова у всех точек прямой (x = ${numStr(n)}), а y — любое число, значит уравнение прямой: x = ${numStr(n)}.`
            : `Координата y одинакова у всех точек прямой (y = ${numStr(n)}), а x — любое число, значит уравнение прямой: y = ${numStr(n)}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// a=0,b=0 -> вся плоскость или нет решений
function genSpecialCaseWholePlaneOrNoSolution() {
    const caseType = pick(["wholePlane", "noSolution"]);
    const c = caseType === "wholePlane" ? 0 : nonZeroRand(-9, 9);
    const correct = caseType === "wholePlane" ? "Решение — вся координатная плоскость" : "Решений нет";

    const options = shuffle([
        { value: correct, correct: true },
        { value: caseType === "wholePlane" ? "Решений нет" : "Решение — вся координатная плоскость", correct: false }
    ]);

    return {
        kind: "specialCaseWholePlaneOrNoSolution",
        taskHTML: `<p class="task-question">0 · x + 0 · y = ${numStr(c)}<br>Что является решением этого уравнения?</p>`,
        correctValue: correct,
        options,
        signature: `specialCaseWholePlaneOrNoSolution:${caseType}:${c}`,
        why: caseType === "wholePlane"
            ? `При a=0, b=0 и c=0 равенство 0=0 верно для любых x и y — решение любая точка плоскости.`
            : `При a=0, b=0 и c≠0 равенство 0 = ${numStr(c)} неверно ни при каких x и y — решений нет.`
    };
}

// две прямые в общем виде -> параллельны или нет
function genIdentifyParallelFromGeneralForm() {
    const k1 = nonZeroRand(-9, 9);
    const b1 = nonZeroRand(-6, 6);
    const m1 = rand(-9, 9);
    const a1 = -k1 * b1;
    const c1 = m1 * b1;

    const areParallel = pick([true, false]);
    let k2, b2, m2, a2, c2;
    if (areParallel) {
        k2 = k1;
        b2 = nonZeroRand(-6, 6);
        do { m2 = rand(-9, 9); } while (m2 === m1 && b2 === b1);
        a2 = -k2 * b2;
        c2 = m2 * b2;
    } else {
        do { k2 = nonZeroRand(-9, 9); } while (k2 === k1);
        b2 = nonZeroRand(-6, 6);
        m2 = rand(-9, 9);
        a2 = -k2 * b2;
        c2 = m2 * b2;
    }

    if (a1 === a2 && b1 === b2 && c1 === c2) return genIdentifyParallelFromGeneralForm();

    const correct = areParallel ? "Да, параллельны" : "Нет, не параллельны";

    const options = shuffle([
        { value: correct, correct: true },
        { value: areParallel ? "Нет, не параллельны" : "Да, параллельны", correct: false }
    ]);

    return {
        kind: "identifyParallelFromGeneralForm",
        taskHTML: `<p class="task-question">${twoVarExprStr(a1, b1)} = ${numStr(c1)}<br>${twoVarExprStr(a2, b2)} = ${numStr(c2)}<br>Графики этих уравнений параллельны?</p>`,
        correctValue: correct,
        options,
        signature: `identifyParallelFromGeneralForm:${a1}:${b1}:${c1}:${a2}:${b2}:${c2}`,
        why: areParallel
            ? `Приведя оба уравнения к виду y=kx+m, получим одинаковый коэффициент k=${numStr(k1)} — прямые параллельны.`
            : `Приведя оба уравнения к виду y=kx+m, получим разные коэффициенты k (${numStr(k1)} и ${numStr(k2)}) — прямые не параллельны.`
    };
}

// точка и вертикальная/горизонтальная прямая -> принадлежит ли
function genPointOnVerticalOrHorizontalLine() {
    const isVertical = pick([true, false]);
    const n = rand(-9, 9);
    const isOnLine = pick([true, false]);
    let x0, y0;
    if (isVertical) {
        x0 = isOnLine ? n : n + nonZeroRand(-5, 5);
        y0 = rand(-9, 9);
    } else {
        y0 = isOnLine ? n : n + nonZeroRand(-5, 5);
        x0 = rand(-9, 9);
    }

    const eqStr = isVertical ? `x = ${numStr(n)}` : `y = ${numStr(n)}`;
    const correct = isOnLine ? "Да, принадлежит" : "Нет, не принадлежит";

    const options = shuffle([
        { value: correct, correct: true },
        { value: isOnLine ? "Нет, не принадлежит" : "Да, принадлежит", correct: false }
    ]);

    return {
        kind: "pointOnVerticalOrHorizontalLine",
        taskHTML: `<p class="task-question">${eqStr}<br>Принадлежит ли точка (${numStr(x0)}; ${numStr(y0)}) этой прямой?</p>`,
        correctValue: correct,
        options,
        signature: `pointOnVerticalOrHorizontalLine:${isVertical}:${n}:${x0}:${y0}`,
        why: isVertical
            ? `У прямой x = ${numStr(n)} все точки имеют x = ${numStr(n)}. У данной точки x = ${numStr(x0)} — ${x0 === n ? "совпадает" : "не совпадает"}, значит точка ${isOnLine ? "принадлежит" : "не принадлежит"} прямой.`
            : `У прямой y = ${numStr(n)} все точки имеют y = ${numStr(n)}. У данной точки y = ${numStr(y0)} — ${y0 === n ? "совпадает" : "не совпадает"}, значит точка ${isOnLine ? "принадлежит" : "не принадлежит"} прямой.`
    };
}

// концептуальный вопрос про общий вид уравнения
function genConceptCheckGeneralForm() {
    const correct = GENERAL_FORM_CONCEPT_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: GENERAL_FORM_CONCEPT_POOL[1], correct: false },
        { value: GENERAL_FORM_CONCEPT_POOL[2], correct: false },
        { value: GENERAL_FORM_CONCEPT_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptCheckGeneralForm",
        taskHTML: `<p class="task-question">Какое утверждение про уравнение ax + by = c верно?</p>`,
        correctValue: correct,
        options,
        signature: `conceptCheckGeneralForm`,
        why: `При b ≠ 0 можно выразить y и получить обычную линейную функцию y = kx + m. Уравнение с двумя переменными обычно имеет бесконечно много решений (а не одно), а особый случай a=0, b=0 даёт либо все точки плоскости, либо ни одной — в зависимости от c.`
    };
}

const GENERATORS = {
    identifyCoefficients: genIdentifyCoefficients,
    checkIfPointIsSolution: genCheckIfPointIsSolution,
    findMissingCoordinate: genFindMissingCoordinate,
    classifyGraphType: genClassifyGraphType,
    convertToSlopeForm: genConvertToSlopeForm,
    findXIntercept: genFindXIntercept,
    findYIntercept: genFindYIntercept,
    equationOfVerticalOrHorizontalLine: genEquationOfVerticalOrHorizontalLine,
    specialCaseWholePlaneOrNoSolution: genSpecialCaseWholePlaneOrNoSolution,
    identifyParallelFromGeneralForm: genIdentifyParallelFromGeneralForm,
    pointOnVerticalOrHorizontalLine: genPointOnVerticalOrHorizontalLine,
    conceptCheckGeneralForm: genConceptCheckGeneralForm
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
            topic: "linear-equation-2var"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
