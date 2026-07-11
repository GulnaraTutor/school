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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["addSubSameDenomNumeric", "addSubSameDenomLetters", "multiplyNumeric", "multiplyLettersSimple"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["addSubDifferentDenomNumeric", "addSubDifferentDenomLettersCross", "divideNumeric", "divideLettersSimple", "multiplyWithCancelPowers"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["addSubDifferentDenomSharedFactor", "wholePlusFraction", "addSubSameDenomBracketNeeded", "divideWithFactoring", "multiplyLettersWithCancelBinomial"] }
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

function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    return b === 0 ? a : gcd(b, a % b);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = rand(0, i);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const LETTERS = ["a", "b", "c", "x", "y", "z", "m", "n"];

function pickLetters(count) {
    return shuffle(LETTERS).slice(0, count);
}

const SUPERSCRIPTS = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

function sup(n) {
    return String(n).split("").map(d => SUPERSCRIPTS[d]).join("");
}

function powVar(letter, exponent) {
    return exponent === 1 ? letter : letter + sup(exponent);
}

function term(coef, variable) {
    return coef === 1 ? variable : `${coef}${variable}`;
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

// taskValue у этого тренажёра — массив частей выражения: дроби ({num,den}) и операторы (строки "+","−","×","÷")
function exprToHTML(parts) {
    return parts.map(p => typeof p === "string" ? `<span class="op">${p}</span>` : valueToHTML(p)).join("");
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

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// 4/11 + 3/11 -> 7/11
function genAddSubSameDenomNumeric() {
    const n = rand(4, 15);
    let p, q;
    do { p = rand(1, n - 1); q = rand(1, n - 1); } while (p === q);
    const sign = pick(["+", "−"]);
    if (sign === "−" && p < q) [p, q] = [q, p];

    const result = sign === "+" ? p + q : p - q;
    const correct = { num: `${result}`, den: `${n}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${sign === "+" ? p - q : p + q}`, den: `${n}` }, correct: false },
        { value: { num: `${result}`, den: `${2 * n}` }, correct: false },
        { value: { num: `${p}`, den: `${n}` }, correct: false }
    ]);

    return {
        kind: "addSubSameDenomNumeric",
        taskValue: [{ num: `${p}`, den: `${n}` }, sign, { num: `${q}`, den: `${n}` }],
        correctValue: correct,
        options,
        signature: `addSubSameDenomNumeric:${p}:${q}:${n}:${sign}`,
        why: `Знаменатель ${n} общий — оставляем его как есть, а числители ${p} и ${q} ${sign === "+" ? "складываем" : "вычитаем"}: ${p}${sign}${q}=${result}.`
    };
}

// 2x/7 + 4x/7 -> 6x/7
function genAddSubSameDenomLetters() {
    const [L] = pickLetters(1);
    const n = rand(4, 12);
    let p, q;
    do { p = rand(1, 9); q = rand(1, 9); } while (p === q);
    const sign = pick(["+", "−"]);
    if (sign === "−" && p < q) [p, q] = [q, p];

    const result = sign === "+" ? p + q : p - q;
    const correct = { num: `${result}${L}`, den: `${n}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${sign === "+" ? p - q : p + q}${L}`, den: `${n}` }, correct: false },
        { value: { num: `${result}${L}`, den: `${2 * n}` }, correct: false },
        { value: { num: `${p}${L}`, den: `${n}` }, correct: false }
    ]);

    return {
        kind: "addSubSameDenomLetters",
        taskValue: [{ num: `${p}${L}`, den: `${n}` }, sign, { num: `${q}${L}`, den: `${n}` }],
        correctValue: correct,
        options,
        signature: `addSubSameDenomLetters:${L}:${p}:${q}:${n}:${sign}`,
        why: `Знаменатель ${n} не трогаем, а ${p}${L} и ${q}${L} ${sign === "+" ? "складываем" : "вычитаем"} как обычные слагаемые: получаем ${result}${L}.`
    };
}

