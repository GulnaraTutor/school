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
let noviceSequence = []; // порядок "с скобками / без скобок" на лёгком уровне, перемешивается раз в игру

const TOTAL_ROUNDS = 15;
const START_LIVES = 3;

// =====================
// УРОВНИ СЛОЖНОСТИ
// =====================
const LEVELS = {
    novice: { label: "Лёгкий",  from: 1,  to: 5 },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["diffSquaresLinear", "perfectSquareOverMonomial", "trinomialOverDiffSquares", "signFlipCommonFactor", "sumDiffCubes", "squareOverLinearCommonFactor"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["groupingFactor", "signFlipIdentity", "cubesFactorReciprocal", "diffSquaresSignFlip", "powerFactorExtraction", "diffSquaresOverSquaredLinear"] }
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

// powVar("x", 1) -> "x", powVar("x", 3) -> "x³"
function powVar(letter, exponent) {
    return exponent === 1 ? letter : letter + sup(exponent);
}

// term(1, "x") -> "x", term(3, "x") -> "3x"  (не показываем коэффициент 1)
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
// ГЕНЕРАТОРЫ ЗАДАНИЙ — ЛЁГКИЙ УРОВЕНЬ, БЕЗ СКОБОК
// =====================

// 10xz / 15yz -> 2x / 3y  (числа + общая буква сокращаются)
function genPlainA() {
    const [L1, L2, Lc] = pickLetters(3);

    let p, q;
    do { p = rand(2, 9); q = rand(2, 9); } while (gcd(p, q) !== 1 || p === q);
    const g = rand(2, 6);
    const c1 = p * g, c2 = q * g;

    const correct = { num: `${p}${L1}`, den: `${q}${L2}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${c1}${L1}`, den: `${q}${L2}` }, correct: false },
        { value: { num: `${p}${L2}`, den: `${q}${L1}` }, correct: false },
        { value: { num: `${q}${L1}`, den: `${p}${L2}` }, correct: false }
    ]);

    return {
        kind: "plainA",
        taskValue: { num: `${c1}${L1}${Lc}`, den: `${c2}${L2}${Lc}` },
        correctValue: correct,
        options,
        signature: `plainA:${c1}:${c2}:${L1}:${L2}:${Lc}`,
        why: `Общий множитель чисел ${c1} и ${c2} — это ${g}. Буква ${Lc} есть и сверху, и снизу — сокращаем её полностью. Получаем ${p}${L1}/${q}${L2}.`
    };
}

// 2ay³ / −4a²b -> y³ / (−2ab)  (буква сокращается частично, знак сохраняется)
function genPlainB() {
    const [A, Y, B] = pickLetters(3);

    let p, q;
    do { p = rand(2, 9); q = rand(2, 9); } while (gcd(p, q) !== 1 || p === q);
    const g = rand(2, 6);
    const c1 = p * g, c2 = q * g;
    const e = rand(2, 3);
    const sign = Math.random() < 0.5 ? "−" : "";

    const correct = { num: `${p}${powVar(Y, e)}`, den: `${sign}${q}${A}${B}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${p}${A}${powVar(Y, e)}`, den: `${sign}${q}${B}` }, correct: false },
        { value: { num: `${p}${powVar(Y, e)}`, den: `${sign}${q}${B}` }, correct: false },
        { value: { num: `${p}${powVar(Y, e)}`, den: `${sign === "−" ? "" : "−"}${q}${A}${B}` }, correct: false }
    ]);

    return {
        kind: "plainB",
        taskValue: { num: `${c1}${A}${powVar(Y, e)}`, den: `${sign}${c2}${A}²${B}` },
        correctValue: correct,
        options,
        signature: `plainB:${c1}:${c2}:${A}:${Y}:${B}:${e}:${sign}`,
        why: `Общий множитель чисел ${c1} и ${c2} — это ${g}. Буква ${A} есть в степени 1 сверху и 2 снизу — одна степень сокращается, снизу остаётся ${A}. Буквы ${Y} и ${B} общих множителей не имеют, остаются как есть.`
    };
}

