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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["domainRangeRead", "evenOddClassify", "zerosRead", "functionConceptCheck"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["monotonicityRead", "boundedExtremumRead", "signIntervalRead", "evenOddCompute"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["combinedPropertiesQuestion", "compareTwoFunctionsProperty", "functionPropertiesConceptCheck", "quadraticVertexFromFormula"] }
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

// строка вида "(2; 5]" — lo/hi = null означает бесконечность (здесь не используется, но сигнатура совместима с темой «Неравенства»)
function intervalStr(lo, loIncl, hi, hiIncl) {
    const left = lo === null ? "(−∞" : (loIncl ? `[${numStr(lo)}` : `(${numStr(lo)}`);
    const right = hi === null ? "+∞)" : (hiIncl ? `${numStr(hi)}]` : `${numStr(hi)})`);
    return `${left}; ${right}`;
}

// ax + b (без "= 0"/сравнения)
function linExprStr(a, b) {
    let s = a === 1 ? "x" : a === -1 ? "−x" : `${numStr(a)}x`;
    if (b !== 0) s += ` ${b > 0 ? "+" : "−"} ${Math.abs(b)}`;
    return s;
}

// ax² + bx + c (без "= 0"/сравнения)
function quadExprStr(a, b, c) {
    let s = a === 1 ? "x²" : a === -1 ? "−x²" : `${numStr(a)}x²`;
    if (b !== 0) {
        const bAbs = Math.abs(b);
        s += ` ${b > 0 ? "+" : "−"} ${bAbs === 1 ? "" : bAbs}x`;
    }
    if (c !== 0) s += ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}`;
    return s;
}

// строит кусочно-линейную функцию из трёх точек: форма "галочка" (V, минимум в x2) или "домик" (Λ, максимум в x2)
function buildShape(opts) {
    opts = opts || {};
    const x1 = rand(-6, -2);
    const x2 = x1 + rand(2, 4);
    const x3 = x2 + rand(2, 4);
    const shape = opts.shape || pick(["V", "Λ"]);

    let y1, y2, y3;
    if (opts.zeroAt === "start") {
        y1 = 0;
        y2 = shape === "V" ? nonZeroRand(-6, -1) : nonZeroRand(1, 6);
        // не даём y3 случайно попасть в 0 — иначе на графике возник бы второй, незапланированный ноль
        do { y3 = shape === "V" ? y2 + rand(1, 6) : y2 - rand(1, 6); } while (y3 === 0);
    } else if (opts.zeroAt === "end") {
        y3 = 0;
        y2 = shape === "V" ? nonZeroRand(-6, -1) : nonZeroRand(1, 6);
        do { y1 = shape === "V" ? y2 + rand(1, 6) : y2 - rand(1, 6); } while (y1 === 0);
    } else {
        y2 = rand(-5, 5);
        y1 = shape === "V" ? y2 + rand(1, 6) : y2 - rand(1, 6);
        y3 = shape === "V" ? y2 + rand(1, 6) : y2 - rand(1, 6);
    }

    return { x1, y1, x2, y2, x3, y3, shape };
}

// специальная форма для signIntervalRead: ноль ровно на одном конце, весь остальной график одного знака
// (гарантирует единственный ноль — иначе где-то внутри отрезка возник бы второй, нецелый ноль)
function buildSignShape() {
    const x1 = rand(-6, -2);
    const x2 = x1 + rand(2, 4);
    const x3 = x2 + rand(2, 4);
    const positive = pick([true, false]);
    const zeroAt = pick(["start", "end"]);
    const shape = positive ? "Λ" : "V";

    const y2 = positive ? rand(2, 6) : rand(-6, -2);
    const otherVal = positive ? rand(1, y2 - 1) : rand(y2 + 1, -1);

    const y1 = zeroAt === "start" ? 0 : otherVal;
    const y3 = zeroAt === "start" ? otherVal : 0;

    return { x1, y1, x2, y2, x3, y3, shape, positive, zeroAt };
}

// рисует SVG-ломаную по трём точкам (переиспользует .graph-svg/.axis-line/.axis-arrow/.axis-label/.hyperbola-curve)
function buildPiecewiseGraphSVG(f) {
    const W = 260, H = 200;
    const padL = 30, padR = 15, padT = 15, padB = 25;
    const xs = [f.x1, f.x2, f.x3, 0];
    const ys = [f.y1, f.y2, f.y3, 0];
    const xMin = Math.min(...xs) - 1, xMax = Math.max(...xs) + 1;
    const yMin = Math.min(...ys) - 1, yMax = Math.max(...ys) + 1;

    function toSvgX(x) { return padL + (x - xMin) / (xMax - xMin) * (W - padL - padR); }
    function toSvgY(y) { return H - padB - (y - yMin) / (yMax - yMin) * (H - padT - padB); }

    const originX = toSvgX(0), originY = toSvgY(0);
    const pts = [[f.x1, f.y1], [f.x2, f.y2], [f.x3, f.y3]];
    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${toSvgX(p[0]).toFixed(1)},${toSvgY(p[1]).toFixed(1)}`).join(" ");

    return `<div class="graph-box"><svg viewBox="0 0 ${W} ${H}" class="graph-svg" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="${originY.toFixed(1)}" x2="253" y2="${originY.toFixed(1)}" class="axis-line"/>
        <polygon points="258,${originY.toFixed(1)} 249,${(originY - 5).toFixed(1)} 249,${(originY + 5).toFixed(1)}" class="axis-arrow"/>
        <line x1="${originX.toFixed(1)}" y1="195" x2="${originX.toFixed(1)}" y2="7" class="axis-line"/>
        <polygon points="${originX.toFixed(1)},2 ${(originX - 5).toFixed(1)},11 ${(originX + 5).toFixed(1)},11" class="axis-arrow"/>
        <text x="246" y="${(originY - 9).toFixed(1)}" class="axis-label">x</text>
        <text x="${(originX + 8).toFixed(1)}" y="16" class="axis-label">y</text>
        <path d="${pathD}" class="hyperbola-curve curve-blue" fill="none"/>
    </svg></div>`;
}

