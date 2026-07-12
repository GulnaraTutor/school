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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["intervalNotationRead", "intervalNotationWrite", "solveLinearSimple", "flipSignConcept"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["solveLinearWithFlip", "compareEndpointType", "findRootsForInequality", "signOfLeadingCoeff"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["solveQuadraticInequalityUp", "solveQuadraticInequalityDown", "noSolutionOrAllReals", "systemOfInequalities"] }
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

// строка вида "(2; 5]" — lo/hi = null означает бесконечность
function intervalStr(lo, loIncl, hi, hiIncl) {
    const left = lo === null ? "(−∞" : (loIncl ? `[${numStr(lo)}` : `(${numStr(lo)}`);
    const right = hi === null ? "+∞)" : (hiIncl ? `${numStr(hi)}]` : `${numStr(hi)})`);
    return `${left}; ${right}`;
}

function unionStr(a, b) {
    return `${a} ∪ ${b}`;
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

// "x₁ = v1, x₂ = v2" — всегда в порядке возрастания
function rootsPairStr(r1, r2) {
    const lo = Math.min(r1, r2), hi = Math.max(r1, r2);
    return `x₁ = ${numStr(lo)}, x₂ = ${numStr(hi)}`;
}

// решение ax+b {op} 0 при a > 0 (без смены знака) относительно корня x0
function intervalForOp(op, x0) {
    if (op === ">") return intervalStr(x0, false, null, false);
    if (op === "≥") return intervalStr(x0, true, null, false);
    if (op === "<") return intervalStr(null, false, x0, false);
    return intervalStr(null, false, x0, true);
}

const OPPOSITE_OP = { ">": "<", "≥": "≤", "<": ">", "≤": "≥" };
const NONSTRICT_OF = { ">": "≥", "<": "≤" };
const STRICT_OF = { "≥": ">", "≤": "<" };

// снаружи корней: (−∞; lo) ∪ (hi; +∞) с учётом включения границ
function outsideStr(lo, hi, incl) {
    return unionStr(intervalStr(null, false, lo, incl), intervalStr(hi, incl, null, false));
}

// между корнями: (lo; hi) с учётом включения границ
function betweenStr(lo, hi, incl) {
    return intervalStr(lo, incl, hi, incl);
}

const FLIP_POOL = ["Меняется на противоположный", "Остаётся тем же", "Становится равенством", "Неравенство теряет смысл"];
const NO_SOLUTION_POOL = ["x — любое число", "Решений нет", "x > 0", "x < 0"];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// дан промежуток (lo; hi] и число x -> принадлежит ли (проверка именно границы)
function genIntervalNotationRead() {
    let lo, hi;
    do { lo = nonZeroRand(-9, 9); hi = nonZeroRand(-9, 9); } while (lo >= hi);
    const loIncl = pick([true, false]);
    const hiIncl = pick([true, false]);
    const intervalText = intervalStr(lo, loIncl, hi, hiIncl);

    const modes = ["lo", "hi", "outside"];
    if (hi - lo >= 2) modes.push("inside");
    const mode = pick(modes);

    let x, belongs;
    if (mode === "lo") { x = lo; belongs = loIncl; }
    else if (mode === "hi") { x = hi; belongs = hiIncl; }
    else if (mode === "inside") { x = rand(lo + 1, hi - 1); belongs = true; }
    else { x = pick([lo - nonZeroRand(1, 5), hi + nonZeroRand(1, 5)]); belongs = false; }

    const correct = belongs ? "Да" : "Нет";

    const options = shuffle([
        { value: correct, correct: true },
        { value: belongs ? "Нет" : "Да", correct: false }
    ]);

    return {
        kind: "intervalNotationRead",
        taskHTML: `<p class="task-question">Промежуток: ${intervalText}<br>Принадлежит ли ему число x = ${numStr(x)}?</p>`,
        correctValue: correct,
        options,
        signature: `intervalNotationRead:${lo}:${hi}:${loIncl}:${hiIncl}:${x}`,
        why: belongs
            ? `x = ${numStr(x)} входит в промежуток ${intervalText}.`
            : `x = ${numStr(x)} НЕ входит в промежуток ${intervalText}${(x === lo || x === hi) ? " — граница здесь обозначена круглой скобкой, значит не включена" : ""}.`
    };
}

// словесное описание -> верная запись промежутка
function genIntervalNotationWrite() {
    let lo, hi;
    do { lo = nonZeroRand(-9, 9); hi = nonZeroRand(-9, 9); } while (lo >= hi);
    const loIncl = pick([true, false]);
    const hiIncl = pick([true, false]);
    const loWord = loIncl ? "больше или равно" : "больше";
    const hiWord = hiIncl ? "не больше" : "меньше";
    const correct = intervalStr(lo, loIncl, hi, hiIncl);

    const vals = new Set([correct, intervalStr(lo, !loIncl, hi, hiIncl), intervalStr(lo, loIncl, hi, !hiIncl), intervalStr(lo, !loIncl, hi, !hiIncl)]);
    if (vals.size !== 4) return genIntervalNotationWrite();

    const options = shuffle([
        { value: correct, correct: true },
        { value: intervalStr(lo, !loIncl, hi, hiIncl), correct: false },
        { value: intervalStr(lo, loIncl, hi, !hiIncl), correct: false },
        { value: intervalStr(lo, !loIncl, hi, !hiIncl), correct: false }
    ]);

    return {
        kind: "intervalNotationWrite",
        taskHTML: `<p class="task-question">x ${loWord} ${numStr(lo)}, но ${hiWord} ${numStr(hi)}.<br>Запишите это как числовой промежуток.</p>`,
        correctValue: correct,
        options,
        signature: `intervalNotationWrite:${lo}:${hi}:${loIncl}:${hiIncl}`,
        why: `«${loWord} ${numStr(lo)}» даёт ${loIncl ? "квадратную" : "круглую"} скобку слева, «${hiWord} ${numStr(hi)}» — ${hiIncl ? "квадратную" : "круглую"} скобку справа: ${correct}.`
    };
}

// ax+b {op} 0, a>0 -> промежуток (без смены знака)
function genSolveLinearSimple() {
    const x0 = nonZeroRand(-9, 9);
    const a = rand(2, 9);
    const b = -a * x0;
    const op = pick([">", "≥", "<", "≤"]);
    const correct = intervalForOp(op, x0);

    const vals = new Set([correct, intervalForOp(OPPOSITE_OP[op], x0), intervalForOp(op, -x0), intervalForOp(OPPOSITE_OP[op], -x0)]);
    if (vals.size !== 4) return genSolveLinearSimple();

    const options = shuffle([
        { value: correct, correct: true },
        { value: intervalForOp(OPPOSITE_OP[op], x0), correct: false },
        { value: intervalForOp(op, -x0), correct: false },
        { value: intervalForOp(OPPOSITE_OP[op], -x0), correct: false }
    ]);

    return {
        kind: "solveLinearSimple",
        taskHTML: `<p class="task-question">${linExprStr(a, b)} ${op} 0<br>Решите неравенство.</p>`,
        correctValue: correct,
        options,
        signature: `solveLinearSimple:${x0}:${a}:${op}`,
        why: `${linExprStr(a, b)} ${op} 0 → ${numStr(a)}x ${op} ${numStr(-b)} → x ${op} ${numStr(x0)} (делили на положительное число ${numStr(a)}, знак не меняется). Ответ: ${correct}.`
    };
}

// концептуальный вопрос про смену знака (фикс-пул)
function genFlipSignConcept() {
    const correct = FLIP_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: FLIP_POOL[1], correct: false },
        { value: FLIP_POOL[2], correct: false },
        { value: FLIP_POOL[3], correct: false }
    ]);

    return {
        kind: "flipSignConcept",
        taskHTML: `<p class="task-question">Что происходит со знаком неравенства, если обе части умножить или разделить на отрицательное число?</p>`,
        correctValue: correct,
        options,
        signature: `flipSignConcept`,
        why: `При умножении или делении обеих частей неравенства на отрицательное число знак меняется на противоположный: &lt; ↔ &gt;, ≤ ↔ ≥.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// ax+b {op} 0, a<0 -> обязательна смена знака
function genSolveLinearWithFlip() {
    const x0 = nonZeroRand(-9, 9);
    const a = nonZeroRand(-9, -2);
    const b = -a * x0;
    const op = pick([">", "≥", "<", "≤"]);
    const flippedOp = OPPOSITE_OP[op];
    const correct = intervalForOp(flippedOp, x0);

    const vals = new Set([correct, intervalForOp(op, x0), intervalForOp(flippedOp, -x0), intervalForOp(op, -x0)]);
    if (vals.size !== 4) return genSolveLinearWithFlip();

    const options = shuffle([
        { value: correct, correct: true },
        { value: intervalForOp(op, x0), correct: false },
        { value: intervalForOp(flippedOp, -x0), correct: false },
        { value: intervalForOp(op, -x0), correct: false }
    ]);

    return {
        kind: "solveLinearWithFlip",
        taskHTML: `<p class="task-question">${linExprStr(a, b)} ${op} 0<br>Решите неравенство.</p>`,
        correctValue: correct,
        options,
        signature: `solveLinearWithFlip:${x0}:${a}:${op}`,
        why: `${linExprStr(a, b)} ${op} 0 → ${numStr(a)}x ${op} ${numStr(-b)}. Делим на отрицательное число ${numStr(a)} — знак меняется на противоположный: x ${flippedOp} ${numStr(x0)}. Ответ: ${correct}.`
    };
}

// неравенство x {op} a -> какая скобка нужна у границы a
function genCompareEndpointType() {
    const a = nonZeroRand(-9, 9);
    const op = pick(["<", "≤", ">", "≥"]);
    const correct = (op === "≤" || op === "≥") ? "[ ]" : "( )";

    const options = shuffle([
        { value: correct, correct: true },
        { value: correct === "[ ]" ? "( )" : "[ ]", correct: false }
    ]);

    return {
        kind: "compareEndpointType",
        taskHTML: `<p class="task-question">Неравенство: x ${op} ${numStr(a)}.<br>Какую скобку нужно поставить у числа ${numStr(a)} в записи промежутка?</p>`,
        correctValue: correct,
        options,
        signature: `compareEndpointType:${a}:${op}`,
        why: (op === "≤" || op === "≥")
            ? `Знак ${op} нестрогий (включает равенство), значит граница входит в промежуток — нужна квадратная скобка [ ].`
            : `Знак ${op} строгий (не включает равенство), значит граница не входит в промежуток — нужна круглая скобка ( ).`
    };
}

// x²+px+q=0 с целыми корнями по Виета -> найти сами корни (подготовка к методу интервалов)
function genFindRootsForInequality() {
    let x1, x2;
    do { x1 = nonZeroRand(-9, 9); x2 = nonZeroRand(-9, 9); } while (x1 === x2);
    const p = -(x1 + x2), q = x1 * x2;
    const correct = rootsPairStr(x1, x2);

    const vals = new Set([correct, rootsPairStr(-x1, -x2), rootsPairStr(x1, -x2), rootsPairStr(-x1, x2)]);
    if (vals.size !== 4) return genFindRootsForInequality();

    const options = shuffle([
        { value: correct, correct: true },
        { value: rootsPairStr(-x1, -x2), correct: false },
        { value: rootsPairStr(x1, -x2), correct: false },
        { value: rootsPairStr(-x1, x2), correct: false }
    ]);

    return {
        kind: "findRootsForInequality",
        taskHTML: `<p class="task-question">Для метода интервалов нужны корни уравнения ${quadExprStr(1, p, q)} = 0.<br>Найдите их.</p>`,
        correctValue: correct,
        options,
        signature: `findRootsForInequality:${x1}:${x2}`,
        why: `По теореме Виета: x₁+x₂ = ${numStr(-p)}, x₁·x₂ = ${numStr(q)} — подходят ${numStr(x1)} и ${numStr(x2)}.`
    };
}

// дано квадратное неравенство -> куда направлена парабола
function genSignOfLeadingCoeff() {
    const a = nonZeroRand(-9, 9);
    const b = nonZeroRand(-9, 9);
    const c = nonZeroRand(-9, 9);
    const op = pick([">", "<", "≥", "≤"]);
    const correct = a > 0 ? "Вверх (a > 0)" : "Вниз (a < 0)";

    const options = shuffle([
        { value: correct, correct: true },
        { value: a > 0 ? "Вниз (a < 0)" : "Вверх (a > 0)", correct: false }
    ]);

    return {
        kind: "signOfLeadingCoeff",
        taskHTML: `<p class="task-question">${quadExprStr(a, b, c)} ${op} 0<br>Куда направлена парабола?</p>`,
        correctValue: correct,
        options,
        signature: `signOfLeadingCoeff:${a}:${b}:${c}:${op}`,
        why: `Коэффициент перед x² равен ${numStr(a)} — он ${a > 0 ? "положительный, значит парабола направлена вверх" : "отрицательный, значит парабола направлена вниз"}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// ax²+bx+c {op} 0, a>0, корни x1<x2 выбираются первыми -> полное решение методом интервалов
function genSolveQuadraticInequalityUp() {
    let x1, x2;
    do { x1 = nonZeroRand(-9, 9); x2 = nonZeroRand(-9, 9); } while (x1 === x2);
    const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    const a = rand(1, 3);
    const p = -(x1 + x2), q = x1 * x2;
    const b = a * p, c = a * q;
    const op = pick([">", "≥", "<", "≤"]);

    const incl = (op === "≥" || op === "≤");
    const isOutside = (op === ">" || op === "≥");
    const correct = isOutside ? outsideStr(lo, hi, incl) : betweenStr(lo, hi, incl);

    const d1 = isOutside ? betweenStr(lo, hi, incl) : outsideStr(lo, hi, incl);
    const d2 = isOutside ? outsideStr(lo, hi, !incl) : betweenStr(lo, hi, !incl);
    const d3 = isOutside ? betweenStr(lo, hi, !incl) : outsideStr(lo, hi, !incl);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveQuadraticInequalityUp();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveQuadraticInequalityUp",
        taskHTML: `<p class="task-question">${quadExprStr(a, b, c)} ${op} 0<br>Решите неравенство методом интервалов.</p>`,
        correctValue: correct,
        options,
        signature: `solveQuadraticInequalityUp:${x1}:${x2}:${a}:${op}`,
        why: `Корни: x₁ = ${numStr(lo)}, x₂ = ${numStr(hi)}. Парабола направлена вверх (a = ${numStr(a)} &gt; 0), поэтому она выше оси ${isOutside ? "снаружи корней" : "нигде"}${isOutside ? "" : ", а ниже — снаружи; нужный участок между корнями"}. Ответ: ${correct}.`
    };
}