// =====================
// ГЕНЕРАТОРЫ ЗАДАНИЙ — ЛЁГКИЙ УРОВЕНЬ, СО СКОБКАМИ
// =====================

// a(b−2) / 5(b−2) -> a / 5  (скобка сокращается полностью)
function genBracketC() {
    const [L1, L2] = pickLetters(2);
    const k = rand(2, 9);
    const sign = Math.random() < 0.5 ? "+" : "−";
    const n = rand(2, 9);

    const binom = `${L2} ${sign} ${k}`;
    const correct = { num: `${L1}`, den: `${n}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${L1}`, den: `${n}(${binom})` }, correct: false },
        { value: { num: `${n}`, den: `${L1}` }, correct: false },
        { value: { num: `${L2}`, den: `${n}` }, correct: false }
    ]);

    return {
        kind: "bracketC",
        taskValue: { num: `${L1}(${binom})`, den: `${n}(${binom})` },
        correctValue: correct,
        options,
        signature: `bracketC:${L1}:${L2}:${k}:${sign}:${n}`,
        why: `Скобка (${binom}) есть и сверху, и снизу — сокращаем её полностью. Остаётся ${L1}/${n}.`
    };
}

// 15a(a−b) / 20a²(a−b) -> 3 / (4a)  (число + степень буквы + скобка сокращаются)
function genBracketD() {
    const [L, M] = pickLetters(2);
    const sign = Math.random() < 0.5 ? "+" : "−";

    let p, q;
    do { p = rand(2, 9); q = rand(2, 9); } while (gcd(p, q) !== 1 || p === q);
    const g = rand(2, 6);
    const c1 = p * g, c2 = q * g;

    const binom = `${L} ${sign} ${M}`;
    const correct = { num: `${p}`, den: `${q}${L}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${p}${L}`, den: `${q}` }, correct: false },
        { value: { num: `${p}`, den: `${q}` }, correct: false },
        { value: { num: `${q}`, den: `${p}${L}` }, correct: false }
    ]);

    return {
        kind: "bracketD",
        taskValue: { num: `${c1}${L}(${binom})`, den: `${c2}${L}²(${binom})` },
        correctValue: correct,
        options,
        signature: `bracketD:${L}:${M}:${sign}:${c1}:${c2}`,
        why: `Сначала сокращаем числа: общий множитель ${c1} и ${c2} — это ${g}, получаем ${p} и ${q}. Скобка (${binom}) сокращается полностью. Буква ${L} есть в степени 1 сверху и 2 снизу — одна степень сокращается, снизу остаётся ${L}. Итог: ${p}/(${q}${L}).`
    };
}

// =====================
// ГЕНЕРАТОРЫ ЗАДАНИЙ — СРЕДНИЙ УРОВЕНЬ
// =====================

// (y² − 16) / (3y + 12) -> (y − 4) / 3
function genDiffSquaresLinear() {
    const [L] = pickLetters(1);
    const n = rand(3, 9);
    const k = rand(2, 6);

    const correct = { num: `${L} − ${n}`, den: `${k}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${L} + ${n}`, den: `${k}` }, correct: false },
        { value: { num: `${L}² − ${n * n}`, den: `${k}` }, correct: false },
        { value: { num: `${n} − ${L}`, den: `${k}` }, correct: false }
    ]);

    return {
        kind: "diffSquaresLinear",
        taskValue: { num: `${L}² − ${n * n}`, den: `${k}${L} + ${k * n}` },
        correctValue: correct,
        options,
        signature: `diffSquaresLinear:${L}:${n}:${k}`,
        why: `Числитель — разность квадратов: ${L}²−${n * n} = (${L}−${n})(${L}+${n}). Знаменатель раскладывается как ${k}(${L}+${n}). Сокращаем (${L}+${n}), остаётся (${L}−${n})/${k}.`
    };
}