// 4/9 x 3/8 -> 1/6
function genMultiplyNumeric() {
    let p, q, r, s;
    do {
        p = rand(2, 9); q = rand(2, 9); r = rand(2, 9); s = rand(2, 9);
    } while (s === r || p * s + r * q === p * r);

    const rawNum = p * r, rawDen = q * s;
    const g = gcd(rawNum, rawDen);
    const correct = { num: `${rawNum / g}`, den: `${rawDen / g}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${p * s + r * q}`, den: `${q * s}` }, correct: false },
        { value: { num: `${p * r}`, den: `${q}` }, correct: false },
        { value: { num: `${p * s}`, den: `${q * r}` }, correct: false }
    ]);

    return {
        kind: "multiplyNumeric",
        taskValue: [{ num: `${p}`, den: `${q}` }, "×", { num: `${r}`, den: `${s}` }],
        correctValue: correct,
        options,
        signature: `multiplyNumeric:${p}:${q}:${r}:${s}`,
        why: `Перемножаем числители (${p}×${r}=${rawNum}) и знаменатели (${q}×${s}=${rawDen}), затем сокращаем дробь ${rawNum}/${rawDen}.`
    };
}

// (px)/q x r/(sx) -> буква сокращается
function genMultiplyLettersSimple() {
    const [L] = pickLetters(1);
    let p, q, r, s;
    do {
        p = rand(2, 9); q = rand(2, 9); r = rand(2, 9); s = rand(2, 9);
    } while (p * s + r * q === p * r);

    const rawNum = p * r, rawDen = q * s;
    const g = gcd(rawNum, rawDen);
    const correct = { num: `${rawNum / g}`, den: `${rawDen / g}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${rawNum / g}${L}`, den: `${rawDen / g}` }, correct: false },
        { value: { num: `${p * r}`, den: `${q}` }, correct: false },
        { value: { num: `${p * s + r * q}`, den: `${q * s}` }, correct: false }
    ]);

    return {
        kind: "multiplyLettersSimple",
        taskValue: [{ num: `${p}${L}`, den: `${q}` }, "×", { num: `${r}`, den: `${s}${L}` }],
        correctValue: correct,
        options,
        signature: `multiplyLettersSimple:${L}:${p}:${q}:${r}:${s}`,
        why: `Буква ${L} есть и сверху, и снизу — сокращается полностью. Числа перемножаем и сокращаем: ${p}×${r}=${rawNum}, ${q}×${s}=${rawDen}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// 1/a + 1/b -> общий знаменатель a*b
function genAddSubDifferentDenomNumeric() {
    let a, b, p, q, sign, numResult;
    do {
        a = rand(2, 9); b = rand(2, 9);
        p = rand(1, 4); q = rand(1, 4);
        sign = pick(["+", "−"]);
        numResult = sign === "+" ? p * b + q * a : p * b - q * a;
    } while (a === b || p === q || numResult <= 0 || numResult === (sign === "+" ? p + q : p - q));

    const correct = { num: `${numResult}`, den: `${a * b}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${sign === "+" ? p + q : p - q}`, den: `${a * b}` }, correct: false },
        { value: { num: `${numResult}`, den: `${a + b}` }, correct: false },
        { value: { num: `${sign === "+" ? p * a + q * b : p * a - q * b}`, den: `${a * b}` }, correct: false }
    ]);

    return {
        kind: "addSubDifferentDenomNumeric",
        taskValue: [{ num: `${p}`, den: `${a}` }, sign, { num: `${q}`, den: `${b}` }],
        correctValue: correct,
        options,
        signature: `addSubDifferentDenomNumeric:${p}:${a}:${q}:${b}:${sign}`,
        why: `Общий знаменатель — ${a * b}. Первую дробь домножаем на ${b} (${p}×${b}=${p * b}), вторую — на ${a} (${q}×${a}=${q * a}).`
    };
}

// p/(aL) +/- q/(bM) -> разные буквы, полное домножение
function genAddSubDifferentDenomLettersCross() {
    const [L, M] = pickLetters(2);
    const a = rand(2, 6), b = rand(2, 6);
    const p = rand(1, 9), q = rand(1, 9);
    const sign = pick(["+", "−"]);

    const correct = { num: `${p * b}${M} ${sign} ${q * a}${L}`, den: `${a * b}${L}${M}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${p * b}${M} ${sign === "+" ? "−" : "+"} ${q * a}${L}`, den: `${a * b}${L}${M}` }, correct: false },
        { value: { num: `${p}${M} ${sign} ${q}${L}`, den: `${a * b}${L}${M}` }, correct: false },
        { value: { num: `${p * b}${M} ${sign} ${q * a}${L}`, den: `${a * b}` }, correct: false }
    ]);

    return {
        kind: "addSubDifferentDenomLettersCross",
        taskValue: [{ num: `${p}`, den: `${a}${L}` }, sign, { num: `${q}`, den: `${b}${M}` }],
        correctValue: correct,
        options,
        signature: `addSubDifferentDenomLettersCross:${L}:${M}:${a}:${b}:${p}:${q}:${sign}`,
        why: `У знаменателей нет общих букв — домножаем первую дробь на ${b}${M}, вторую на ${a}${L}. Общий знаменатель: ${a * b}${L}${M}.`
    };
}

// p/q ÷ r/s -> переворачиваем вторую
function genDivideNumeric() {
    let p, q, r, s;
    do {
        p = rand(2, 9); q = rand(2, 9); r = rand(2, 9); s = rand(2, 9);
    } while (r === s || p === q || p * s === q * r);

    const rawNum = p * s, rawDen = q * r;
    const g = gcd(rawNum, rawDen);
    const correct = { num: `${rawNum / g}`, den: `${rawDen / g}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${p * r}`, den: `${q * s}` }, correct: false },
        { value: { num: `${q * r}`, den: `${p * s}` }, correct: false },
        { value: { num: `${q * s}`, den: `${p * r}` }, correct: false }
    ]);

    return {
        kind: "divideNumeric",
        taskValue: [{ num: `${p}`, den: `${q}` }, "÷", { num: `${r}`, den: `${s}` }],
        correctValue: correct,
        options,
        signature: `divideNumeric:${p}:${q}:${r}:${s}`,
        why: `Делим на дробь ${r}/${s} — значит умножаем на перевёрнутую ${s}/${r}: ${p}×${s}=${rawNum}, ${q}×${r}=${rawDen}, затем сокращаем.`
    };
}

// (pL)/q ÷ r/(sL) -> буква возводится во вторую степень
function genDivideLettersSimple() {
    const [L] = pickLetters(1);
    const p = rand(2, 9), q = rand(2, 9), r = rand(2, 9), s = rand(2, 9);

    const rawNum = p * s, rawDen = q * r;
    const g = gcd(rawNum, rawDen);
    const correct = { num: `${rawNum / g}${powVar(L, 2)}`, den: `${rawDen / g}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${p * r}${L}`, den: `${q * s}${L}` }, correct: false },
        { value: { num: `${rawNum / g}`, den: `${rawDen / g}${L}` }, correct: false },
        { value: { num: `${q * r}`, den: `${p * s}${powVar(L, 2)}` }, correct: false }
    ]);

    return {
        kind: "divideLettersSimple",
        taskValue: [{ num: `${p}${L}`, den: `${q}` }, "÷", { num: `${r}`, den: `${s}${L}` }],
        correctValue: correct,
        options,
        signature: `divideLettersSimple:${L}:${p}:${q}:${r}:${s}`,
        why: `Переворачиваем вторую дробь и умножаем: (${p}${L}/${q})×(${s}${L}/${r}). Буквы ${L} перемножаются между собой и остаются в степени 2.`
    };
}

// (pA²)/(qB) x (rB²)/(sA) -> степени частично сокращаются
function genMultiplyWithCancelPowers() {
    const [A, B] = pickLetters(2);
    const p = rand(2, 9), q = rand(2, 9), r = rand(2, 9);
    let s = rand(2, 9);
    if (s === r) s = s === 9 ? s - 1 : s + 1;

    const rawNum = p * r, rawDen = q * s;
    const g = gcd(rawNum, rawDen);
    const correct = { num: `${rawNum / g}${A}${B}`, den: `${rawDen / g}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${rawNum / g}`, den: `${rawDen / g}` }, correct: false },
        { value: { num: `${rawNum / g}${powVar(A, 2)}`, den: `${rawDen / g}${B}` }, correct: false },
        { value: { num: `${p * r}${A}${B}`, den: `${q * r}` }, correct: false }
    ]);

    return {
        kind: "multiplyWithCancelPowers",
        taskValue: [{ num: `${p}${powVar(A, 2)}`, den: `${q}${B}` }, "×", { num: `${r}${powVar(B, 2)}`, den: `${s}${A}` }],
        correctValue: correct,
        options,
        signature: `multiplyWithCancelPowers:${A}:${B}:${p}:${q}:${r}:${s}`,
        why: `Из ${A}² и ${A} одна степень уходит, остаётся ${A}. Так же с ${B}² и ${B} остаётся ${B}. Числа ${p}×${r} и ${q}×${s} сокращаем.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// p/(LM) +/- q/(LN) -> общая буква, домножаем только на недостающее
function genAddSubDifferentDenomSharedFactor() {
    const [L, M, N] = pickLetters(3);
    let p = rand(1, 9), q = rand(1, 9);
    if (p === q) q = q === 9 ? q - 1 : q + 1;
    const sign = pick(["+", "−"]);

    const correct = { num: `${p}${N} ${sign} ${q}${M}`, den: `${L}${M}${N}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${p}${M} ${sign} ${q}${N}`, den: `${L}${M}${N}` }, correct: false },
        { value: { num: `${p}${N} ${sign} ${q}${M}`, den: `${M}${N}` }, correct: false },
        { value: { num: `${p}${L}${N} ${sign} ${q}${L}${M}`, den: `${L}${M}${N}` }, correct: false }
    ]);

    return {
        kind: "addSubDifferentDenomSharedFactor",
        taskValue: [{ num: `${p}`, den: `${L}${M}` }, sign, { num: `${q}`, den: `${L}${N}` }],
        correctValue: correct,
        options,
        signature: `addSubDifferentDenomSharedFactor:${L}:${M}:${N}:${p}:${q}:${sign}`,
        why: `Буква ${L} есть в обоих знаменателях — на неё домножать не нужно. Первую дробь домножаем только на ${N}, вторую — только на ${M}.`
    };
}