// то же, но a<0 -> направление обратное
function genSolveQuadraticInequalityDown() {
    let x1, x2;
    do { x1 = nonZeroRand(-9, 9); x2 = nonZeroRand(-9, 9); } while (x1 === x2);
    const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    const a = nonZeroRand(-3, -1);
    const p = -(x1 + x2), q = x1 * x2;
    const b = a * p, c = a * q;
    const op = pick([">", "≥", "<", "≤"]);

    const incl = (op === "≥" || op === "≤");
    const isOutside = (op === "<" || op === "≤");
    const correct = isOutside ? outsideStr(lo, hi, incl) : betweenStr(lo, hi, incl);

    const d1 = isOutside ? betweenStr(lo, hi, incl) : outsideStr(lo, hi, incl);
    const d2 = isOutside ? outsideStr(lo, hi, !incl) : betweenStr(lo, hi, !incl);
    const d3 = isOutside ? betweenStr(lo, hi, !incl) : outsideStr(lo, hi, !incl);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveQuadraticInequalityDown();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveQuadraticInequalityDown",
        taskHTML: `<p class="task-question">${quadExprStr(a, b, c)} ${op} 0<br>Решите неравенство методом интервалов.</p>`,
        correctValue: correct,
        options,
        signature: `solveQuadraticInequalityDown:${x1}:${x2}:${a}:${op}`,
        why: `Корни: x₁ = ${numStr(lo)}, x₂ = ${numStr(hi)}. Парабола направлена вниз (a = ${numStr(a)} &lt; 0), поэтому она выше оси между корнями, а ниже — снаружи. Ответ: ${correct}.`
    };
}