// (c+2)² / (7c² + 14c) -> (c+2) / (7c)
function genPerfectSquareOverMonomial() {
    const [L] = pickLetters(1);
    const n = rand(2, 9);
    const k = rand(2, 6);

    const correct = { num: `${L} + ${n}`, den: `${k}${L}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${L} − ${n}`, den: `${k}${L}` }, correct: false },
        { value: { num: `(${L} + ${n})²`, den: `${k}${L}` }, correct: false },
        { value: { num: `${L} + ${n}`, den: `${k}` }, correct: false }
    ]);

    return {
        kind: "perfectSquareOverMonomial",
        taskValue: { num: `(${L} + ${n})²`, den: `${k}${L}² + ${k * n}${L}` },
        correctValue: correct,
        options,
        signature: `perfectSquareOverMonomial:${L}:${n}:${k}`,
        why: `Знаменатель раскладываем: ${k}${L}²+${k * n}${L} = ${k}${L}(${L}+${n}). Одна скобка (${L}+${n}) сокращается с числителем (${L}+${n})², остаётся (${L}+${n})/(${k}${L}).`
    };
}

// (a²+10a+25) / (a²−25) -> (a+5) / (a−5)
function genTrinomialOverDiffSquares() {
    const [L] = pickLetters(1);
    const n = rand(2, 9);

    const correct = { num: `${L} + ${n}`, den: `${L} − ${n}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${L} − ${n}`, den: `${L} + ${n}` }, correct: false },
        { value: { num: `${L} + ${n}`, den: `${L} + ${n}` }, correct: false },
        { value: { num: `(${L} + ${n})²`, den: `${L} − ${n}` }, correct: false }
    ]);

    return {
        kind: "trinomialOverDiffSquares",
        taskValue: { num: `${L}² + ${2 * n}${L} + ${n * n}`, den: `${L}² − ${n * n}` },
        correctValue: correct,
        options,
        signature: `trinomialOverDiffSquares:${L}:${n}`,
        why: `Числитель — квадрат суммы: ${L}²+${2 * n}${L}+${n * n} = (${L}+${n})². Знаменатель — разность квадратов: ${L}²−${n * n} = (${L}−${n})(${L}+${n}). Сокращаем (${L}+${n}), остаётся (${L}+${n})/(${L}−${n}).`
    };
}

// (7b − 14b²) / (42b² − 21b) -> −1/3  (буква сокращается полностью, меняется знак)
function genSignFlipCommonFactor() {
    const [L] = pickLetters(1);

    let p0, q0;
    do { p0 = rand(2, 9); q0 = rand(2, 9); } while (p0 === q0);
    const k = rand(2, 6);
    const g = gcd(p0, q0);
    const p = p0 / g, q = q0 / g;

    const correct = { num: `−${p}`, den: `${q}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${p}`, den: `${q}` }, correct: false },
        { value: { num: `−${q}`, den: `${p}` }, correct: false },
        { value: { num: `${q0}`, den: `${p0}` }, correct: false }
    ]);

    return {
        kind: "signFlipCommonFactor",
        taskValue: { num: `${p0}${L} − ${p0 * k}${L}²`, den: `${q0 * k}${L}² − ${q0}${L}` },
        correctValue: correct,
        options,
        signature: `signFlipCommonFactor:${L}:${p0}:${q0}:${k}`,
        why: `Выносим общий множитель ${L}: ${p0}${L}(1−${k}${L}) сверху и ${q0}${L}(${k}${L}−1) снизу. Скобки (1−${k}${L}) и (${k}${L}−1) — противоположные, отличаются только знаком. После сокращения буквы ${L} и скобки остаётся −${p0}/${q0}, что после сокращения чисел равно −${p}/${q}.`
    };
}