const EVEN_ODD_POOL = ["Чётная", "Нечётная", "Ни чётная, ни нечётная"];
const BOUNDED_POOL = ["Существует число, больше (или меньше) которого значения функции не бывают", "Функция всегда положительна", "Функция определена на всей числовой прямой", "У функции нет корней"];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// по SVG-графику -> область определения ИЛИ область значений
function genDomainRangeRead() {
    const f = buildShape();
    const svg = buildPiecewiseGraphSVG(f);
    const askDomain = pick([true, false]);

    const rangeLo = f.shape === "V" ? f.y2 : Math.min(f.y1, f.y3);
    const rangeHi = f.shape === "V" ? Math.max(f.y1, f.y3) : f.y2;

    const domainStr = intervalStr(f.x1, true, f.x3, true);
    const rangeStr = intervalStr(rangeLo, true, rangeHi, true);
    const correct = askDomain ? domainStr : rangeStr;

    const lo = askDomain ? f.x1 : rangeLo;
    const hi = askDomain ? f.x3 : rangeHi;

    const d1 = askDomain ? rangeStr : domainStr;
    const d2 = intervalStr(lo, false, hi, false);
    const d3 = intervalStr(lo, true, hi + 1, true);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genDomainRangeRead();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "domainRangeRead",
        taskHTML: `<p class="task-question">${svg}<br>Найдите ${askDomain ? "область определения D(f)" : "область значений E(f)"} этой функции.</p>`,
        correctValue: correct,
        options,
        signature: `domainRangeRead:${f.x1}:${f.y1}:${f.x2}:${f.y2}:${f.x3}:${f.y3}:${askDomain}`,
        why: askDomain
            ? `График существует от x = ${numStr(f.x1)} до x = ${numStr(f.x3)}, значит D(f) = ${domainStr}.`
            : `Наименьшее значение y на графике — ${numStr(rangeLo)}, наибольшее — ${numStr(rangeHi)}, значит E(f) = ${rangeStr}.`
    };
}

