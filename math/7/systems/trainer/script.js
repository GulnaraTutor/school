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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["checkIfPairIsSolution", "classifySystemType", "identifyWhichVarEasierToExpress", "pickMultiplierForElimination"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["solveBySubstitutionSimple", "solveByEliminationDirect", "solveGraphicalReadIntersection", "findSecondVariableAfterFirst"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["solveBySubstitutionFull", "solveByEliminationWithMultiplication", "noSolutionOrInfiniteFromSystem", "conceptCheckSystemMethods"] }
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

// случайное ненулевое целое, исключая также 1 и −1 (для "нетривиальных" коэффициентов)
function randExcept01(min, max) {
    let n;
    do { n = rand(min, max); } while (n === 0 || n === 1 || n === -1);
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

function systemHTML(eq1, eq2) {
    return `${eq1}<br>${eq2}`;
}

const SYSTEM_TYPE_POOL = ["Единственное решение", "Решений нет", "Бесконечно много решений"];

const SYSTEM_METHODS_POOL = [
    "Метод подстановки удобен, когда одна переменная уже выражена или имеет коэффициент ±1",
    "Графический метод даёт точный ответ для любых коэффициентов, включая нецелые",
    "Метод сложения требует, чтобы обе переменные уже стояли отдельно в разных уравнениях",
    "Систему из двух линейных уравнений всегда можно решить только графическим методом"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// система + точка -> является ли решением системы (обоих уравнений)
function genCheckIfPairIsSolution() {
    const x0 = rand(-9, 9), y0 = rand(-9, 9);
    const a1 = nonZeroRand(-9, 9), b1 = nonZeroRand(-9, 9);
    let a2, b2;
    do { a2 = nonZeroRand(-9, 9); b2 = nonZeroRand(-9, 9); } while (a1 * b2 === a2 * b1);
    const c1 = a1 * x0 + b1 * y0;
    const c2 = a2 * x0 + b2 * y0;

    const wantSolution = pick([true, false]);
    let px, py;
    if (wantSolution) { px = x0; py = y0; }
    else {
        do { px = rand(-9, 9); py = rand(-9, 9); } while (px === x0 && py === y0);
    }

    const check1 = a1 * px + b1 * py === c1;
    const check2 = a2 * px + b2 * py === c2;
    const actuallyIsSolution = check1 && check2;
    const correct = actuallyIsSolution ? "Да, является" : "Нет, не является";

    const options = shuffle([
        { value: correct, correct: true },
        { value: actuallyIsSolution ? "Нет, не является" : "Да, является", correct: false }
    ]);

    return {
        kind: "checkIfPairIsSolution",
        taskHTML: `<p class="task-question">${systemHTML(`${twoVarExprStr(a1, b1)} = ${numStr(c1)}`, `${twoVarExprStr(a2, b2)} = ${numStr(c2)}`)}<br>Является ли пара (${numStr(px)}; ${numStr(py)}) решением этой системы?</p>`,
        correctValue: correct,
        options,
        signature: `checkIfPairIsSolution:${a1}:${b1}:${a2}:${b2}:${x0}:${y0}:${px}:${py}`,
        why: !check1
            ? `Подставим точку в первое уравнение: не выполняется, значит точка не решение системы.`
            : !check2
                ? `Первое уравнение выполняется, но второе — нет: точка не является решением системы.`
                : `Точка удовлетворяет обоим уравнениям одновременно — это решение системы.`
    };
}

// два уравнения (в виде y=kx+m) -> классифицировать тип системы
function genClassifySystemType() {
    const caseType = pick(["unique", "none", "infinite"]);
    const k1 = nonZeroRand(-9, 9);
    const bcoef1 = nonZeroRand(-6, 6);
    const m1 = rand(-9, 9);
    const a1 = -k1 * bcoef1;
    const c1 = m1 * bcoef1;

    let k2, m2, bcoef2;
    if (caseType === "unique") {
        do { k2 = nonZeroRand(-9, 9); } while (k2 === k1);
        bcoef2 = nonZeroRand(-6, 6);
        m2 = rand(-9, 9);
    } else if (caseType === "none") {
        k2 = k1;
        bcoef2 = nonZeroRand(-6, 6);
        do { m2 = rand(-9, 9); } while (m2 === m1);
    } else {
        k2 = k1;
        bcoef2 = nonZeroRand(-6, 6);
        m2 = m1;
    }
    const a2 = -k2 * bcoef2;
    const c2 = m2 * bcoef2;

    const correct = caseType === "unique" ? SYSTEM_TYPE_POOL[0] : caseType === "none" ? SYSTEM_TYPE_POOL[1] : SYSTEM_TYPE_POOL[2];

    const options = shuffle(SYSTEM_TYPE_POOL.map(v => ({ value: v, correct: v === correct })));

    return {
        kind: "classifySystemType",
        taskHTML: `<p class="task-question">${systemHTML(`${twoVarExprStr(a1, bcoef1)} = ${numStr(c1)}`, `${twoVarExprStr(a2, bcoef2)} = ${numStr(c2)}`)}<br>Сколько решений у этой системы?</p>`,
        correctValue: correct,
        options,
        signature: `classifySystemType:${caseType}:${a1}:${bcoef1}:${c1}:${a2}:${bcoef2}:${c2}`,
        why: caseType === "unique" ? `Коэффициенты наклона разные, прямые пересекаются в одной точке — единственное решение.`
            : caseType === "none" ? `Коэффициенты наклона одинаковы, а свободные члены разные — прямые параллельны и не пересекаются, решений нет.`
            : `Коэффициенты наклона и свободные члены совпадают — это одна и та же прямая, решений бесконечно много.`
    };
}

// система с одним коэффициентом ±1 -> какую переменную из какого уравнения проще выразить
function genIdentifyWhichVarEasierToExpress() {
    const slot = pick(["eq1_x", "eq1_y", "eq2_x", "eq2_y"]);

    let a1 = randExcept01(-9, 9), b1 = randExcept01(-9, 9);
    let a2 = randExcept01(-9, 9), b2 = randExcept01(-9, 9);

    const easyCoef = pick([1, -1]);
    if (slot === "eq1_x") a1 = easyCoef;
    else if (slot === "eq1_y") b1 = easyCoef;
    else if (slot === "eq2_x") a2 = easyCoef;
    else b2 = easyCoef;

    if (a1 * b2 === a2 * b1) return genIdentifyWhichVarEasierToExpress();

    const x0 = rand(-9, 9), y0 = rand(-9, 9);
    const c1 = a1 * x0 + b1 * y0;
    const c2 = a2 * x0 + b2 * y0;

    const labels = {
        eq1_x: "x из первого уравнения",
        eq1_y: "y из первого уравнения",
        eq2_x: "x из второго уравнения",
        eq2_y: "y из второго уравнения"
    };
    const correct = labels[slot];

    const options = shuffle(Object.values(labels).map(v => ({ value: v, correct: v === correct })));

    return {
        kind: "identifyWhichVarEasierToExpress",
        taskHTML: `<p class="task-question">${systemHTML(`${twoVarExprStr(a1, b1)} = ${numStr(c1)}`, `${twoVarExprStr(a2, b2)} = ${numStr(c2)}`)}<br>Какую переменную и из какого уравнения проще всего выразить для метода подстановки?</p>`,
        correctValue: correct,
        options,
        signature: `identifyWhichVarEasierToExpress:${slot}:${a1}:${b1}:${a2}:${b2}`,
        why: `В этом уравнении коэффициент равен ${numStr(easyCoef)} (то есть ±1) — переменную можно выразить без деления на дробь, это проще всего.`
    };
}

// на что домножить уравнение, чтобы коэффициент при переменной стал противоположным
function genPickMultiplierForElimination() {
    const eliminateX = pick([true, false]);
    const m = nonZeroRand(-6, 6);

    let a1, a2, b1, b2;
    if (eliminateX) {
        a1 = nonZeroRand(-9, 9);
        a2 = -a1 * m;
        b1 = nonZeroRand(-9, 9);
        b2 = nonZeroRand(-9, 9);
    } else {
        b1 = nonZeroRand(-9, 9);
        b2 = -b1 * m;
        a1 = nonZeroRand(-9, 9);
        a2 = nonZeroRand(-9, 9);
    }

    if (a1 * b2 === a2 * b1) return genPickMultiplierForElimination();

    const x0 = rand(-9, 9), y0 = rand(-9, 9);
    const c1 = a1 * x0 + b1 * y0;
    const c2 = a2 * x0 + b2 * y0;

    const baseCoef = eliminateX ? a1 : b1;
    const otherCoef = eliminateX ? a2 : b2;

    const correct = numStr(m);
    const d1 = numStr(-m);
    const d2 = numStr(m + 1);
    const d3 = numStr(otherCoef);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genPickMultiplierForElimination();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "pickMultiplierForElimination",
        taskHTML: `<p class="task-question">${systemHTML(`${twoVarExprStr(a1, b1)} = ${numStr(c1)}`, `${twoVarExprStr(a2, b2)} = ${numStr(c2)}`)}<br>На какое число нужно домножить первое уравнение, чтобы после сложения со вторым коэффициент при ${eliminateX ? "x" : "y"} исчез?</p>`,
        correctValue: correct,
        options,
        signature: `pickMultiplierForElimination:${eliminateX}:${a1}:${b1}:${a2}:${b2}:${m}`,
        why: `Коэффициент при ${eliminateX ? "x" : "y"} в первом уравнении: ${numStr(baseCoef)}, во втором: ${numStr(otherCoef)}. Чтобы после домножения первого уравнения на m эти коэффициенты стали противоположными, нужно ${numStr(baseCoef)} · m = ${numStr(-otherCoef)}, откуда m = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// одно уравнение уже y=kx+b -> метод подстановки
function genSolveBySubstitutionSimple() {
    const k = nonZeroRand(-9, 9);
    const bInt = rand(-9, 9);
    const x0 = rand(-9, 9);
    const y0 = k * x0 + bInt;

    let a2, b2;
    do { a2 = nonZeroRand(-9, 9); b2 = nonZeroRand(-9, 9); } while (a2 + b2 * k === 0);
    const c2 = a2 * x0 + b2 * y0;

    const askX = pick([true, false]);
    const answerVal = askX ? x0 : y0;
    const correct = numStr(answerVal);

    const d1 = numStr(-answerVal);
    const d2 = numStr(askX ? y0 : x0);
    const d3 = numStr(answerVal + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveBySubstitutionSimple();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveBySubstitutionSimple",
        taskHTML: `<p class="task-question">${systemHTML(`y = ${linExprStr(k, bInt)}`, `${twoVarExprStr(a2, b2)} = ${numStr(c2)}`)}<br>Решите систему методом подстановки. Найдите ${askX ? "x" : "y"}.</p>`,
        correctValue: correct,
        options,
        signature: `solveBySubstitutionSimple:${k}:${bInt}:${a2}:${b2}:${x0}:${askX}`,
        why: `Подставим y во второе уравнение: ${numStr(a2)}x ${b2 > 0 ? "+" : "−"} ${Math.abs(b2)}(${linExprStr(k, bInt)}) = ${numStr(c2)}. Решая, получаем x = ${numStr(x0)}, тогда y = ${numStr(y0)}.`
    };
}

// коэффициенты при одной переменной уже равны/противоположны -> метод сложения
function genSolveByEliminationDirect() {
    const x0 = rand(-9, 9), y0 = rand(-9, 9);
    const coefA = nonZeroRand(-9, 9);
    const sameSign = pick([true, false]);
    const a1 = coefA;
    const a2 = sameSign ? coefA : -coefA;

    let b1, b2;
    do { b1 = nonZeroRand(-9, 9); b2 = nonZeroRand(-9, 9); } while (a1 * b2 === a2 * b1);
    const c1 = a1 * x0 + b1 * y0;
    const c2 = a2 * x0 + b2 * y0;

    const askX = pick([true, false]);
    const answerVal = askX ? x0 : y0;
    const correct = numStr(answerVal);

    const d1 = numStr(-answerVal);
    const d2 = numStr(askX ? y0 : x0);
    const d3 = numStr(answerVal + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveByEliminationDirect();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveByEliminationDirect",
        taskHTML: `<p class="task-question">${systemHTML(`${twoVarExprStr(a1, b1)} = ${numStr(c1)}`, `${twoVarExprStr(a2, b2)} = ${numStr(c2)}`)}<br>Решите систему методом сложения. Найдите ${askX ? "x" : "y"}.</p>`,
        correctValue: correct,
        options,
        signature: `solveByEliminationDirect:${a1}:${b1}:${a2}:${b2}:${x0}:${y0}:${askX}`,
        why: sameSign
            ? `Коэффициенты при x одинаковы — вычтем уравнения, x исчезнет. Решая дальше, получаем x = ${numStr(x0)}, y = ${numStr(y0)}.`
            : `Коэффициенты при x противоположны — сложим уравнения, x исчезнет. Решая дальше, получаем x = ${numStr(x0)}, y = ${numStr(y0)}.`
    };
}

// две функции y=kx+m -> найти точку пересечения (графический метод)
function genSolveGraphicalReadIntersection() {
    const k1 = nonZeroRand(-9, 9);
    const b1 = rand(-9, 9);
    let k2;
    do { k2 = nonZeroRand(-9, 9); } while (k2 === k1);
    const x0 = rand(-9, 9);
    const y0 = k1 * x0 + b1;
    const b2 = y0 - k2 * x0;

    const correct = `(${numStr(x0)}; ${numStr(y0)})`;
    const d1 = `(${numStr(y0)}; ${numStr(x0)})`;
    const d2 = `(${numStr(-x0)}; ${numStr(y0)})`;
    const d3 = `(${numStr(x0)}; ${numStr(-y0)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveGraphicalReadIntersection();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveGraphicalReadIntersection",
        taskHTML: `<p class="task-question">${systemHTML(`y = ${linExprStr(k1, b1)}`, `y = ${linExprStr(k2, b2)}`)}<br>Найдите точку пересечения графиков (решение системы графическим методом).</p>`,
        correctValue: correct,
        options,
        signature: `solveGraphicalReadIntersection:${k1}:${b1}:${k2}:${b2}`,
        why: `Приравняем правые части: ${linExprStr(k1, b1)} = ${linExprStr(k2, b2)} → x = ${numStr(x0)}. Тогда y = ${numStr(y0)}. Точка пересечения: ${correct}.`
    };
}

// известна одна переменная -> найти вторую подстановкой в одно из уравнений
function genFindSecondVariableAfterFirst() {
    const x0 = rand(-9, 9), y0 = rand(-9, 9);
    const a1 = nonZeroRand(-9, 9), b1 = nonZeroRand(-9, 9);
    let a2, b2;
    do { a2 = nonZeroRand(-9, 9); b2 = nonZeroRand(-9, 9); } while (a1 * b2 === a2 * b1);
    const c1 = a1 * x0 + b1 * y0;
    const c2 = a2 * x0 + b2 * y0;

    const knownIsX = pick([true, false]);
    const answerVal = knownIsX ? y0 : x0;
    const correct = numStr(answerVal);

    const d1 = numStr(-answerVal);
    const d2 = numStr(knownIsX ? x0 : y0);
    const d3 = numStr(answerVal + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindSecondVariableAfterFirst();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    const knownLabel = knownIsX ? `x = ${numStr(x0)}` : `y = ${numStr(y0)}`;
    const findLabel = knownIsX ? "y" : "x";

    return {
        kind: "findSecondVariableAfterFirst",
        taskHTML: `<p class="task-question">${systemHTML(`${twoVarExprStr(a1, b1)} = ${numStr(c1)}`, `${twoVarExprStr(a2, b2)} = ${numStr(c2)}`)}<br>Известно, что в решении системы ${knownLabel}. Подставьте в первое уравнение и найдите ${findLabel}.</p>`,
        correctValue: correct,
        options,
        signature: `findSecondVariableAfterFirst:${a1}:${b1}:${a2}:${b2}:${x0}:${y0}:${knownIsX}`,
        why: knownIsX
            ? `Подставим x = ${numStr(x0)} в первое уравнение: ${numStr(a1)}·${numStr(x0)} + (${numStr(b1)}y) = ${numStr(c1)}, откуда y = ${correct}.`
            : `Подставим y = ${numStr(y0)} в первое уравнение: (${numStr(a1)}x) + (${numStr(b1)}·${numStr(y0)}) = ${numStr(c1)}, откуда x = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// полная система, оба уравнения в общем виде -> решить методом подстановки, найти пару (x; y)
function genSolveBySubstitutionFull() {
    const x0 = rand(-9, 9), y0 = rand(-9, 9);
    const a1 = nonZeroRand(-9, 9), b1 = nonZeroRand(-9, 9);
    let a2, b2;
    do { a2 = nonZeroRand(-9, 9); b2 = nonZeroRand(-9, 9); } while (a1 * b2 === a2 * b1);
    const c1 = a1 * x0 + b1 * y0;
    const c2 = a2 * x0 + b2 * y0;

    const correct = `(${numStr(x0)}; ${numStr(y0)})`;
    const d1 = `(${numStr(y0)}; ${numStr(x0)})`;
    const d2 = `(${numStr(-x0)}; ${numStr(-y0)})`;
    const d3 = `(${numStr(x0 + 1)}; ${numStr(y0)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveBySubstitutionFull();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveBySubstitutionFull",
        taskHTML: `<p class="task-question">${systemHTML(`${twoVarExprStr(a1, b1)} = ${numStr(c1)}`, `${twoVarExprStr(a2, b2)} = ${numStr(c2)}`)}<br>Решите систему методом подстановки. Найдите (x; y).</p>`,
        correctValue: correct,
        options,
        signature: `solveBySubstitutionFull:${a1}:${b1}:${a2}:${b2}:${x0}:${y0}`,
        why: `Выразим переменную из одного уравнения и подставим в другое. Решение системы: x = ${numStr(x0)}, y = ${numStr(y0)}. Проверка: оба уравнения выполняются при этой паре чисел.`
    };
}

// более крупные коэффициенты, требуется домножение -> метод сложения, найти пару (x; y)
function genSolveByEliminationWithMultiplication() {
    const x0 = rand(-9, 9), y0 = rand(-9, 9);
    const a1 = randExcept01(-9, 9), b1 = randExcept01(-9, 9);
    let a2, b2;
    do { a2 = randExcept01(-9, 9); b2 = randExcept01(-9, 9); } while (a1 * b2 === a2 * b1);
    const c1 = a1 * x0 + b1 * y0;
    const c2 = a2 * x0 + b2 * y0;

    const correct = `(${numStr(x0)}; ${numStr(y0)})`;
    const d1 = `(${numStr(y0)}; ${numStr(x0)})`;
    const d2 = `(${numStr(-x0)}; ${numStr(-y0)})`;
    const d3 = `(${numStr(x0 + 1)}; ${numStr(y0)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genSolveByEliminationWithMultiplication();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "solveByEliminationWithMultiplication",
        taskHTML: `<p class="task-question">${systemHTML(`${twoVarExprStr(a1, b1)} = ${numStr(c1)}`, `${twoVarExprStr(a2, b2)} = ${numStr(c2)}`)}<br>Решите систему методом сложения (потребуется домножить одно или оба уравнения). Найдите (x; y).</p>`,
        correctValue: correct,
        options,
        signature: `solveByEliminationWithMultiplication:${a1}:${b1}:${a2}:${b2}:${x0}:${y0}`,
        why: `Домножим уравнения на подходящие числа, чтобы коэффициенты при одной из переменных стали противоположными, сложим уравнения и найдём эту переменную, затем подставим и найдём вторую. Решение: x = ${numStr(x0)}, y = ${numStr(y0)}.`
    };
}

// система в общем виде -> число решений через сравнение коэффициентов (без перехода к y=kx+m)
function genNoSolutionOrInfiniteFromSystem() {
    const caseType = pick(["unique", "none", "infinite"]);
    const a1 = nonZeroRand(-9, 9), b1 = nonZeroRand(-9, 9), c1 = rand(-9, 9);
    let a2, b2, c2;
    if (caseType === "unique") {
        do { a2 = nonZeroRand(-9, 9); b2 = nonZeroRand(-9, 9); } while (a1 * b2 === a2 * b1);
        c2 = rand(-9, 9);
    } else {
        const t = nonZeroRand(-4, 4);
        a2 = t * a1;
        b2 = t * b1;
        c2 = caseType === "none" ? t * c1 + nonZeroRand(-5, 5) : t * c1;
    }

    const correct = caseType === "unique" ? SYSTEM_TYPE_POOL[0] : caseType === "none" ? SYSTEM_TYPE_POOL[1] : SYSTEM_TYPE_POOL[2];

    const options = shuffle(SYSTEM_TYPE_POOL.map(v => ({ value: v, correct: v === correct })));

    return {
        kind: "noSolutionOrInfiniteFromSystem",
        taskHTML: `<p class="task-question">${systemHTML(`${twoVarExprStr(a1, b1)} = ${numStr(c1)}`, `${twoVarExprStr(a2, b2)} = ${numStr(c2)}`)}<br>Сколько решений у этой системы?</p>`,
        correctValue: correct,
        options,
        signature: `noSolutionOrInfiniteFromSystem:${caseType}:${a1}:${b1}:${c1}:${a2}:${b2}:${c2}`,
        why: caseType === "unique" ? `Коэффициенты при x и y не пропорциональны — прямые пересекаются в одной точке, решение единственное.`
            : caseType === "none" ? `Коэффициенты при x и y пропорциональны, а свободные члены — нет: прямые параллельны и не совпадают, решений нет.`
            : `Коэффициенты при x, y и свободные члены пропорциональны — это одна и та же прямая, решений бесконечно много.`
    };
}

// концептуальный вопрос про методы решения систем
function genConceptCheckSystemMethods() {
    const correct = SYSTEM_METHODS_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: SYSTEM_METHODS_POOL[1], correct: false },
        { value: SYSTEM_METHODS_POOL[2], correct: false },
        { value: SYSTEM_METHODS_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptCheckSystemMethods",
        taskHTML: `<p class="task-question">Какое утверждение о методах решения систем уравнений верно?</p>`,
        correctValue: correct,
        options,
        signature: `conceptCheckSystemMethods`,
        why: `Метод подстановки особенно удобен, когда переменную можно выразить без дробей — то есть коэффициент при ней равен ±1. Графический метод даёт лишь приближённый ответ по рисунку, а метод сложения работает и когда переменные "перемешаны" в обоих уравнениях — их можно предварительно домножить.`
    };
}

const GENERATORS = {
    checkIfPairIsSolution: genCheckIfPairIsSolution,
    classifySystemType: genClassifySystemType,
    identifyWhichVarEasierToExpress: genIdentifyWhichVarEasierToExpress,
    pickMultiplierForElimination: genPickMultiplierForElimination,
    solveBySubstitutionSimple: genSolveBySubstitutionSimple,
    solveByEliminationDirect: genSolveByEliminationDirect,
    solveGraphicalReadIntersection: genSolveGraphicalReadIntersection,
    findSecondVariableAfterFirst: genFindSecondVariableAfterFirst,
    solveBySubstitutionFull: genSolveBySubstitutionFull,
    solveByEliminationWithMultiplication: genSolveByEliminationWithMultiplication,
    noSolutionOrInfiniteFromSystem: genNoSolutionOrInfiniteFromSystem,
    conceptCheckSystemMethods: genConceptCheckSystemMethods
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
            topic: "systems"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