// (a³−b³) / (a−b) -> a² + ab + b²
function genSumDiffCubes() {
    const [L, M] = pickLetters(2);

    const correct = `${L}² + ${L}${M} + ${M}²`;

    const options = shuffle([
        { value: correct, correct: true },
        { value: `${L}² − ${L}${M} + ${M}²`, correct: false },
        { value: `${L} + ${M}`, correct: false },
        { value: `${L}² + ${M}²`, correct: false }
    ]);

    return {
        kind: "sumDiffCubes",
        taskValue: { num: `${L}³ − ${M}³`, den: `${L} − ${M}` },
        correctValue: correct,
        options,
        signature: `sumDiffCubes:${L}:${M}`,
        why: `Разность кубов: a³−b³ = (a−b)(a²+ab+b²). Здесь a=${L}, b=${M}. Знаменатель (${L}−${M}) сокращается с одним из множителей, остаётся ${L}²+${L}${M}+${M}².`
    };
}

// (2a−2b)² / (a−b) -> 4(a−b)  ;  (3x+6y)² / (5x+10y) -> 9(x+2y)/5
function genSquareOverLinearCommonFactor() {
    const [A, B] = pickLetters(2);
    const sign = Math.random() < 0.5 ? "+" : "−";
    const k = rand(1, 4);
    const p = rand(2, 4);
    let q;
    do { q = rand(1, 6); } while (q === p * p);

    const g = gcd(p * p, q);
    const numCoef = (p * p) / g;
    const denCoef = q / g;

    const binom = `${A} ${sign} ${term(k, B)}`;
    const wrongSign = sign === "+" ? "−" : "+";
    const wrongBinom = `${A} ${wrongSign} ${term(k, B)}`;

    const makeVal = (coef, binomStr, den) => den === 1 ? `${term(coef, `(${binomStr})`)}` : { num: `${term(coef, `(${binomStr})`)}`, den: `${den}` };

    const correct = makeVal(numCoef, binom, denCoef);

    const options = shuffle([
        { value: correct, correct: true },
        { value: makeVal(numCoef, wrongBinom, denCoef), correct: false },        // перепутали знак в скобке
        { value: { num: `${term(p, `(${binom})`)}`, den: `${q}` }, correct: false },      // забыли возвести p в квадрат (числа не сокращены)
        { value: { num: `${term(q, `(${binom})`)}`, den: `${p * p}` }, correct: false }   // перевернули дробь (числа не сокращены)
    ]);

    return {
        kind: "squareOverLinearCommonFactor",
        taskValue: { num: `(${term(p, A)} ${sign} ${term(p * k, B)})²`, den: `${term(q, A)} ${sign} ${term(q * k, B)}` },
        correctValue: correct,
        options,
        signature: `squareOverLinearCommonFactor:${A}:${B}:${sign}:${k}:${p}:${q}`,
        why: `Числитель — квадрат общего множителя: (${term(p, A)} ${sign} ${term(p * k, B)})² = (${p}(${binom}))² = ${p * p}(${binom})². Знаменатель: ${term(q, A)} ${sign} ${term(q * k, B)} = ${q}(${binom}). Сокращаем одну скобку (${binom}), остаётся ${p * p}(${binom})/${q}, что после сокращения чисел равно ${numCoef}(${binom})${denCoef === 1 ? "" : `/${denCoef}`}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ ЗАДАНИЙ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// (2x+bx−2y−by) / (7x−7y) -> (b+2) / 7  (группировка слагаемых)
function genGroupingFactor() {
    const [X, Y] = pickLetters(2);
    const coefLetter = pick(LETTERS.filter(l => l !== X && l !== Y));
    const n = rand(2, 9);
    const k = rand(2, 9);

    const correct = { num: `${coefLetter} + ${n}`, den: `${k}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${coefLetter} − ${n}`, den: `${k}` }, correct: false },
        { value: { num: `${coefLetter} + ${n}`, den: `−${k}` }, correct: false },
        { value: { num: `${n}${coefLetter}`, den: `${k}` }, correct: false }
    ]);

    return {
        kind: "groupingFactor",
        taskValue: { num: `${n}${X} + ${coefLetter}${X} − ${n}${Y} − ${coefLetter}${Y}`, den: `${k}${X} − ${k}${Y}` },
        correctValue: correct,
        options,
        signature: `groupingFactor:${X}:${Y}:${coefLetter}:${n}:${k}`,
        why: `Группируем слагаемые числителя: ${X}(${n}+${coefLetter}) − ${Y}(${n}+${coefLetter}) = (${n}+${coefLetter})(${X}−${Y}). Знаменатель: ${k}(${X}−${Y}). Сокращаем (${X}−${Y}), остаётся (${coefLetter}+${n})/${k}.`
    };
}

// варианты по образцу №40: смена знака в скобках даёт −1, 1 или (L+M)
function genSignFlipIdentity() {
    const [L, M] = pickLetters(2);
    const variant = pick(["v1", "v2", "v3", "v4"]);

    let taskValue, correct, why;

    if (variant === "v1") {
        taskValue = { num: `${L} − ${M}`, den: `${M} − ${L}` };
        correct = "−1";
        why = `Знаменатель — это числитель с обратным знаком: ${M}−${L} = −(${L}−${M}). Дробь вида k/(−k) всегда равна −1.`;
    } else if (variant === "v2") {
        taskValue = { num: `(${L} − ${M})²`, den: `(${M} − ${L})²` };
        correct = "1";
        why = `(${M}−${L}) = −(${L}−${M}), но после возведения в квадрат знак пропадает: (${M}−${L})² = (${L}−${M})². Числитель и знаменатель равны, дробь равна 1.`;
    } else if (variant === "v3") {
        taskValue = { num: `(−${L} − ${M})²`, den: `${L} + ${M}` };
        correct = `${L} + ${M}`;
        why = `(−${L}−${M})² = (${L}+${M})², так как при возведении в квадрат знак не важен. Получаем (${L}+${M})²/(${L}+${M}) = ${L}+${M}.`;
    } else {
        taskValue = { num: `−${L} − ${M}`, den: `${L} + ${M}` };
        correct = "−1";
        why = `Числитель −${L}−${M} = −(${L}+${M}) — это знаменатель с обратным знаком. Дробь вида (−k)/k всегда равна −1.`;
    }

    const pool = ["1", "−1", `${L} + ${M}`, `−(${L} + ${M})`].filter(v => v !== correct);

    const options = shuffle([
        { value: correct, correct: true },
        { value: pool[0], correct: false },
        { value: pool[1], correct: false },
        { value: pool[2], correct: false }
    ]);

    return {
        kind: "signFlipIdentity",
        taskValue,
        correctValue: correct,
        options,
        signature: `signFlipIdentity:${variant}:${L}:${M}`,
        why
    };
}

// (a²−ab+b²)/(a³+b³) -> 1/(a+b)  ИЛИ  (b+2)/(b³+8) -> 1/(b²−2b+4)
function genCubesFactorReciprocal() {
    const sub = pick(["trinomial", "linear"]);

    if (sub === "trinomial") {
        const [L, M] = pickLetters(2);
        const correct = { num: "1", den: `${L} + ${M}` };

        const options = shuffle([
            { value: correct, correct: true },
            { value: { num: "1", den: `${L} − ${M}` }, correct: false },
            { value: { num: `${L} + ${M}`, den: "1" }, correct: false },
            { value: { num: "1", den: `${L}² + ${M}²` }, correct: false }
        ]);

        return {
            kind: "cubesFactorReciprocal",
            taskValue: { num: `${L}² − ${L}${M} + ${M}²`, den: `${L}³ + ${M}³` },
            correctValue: correct,
            options,
            signature: `cubesFactorReciprocal:trinomial:${L}:${M}`,
            why: `Знаменатель — сумма кубов: ${L}³+${M}³ = (${L}+${M})(${L}²−${L}${M}+${M}²). Числитель совпадает со вторым множителем — сокращаем его, остаётся 1/(${L}+${M}).`
        };
    }

    const [L] = pickLetters(1);
    const n = rand(2, 9);
    const correct = { num: "1", den: `${L}² − ${n}${L} + ${n * n}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: "1", den: `${L}² + ${n}${L} + ${n * n}` }, correct: false },
        { value: { num: `${L}² − ${n}${L} + ${n * n}`, den: "1" }, correct: false },
        { value: { num: "1", den: `${L}² − ${n * n}` }, correct: false }
    ]);

    return {
        kind: "cubesFactorReciprocal",
        taskValue: { num: `${L} + ${n}`, den: `${L}³ + ${n * n * n}` },
        correctValue: correct,
        options,
        signature: `cubesFactorReciprocal:linear:${L}:${n}`,
        why: `Знаменатель — сумма кубов: ${L}³+${n * n * n} = (${L}+${n})(${L}²−${n}${L}+${n * n}). Числитель совпадает с первым множителем — сокращаем его, остаётся 1/(${L}²−${n}${L}+${n * n}).`
    };
}

