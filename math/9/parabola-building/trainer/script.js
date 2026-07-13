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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["findVertexXFromFormula", "branchDirectionFromA", "axisOfSymmetryFromVertex", "yInterceptFromFormula"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["computeVertexFull", "valueTableCompute", "xInterceptsViaVieta", "symmetricPointFromVertex"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["fullVertexNonUnitA", "findAFromVertexAndPoint", "readVertexFromParabolaGraph", "parabolaAlgorithmConceptCheck"] }
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

// строит параболу y=a(x-x0)^2+y0 из выбранной вершины (x0,y0) и коэффициента a;
// b и c вычисляются из них — гарантирует целую вершину без подбора
function buildParabola(aPool) {
    const a = pick(aPool);
    const x0 = rand(-5, 5);
    const y0 = rand(-6, 6);
    const b = -2 * a * x0;
    const c = a * x0 * x0 + y0;
    return { a, b, c, x0, y0 };
}

// рисует гладкую (по виду) кривую параболы y=a(x-x0)^2+y0, сэмплируя 11 точек
function buildParabolaSVG(a, x0, y0) {
    const W = 260, H = 200;
    const padL = 30, padR = 15, padT = 15, padB = 25;
    const pts = [];
    for (let i = -5; i <= 5; i++) {
        const x = x0 + i * 0.5;
        const y = a * (x - x0) * (x - x0) + y0;
        pts.push([x, y]);
    }
    const allX = [...pts.map(p => p[0]), 0];
    const allY = [...pts.map(p => p[1]), 0];
    const xMin = Math.min(...allX) - 0.5, xMax = Math.max(...allX) + 0.5;
    const yMin = Math.min(...allY) - 1, yMax = Math.max(...allY) + 1;

    function toSvgX(x) { return padL + (x - xMin) / (xMax - xMin) * (W - padL - padR); }
    function toSvgY(y) { return H - padB - (y - yMin) / (yMax - yMin) * (H - padT - padB); }

    const originX = toSvgX(0), originY = toSvgY(0);
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

const PARABOLA_CONCEPT_POOL = [
    "Сначала найти вершину и направление ветвей, потом — таблицу значений",
    "Сначала подставить случайные значения x, потом искать вершину",
    "Вершину искать не нужно — достаточно таблицы значений",
    "Направление ветвей определяется по знаку c, а не a"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// y=ax²+bx+c -> x0=-b/(2a)
function genFindVertexXFromFormula() {
    const p = buildParabola([1, -1]);
    const correct = numStr(p.x0);

    const d1 = numStr(-p.x0);
    const d2 = numStr(p.b);
    const d3 = numStr(p.x0 + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindVertexXFromFormula();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findVertexXFromFormula",
        taskHTML: `<p class="task-question">y = ${quadExprStr(p.a, p.b, p.c)}<br>Найдите x-координату вершины параболы.</p>`,
        correctValue: correct,
        options,
        signature: `findVertexXFromFormula:${p.a}:${p.b}:${p.c}:${p.x0}`,
        why: `x₀ = −b / (2a) = ${numStr(-p.b)} / (2·${numStr(p.a)}) = ${correct}.`
    };
}

// дано a -> ветви вверх/вниз
function genBranchDirectionFromA() {
    const a = nonZeroRand(-6, 6);
    const correct = a > 0 ? "Вверх" : "Вниз";

    const options = shuffle([
        { value: correct, correct: true },
        { value: a > 0 ? "Вниз" : "Вверх", correct: false }
    ]);

    return {
        kind: "branchDirectionFromA",
        taskHTML: `<p class="task-question">В формуле y = ax² + bx + c коэффициент a = ${numStr(a)}.<br>Куда направлены ветви параболы?</p>`,
        correctValue: correct,
        options,
        signature: `branchDirectionFromA:${a}`,
        why: `Знак a ${a > 0 ? "положительный" : "отрицательный"}, значит ветви направлены ${correct.toLowerCase()}.`
    };
}

// дана вершина (x0,y0) -> уравнение оси симметрии
function genAxisOfSymmetryFromVertex() {
    const x0 = rand(-8, 8);
    const y0 = rand(-8, 8);
    const correct = `x = ${numStr(x0)}`;

    const d1 = `x = ${numStr(-x0)}`;
    const d2 = `y = ${numStr(y0)}`;
    const d3 = `x = ${numStr(x0 + 1)}`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genAxisOfSymmetryFromVertex();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "axisOfSymmetryFromVertex",
        taskHTML: `<p class="task-question">Вершина параболы находится в точке (${numStr(x0)}; ${numStr(y0)}).<br>Запишите уравнение оси симметрии.</p>`,
        correctValue: correct,
        options,
        signature: `axisOfSymmetryFromVertex:${x0}:${y0}`,
        why: `Ось симметрии — вертикальная прямая через вершину: x = ${numStr(x0)}.`
    };
}

// y=ax²+bx+c -> значение при x=0
function genYInterceptFromFormula() {
    const p = buildParabola([1, -1, 2, -2]);
    const correct = numStr(p.c);

    const d1 = numStr(p.b);
    const d2 = numStr(-p.c);
    const d3 = numStr(p.c + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genYInterceptFromFormula();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "yInterceptFromFormula",
        taskHTML: `<p class="task-question">y = ${quadExprStr(p.a, p.b, p.c)}<br>Чему равно значение y при x = 0?</p>`,
        correctValue: correct,
        options,
        signature: `yInterceptFromFormula:${p.a}:${p.b}:${p.c}`,
        why: `При x = 0 все члены с x обнуляются: y = c = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// даны a,b,c -> полная вершина (x0;y0)
function genComputeVertexFull() {
    const p = buildParabola([1, -1]);
    const correct = `(${numStr(p.x0)}; ${numStr(p.y0)})`;

    const d1 = `(${numStr(-p.x0)}; ${numStr(p.y0)})`;
    const d2 = `(${numStr(p.x0)}; ${numStr(-p.y0)})`;
    const d3 = `(${numStr(p.x0)}; ${numStr(p.c)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genComputeVertexFull();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "computeVertexFull",
        taskHTML: `<p class="task-question">y = ${quadExprStr(p.a, p.b, p.c)}<br>Найдите координаты вершины параболы.</p>`,
        correctValue: correct,
        options,
        signature: `computeVertexFull:${p.a}:${p.b}:${p.c}:${p.x0}:${p.y0}`,
        why: `x₀ = −b / (2a) = ${numStr(p.x0)}. y₀ = f(x₀) = ${numStr(p.a)}·${numStr(p.x0)}² + (${numStr(p.b)})·${numStr(p.x0)} + ${numStr(p.c)} = ${numStr(p.y0)}. Вершина: ${correct}.`
    };
}

// дана формула и x (не в вершине) -> y=f(x)
function genValueTableCompute() {
    const p = buildParabola([1, -1]);
    const offset = nonZeroRand(-4, 4);
    const x1 = p.x0 + offset;
    const y1 = p.a * offset * offset + p.y0;
    const correct = numStr(y1);

    const d1 = numStr(-y1);
    const d2 = numStr(y1 + p.a);
    const d3 = numStr(p.y0);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genValueTableCompute();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "valueTableCompute",
        taskHTML: `<p class="task-question">y = ${quadExprStr(p.a, p.b, p.c)}<br>Вычислите y при x = ${numStr(x1)}.</p>`,
        correctValue: correct,
        options,
        signature: `valueTableCompute:${p.a}:${p.b}:${p.c}:${x1}`,
        why: `y = ${numStr(p.a)}·${numStr(x1)}² + (${numStr(p.b)})·${numStr(x1)} + ${numStr(p.c)} = ${correct}.`
    };
}

// приведённое x²+px+q=0 с целыми корнями (Виета) -> найти корни
function genXInterceptsViaVieta() {
    const r1 = rand(-6, 6);
    let r2 = rand(-6, 6);
    if (r2 === r1) return genXInterceptsViaVieta();

    const p = -(r1 + r2);
    const q = r1 * r2;
    const sorted = [r1, r2].sort((a, b) => a - b);
    const correct = `x₁ = ${numStr(sorted[0])}, x₂ = ${numStr(sorted[1])}`;

    const d1 = `x₁ = ${numStr(-sorted[0])}, x₂ = ${numStr(-sorted[1])}`;
    const d2 = `x₁ = ${numStr(sorted[0] + 1)}, x₂ = ${numStr(sorted[1] + 1)}`;
    const d3 = `x₁ = ${numStr(p)}, x₂ = ${numStr(q)}`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genXInterceptsViaVieta();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "xInterceptsViaVieta",
        taskHTML: `<p class="task-question">y = x² + (${numStr(p)})x + (${numStr(q)})<br>Найдите x-пересечения параболы (корни уравнения x² + (${numStr(p)})x + (${numStr(q)}) = 0).</p>`,
        correctValue: correct,
        options,
        signature: `xInterceptsViaVieta:${p}:${q}:${sorted[0]}:${sorted[1]}`,
        why: `По теореме Виета x₁ + x₂ = ${numStr(-p)}, x₁ · x₂ = ${numStr(q)}. Подходят числа ${numStr(sorted[0])} и ${numStr(sorted[1])}.`
    };
}

// дана ось симметрии x0 и точка (x1,y1) -> симметричная точка
function genSymmetricPointFromVertex() {
    const x0 = rand(-6, 6);
    const offset = nonZeroRand(-5, 5);
    const x1 = x0 + offset;
    const y1 = rand(-8, 8);
    const symX = x0 - offset;
    const correct = `(${numStr(symX)}; ${numStr(y1)})`;

    const d1 = `(${numStr(x1)}; ${numStr(y1)})`;
    const d2 = `(${numStr(symX)}; ${numStr(-y1)})`;
    const d3 = `(${numStr(-offset)}; ${numStr(y1)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSymmetricPointFromVertex();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "symmetricPointFromVertex",
        taskHTML: `<p class="task-question">Ось симметрии параболы: x = ${numStr(x0)}. Точка (${numStr(x1)}; ${numStr(y1)}) лежит на параболе.<br>Найдите симметричную ей точку.</p>`,
        correctValue: correct,
        options,
        signature: `symmetricPointFromVertex:${x0}:${x1}:${y1}`,
        why: `Симметричная точка находится на том же расстоянии от оси, но с другой стороны: x = 2·${numStr(x0)} − (${numStr(x1)}) = ${numStr(symX)}, y не меняется: ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// a≠±1, даны a,b,c -> полная вершина (числа покрупнее)
function genFullVertexNonUnitA() {
    const p = buildParabola([2, -2, 3, -3]);
    const correct = `(${numStr(p.x0)}; ${numStr(p.y0)})`;

    const d1 = `(${numStr(-p.x0)}; ${numStr(p.y0)})`;
    const d2 = `(${numStr(p.x0)}; ${numStr(-p.y0)})`;
    const d3 = `(${numStr(p.x0)}; ${numStr(p.c)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFullVertexNonUnitA();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "fullVertexNonUnitA",
        taskHTML: `<p class="task-question">y = ${quadExprStr(p.a, p.b, p.c)}<br>Найдите координаты вершины параболы.</p>`,
        correctValue: correct,
        options,
        signature: `fullVertexNonUnitA:${p.a}:${p.b}:${p.c}:${p.x0}:${p.y0}`,
        why: `x₀ = −b / (2a) = ${numStr(-p.b)} / (2·${numStr(p.a)}) = ${numStr(p.x0)}. y₀ = f(x₀) = ${numStr(p.a)}·${numStr(p.x0)}² + (${numStr(p.b)})·${numStr(p.x0)} + ${numStr(p.c)} = ${numStr(p.y0)}. Вершина: ${correct}.`
    };
}

// дана вершина (x0,y0) и точка (x1,y1) на параболе -> найти a
function genFindAFromVertexAndPoint() {
    const x0 = rand(-5, 5);
    const y0 = rand(-6, 6);
    const a = nonZeroRand(-4, 4);
    const offset = nonZeroRand(-3, 3);
    const x1 = x0 + offset;
    const y1 = a * offset * offset + y0;
    const correct = numStr(a);

    const d1 = numStr(-a);
    const d2 = numStr(a + 1);
    const d3 = numStr(a - 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindAFromVertexAndPoint();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findAFromVertexAndPoint",
        taskHTML: `<p class="task-question">Вершина параболы y = a(x − x₀)² + y₀ находится в точке (${numStr(x0)}; ${numStr(y0)}). Парабола проходит через точку (${numStr(x1)}; ${numStr(y1)}).<br>Найдите a.</p>`,
        correctValue: correct,
        options,
        signature: `findAFromVertexAndPoint:${x0}:${y0}:${a}:${x1}:${y1}`,
        why: `a = (y₁ − y₀) / (x₁ − x₀)² = (${numStr(y1)} − (${numStr(y0)})) / (${numStr(x1)} − (${numStr(x0)}))² = ${numStr(y1 - y0)} / ${(x1 - x0) * (x1 - x0)} = ${correct}.`
    };
}

// SVG с гладкой параболой -> прочитать координаты вершины
function genReadVertexFromParabolaGraph() {
    const a = pick([1, -1]);
    const x0 = rand(-4, 4);
    const y0 = rand(-4, 4);
    const svg = buildParabolaSVG(a, x0, y0);
    const correct = `(${numStr(x0)}; ${numStr(y0)})`;

    const d1 = `(${numStr(-x0)}; ${numStr(y0)})`;
    const d2 = `(${numStr(x0)}; ${numStr(-y0)})`;
    const d3 = `(${numStr(x0 + 1)}; ${numStr(y0)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genReadVertexFromParabolaGraph();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "readVertexFromParabolaGraph",
        taskHTML: `<p class="task-question">${svg}<br>Найдите координаты вершины параболы по графику.</p>`,
        correctValue: correct,
        options,
        signature: `readVertexFromParabolaGraph:${a}:${x0}:${y0}`,
        why: `Вершина — самая ${a > 0 ? "низкая" : "высокая"} точка графика: ${correct}.`
    };
}

// концептуальный вопрос про порядок шагов алгоритма
function genParabolaAlgorithmConceptCheck() {
    const correct = PARABOLA_CONCEPT_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: PARABOLA_CONCEPT_POOL[1], correct: false },
        { value: PARABOLA_CONCEPT_POOL[2], correct: false },
        { value: PARABOLA_CONCEPT_POOL[3], correct: false }
    ]);

    return {
        kind: "parabolaAlgorithmConceptCheck",
        taskHTML: `<p class="task-question">Как правильно начинать построение параболы y = ax² + bx + c?</p>`,
        correctValue: correct,
        options,
        signature: `parabolaAlgorithmConceptCheck`,
        why: `Сначала находят вершину (x₀ = −b/(2a), y₀ = f(x₀)) и направление ветвей по знаку a — это задаёт форму и положение графика, а таблица значений уже строится вокруг вершины.`
    };
}

const GENERATORS = {
    findVertexXFromFormula: genFindVertexXFromFormula,
    branchDirectionFromA: genBranchDirectionFromA,
    axisOfSymmetryFromVertex: genAxisOfSymmetryFromVertex,
    yInterceptFromFormula: genYInterceptFromFormula,
    computeVertexFull: genComputeVertexFull,
    valueTableCompute: genValueTableCompute,
    xInterceptsViaVieta: genXInterceptsViaVieta,
    symmetricPointFromVertex: genSymmetricPointFromVertex,
    fullVertexNonUnitA: genFullVertexNonUnitA,
    findAFromVertexAndPoint: genFindAFromVertexAndPoint,
    readVertexFromParabolaGraph: genReadVertexFromParabolaGraph,
    parabolaAlgorithmConceptCheck: genParabolaAlgorithmConceptCheck
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
            topic: "parabola-building"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