// wL + p/q -> целое приводим к дроби со знаменателем q
function genWholePlusFraction() {
    const [L] = pickLetters(1);
    const w = rand(2, 9), q = rand(2, 9);
    let p = rand(1, 9);
    if (p === w * q) p = p === 9 ? p - 1 : p + 1;

    const correct = { num: `${w * q}${L} + ${p}`, den: `${q}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${w}${L} + ${p}`, den: `${q}` }, correct: false },
        { value: { num: `${w * q}${L} + ${p}`, den: `${q * q}` }, correct: false },
        { value: { num: `${p}${L} + ${w * q}`, den: `${q}` }, correct: false }
    ]);

    return {
        kind: "wholePlusFraction",
        taskValue: [`${w}${L}`, "+", { num: `${p}`, den: `${q}` }],
        correctValue: correct,
        options,
        signature: `wholePlusFraction:${L}:${w}:${p}:${q}`,
        why: `${w}${L} — это то же самое, что ${w}${L}/1. Домножаем числитель и знаменатель на ${q}, чтобы знаменатель совпал: получаем (${w * q}${L})/${q}, дальше складываем с ${p}/${q}.`
    };
}

// (p1L+p2)/(nM) - (q1L-q2)/(nM) -> нужны скобки
function genAddSubSameDenomBracketNeeded() {
    const [L, M] = pickLetters(2);
    const n = rand(2, 6);
    let p1 = rand(3, 9), q1 = rand(1, p1 - 1);
    const p2 = rand(1, 9), q2 = rand(1, 9);

    const correctNum = (p1 - q1) + (p2 + q2) === 0 ? null : (p1 - q1);
    const resultCoef = p1 - q1;
    const resultConst = p2 + q2;
    const correct = { num: `${resultCoef}${L} + ${resultConst}`, den: `${n}${M}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${resultCoef}${L} + ${p2 - q2}`, den: `${n}${M}` }, correct: false },
        { value: { num: `${p1 + q1}${L} + ${resultConst}`, den: `${n}${M}` }, correct: false },
        { value: { num: `${q1 - p1}${L} + ${q2 + p2}`, den: `${n}${M}` }, correct: false }
    ]);

    return {
        kind: "addSubSameDenomBracketNeeded",
        taskValue: [{ num: `${p1}${L} + ${p2}`, den: `${n}${M}` }, "−", { num: `${q1}${L} − ${q2}`, den: `${n}${M}` }],
        correctValue: correct,
        options,
        signature: `addSubSameDenomBracketNeeded:${L}:${M}:${n}:${p1}:${p2}:${q1}:${q2}`,
        why: `Минус относится ко всему второму числителю: −(${q1}${L} − ${q2}) = −${q1}${L} + ${q2}. Складываем с первым числителем: (${p1}−${q1})${L} + (${p2}+${q2}) = ${resultCoef}${L} + ${resultConst}.`
    };
}

