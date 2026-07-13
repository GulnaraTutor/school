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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["multiplyMonomialByBinomial", "multiplyMonomialByTrinomial", "signOfProductConcept", "multiplyNegativeMonomialByBinomial"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["expandBinomialByBinomialSimple", "expandBinomialByBinomialMixedSigns", "findConstantTermInExpansion", "findLinearCoefficientInExpansion"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["expandBinomialByBinomialWithLeadingCoef", "expandTrinomialByBinomial", "findMissingCoefficient", "conceptCheckDistribution"] }
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

// строит многочлен от одной переменной x из членов {coef, deg} (deg — степень x, 0 = свободный член)
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

const SIGN_PRODUCT_POOL = [
    "Если знаки множителей одинаковые — результат положительный, если разные — отрицательный",
    "Знак результата всегда положительный, если хотя бы один множитель положительный",
    "Знак результата определяется знаком первого множителя, второй роли не играет",
    "Умножение двух отрицательных чисел всегда даёт отрицательный результат"
];

const DISTRIBUTION_CONCEPT_POOL = [
    "Потому что каждое слагаемое первого множителя нужно умножить на каждое слагаемое второго — иначе часть произведения потеряется",
    "Потому что достаточно перемножить только первые члены каждой скобки",
    "Потому что многочлены нужно сначала сложить, а потом умножить результат на число",
    "Потому что порядок скобок влияет на результат, поэтому важно умножать только по порядку"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// k(x+b) -> раскрыть скобки
function genMultiplyMonomialByBinomial() {
    const k = nonZeroRand(-9, 9);
    const b = nonZeroRand(-9, 9);
    const correct = polyStr([{ coef: k, deg: 1 }, { coef: k * b, deg: 0 }]);
    const taskExpr = `${numStr(k)}(x ${b >= 0 ? "+" : "−"} ${Math.abs(b)})`;

    const d1 = polyStr([{ coef: k, deg: 1 }, { coef: b, deg: 0 }]);
    const d2 = polyStr([{ coef: k, deg: 1 }, { coef: -k * b, deg: 0 }]);
    const d3 = polyStr([{ coef: k * b, deg: 1 }, { coef: k * b, deg: 0 }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genMultiplyMonomialByBinomial();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "multiplyMonomialByBinomial",
        taskHTML: `<p class="task-question">${taskExpr}<br>Раскройте скобки.</p>`,
        correctValue: correct,
        options,
        signature: `multiplyMonomialByBinomial:${k}:${b}`,
        why: `${numStr(k)} · x = ${numStr(k)}x, ${numStr(k)} · (${numStr(b)}) = ${numStr(k * b)}. Итог: ${correct}.`
    };
}

// k(x²+bx+c) -> раскрыть скобки
function genMultiplyMonomialByTrinomial() {
    const k = nonZeroRand(-9, 9);
    const b = nonZeroRand(-9, 9);
    const c = nonZeroRand(-9, 9);
    const correct = polyStr([{ coef: k, deg: 2 }, { coef: k * b, deg: 1 }, { coef: k * c, deg: 0 }]);
    const taskExpr = `${numStr(k)}(x² ${b >= 0 ? "+" : "−"} ${Math.abs(b)}x ${c >= 0 ? "+" : "−"} ${Math.abs(c)})`;

    const d1 = polyStr([{ coef: k, deg: 2 }, { coef: k * b, deg: 1 }, { coef: c, deg: 0 }]);
    const d2 = polyStr([{ coef: k, deg: 2 }, { coef: b, deg: 1 }, { coef: k * c, deg: 0 }]);
    const d3 = polyStr([{ coef: k, deg: 2 }, { coef: -k * b, deg: 1 }, { coef: k * c, deg: 0 }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genMultiplyMonomialByTrinomial();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "multiplyMonomialByTrinomial",
        taskHTML: `<p class="task-question">${taskExpr}<br>Раскройте скобки.</p>`,
        correctValue: correct,
        options,
        signature: `multiplyMonomialByTrinomial:${k}:${b}:${c}`,
        why: `${numStr(k)} · x² = ${numStr(k)}x², ${numStr(k)} · ${numStr(b)}x = ${numStr(k * b)}x, ${numStr(k)} · (${numStr(c)}) = ${numStr(k * c)}. Итог: ${correct}.`
    };
}

// концептуальный вопрос про знак произведения
function genSignOfProductConcept() {
    const correct = SIGN_PRODUCT_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: SIGN_PRODUCT_POOL[1], correct: false },
        { value: SIGN_PRODUCT_POOL[2], correct: false },
        { value: SIGN_PRODUCT_POOL[3], correct: false }
    ]);

    return {
        kind: "signOfProductConcept",
        taskHTML: `<p class="task-question">Как определить знак произведения двух чисел?</p>`,
        correctValue: correct,
        options,
        signature: `signOfProductConcept`,
        why: `Одинаковые знаки множителей дают плюс, разные — минус: (+)·(+)=(+), (−)·(−)=(+), (+)·(−)=(−).`
    };
}

// −k(x+b) -> раскрыть скобки (акцент на смену знака у всех членов)
function genMultiplyNegativeMonomialByBinomial() {
    const k = rand(2, 9);
    const b = nonZeroRand(-9, 9);
    const correct = polyStr([{ coef: -k, deg: 1 }, { coef: -k * b, deg: 0 }]);
    const taskExpr = `−${k}(x ${b >= 0 ? "+" : "−"} ${Math.abs(b)})`;

    const d1 = polyStr([{ coef: -k, deg: 1 }, { coef: k * b, deg: 0 }]);
    const d2 = polyStr([{ coef: k, deg: 1 }, { coef: -k * b, deg: 0 }]);
    const d3 = polyStr([{ coef: k, deg: 1 }, { coef: k * b, deg: 0 }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genMultiplyNegativeMonomialByBinomial();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "multiplyNegativeMonomialByBinomial",
        taskHTML: `<p class="task-question">${taskExpr}<br>Раскройте скобки.</p>`,
        correctValue: correct,
        options,
        signature: `multiplyNegativeMonomialByBinomial:${k}:${b}`,
        why: `Знак минус перед скобкой меняет знак у обоих членов: −${k} · x = ${numStr(-k)}x, −${k} · (${numStr(b)}) = ${numStr(-k * b)}. Итог: ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// (x+p)(x+q) -> x² + (p+q)x + pq
function genExpandBinomialByBinomialSimple() {
    const p = rand(1, 9);
    const q = rand(1, 9);
    const correct = polyStr([{ coef: 1, deg: 2 }, { coef: p + q, deg: 1 }, { coef: p * q, deg: 0 }]);
    const taskExpr = `(x + ${p})(x + ${q})`;

    const d1 = polyStr([{ coef: 1, deg: 2 }, { coef: p * q, deg: 1 }, { coef: p + q, deg: 0 }]);
    const d2 = polyStr([{ coef: 1, deg: 2 }, { coef: p + q, deg: 1 }, { coef: p + q, deg: 0 }]);
    const d3 = polyStr([{ coef: 1, deg: 2 }, { coef: Math.abs(p - q), deg: 1 }, { coef: p * q, deg: 0 }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genExpandBinomialByBinomialSimple();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "expandBinomialByBinomialSimple",
        taskHTML: `<p class="task-question">${taskExpr}<br>Раскройте скобки методом «краб».</p>`,
        correctValue: correct,
        options,
        signature: `expandBinomialByBinomialSimple:${p}:${q}`,
        why: `x · x = x². Средний член: x · ${q} + ${p} · x = (${p} + ${q})x = ${p + q}x. Свободный член: ${p} · ${q} = ${p * q}. Итог: ${correct}.`
    };
}

// (x−p)(x+q) -> x² + (q−p)x − pq
function genExpandBinomialByBinomialMixedSigns() {
    const p = rand(1, 9);
    const q = rand(1, 9);
    const correct = polyStr([{ coef: 1, deg: 2 }, { coef: q - p, deg: 1 }, { coef: -p * q, deg: 0 }]);
    const taskExpr = `(x − ${p})(x + ${q})`;

    const d1 = polyStr([{ coef: 1, deg: 2 }, { coef: q - p, deg: 1 }, { coef: p * q, deg: 0 }]);
    const d2 = polyStr([{ coef: 1, deg: 2 }, { coef: p + q, deg: 1 }, { coef: -p * q, deg: 0 }]);
    const d3 = polyStr([{ coef: 1, deg: 2 }, { coef: p - q, deg: 1 }, { coef: -p * q, deg: 0 }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genExpandBinomialByBinomialMixedSigns();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "expandBinomialByBinomialMixedSigns",
        taskHTML: `<p class="task-question">${taskExpr}<br>Раскройте скобки методом «краб».</p>`,
        correctValue: correct,
        options,
        signature: `expandBinomialByBinomialMixedSigns:${p}:${q}`,
        why: `x · x = x². Средний член: x · ${q} + (−${p}) · x = ${q - p >= 0 ? "" : "−"}${Math.abs(q - p)}x. Свободный член: (−${p}) · ${q} = −${p * q}. Итог: ${correct}.`
    };
}

// дано (x+p)(x+q) -> найти только свободный член
function genFindConstantTermInExpansion() {
    const p = rand(1, 9);
    const q = rand(1, 9);
    const correct = numStr(p * q);
    const taskExpr = `(x + ${p})(x + ${q})`;

    const d1 = numStr(p + q);
    const d2 = numStr(p * q + 1);
    const d3 = numStr(-(p * q));

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindConstantTermInExpansion();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findConstantTermInExpansion",
        taskHTML: `<p class="task-question">${taskExpr}<br>Найдите свободный член произведения (без x).</p>`,
        correctValue: correct,
        options,
        signature: `findConstantTermInExpansion:${p}:${q}`,
        why: `Свободный член произведения — произведение свободных членов скобок: ${p} · ${q} = ${correct}.`
    };
}

// дано (x+p)(x+q) -> найти только коэффициент при x
function genFindLinearCoefficientInExpansion() {
    const p = rand(1, 9);
    const q = rand(1, 9);
    const correct = numStr(p + q);
    const taskExpr = `(x + ${p})(x + ${q})`;

    const d1 = numStr(p * q);
    const d2 = numStr(p + q + 1);
    const d3 = numStr(Math.abs(p - q));

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindLinearCoefficientInExpansion();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findLinearCoefficientInExpansion",
        taskHTML: `<p class="task-question">${taskExpr}<br>Найдите коэффициент при x в произведении.</p>`,
        correctValue: correct,
        options,
        signature: `findLinearCoefficientInExpansion:${p}:${q}`,
        why: `Коэффициент при x — сумма чисел в скобках: ${p} + ${q} = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// (ax+p)(x+q), a≠1 -> ax² + (aq+p)x + pq
function genExpandBinomialByBinomialWithLeadingCoef() {
    const a = rand(2, 5);
    const p = nonZeroRand(-9, 9);
    const q = nonZeroRand(-9, 9);
    const correct = polyStr([{ coef: a, deg: 2 }, { coef: a * q + p, deg: 1 }, { coef: p * q, deg: 0 }]);
    const taskExpr = `(${a}x ${p >= 0 ? "+" : "−"} ${Math.abs(p)})(x ${q >= 0 ? "+" : "−"} ${Math.abs(q)})`;

    const d1 = polyStr([{ coef: a, deg: 2 }, { coef: q + p, deg: 1 }, { coef: p * q, deg: 0 }]);
    const d2 = polyStr([{ coef: a, deg: 2 }, { coef: a * q + p, deg: 1 }, { coef: a * p * q, deg: 0 }]);
    const d3 = polyStr([{ coef: a, deg: 2 }, { coef: a * p + q, deg: 1 }, { coef: p * q, deg: 0 }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genExpandBinomialByBinomialWithLeadingCoef();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "expandBinomialByBinomialWithLeadingCoef",
        taskHTML: `<p class="task-question">${taskExpr}<br>Раскройте скобки методом «краб».</p>`,
        correctValue: correct,
        options,
        signature: `expandBinomialByBinomialWithLeadingCoef:${a}:${p}:${q}`,
        why: `${a}x · x = ${a}x². Средний член: ${a}x · (${numStr(q)}) + (${numStr(p)}) · x = ${numStr(a * q + p)}x. Свободный член: (${numStr(p)}) · (${numStr(q)}) = ${numStr(p * q)}. Итог: ${correct}.`
    };
}

// (x²+px+q)(x+r) -> полное раскрытие с приведением подобных
function genExpandTrinomialByBinomial() {
    const p = nonZeroRand(-6, 6);
    const q = nonZeroRand(-6, 6);
    const r = nonZeroRand(-6, 6);
    const c2 = p + r;
    const c1 = p * r + q;
    const c0 = q * r;
    const correct = polyStr([{ coef: 1, deg: 3 }, { coef: c2, deg: 2 }, { coef: c1, deg: 1 }, { coef: c0, deg: 0 }]);
    const taskExpr = `(x² ${p >= 0 ? "+" : "−"} ${Math.abs(p)}x ${q >= 0 ? "+" : "−"} ${Math.abs(q)})(x ${r >= 0 ? "+" : "−"} ${Math.abs(r)})`;

    const d1 = polyStr([{ coef: 1, deg: 3 }, { coef: c2, deg: 2 }, { coef: p + q, deg: 1 }, { coef: c0, deg: 0 }]);
    const d2 = polyStr([{ coef: 1, deg: 3 }, { coef: c2, deg: 2 }, { coef: c1, deg: 1 }, { coef: q + r, deg: 0 }]);
    const d3 = polyStr([{ coef: 1, deg: 3 }, { coef: p * r, deg: 2 }, { coef: c1, deg: 1 }, { coef: c0, deg: 0 }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genExpandTrinomialByBinomial();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "expandTrinomialByBinomial",
        taskHTML: `<p class="task-question">${taskExpr}<br>Раскройте скобки и приведите подобные.</p>`,
        correctValue: correct,
        options,
        signature: `expandTrinomialByBinomial:${p}:${q}:${r}`,
        why: `x²-коэффициент: ${numStr(p)} + ${numStr(r)} = ${numStr(c2)}. x-коэффициент: ${numStr(p)} · ${numStr(r)} + ${numStr(q)} = ${numStr(p * r)} + ${numStr(q)} = ${numStr(c1)}. Свободный член: ${numStr(q)} · ${numStr(r)} = ${numStr(c0)}. Итог: ${correct}.`
    };
}

// полное раскрытие с одним пропущенным коэффициентом -> найти его
function genFindMissingCoefficient() {
    const p = rand(1, 9);
    const q = rand(1, 9);
    const linCoef = p + q;
    const constCoef = p * q;
    const askLinear = pick([true, false]);

    const correct = numStr(askLinear ? linCoef : constCoef);
    const shownExpr = askLinear ? `x² + ?x + ${constCoef}` : `x² + ${linCoef}x + ?`;
    const taskExpr = `(x + ${p})(x + ${q}) = ${shownExpr}`;

    const d1 = numStr(askLinear ? constCoef : linCoef);
    const d2 = numStr((askLinear ? linCoef : constCoef) + 1);
    const d3 = numStr(Math.abs(p - q));

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindMissingCoefficient();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findMissingCoefficient",
        taskHTML: `<p class="task-question">${taskExpr}<br>Найдите пропущенный коэффициент.</p>`,
        correctValue: correct,
        options,
        signature: `findMissingCoefficient:${p}:${q}:${askLinear}`,
        why: askLinear
            ? `Коэффициент при x — сумма чисел в скобках: ${p} + ${q} = ${correct}.`
            : `Свободный член — произведение чисел в скобках: ${p} · ${q} = ${correct}.`
    };
}

// концептуальный вопрос про метод "каждый на каждый"
function genConceptCheckDistribution() {
    const correct = DISTRIBUTION_CONCEPT_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: DISTRIBUTION_CONCEPT_POOL[1], correct: false },
        { value: DISTRIBUTION_CONCEPT_POOL[2], correct: false },
        { value: DISTRIBUTION_CONCEPT_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptCheckDistribution",
        taskHTML: `<p class="task-question">Почему при умножении многочлена на многочлен нужно перемножить «каждый член на каждый»?</p>`,
        correctValue: correct,
        options,
        signature: `conceptCheckDistribution`,
        why: `Умножение распределяется по каждому слагаемому — если пропустить хотя бы одну пару членов, часть произведения потеряется.`
    };
}

const GENERATORS = {
    multiplyMonomialByBinomial: genMultiplyMonomialByBinomial,
    multiplyMonomialByTrinomial: genMultiplyMonomialByTrinomial,
    signOfProductConcept: genSignOfProductConcept,
    multiplyNegativeMonomialByBinomial: genMultiplyNegativeMonomialByBinomial,
    expandBinomialByBinomialSimple: genExpandBinomialByBinomialSimple,
    expandBinomialByBinomialMixedSigns: genExpandBinomialByBinomialMixedSigns,
    findConstantTermInExpansion: genFindConstantTermInExpansion,
    findLinearCoefficientInExpansion: genFindLinearCoefficientInExpansion,
    expandBinomialByBinomialWithLeadingCoef: genExpandBinomialByBinomialWithLeadingCoef,
    expandTrinomialByBinomial: genExpandTrinomialByBinomial,
    findMissingCoefficient: genFindMissingCoefficient,
    conceptCheckDistribution: genConceptCheckDistribution
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
            topic: "monomial-operations"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