// формула -> Чётная / Нечётная / Ни то ни другое
function genEvenOddClassify() {
    const type = pick(EVEN_ODD_POOL);
    let formula;
    if (type === "Чётная") {
        const a = nonZeroRand(-5, 5);
        const c = rand(-5, 5);
        formula = `${a === 1 ? "" : a === -1 ? "−" : numStr(a)}x²${c !== 0 ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}`;
    } else if (type === "Нечётная") {
        const a = nonZeroRand(-5, 5);
        formula = `${a === 1 ? "" : a === -1 ? "−" : numStr(a)}x³`;
    } else {
        const a = nonZeroRand(-5, 5);
        const c = nonZeroRand(-5, 5);
        formula = linExprStr(a, c);
    }
    const correct = type;

    const options = shuffle([
        { value: correct, correct: true },
        ...EVEN_ODD_POOL.filter(t => t !== type).map(t => ({ value: t, correct: false }))
    ]);

    return {
        kind: "evenOddClassify",
        taskHTML: `<p class="task-question">y = ${formula}<br>Определите: функция чётная, нечётная или ни то, ни другое?</p>`,
        correctValue: correct,
        options,
        signature: `evenOddClassify:${type}:${formula}`,
        why: type === "Чётная" ? `f(−x) = f(x) для всех x — функция чётная.`
            : type === "Нечётная" ? `f(−x) = −f(x) для всех x — функция нечётная.`
            : `f(−x) не равно ни f(x), ни −f(x) — функция ни чётная, ни нечётная.`
    };
}

// по SVG-графику (с нулём на x1 или x3) -> найти ноль
function genZerosRead() {
    const zeroAt = pick(["start", "end"]);
    const f = buildShape({ zeroAt });
    const svg = buildPiecewiseGraphSVG(f);
    const zeroX = zeroAt === "start" ? f.x1 : f.x3;
    const correct = numStr(zeroX);

    const otherEnd = zeroAt === "start" ? f.x3 : f.x1;
    const vals = new Set([correct, numStr(otherEnd), numStr(f.x2), numStr(zeroX + 1)]);
    if (vals.size !== 4) return genZerosRead();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(otherEnd), correct: false },
        { value: numStr(f.x2), correct: false },
        { value: numStr(zeroX + 1), correct: false }
    ]);

    return {
        kind: "zerosRead",
        taskHTML: `<p class="task-question">${svg}<br>Найдите ноль функции (точку, где график пересекает ось x).</p>`,
        correctValue: correct,
        options,
        signature: `zerosRead:${f.x1}:${f.y1}:${f.x2}:${f.y2}:${f.x3}:${f.y3}`,
        why: `График пересекает ось x в точке x = ${numStr(zeroX)}.`
    };
}