// (L²-n²)/(kM) ÷ (L+n)/(k²M²) -> деление с разложением
function genDivideWithFactoring() {
    const [L, M] = pickLetters(2);
    const n = rand(2, 9), k = rand(2, 6);

    const correct = `${k}${M}(${L} − ${n})`;

    const options = shuffle([
        { value: correct, correct: true },
        { value: `${k}${M}(${L} + ${n})`, correct: false },
        { value: `${L} − ${n}`, correct: false },
        { value: `${k * k}${powVar(M, 2)}(${L} − ${n})`, correct: false }
    ]);

    return {
        kind: "divideWithFactoring",
        taskValue: [{ num: `${powVar(L, 2)} − ${n * n}`, den: `${k}${M}` }, "÷", { num: `${L} + ${n}`, den: `${k * k}${powVar(M, 2)}` }],
        correctValue: correct,
        options,
        signature: `divideWithFactoring:${L}:${M}:${n}:${k}`,
        why: `Раскладываем ${L}²−${n * n} = (${L}−${n})(${L}+${n}). Делим — значит умножаем на перевёрнутую дробь: скобка (${L}+${n}) сокращается, ${k * k}${powVar(M, 2)}/${k}${M} даёт ${k}${M}. Итог: ${k}${M}(${L}−${n}).`
    };
}