// (25−a²) / (3a−15) -> −(a+5) / 3
function genDiffSquaresSignFlip() {
    const [L] = pickLetters(1);
    const n = rand(3, 9);
    const k = rand(2, 6);

    const correct = { num: `−${L} − ${n}`, den: `${k}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${L} + ${n}`, den: `${k}` }, correct: false },
        { value: { num: `${L} − ${n}`, den: `${k}` }, correct: false },
        { value: { num: `−${L} + ${n}`, den: `${k}` }, correct: false }
    ]);

    return {
        kind: "diffSquaresSignFlip",
        taskValue: { num: `${n * n} − ${L}²`, den: `${k}${L} − ${k * n}` },
        correctValue: correct,
        options,
        signature: `diffSquaresSignFlip:${L}:${n}:${k}`,
        why: `Числитель ${n * n}−${L}² — это разность квадратов с переставленными слагаемыми: = −(${L}²−${n * n}) = −(${L}−${n})(${L}+${n}). Знаменатель: ${k}${L}−${k * n} = ${k}(${L}−${n}). Сокращаем (${L}−${n}), остаётся −(${L}+${n})/${k}.`
    };
}

// по образцу №44: (x⁶+x⁴)/(x⁴+x²) -> x²  ;  (x⁴−x⁶)/(x²−x⁴) -> −x²
function genPowerFactorExtraction() {
    const [L] = pickLetters(1);
    const e = rand(3, 5);
    const form = pick(["sum", "diff"]);

    let taskValue, correct, why;

    if (form === "sum") {
        taskValue = { num: `${powVar(L, e + 2)} + ${powVar(L, e)}`, den: `${powVar(L, e)} + ${powVar(L, e - 2)}` };
        correct = `${powVar(L, 2)}`;
        why = `Выносим общий множитель ${powVar(L, e)} в числителе и ${powVar(L, e - 2)} в знаменателе: числитель = ${powVar(L, e)}(${L}²+1), знаменатель = ${powVar(L, e - 2)}(${L}²+1). Скобки одинаковые — сокращаются. Остаётся ${powVar(L, e)}/${powVar(L, e - 2)} = ${powVar(L, 2)}.`;
    } else {
        taskValue = { num: `${powVar(L, e)} − ${powVar(L, e + 2)}`, den: `${powVar(L, e)} − ${powVar(L, e - 2)}` };
        correct = `−${powVar(L, 2)}`;
        why = `Выносим общий множитель: числитель = ${powVar(L, e)}(1−${L}²), знаменатель = ${powVar(L, e - 2)}(${L}²−1) = −${powVar(L, e - 2)}(1−${L}²). Скобки сокращаются, но остаётся минус: ${powVar(L, e)}/(−${powVar(L, e - 2)}) = −${powVar(L, 2)}.`;
    }

    const options = shuffle([
        { value: correct, correct: true },
        { value: form === "sum" ? `−${powVar(L, 2)}` : `${powVar(L, 2)}`, correct: false },
        { value: `${powVar(L, 4)}`, correct: false },
        { value: `${L}`, correct: false }
    ]);

    return {
        kind: "powerFactorExtraction",
        taskValue,
        correctValue: correct,
        options,
        signature: `powerFactorExtraction:${L}:${e}:${form}`,
        why
    };
}