// концептуальный вопрос про D(f) или E(f)
function genFunctionConceptCheck() {
    const askDomain = pick([true, false]);
    const pool = askDomain
        ? ["Все значения, которые может принимать аргумент x", "Все значения, которые может принимать зависимая переменная y", "Формула, которая связывает x и y", "Точки пересечения графика с осями"]
        : ["Все значения, которые может принимать зависимая переменная y", "Все значения, которые может принимать аргумент x", "Формула, которая связывает x и y", "Точки пересечения графика с осями"];
    const correct = pool[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: pool[1], correct: false },
        { value: pool[2], correct: false },
        { value: pool[3], correct: false }
    ]);

    return {
        kind: "functionConceptCheck",
        taskHTML: askDomain
            ? `<p class="task-question">Что такое область определения функции D(f)?</p>`
            : `<p class="task-question">Что такое область значений функции E(f)?</p>`,
        correctValue: correct,
        options,
        signature: `functionConceptCheck:${askDomain}`,
        why: askDomain
            ? `D(f) — область определения: все значения, которые может принимать аргумент x.`
            : `E(f) — область значений: все значения, которые может принимать y.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// по SVG-графику -> промежуток возрастания ИЛИ убывания
function genMonotonicityRead() {
    const f = buildShape();
    const svg = buildPiecewiseGraphSVG(f);
    const askIncreasing = pick([true, false]);

    let lo, hi;
    if (f.shape === "V") {
        if (askIncreasing) { lo = f.x2; hi = f.x3; } else { lo = f.x1; hi = f.x2; }
    } else {
        if (askIncreasing) { lo = f.x1; hi = f.x2; } else { lo = f.x2; hi = f.x3; }
    }
    const correct = intervalStr(lo, true, hi, true);

    const otherLo = (lo === f.x1) ? f.x2 : f.x1;
    const otherHi = (hi === f.x3) ? f.x2 : f.x3;
    const otherInterval = intervalStr(otherLo, true, otherHi, true);
    const d2 = intervalStr(f.x1, true, f.x3, true);
    const d3 = intervalStr(lo, false, hi, false);

    const vals = new Set([correct, otherInterval, d2, d3]);
    if (vals.size !== 4) return genMonotonicityRead();

    const options = shuffle([
        { value: correct, correct: true },
        { value: otherInterval, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "monotonicityRead",
        taskHTML: `<p class="task-question">${svg}<br>Найдите промежуток, на котором функция ${askIncreasing ? "возрастает" : "убывает"}.</p>`,
        correctValue: correct,
        options,
        signature: `monotonicityRead:${f.x1}:${f.y1}:${f.x2}:${f.y2}:${f.x3}:${f.y3}:${askIncreasing}`,
        why: `Функция ${askIncreasing ? "возрастает" : "убывает"} на ${correct}.`
    };
}

// по SVG-графику -> наименьшее (V) или наибольшее (Λ) значение функции
function genBoundedExtremumRead() {
    const f = buildShape();
    const svg = buildPiecewiseGraphSVG(f);
    const askMin = f.shape === "V";
    const correct = numStr(f.y2);
    const extremumX = f.x2;

    const d1 = numStr(f.y1);
    const d2 = numStr(f.y3);
    const d3 = numStr(f.y2 + (askMin ? 1 : -1));

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genBoundedExtremumRead();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "boundedExtremumRead",
        taskHTML: `<p class="task-question">${svg}<br>Найдите ${askMin ? "наименьшее" : "наибольшее"} значение функции.</p>`,
        correctValue: correct,
        options,
        signature: `boundedExtremumRead:${f.x1}:${f.y1}:${f.x2}:${f.y2}:${f.x3}:${f.y3}`,
        why: `${askMin ? "Наименьшее" : "Наибольшее"} значение функции — ${correct}, достигается при x = ${numStr(extremumX)}.`
    };
}

// по SVG-графику (ноль на одном конце, весь остальной график одного знака) -> промежуток f(x)>0 или f(x)<0
function genSignIntervalRead() {
    const f = buildSignShape();
    const svg = buildPiecewiseGraphSVG(f);

    const correct = f.zeroAt === "start"
        ? intervalStr(f.x1, false, f.x3, true)
        : intervalStr(f.x1, true, f.x3, false);

    const wrongDirection = f.zeroAt === "start"
        ? intervalStr(f.x1, true, f.x3, false)
        : intervalStr(f.x1, false, f.x3, true);
    const d2 = intervalStr(f.x1, false, f.x3, false);
    const d3 = intervalStr(f.x1, true, f.x3, true);

    const vals = new Set([correct, wrongDirection, d2, d3]);
    if (vals.size !== 4) return genSignIntervalRead();

    const options = shuffle([
        { value: correct, correct: true },
        { value: wrongDirection, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "signIntervalRead",
        taskHTML: `<p class="task-question">${svg}<br>Найдите промежуток, на котором f(x) ${f.positive ? "&gt; 0" : "&lt; 0"}.</p>`,
        correctValue: correct,
        options,
        signature: `signIntervalRead:${f.x1}:${f.y1}:${f.x2}:${f.y2}:${f.x3}:${f.y3}`,
        why: `Единственный ноль функции — x = ${numStr(f.zeroAt === "start" ? f.x1 : f.x3)}. На всей остальной части графика функция ${f.positive ? "положительна" : "отрицательна"}: f(x) ${f.positive ? "&gt;" : "&lt;"} 0 на ${correct}.`
    };
}

// дано f(x)=ax² или ax³ и f(x0) -> вычислить f(−x0)
function genEvenOddCompute() {
    const type = pick(["Чётная", "Нечётная"]);
    const a = nonZeroRand(2, 5);
    const x0 = rand(2, 6);
    let fx0, fNegX0, formula;
    if (type === "Чётная") {
        formula = `${a}x²`;
        fx0 = a * x0 * x0;
        fNegX0 = fx0;
    } else {
        formula = `${a}x³`;
        fx0 = a * x0 * x0 * x0;
        fNegX0 = -fx0;
    }
    const correct = numStr(fNegX0);

    const d1 = type === "Чётная" ? numStr(-fx0) : numStr(fx0);
    const d2 = numStr(fNegX0 + a);
    const d3 = numStr(fNegX0 - a);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genEvenOddCompute();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "evenOddCompute",
        taskHTML: `<p class="task-question">f(x) = ${formula}, f(${x0}) = ${fx0}.<br>Чему равно f(−${x0})?</p>`,
        correctValue: correct,
        options,
        signature: `evenOddCompute:${type}:${a}:${x0}`,
        why: type === "Чётная"
            ? `Функция чётная (f(−x) = f(x)), значит f(−${x0}) = f(${x0}) = ${correct}.`
            : `Функция нечётная (f(−x) = −f(x)), значит f(−${x0}) = −f(${x0}) = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// по SVG-графику -> "на промежутке возрастания найдите наименьшее значение"
function genCombinedPropertiesQuestion() {
    const f = buildShape();
    const svg = buildPiecewiseGraphSVG(f);

    let incStart, incEnd, minOnInc;
    if (f.shape === "V") {
        incStart = f.x2; incEnd = f.x3; minOnInc = f.y2;
    } else {
        incStart = f.x1; incEnd = f.x2; minOnInc = f.y1;
    }
    const correct = numStr(minOnInc);

    const maxOnInc = f.shape === "V" ? f.y3 : f.y2;
    const d1 = numStr(maxOnInc);
    const d2 = numStr(f.shape === "V" ? f.y1 : f.y3);
    const d3 = numStr(minOnInc + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genCombinedPropertiesQuestion();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "combinedPropertiesQuestion",
        taskHTML: `<p class="task-question">${svg}<br>На промежутке возрастания функции найдите её наименьшее значение.</p>`,
        correctValue: correct,
        options,
        signature: `combinedPropertiesQuestion:${f.x1}:${f.y1}:${f.x2}:${f.y2}:${f.x3}:${f.y3}`,
        why: `Функция возрастает на [${numStr(incStart)}; ${numStr(incEnd)}]. На возрастающем участке наименьшее значение — в его начале, при x = ${numStr(incStart)}: f(${numStr(incStart)}) = ${numStr(minOnInc)}.`
    };
}

// f(x)=a1x+b1, g(x)=a2x+b2, дано x0 -> что больше
function genCompareTwoFunctionsProperty() {
    const a1 = nonZeroRand(-5, 5), b1 = rand(-5, 5);
    const a2 = nonZeroRand(-5, 5), b2 = rand(-5, 5);
    const x0 = rand(-5, 5);
    const fVal = a1 * x0 + b1;
    const gVal = a2 * x0 + b2;
    if (fVal === gVal) return genCompareTwoFunctionsProperty();

    const correct = fVal > gVal ? "f(x₀)" : "g(x₀)";
    const options = shuffle([
        { value: correct, correct: true },
        { value: correct === "f(x₀)" ? "g(x₀)" : "f(x₀)", correct: false }
    ]);

    return {
        kind: "compareTwoFunctionsProperty",
        taskHTML: `<p class="task-question">f(x) = ${linExprStr(a1, b1)}, g(x) = ${linExprStr(a2, b2)}, x₀ = ${numStr(x0)}.<br>Что больше: f(x₀) или g(x₀)?</p>`,
        correctValue: correct,
        options,
        signature: `compareTwoFunctionsProperty:${a1}:${b1}:${a2}:${b2}:${x0}`,
        why: `f(x₀) = ${numStr(fVal)}, g(x₀) = ${numStr(gVal)}. ${correct} больше.`
    };
}

// концептуальный вопрос про ограниченность
function genFunctionPropertiesConceptCheck() {
    const correct = BOUNDED_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: BOUNDED_POOL[1], correct: false },
        { value: BOUNDED_POOL[2], correct: false },
        { value: BOUNDED_POOL[3], correct: false }
    ]);

    return {
        kind: "functionPropertiesConceptCheck",
        taskHTML: `<p class="task-question">Что означает, что функция ограничена (сверху или снизу)?</p>`,
        correctValue: correct,
        options,
        signature: `functionPropertiesConceptCheck`,
        why: `Ограниченность означает, что существует число M, такое что значения функции никогда не превышают M (ограничена сверху) или никогда не меньше M (ограничена снизу).`
    };
}