// D<0 гарантированно -> "решений нет" или "x — любое число"
function genNoSolutionOrAllReals() {
    const a = pick([1, -1]) * rand(1, 5);
    const b = nonZeroRand(-9, 9);
    let c;
    if (a > 0) {
        const minC = Math.ceil((b * b) / (4 * a)) + 1;
        c = minC + rand(0, 5);
    } else {
        const maxC = Math.floor((b * b) / (4 * a)) - 1;
        c = maxC - rand(0, 5);
    }
    const op = pick([">", "≥", "<", "≤"]);
    const exprAlwaysPositive = a > 0;
    const wantsPositive = (op === ">" || op === "≥");
    const correct = (wantsPositive === exprAlwaysPositive) ? "x — любое число" : "Решений нет";

    const pool = NO_SOLUTION_POOL.filter(v => v !== correct);

    const options = shuffle([
        { value: correct, correct: true },
        { value: pool[0], correct: false },
        { value: pool[1], correct: false },
        { value: pool[2], correct: false }
    ]);

    return {
        kind: "noSolutionOrAllReals",
        taskHTML: `<p class="task-question">${quadExprStr(a, b, c)} ${op} 0<br>Решите неравенство.</p>`,
        correctValue: correct,
        options,
        signature: `noSolutionOrAllReals:${a}:${b}:${c}:${op}`,
        why: `D = ${numStr(b)}² − 4×${numStr(a)}×${numStr(c)} = ${b * b - 4 * a * c} — отрицательный, действительных корней нет. Парабола целиком ${exprAlwaysPositive ? "выше" : "ниже"} оси, выражение всегда ${exprAlwaysPositive ? "положительно" : "отрицательно"}. Ответ: ${correct}.`
    };
}

