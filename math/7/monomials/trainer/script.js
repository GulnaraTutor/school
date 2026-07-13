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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["identifyCoefficient", "identifyLetterPart", "degreeOfMonomial", "classifyMonomialOrPolynomial"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["reduceMonomialToStandardForm", "identifyLikeTerms", "combineLikeTerms", "degreeOfPolynomial"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["standardFormPolynomial", "sumOfTwoPolynomials", "differenceOfTwoPolynomials", "conceptCheckLikeTerms"] }
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

// строит строку многочлена/одночлена из членов вида {coef, expA, expB} (буквы ограничены a,b)
function polynomialStr(terms) {
    const nonZero = terms.filter(t => t.coef !== 0);
    if (nonZero.length === 0) return "0";

    let result = "";
    nonZero.forEach((t, i) => {
        const absCoef = Math.abs(t.coef);
        let letters = "";
        if (t.expA > 0) letters += "a" + (t.expA > 1 ? sup(t.expA) : "");
        if (t.expB > 0) letters += "b" + (t.expB > 1 ? sup(t.expB) : "");

        let magStr;
        if (letters === "") magStr = String(absCoef);
        else if (absCoef === 1) magStr = letters;
        else magStr = absCoef + letters;

        if (i === 0) {
            result += (t.coef < 0 ? "−" : "") + magStr;
        } else {
            result += (t.coef < 0 ? " − " : " + ") + magStr;
        }
    });
    return result;
}

const LIKE_TERMS_CONCEPT_POOL = [
    "Потому что разные буквенные части (например a и a²) означают разные величины — их нельзя объединить в одно число",
    "Потому что складывать можно только положительные одночлены",
    "Потому что коэффициенты должны быть одинаковыми, а буквенная часть значения не имеет",
    "На самом деле складывать можно любые одночлены, независимо от буквенной части"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// дан одночлен стандартного вида -> назвать коэффициент
function genIdentifyCoefficient() {
    const coefPool = [1, -1, 2, -2, 3, -3, 5, -5, 7, -7];
    const coef = pick(coefPool);
    const expA = rand(1, 3);
    const expB = pick([0, 0, 1, 2]);
    const str = polynomialStr([{ coef, expA, expB }]);
    const correct = numStr(coef);

    const d1 = numStr(-coef);
    const d2 = numStr(expA);
    const d3 = numStr(coef + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genIdentifyCoefficient();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "identifyCoefficient",
        taskHTML: `<p class="task-question">${str}<br>Назовите коэффициент этого одночлена.</p>`,
        correctValue: correct,
        options,
        signature: `identifyCoefficient:${coef}:${expA}:${expB}`,
        why: (coef === 1 || coef === -1)
            ? `Числа не видно, но оно есть: коэффициент равен ${correct}.`
            : `Коэффициент — число перед буквами: ${correct}.`
    };
}

// дан одночлен -> назвать буквенную часть
function genIdentifyLetterPart() {
    const coef = nonZeroRand(-9, 9);
    const expA = rand(1, 3);
    const expB = pick([0, 1, 2]);
    const str = polynomialStr([{ coef, expA, expB }]);
    const correct = polynomialStr([{ coef: 1, expA, expB }]);

    const d1 = polynomialStr([{ coef: 1, expA: expA + 1, expB }]);
    const d2 = polynomialStr([{ coef: 1, expA, expB: expB + 1 }]);
    const d3 = numStr(coef);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genIdentifyLetterPart();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "identifyLetterPart",
        taskHTML: `<p class="task-question">${str}<br>Назовите буквенную часть этого одночлена.</p>`,
        correctValue: correct,
        options,
        signature: `identifyLetterPart:${coef}:${expA}:${expB}`,
        why: `Буквенная часть — всё, что стоит после коэффициента: ${correct}.`
    };
}

// дан одночлен с 1-2 буквами -> степень (сумма показателей)
function genDegreeOfMonomial() {
    const coef = nonZeroRand(-9, 9);
    const expA = rand(1, 4);
    const expB = rand(1, 3);
    const str = polynomialStr([{ coef, expA, expB }]);
    const correct = numStr(expA + expB);

    const d1 = numStr(expA);
    const d2 = numStr(expB);
    const d3 = numStr(expA + expB + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genDegreeOfMonomial();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "degreeOfMonomial",
        taskHTML: `<p class="task-question">${str}<br>Найдите степень этого одночлена.</p>`,
        correctValue: correct,
        options,
        signature: `degreeOfMonomial:${expA}:${expB}`,
        why: `Степень одночлена — сумма показателей всех букв: ${expA} + ${expB} = ${correct}.`
    };
}

// дано короткое выражение -> одночлен или многочлен
function genClassifyMonomialOrPolynomial() {
    const isMonomial = pick([true, false]);
    let str;

    if (isMonomial) {
        const coef = nonZeroRand(-9, 9);
        const expA = rand(1, 3);
        const expB = pick([0, 1, 2]);
        str = polynomialStr([{ coef, expA, expB }]);
    } else {
        const coef1 = nonZeroRand(-9, 9);
        const coef2 = nonZeroRand(-9, 9);
        const expA1 = rand(1, 3);
        let expA2 = rand(1, 3);
        while (expA2 === expA1) expA2 = rand(1, 3);
        str = polynomialStr([{ coef: coef1, expA: expA1, expB: 0 }, { coef: coef2, expA: expA2, expB: 0 }]);
    }

    const correct = isMonomial ? "Одночлен" : "Многочлен";

    const options = shuffle([
        { value: correct, correct: true },
        { value: isMonomial ? "Многочлен" : "Одночлен", correct: false }
    ]);

    return {
        kind: "classifyMonomialOrPolynomial",
        taskHTML: `<p class="task-question">${str}<br>Это одночлен или многочлен?</p>`,
        correctValue: correct,
        options,
        signature: `classifyMonomialOrPolynomial:${isMonomial}`,
        why: isMonomial
            ? `Это произведение числа и букв, без знаков + или − между отдельными слагаемыми — одночлен.`
            : `Здесь несколько слагаемых, разделённых знаком — это многочлен (сумма одночленов).`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// одночлен как разбросанное произведение -> стандартный вид
function genReduceMonomialToStandardForm() {
    const n1 = nonZeroRand(-9, 9);
    const n2 = nonZeroRand(-9, 9);
    const expA = rand(1, 2);
    const expB = pick([0, 1]);

    const coef = n1 * n2;
    const correct = polynomialStr([{ coef, expA, expB }]);

    const factors = [numStr(n1)];
    for (let i = 0; i < expA; i++) factors.push("a");
    if (expB) factors.push("b");
    factors.push(numStr(n2));
    const scattered = shuffle(factors).join(" · ");

    const d1 = polynomialStr([{ coef: n1 + n2, expA, expB }]);
    const d2 = polynomialStr([{ coef, expA: expA + 1, expB }]);
    const d3 = polynomialStr([{ coef: -coef, expA, expB }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genReduceMonomialToStandardForm();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "reduceMonomialToStandardForm",
        taskHTML: `<p class="task-question">${scattered}<br>Приведите одночлен к стандартному виду.</p>`,
        correctValue: correct,
        options,
        signature: `reduceMonomialToStandardForm:${n1}:${n2}:${expA}:${expB}`,
        why: `Числа: ${numStr(n1)} · ${numStr(n2)} = ${numStr(coef)}. Буквы: a встречается ${expA} раз(а)${expB ? ", b — один раз" : ""}. Итог: ${correct}.`
    };
}

// два одночлена -> подобные или нет
function genIdentifyLikeTerms() {
    const expA1 = rand(1, 3);
    const expB1 = pick([0, 1, 2]);
    const areLike = pick([true, false]);

    let expA2, expB2;
    if (areLike) {
        expA2 = expA1;
        expB2 = expB1;
    } else {
        do {
            expA2 = rand(1, 3);
            expB2 = pick([0, 1, 2]);
        } while (expA2 === expA1 && expB2 === expB1);
    }

    const coef1 = nonZeroRand(-9, 9);
    const coef2 = nonZeroRand(-9, 9);
    const str1 = polynomialStr([{ coef: coef1, expA: expA1, expB: expB1 }]);
    const str2 = polynomialStr([{ coef: coef2, expA: expA2, expB: expB2 }]);

    const correct = areLike ? "Да, подобные" : "Нет, не подобные";

    const options = shuffle([
        { value: correct, correct: true },
        { value: areLike ? "Нет, не подобные" : "Да, подобные", correct: false }
    ]);

    return {
        kind: "identifyLikeTerms",
        taskHTML: `<p class="task-question">${str1} и ${str2}<br>Это подобные одночлены?</p>`,
        correctValue: correct,
        options,
        signature: `identifyLikeTerms:${expA1}:${expB1}:${expA2}:${expB2}`,
        why: areLike
            ? `Буквенные части совпадают, значит одночлены подобны.`
            : `Буквенные части разные, значит одночлены не подобны.`
    };
}

// два подобных одночлена -> их сумма
function genCombineLikeTerms() {
    const expA = rand(1, 3);
    const expB = pick([0, 1, 2]);
    const coef1 = nonZeroRand(-9, 9);
    const coef2 = nonZeroRand(-9, 9);
    if (coef1 + coef2 === 0) return genCombineLikeTerms();

    const exprStr = polynomialStr([{ coef: coef1, expA, expB }, { coef: coef2, expA, expB }]);
    const correct = polynomialStr([{ coef: coef1 + coef2, expA, expB }]);

    const d1 = polynomialStr([{ coef: coef1 - coef2, expA, expB }]);
    const d2 = polynomialStr([{ coef: coef1 * coef2, expA, expB }]);
    const d3 = polynomialStr([{ coef: coef1 + coef2, expA: expA + 1, expB }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genCombineLikeTerms();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "combineLikeTerms",
        taskHTML: `<p class="task-question">${exprStr}<br>Упростите, сложив подобные одночлены.</p>`,
        correctValue: correct,
        options,
        signature: `combineLikeTerms:${coef1}:${coef2}:${expA}:${expB}`,
        why: `Буквенная часть одинаковая, складываем коэффициенты: ${numStr(coef1)} + (${numStr(coef2)}) = ${numStr(coef1 + coef2)}. Итог: ${correct}.`
    };
}

// многочлен из 2-3 членов -> степень (максимум среди членов)
function genDegreeOfPolynomial() {
    const terms = [];
    const numTerms = rand(2, 3);
    const usedKeys = new Set();

    while (terms.length < numTerms) {
        const expA = rand(0, 3);
        const expB = rand(0, 3);
        if (expA === 0 && expB === 0) continue;
        const key = `${expA},${expB}`;
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        terms.push({ coef: nonZeroRand(-9, 9), expA, expB });
    }

    const str = polynomialStr(terms);
    const degrees = terms.map(t => t.expA + t.expB);
    const correct = numStr(Math.max(...degrees));

    const d1 = numStr(Math.min(...degrees));
    const d2 = numStr(degrees.reduce((s, d) => s + d, 0));
    const d3 = numStr(Math.max(...degrees) + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genDegreeOfPolynomial();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "degreeOfPolynomial",
        taskHTML: `<p class="task-question">${str}<br>Найдите степень этого многочлена.</p>`,
        correctValue: correct,
        options,
        signature: `degreeOfPolynomial:${terms.map(t => `${t.expA}-${t.expB}`).join(":")}`,
        why: `Степени членов: ${degrees.join(", ")}. Степень многочлена — наибольшая из них: ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// многочлен с неприведёнными подобными -> стандартный вид
function genStandardFormPolynomial() {
    const expA = rand(1, 3);
    const useB = pick([true, false]);
    const typeX = { expA, expB: 0 };
    const typeY = useB ? { expA, expB: rand(1, 2) } : { expA: expA + 1, expB: 0 };

    const c1 = nonZeroRand(-9, 9), c2 = nonZeroRand(-9, 9);
    const c3 = nonZeroRand(-9, 9), c4 = nonZeroRand(-9, 9);
    if (c1 + c2 === 0 || c3 + c4 === 0) return genStandardFormPolynomial();

    const rawTerms = shuffle([
        { coef: c1, ...typeX }, { coef: c3, ...typeY }, { coef: c2, ...typeX }, { coef: c4, ...typeY }
    ]);
    const str = polynomialStr(rawTerms);

    const correct = polynomialStr([{ coef: c1 + c2, ...typeX }, { coef: c3 + c4, ...typeY }]);

    const d1 = polynomialStr([{ coef: c1 - c2, ...typeX }, { coef: c3 - c4, ...typeY }]);
    const d2 = polynomialStr([{ coef: c1 + c2, expA: typeX.expA + 1, expB: typeX.expB }, { coef: c3 + c4, ...typeY }]);
    const d3 = polynomialStr([{ coef: c1 + c2 + c3 + c4, ...typeX }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genStandardFormPolynomial();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "standardFormPolynomial",
        taskHTML: `<p class="task-question">${str}<br>Приведите многочлен к стандартному виду.</p>`,
        correctValue: correct,
        options,
        signature: `standardFormPolynomial:${c1}:${c2}:${c3}:${c4}:${typeX.expA}:${typeX.expB}:${typeY.expA}:${typeY.expB}`,
        why: `Складываем коэффициенты у подобных членов: ${numStr(c1)} и ${numStr(c2)} дают ${numStr(c1 + c2)}; ${numStr(c3)} и ${numStr(c4)} дают ${numStr(c3 + c4)}. Получаем ${correct}.`
    };
}

// сложить два многочлена -> результат в стандартном виде
function genSumOfTwoPolynomials() {
    const c1 = nonZeroRand(-9, 9), c2 = nonZeroRand(-9, 9);
    const c3 = nonZeroRand(-9, 9), c4 = nonZeroRand(-9, 9);
    if (c1 + c3 === 0 || c2 + c4 === 0) return genSumOfTwoPolynomials();

    const poly1 = polynomialStr([{ coef: c1, expA: 1, expB: 0 }, { coef: c2, expA: 0, expB: 1 }]);
    const poly2 = polynomialStr([{ coef: c3, expA: 1, expB: 0 }, { coef: c4, expA: 0, expB: 1 }]);
    const correct = polynomialStr([{ coef: c1 + c3, expA: 1, expB: 0 }, { coef: c2 + c4, expA: 0, expB: 1 }]);

    const d1 = polynomialStr([{ coef: c1 - c3, expA: 1, expB: 0 }, { coef: c2 - c4, expA: 0, expB: 1 }]);
    const d2 = polynomialStr([{ coef: c1 + c3, expA: 0, expB: 1 }, { coef: c2 + c4, expA: 1, expB: 0 }]);
    const d3 = polynomialStr([{ coef: c1 + c3 + 1, expA: 1, expB: 0 }, { coef: c2 + c4, expA: 0, expB: 1 }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSumOfTwoPolynomials();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "sumOfTwoPolynomials",
        taskHTML: `<p class="task-question">(${poly1}) + (${poly2})<br>Найдите сумму многочленов.</p>`,
        correctValue: correct,
        options,
        signature: `sumOfTwoPolynomials:${c1}:${c2}:${c3}:${c4}`,
        why: `Складываем коэффициенты при a: ${numStr(c1)} + ${numStr(c3)} = ${numStr(c1 + c3)}; при b: ${numStr(c2)} + ${numStr(c4)} = ${numStr(c2 + c4)}. Получаем ${correct}.`
    };
}

// вычесть многочлен (знаки вычитаемого меняются) -> результат
function genDifferenceOfTwoPolynomials() {
    const c1 = nonZeroRand(-9, 9), c2 = nonZeroRand(-9, 9);
    const c3 = nonZeroRand(-9, 9), c4 = nonZeroRand(-9, 9);
    if (c1 - c3 === 0 || c2 - c4 === 0) return genDifferenceOfTwoPolynomials();

    const poly1 = polynomialStr([{ coef: c1, expA: 1, expB: 0 }, { coef: c2, expA: 0, expB: 1 }]);
    const poly2 = polynomialStr([{ coef: c3, expA: 1, expB: 0 }, { coef: c4, expA: 0, expB: 1 }]);
    const correct = polynomialStr([{ coef: c1 - c3, expA: 1, expB: 0 }, { coef: c2 - c4, expA: 0, expB: 1 }]);

    const d1 = polynomialStr([{ coef: c1 + c3, expA: 1, expB: 0 }, { coef: c2 + c4, expA: 0, expB: 1 }]);
    const d2 = polynomialStr([{ coef: c1 - c3, expA: 1, expB: 0 }, { coef: c4 - c2, expA: 0, expB: 1 }]);
    const d3 = polynomialStr([{ coef: c3 - c1, expA: 1, expB: 0 }, { coef: c4 - c2, expA: 0, expB: 1 }]);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genDifferenceOfTwoPolynomials();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "differenceOfTwoPolynomials",
        taskHTML: `<p class="task-question">(${poly1}) − (${poly2})<br>Найдите разность многочленов.</p>`,
        correctValue: correct,
        options,
        signature: `differenceOfTwoPolynomials:${c1}:${c2}:${c3}:${c4}`,
        why: `Меняем знак каждого члена вычитаемого и складываем: при a: ${numStr(c1)} − (${numStr(c3)}) = ${numStr(c1 - c3)}; при b: ${numStr(c2)} − (${numStr(c4)}) = ${numStr(c2 - c4)}. Получаем ${correct}.`
    };
}

// концептуальный вопрос про подобные члены
function genConceptCheckLikeTerms() {
    const correct = LIKE_TERMS_CONCEPT_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: LIKE_TERMS_CONCEPT_POOL[1], correct: false },
        { value: LIKE_TERMS_CONCEPT_POOL[2], correct: false },
        { value: LIKE_TERMS_CONCEPT_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptCheckLikeTerms",
        taskHTML: `<p class="task-question">Почему нельзя складывать неподобные одночлены (например, 3a² и 5a)?</p>`,
        correctValue: correct,
        options,
        signature: `conceptCheckLikeTerms`,
        why: `a² и a — разные буквенные части, то есть разные величины (как площадь и длина). Складывать их коэффициенты напрямую нельзя.`
    };
}

const GENERATORS = {
    identifyCoefficient: genIdentifyCoefficient,
    identifyLetterPart: genIdentifyLetterPart,
    degreeOfMonomial: genDegreeOfMonomial,
    classifyMonomialOrPolynomial: genClassifyMonomialOrPolynomial,
    reduceMonomialToStandardForm: genReduceMonomialToStandardForm,
    identifyLikeTerms: genIdentifyLikeTerms,
    combineLikeTerms: genCombineLikeTerms,
    degreeOfPolynomial: genDegreeOfPolynomial,
    standardFormPolynomial: genStandardFormPolynomial,
    sumOfTwoPolynomials: genSumOfTwoPolynomials,
    differenceOfTwoPolynomials: genDifferenceOfTwoPolynomials,
    conceptCheckLikeTerms: genConceptCheckLikeTerms
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
            topic: "monomials"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