// (4x²−y²) / (10x+5y)² -> (2x−y) / (25(2x+y))
function genDiffSquaresOverSquaredLinear() {
    const [A, B] = pickLetters(2);
    const m = rand(1, 4);
    const n = rand(1, 4);
    const q = rand(2, 6);

    const plusBinom = `${term(m, A)} + ${term(n, B)}`;
    const minusBinom = `${term(m, A)} − ${term(n, B)}`;

    const correct = { num: minusBinom, den: `${q * q}(${plusBinom})` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: plusBinom, den: `${q * q}(${plusBinom})` }, correct: false },   // перепутали знак в числителе
        { value: { num: minusBinom, den: `${q}(${plusBinom})` }, correct: false },      // забыли возвести множитель в квадрат
        { value: { num: `${q * q}(${minusBinom})`, den: `${plusBinom}` }, correct: false } // перепутали, где квадрат
    ]);

    return {
        kind: "diffSquaresOverSquaredLinear",
        taskValue: { num: `${term(m * m, powVar(A, 2))} − ${term(n * n, powVar(B, 2))}`, den: `(${term(q * m, A)} + ${term(q * n, B)})²` },
        correctValue: correct,
        options,
        signature: `diffSquaresOverSquaredLinear:${A}:${B}:${m}:${n}:${q}`,
        why: `Числитель — разность квадратов: ${term(m * m, powVar(A, 2))}−${term(n * n, powVar(B, 2))} = (${minusBinom})(${plusBinom}). Знаменатель — квадрат общего множителя: (${term(q * m, A)}+${term(q * n, B)})² = (${q}(${plusBinom}))² = ${q * q}(${plusBinom})². Сокращаем (${plusBinom}), остаётся (${minusBinom})/(${q * q}(${plusBinom})).`
    };
}