// вершина (x0,y0) выбирается первой -> дано y=x²+bx+c, найти координаты вершины
function genQuadraticVertexFromFormula() {
    const x0 = rand(-6, 6);
    const y0 = rand(-6, 6);
    const b = -2 * x0;
    const c = y0 + x0 * x0;
    const correct = `(${numStr(x0)}; ${numStr(y0)})`;

    const d1 = `(${numStr(-x0)}; ${numStr(y0)})`;
    const d2 = `(${numStr(x0)}; ${numStr(-y0)})`;
    const d3 = `(${numStr(-x0)}; ${numStr(-y0)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genQuadraticVertexFromFormula();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "quadraticVertexFromFormula",
        taskHTML: `<p class="task-question">y = ${quadExprStr(1, b, c)}<br>Найдите координаты вершины параболы.</p>`,
        correctValue: correct,
        options,
        signature: `quadraticVertexFromFormula:${x0}:${y0}`,
        why: `x₀ = −b / (2a) = ${numStr(-b)} / 2 = ${numStr(x0)}. Подставляем x₀ в формулу: y₀ = ${numStr(x0)}² ${b >= 0 ? "+" : "−"} ${Math.abs(b)}·${numStr(x0)} ${c >= 0 ? "+" : "−"} ${Math.abs(c)} = ${numStr(y0)}. Вершина: ${correct}.`
    };
}

const GENERATORS = {
    domainRangeRead: genDomainRangeRead,
    evenOddClassify: genEvenOddClassify,
    zerosRead: genZerosRead,
    functionConceptCheck: genFunctionConceptCheck,
    monotonicityRead: genMonotonicityRead,
    boundedExtremumRead: genBoundedExtremumRead,
    signIntervalRead: genSignIntervalRead,
    evenOddCompute: genEvenOddCompute,
    combinedPropertiesQuestion: genCombinedPropertiesQuestion,
    compareTwoFunctionsProperty: genCompareTwoFunctionsProperty,
    functionPropertiesConceptCheck: genFunctionPropertiesConceptCheck,
    quadraticVertexFromFormula: genQuadraticVertexFromFormula
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
            topic: "function-properties"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