// p(M+n)/L x qL/(r(M+n)) -> сокращается и буква, и скобка
function genMultiplyLettersWithCancelBinomial() {
    const [L, M] = pickLetters(2);
    const n = rand(2, 9);
    const p = rand(2, 9), q = rand(2, 9), r = rand(2, 9);

    const rawNum = p * q, rawDen = r;
    const g = gcd(rawNum, rawDen);
    const correct = { num: `${rawNum / g}`, den: `${rawDen / g}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${rawNum / g}(${M} + ${n})`, den: `${rawDen / g}` }, correct: false },
        { value: { num: `${rawNum / g}${L}`, den: `${rawDen / g}` }, correct: false },
        { value: { num: `${p}`, den: `${r}` }, correct: false }
    ]);

    return {
        kind: "multiplyLettersWithCancelBinomial",
        taskValue: [{ num: `${p}(${M} + ${n})`, den: `${L}` }, "×", { num: `${q}${L}`, den: `${r}(${M} + ${n})` }],
        correctValue: correct,
        options,
        signature: `multiplyLettersWithCancelBinomial:${L}:${M}:${n}:${p}:${q}:${r}`,
        why: `Буква ${L} и скобка (${M}+${n}) есть и сверху, и снизу — обе сокращаются полностью. Остаются только числа ${p}×${q} и ${r}, которые сокращаем.`
    };
}

const GENERATORS = {
    addSubSameDenomNumeric: genAddSubSameDenomNumeric,
    addSubSameDenomLetters: genAddSubSameDenomLetters,
    multiplyNumeric: genMultiplyNumeric,
    multiplyLettersSimple: genMultiplyLettersSimple,
    addSubDifferentDenomNumeric: genAddSubDifferentDenomNumeric,
    addSubDifferentDenomLettersCross: genAddSubDifferentDenomLettersCross,
    divideNumeric: genDivideNumeric,
    divideLettersSimple: genDivideLettersSimple,
    multiplyWithCancelPowers: genMultiplyWithCancelPowers,
    addSubDifferentDenomSharedFactor: genAddSubDifferentDenomSharedFactor,
    wholePlusFraction: genWholePlusFraction,
    addSubSameDenomBracketNeeded: genAddSubSameDenomBracketNeeded,
    divideWithFactoring: genDivideWithFactoring,
    multiplyLettersWithCancelBinomial: genMultiplyLettersWithCancelBinomial
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

    taskDisplayEl.innerHTML = exprToHTML(task.taskValue);

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
            taskHTML: exprToHTML(currentTask.taskValue),
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
            topic: "fraction-operations"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