// система из двух линейных неравенств -> промежуток-пересечение
function genSystemOfInequalities() {
    let a1, a2;
    do { a1 = nonZeroRand(-9, 9); a2 = nonZeroRand(-9, 9); } while (a1 >= a2);
    const loIncl = pick([true, false]);
    const hiIncl = pick([true, false]);
    const op1 = loIncl ? "≥" : ">";
    const op2 = hiIncl ? "≤" : "<";
    const correct = intervalStr(a1, loIncl, a2, hiIncl);

    const vals = new Set([correct, intervalStr(a1, !loIncl, a2, hiIncl), intervalStr(a1, loIncl, a2, !hiIncl), intervalStr(a1, !loIncl, a2, !hiIncl)]);
    if (vals.size !== 4) return genSystemOfInequalities();

    const options = shuffle([
        { value: correct, correct: true },
        { value: intervalStr(a1, !loIncl, a2, hiIncl), correct: false },
        { value: intervalStr(a1, loIncl, a2, !hiIncl), correct: false },
        { value: intervalStr(a1, !loIncl, a2, !hiIncl), correct: false }
    ]);

    return {
        kind: "systemOfInequalities",
        taskHTML: `<p class="task-question">Решите систему:<br>x ${op1} ${numStr(a1)} и x ${op2} ${numStr(a2)}</p>`,
        correctValue: correct,
        options,
        signature: `systemOfInequalities:${a1}:${a2}:${loIncl}:${hiIncl}`,
        why: `Первое неравенство даёт ${intervalStr(a1, loIncl, null, false)}, второе — ${intervalStr(null, false, a2, hiIncl)}. Пересечение (общая часть) — это ${correct}.`
    };
}

const GENERATORS = {
    intervalNotationRead: genIntervalNotationRead,
    intervalNotationWrite: genIntervalNotationWrite,
    solveLinearSimple: genSolveLinearSimple,
    flipSignConcept: genFlipSignConcept,
    solveLinearWithFlip: genSolveLinearWithFlip,
    compareEndpointType: genCompareEndpointType,
    findRootsForInequality: genFindRootsForInequality,
    signOfLeadingCoeff: genSignOfLeadingCoeff,
    solveQuadraticInequalityUp: genSolveQuadraticInequalityUp,
    solveQuadraticInequalityDown: genSolveQuadraticInequalityDown,
    noSolutionOrAllReals: genNoSolutionOrAllReals,
    systemOfInequalities: genSystemOfInequalities
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
            topic: "inequalities"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