const GENERATORS = {
    plainA: genPlainA,
    plainB: genPlainB,
    bracketC: genBracketC,
    bracketD: genBracketD,
    diffSquaresLinear: genDiffSquaresLinear,
    perfectSquareOverMonomial: genPerfectSquareOverMonomial,
    trinomialOverDiffSquares: genTrinomialOverDiffSquares,
    signFlipCommonFactor: genSignFlipCommonFactor,
    sumDiffCubes: genSumDiffCubes,
    squareOverLinearCommonFactor: genSquareOverLinearCommonFactor,
    groupingFactor: genGroupingFactor,
    signFlipIdentity: genSignFlipIdentity,
    cubesFactorReciprocal: genCubesFactorReciprocal,
    diffSquaresSignFlip: genDiffSquaresSignFlip,
    powerFactorExtraction: genPowerFactorExtraction,
    diffSquaresOverSquaredLinear: genDiffSquaresOverSquaredLinear
};

function generateTask() {

    const levelKey = getLevelForRound(roundNumber);
    const cfg = LEVELS[levelKey];

    let result;
    let attempts = 0;

    do {
        let kind;
        if (levelKey === "novice") {
            const bucket = noviceSequence[roundNumber - 1];
            kind = bucket === "plain" ? pick(["plainA", "plainB"]) : pick(["bracketC", "bracketD"]);
        } else {
            kind = pick(cfg.kinds);
        }
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
    noviceSequence = shuffle(["plain", "plain", "bracket", "bracket", "bracket"]);
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

    taskDisplayEl.innerHTML = valueToHTML(task.taskValue);

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
            taskHTML: valueToHTML(currentTask.taskValue),
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
            topic: "reduce-fractions"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
