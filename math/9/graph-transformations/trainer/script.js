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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["verticalShiftDirection", "horizontalShiftDirection", "pointAfterVerticalShift", "pointAfterHorizontalShift"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["readVerticalShiftFromGraph", "readHorizontalShiftFromGraph", "domainAfterShift", "rangeAfterVerticalShift"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["combinedShiftReadGraph", "parabolaVertexShiftWrite", "shiftConceptCheck", "combinedShiftFormula"] }
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

// строка вида "(2; 5]" — lo/hi = null означает бесконечность (здесь не используется, но сигнатура совместима с другими темами)
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
function buildShape() {
    const x1 = rand(-4, -2);
    const x2 = x1 + rand(2, 3);
    const x3 = x2 + rand(2, 3);
    const shape = pick(["V", "Λ"]);
    const y2 = rand(-4, 4);
    const y1 = shape === "V" ? y2 + rand(1, 5) : y2 - rand(1, 5);
    const y3 = shape === "V" ? y2 + rand(1, 5) : y2 - rand(1, 5);
    return { x1, y1, x2, y2, x3, y3, shape };
}

// рисует SVG-ломаную по трём точкам: оригинал (синий) + сдвинутый на (a,b) график (красный)
function buildShiftedGraphSVG(f, a, b) {
    const W = 260, H = 200;
    const padL = 30, padR = 15, padT = 15, padB = 25;
    const orig = [[f.x1, f.y1], [f.x2, f.y2], [f.x3, f.y3]];
    const shifted = orig.map(([x, y]) => [x - a, y + b]);
    const allX = [...orig.map(p => p[0]), ...shifted.map(p => p[0]), 0];
    const allY = [...orig.map(p => p[1]), ...shifted.map(p => p[1]), 0];
    const xMin = Math.min(...allX) - 1, xMax = Math.max(...allX) + 1;
    const yMin = Math.min(...allY) - 1, yMax = Math.max(...allY) + 1;

    function toSvgX(x) { return padL + (x - xMin) / (xMax - xMin) * (W - padL - padR); }
    function toSvgY(y) { return H - padB - (y - yMin) / (yMax - yMin) * (H - padT - padB); }

    const originX = toSvgX(0), originY = toSvgY(0);
    function pathD(pts) { return pts.map((p, i) => `${i === 0 ? "M" : "L"}${toSvgX(p[0]).toFixed(1)},${toSvgY(p[1]).toFixed(1)}`).join(" "); }

    return `<div class="graph-box"><svg viewBox="0 0 ${W} ${H}" class="graph-svg" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="${originY.toFixed(1)}" x2="253" y2="${originY.toFixed(1)}" class="axis-line"/>
        <polygon points="258,${originY.toFixed(1)} 249,${(originY - 5).toFixed(1)} 249,${(originY + 5).toFixed(1)}" class="axis-arrow"/>
        <line x1="${originX.toFixed(1)}" y1="195" x2="${originX.toFixed(1)}" y2="7" class="axis-line"/>
        <polygon points="${originX.toFixed(1)},2 ${(originX - 5).toFixed(1)},11 ${(originX + 5).toFixed(1)},11" class="axis-arrow"/>
        <text x="246" y="${(originY - 9).toFixed(1)}" class="axis-label">x</text>
        <text x="${(originX + 8).toFixed(1)}" y="16" class="axis-label">y</text>
        <path d="${pathD(orig)}" class="hyperbola-curve curve-blue" fill="none"/>
        <path d="${pathD(shifted)}" class="hyperbola-curve curve-red" fill="none"/>
    </svg>
    <div class="graph-legend"><span><span class="dot dot-blue"></span>y = f(x)</span><span><span class="dot dot-red"></span>сдвинутый график</span></div>
    </div>`;
}

const SHIFT_CONCEPT_POOL = [
    "Потому что x + a = x₀ выполняется при x = x₀ − a — точка «приходит» на новый график на a раньше",
    "Потому что знак внутри скобки всегда противоположен направлению сдвига по определению",
    "Потому что горизонтальные сдвиги всегда происходят влево",
    "Потому что a на самом деле прибавляется к y, а не к x"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// дано число b -> сдвиг вверх или вниз
function genVerticalShiftDirection() {
    const b = nonZeroRand(-8, 8);
    const formula = b > 0 ? `f(x) + ${b}` : `f(x) − ${Math.abs(b)}`;
    const correct = b > 0 ? "Вверх" : "Вниз";

    const options = shuffle([
        { value: correct, correct: true },
        { value: b > 0 ? "Вниз" : "Вверх", correct: false }
    ]);

    return {
        kind: "verticalShiftDirection",
        taskHTML: `<p class="task-question">y = ${formula}<br>В какую сторону сдвигается график по сравнению с y = f(x)?</p>`,
        correctValue: correct,
        options,
        signature: `verticalShiftDirection:${b}`,
        why: `При b ${b > 0 ? "> 0" : "< 0"} график сдвигается ${correct.toLowerCase()} на |b| = ${Math.abs(b)}.`
    };
}

// дано y=f(x+a) -> сдвиг влево или вправо
function genHorizontalShiftDirection() {
    const a = nonZeroRand(-8, 8);
    const formula = a > 0 ? `f(x + ${a})` : `f(x − ${Math.abs(a)})`;
    const correct = a > 0 ? "Влево" : "Вправо";

    const options = shuffle([
        { value: correct, correct: true },
        { value: a > 0 ? "Вправо" : "Влево", correct: false }
    ]);

    return {
        kind: "horizontalShiftDirection",
        taskHTML: `<p class="task-question">y = ${formula}<br>В какую сторону сдвигается график по сравнению с y = f(x)?</p>`,
        correctValue: correct,
        options,
        signature: `horizontalShiftDirection:${a}`,
        why: `Число внутри скобки двигает график в сторону, противоположную своему знаку: при a ${a > 0 ? "> 0" : "< 0"} — ${correct.toLowerCase()} на |a| = ${Math.abs(a)}.`
    };
}

// точка (x0,y0) на y=f(x), дано b -> куда перейдёт при y=f(x)+b
function genPointAfterVerticalShift() {
    const x0 = rand(-6, 6);
    const y0 = rand(-6, 6);
    const b = nonZeroRand(-8, 8);
    const correct = `(${numStr(x0)}; ${numStr(y0 + b)})`;

    const d1 = `(${numStr(x0 + b)}; ${numStr(y0)})`;
    const d2 = `(${numStr(x0)}; ${numStr(y0 - b)})`;
    const d3 = `(${numStr(x0)}; ${numStr(y0)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genPointAfterVerticalShift();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "pointAfterVerticalShift",
        taskHTML: `<p class="task-question">Точка (${numStr(x0)}; ${numStr(y0)}) лежит на графике y = f(x). График сдвинули: y = f(x) + (${numStr(b)}).<br>В какую точку перейдёт эта точка?</p>`,
        correctValue: correct,
        options,
        signature: `pointAfterVerticalShift:${x0}:${y0}:${b}`,
        why: `При сдвиге y = f(x) + b координата x не меняется, а y увеличивается на b: (${numStr(x0)}; ${numStr(y0)} + (${numStr(b)})) = ${correct}.`
    };
}

// точка (x0,y0) на y=f(x), дано a -> куда перейдёт при y=f(x+a)
function genPointAfterHorizontalShift() {
    const x0 = rand(-6, 6);
    const y0 = rand(-6, 6);
    const a = nonZeroRand(-8, 8);
    const correct = `(${numStr(x0 - a)}; ${numStr(y0)})`;

    const d1 = `(${numStr(x0 + a)}; ${numStr(y0)})`;
    const d2 = `(${numStr(x0)}; ${numStr(y0 - a)})`;
    const d3 = `(${numStr(x0)}; ${numStr(y0)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genPointAfterHorizontalShift();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "pointAfterHorizontalShift",
        taskHTML: `<p class="task-question">Точка (${numStr(x0)}; ${numStr(y0)}) лежит на графике y = f(x). График сдвинули: y = f(x + (${numStr(a)})).<br>В какую точку перейдёт эта точка?</p>`,
        correctValue: correct,
        options,
        signature: `pointAfterHorizontalShift:${x0}:${y0}:${a}`,
        why: `При сдвиге y = f(x + a) координата x уменьшается на a, а y не меняется: (${numStr(x0)} − (${numStr(a)}); ${numStr(y0)}) = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// SVG с двумя кривыми (только вертикальный сдвиг) -> найти b
function genReadVerticalShiftFromGraph() {
    const f = buildShape();
    const b = nonZeroRand(-6, 6);
    const svg = buildShiftedGraphSVG(f, 0, b);
    const correct = numStr(b);

    const d1 = numStr(-b);
    const d2 = numStr(b + 2);
    const d3 = numStr(b - 2);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genReadVerticalShiftFromGraph();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "readVerticalShiftFromGraph",
        taskHTML: `<p class="task-question">${svg}<br>Красный график получен из синего вертикальным сдвигом y = f(x) + b. Найдите b.</p>`,
        correctValue: correct,
        options,
        signature: `readVerticalShiftFromGraph:${f.x1}:${f.y1}:${f.x2}:${f.y2}:${f.x3}:${f.y3}:${b}`,
        why: `Сравните y-координаты любой пары соответствующих точек — каждая увеличилась на b = ${correct}.`
    };
}

// SVG с двумя кривыми (только горизонтальный сдвиг) -> найти a
function genReadHorizontalShiftFromGraph() {
    const f = buildShape();
    const a = nonZeroRand(-6, 6);
    const svg = buildShiftedGraphSVG(f, a, 0);
    const correct = numStr(a);

    const d1 = numStr(-a);
    const d2 = numStr(a + 2);
    const d3 = numStr(a - 2);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genReadHorizontalShiftFromGraph();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "readHorizontalShiftFromGraph",
        taskHTML: `<p class="task-question">${svg}<br>Красный график получен из синего горизонтальным сдвигом y = f(x + a). Найдите a.</p>`,
        correctValue: correct,
        options,
        signature: `readHorizontalShiftFromGraph:${f.x1}:${f.y1}:${f.x2}:${f.y2}:${f.x3}:${f.y3}:${a}`,
        why: `Каждая точка сдвинута по x на −a. Сравнив x-координаты соответствующих точек, получаем −a = ${numStr(-a)}, то есть a = ${correct}.`
    };
}

// дано D(f)=[x1;x3] и вид сдвига -> новая D(f)
function genDomainAfterShift() {
    const f = buildShape();
    const domainStr = intervalStr(f.x1, true, f.x3, true);
    const isVertical = pick([true, false]);
    const b = nonZeroRand(-6, 6);
    const a = nonZeroRand(-6, 6);
    const shiftedDomain = intervalStr(f.x1 - a, true, f.x3 - a, true);
    const flippedDomain = intervalStr(f.x1 + a, true, f.x3 + a, true);

    const correct = isVertical ? domainStr : shiftedDomain;
    const questionFormula = isVertical ? `y = f(x) + (${numStr(b)})` : `y = f(x + (${numStr(a)}))`;

    const d1 = isVertical ? shiftedDomain : domainStr;
    const d2 = flippedDomain;
    const d3 = intervalStr(f.x1, false, f.x3, false);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genDomainAfterShift();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "domainAfterShift",
        taskHTML: `<p class="task-question">D(f) = ${domainStr}. График сдвинули: ${questionFormula}.<br>Чему теперь равна область определения?</p>`,
        correctValue: correct,
        options,
        signature: `domainAfterShift:${f.x1}:${f.x3}:${isVertical}:${a}:${b}`,
        why: isVertical
            ? `Вертикальный сдвиг не меняет x-координаты точек графика, значит D(f) не изменилась: ${domainStr}.`
            : `Горизонтальный сдвиг на a = ${numStr(a)} сдвигает границы D(f) на −a: [${numStr(f.x1)} − (${numStr(a)}); ${numStr(f.x3)} − (${numStr(a)})] = ${shiftedDomain}.`
    };
}

// дано E(f)=[yMin;yMax] и b -> новая область значений
function genRangeAfterVerticalShift() {
    const f = buildShape();
    const yMin = Math.min(f.y1, f.y2, f.y3), yMax = Math.max(f.y1, f.y2, f.y3);
    const rangeStr = intervalStr(yMin, true, yMax, true);
    const b = nonZeroRand(-6, 6);
    const correct = intervalStr(yMin + b, true, yMax + b, true);

    const d1 = rangeStr;
    const d2 = intervalStr(yMin - b, true, yMax - b, true);
    const d3 = intervalStr(yMin + b, false, yMax + b, false);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genRangeAfterVerticalShift();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "rangeAfterVerticalShift",
        taskHTML: `<p class="task-question">E(f) = ${rangeStr}. График сдвинули: y = f(x) + (${numStr(b)}).<br>Чему теперь равна область значений?</p>`,
        correctValue: correct,
        options,
        signature: `rangeAfterVerticalShift:${yMin}:${yMax}:${b}`,
        why: `Вертикальный сдвиг добавляет b к каждому значению y: E(f) = [${numStr(yMin)} + (${numStr(b)}); ${numStr(yMax)} + (${numStr(b)})] = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// SVG с двумя кривыми (оба сдвига сразу) -> найти a или b
function genCombinedShiftReadGraph() {
    const f = buildShape();
    const a = nonZeroRand(-6, 6);
    const b = nonZeroRand(-6, 6);
    const svg = buildShiftedGraphSVG(f, a, b);
    const askA = pick([true, false]);
    const target = askA ? a : b;
    const correct = numStr(target);

    const d1 = numStr(askA ? b : a);
    const d2 = numStr(-target);
    const d3 = numStr(target + 2);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genCombinedShiftReadGraph();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "combinedShiftReadGraph",
        taskHTML: `<p class="task-question">${svg}<br>Красный график получен из синего сдвигом y = f(x + a) + b. Найдите ${askA ? "a" : "b"}.</p>`,
        correctValue: correct,
        options,
        signature: `combinedShiftReadGraph:${f.x1}:${f.y1}:${f.x2}:${f.y2}:${f.x3}:${f.y3}:${a}:${b}:${askA}`,
        why: askA
            ? `Сравните x-координаты соответствующих точек: каждая уменьшилась на a, значит a = ${correct}.`
            : `Сравните y-координаты соответствующих точек: каждая увеличилась на b, значит b = ${correct}.`
    };
}

// дана вершина (x0,y0) -> формула сдвинутой параболы y=x²+px+q в раскрытом виде
function genParabolaVertexShiftWrite() {
    const x0 = rand(-6, 6);
    const y0 = rand(-6, 6);
    const p = -2 * x0;
    const q = x0 * x0 + y0;
    const correct = quadExprStr(1, p, q);

    const dWrongSignP = quadExprStr(1, -p, q);
    const dWrongQ = quadExprStr(1, p, x0 * x0 - y0);
    const dNoShiftQ = quadExprStr(1, p, x0 * x0);

    const vals = new Set([correct, dWrongSignP, dWrongQ, dNoShiftQ]);
    if (vals.size !== 4) return genParabolaVertexShiftWrite();

    const options = shuffle([
        { value: correct, correct: true },
        { value: dWrongSignP, correct: false },
        { value: dWrongQ, correct: false },
        { value: dNoShiftQ, correct: false }
    ]);

    return {
        kind: "parabolaVertexShiftWrite",
        taskHTML: `<p class="task-question">Параболу y = x² сдвинули так, что её вершина оказалась в точке (${numStr(x0)}; ${numStr(y0)}).<br>Запишите формулу y = x² + px + q в раскрытом виде.</p>`,
        correctValue: correct,
        options,
        signature: `parabolaVertexShiftWrite:${x0}:${y0}`,
        why: `Формула сдвинутой параболы: y = (x − (${numStr(x0)}))² + (${numStr(y0)}). Раскрываем скобки: y = ${correct}.`
    };
}

// концептуальный вопрос: почему сдвиг влево при a>0
function genShiftConceptCheck() {
    const correct = SHIFT_CONCEPT_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: SHIFT_CONCEPT_POOL[1], correct: false },
        { value: SHIFT_CONCEPT_POOL[2], correct: false },
        { value: SHIFT_CONCEPT_POOL[3], correct: false }
    ]);

    return {
        kind: "shiftConceptCheck",
        taskHTML: `<p class="task-question">Почему график y = f(x + a) сдвигается ВЛЕВО при a &gt; 0, хотя число a со знаком «плюс»?</p>`,
        correctValue: correct,
        options,
        signature: `shiftConceptCheck`,
        why: `g(x) = f(x + a) повторяет значение f в точке x₀ там, где x + a = x₀, то есть при x = x₀ − a — это на a раньше по оси x, то есть левее.`
    };
}

// y=kx+c, дано a,b -> формула y=k(x+a)+c+b в раскрытом виде
function genCombinedShiftFormula() {
    const k = nonZeroRand(-5, 5);
    const c = rand(-5, 5);
    const a = nonZeroRand(-5, 5);
    const b = nonZeroRand(-5, 5);
    const newIntercept = k * a + c + b;
    const correct = linExprStr(k, newIntercept);

    const dWrongA = linExprStr(k, -k * a + c + b);
    const dNoB = linExprStr(k, k * a + c);
    const dNoA = linExprStr(k, c + b);

    const vals = new Set([correct, dWrongA, dNoB, dNoA]);
    if (vals.size !== 4) return genCombinedShiftFormula();

    const options = shuffle([
        { value: correct, correct: true },
        { value: dWrongA, correct: false },
        { value: dNoB, correct: false },
        { value: dNoA, correct: false }
    ]);

    return {
        kind: "combinedShiftFormula",
        taskHTML: `<p class="task-question">y = ${linExprStr(k, c)}. Сдвинули: y = f(x + (${numStr(a)})) + (${numStr(b)}).<br>Запишите формулу сдвинутой функции в раскрытом виде.</p>`,
        correctValue: correct,
        options,
        signature: `combinedShiftFormula:${k}:${c}:${a}:${b}`,
        why: `y = ${numStr(k)}(x + (${numStr(a)})) + ${numStr(c)} + (${numStr(b)}) = ${numStr(k)}x + ${numStr(k * a)} + ${numStr(c)} + (${numStr(b)}) = ${correct}.`
    };
}

const GENERATORS = {
    verticalShiftDirection: genVerticalShiftDirection,
    horizontalShiftDirection: genHorizontalShiftDirection,
    pointAfterVerticalShift: genPointAfterVerticalShift,
    pointAfterHorizontalShift: genPointAfterHorizontalShift,
    readVerticalShiftFromGraph: genReadVerticalShiftFromGraph,
    readHorizontalShiftFromGraph: genReadHorizontalShiftFromGraph,
    domainAfterShift: genDomainAfterShift,
    rangeAfterVerticalShift: genRangeAfterVerticalShift,
    combinedShiftReadGraph: genCombinedShiftReadGraph,
    parabolaVertexShiftWrite: genParabolaVertexShiftWrite,
    shiftConceptCheck: genShiftConceptCheck,
    combinedShiftFormula: genCombinedShiftFormula
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
            topic: "graph-transformations"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
