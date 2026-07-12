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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["findODZSimple", "findODZPlain", "isRootAllowed", "solveSimpleFraction"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["solveProportionLinear", "solveFractionShift", "findODZTwoFactors", "checkForExtraneous"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["solveLeadsToQuadratic", "solveWithExtraneousRoot", "odzConcept", "solveProportionQuadraticVieta"] }
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

// строка вида "3" / "x − 1" / "x + 3" для множителя знаменателя (x − e), нуль при x = e
function denomStr(e) {
    if (e === 0) return "x";
    return e > 0 ? `x − ${e}` : `x + ${Math.abs(e)}`;
}

// HTML для дроби num/den через общий компонент .frac (никогда слэшем)
function fracHTML(num, den) {
    return `<div class="frac"><span class="frac-num">${num}</span><span class="frac-den">${den}</span></div>`;
}

// "x ≠ v1, x ≠ v2" — для запрещённых по ОДЗ значений, всегда в порядке возрастания
function pairStr(v1, v2) {
    const lo = Math.min(v1, v2), hi = Math.max(v1, v2);
    return `x ≠ ${numStr(lo)}, x ≠ ${numStr(hi)}`;
}

// "x₁ = v1, x₂ = v2" — для корней уравнения, всегда в порядке возрастания
function rootsPairStr(r1, r2) {
    const lo = Math.min(r1, r2), hi = Math.max(r1, r2);
    return `x₁ = ${numStr(lo)}, x₂ = ${numStr(hi)}`;
}

const ODZ_WHY_POOL = ["Чтобы не делить на ноль", "Чтобы уравнение стало квадратным", "Чтобы избавиться от знаменателя", "Чтобы упростить дробь"];
const ODZ_ACTION_POOL = ["Отбросить его как посторонний", "Оставить в ответе", "Заменить его на ноль", "Возвести в квадрат"];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// дано k/(x−e) = m -> какое значение x недопустимо
function genFindODZSimple() {
    const e = nonZeroRand(-9, 9);
    const k = nonZeroRand(2, 9);
    const m = nonZeroRand(2, 9);
    const correct = numStr(e);

    const vals = new Set([correct, numStr(-e), numStr(e + 1), numStr(e - 1)]);
    if (vals.size !== 4) return genFindODZSimple();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(-e), correct: false },
        { value: numStr(e + 1), correct: false },
        { value: numStr(e - 1), correct: false }
    ]);

    return {
        kind: "findODZSimple",
        taskHTML: `<p class="task-question">${fracHTML(numStr(k), denomStr(e))} = ${numStr(m)}<br>Какое значение x недопустимо (не входит в ОДЗ)?</p>`,
        correctValue: correct,
        options,
        signature: `findODZSimple:${e}:${k}:${m}`,
        why: `Знаменатель ${denomStr(e)} обращается в 0 при x = ${correct} — это значение недопустимо.`
    };
}

// дано m/(kx) = n -> x ≠ 0
function genFindODZPlain() {
    const k = rand(2, 9);
    const m = nonZeroRand(2, 9);
    const n = nonZeroRand(2, 9);
    const correct = "0";

    const pool = [...new Set([`${k}`, `${-k}`, "1", `${m}`])];
    if (pool.length < 3) return genFindODZPlain();
    const distractors = shuffle(pool).slice(0, 3);

    const options = shuffle([
        { value: correct, correct: true },
        ...distractors.map(v => ({ value: v, correct: false }))
    ]);

    return {
        kind: "findODZPlain",
        taskHTML: `<p class="task-question">${fracHTML(numStr(m), `${k}x`)} = ${numStr(n)}<br>Какое значение x недопустимо?</p>`,
        correctValue: correct,
        options,
        signature: `findODZPlain:${k}:${m}:${n}`,
        why: `Знаменатель ${k}x обращается в 0 только при x = 0 — это единственное недопустимое значение.`
    };
}

// ОДЗ: x ≠ a. Может ли x = b быть корнем?
function genIsRootAllowed() {
    const a = nonZeroRand(-9, 9);
    const same = pick([true, false]);
    let b;
    if (same) {
        b = a;
    } else {
        do { b = nonZeroRand(-9, 9); } while (b === a);
    }
    const correct = same ? "Нет" : "Да";

    const options = shuffle([
        { value: correct, correct: true },
        { value: same ? "Да" : "Нет", correct: false }
    ]);

    return {
        kind: "isRootAllowed",
        taskHTML: `<p class="task-question">ОДЗ: x ≠ ${numStr(a)}. Может ли x = ${numStr(b)} быть корнем уравнения?</p>`,
        correctValue: correct,
        options,
        signature: `isRootAllowed:${a}:${b}`,
        why: same
            ? `x = ${numStr(b)} совпадает с исключённым по ОДЗ значением — быть корнем не может.`
            : `x = ${numStr(b)} не входит в число запрещённых по ОДЗ значений — может быть корнем.`
    };
}

// k/x = m -> x = k/m (корень выбирается первым, k строится под него)
function genSolveSimpleFraction() {
    const x0 = nonZeroRand(-9, 9);
    const m = nonZeroRand(-9, 9);
    const k = m * x0;
    const correct = numStr(x0);

    const vals = new Set([correct, numStr(-x0), numStr(x0 + 1), numStr(m)]);
    if (vals.size !== 4) return genSolveSimpleFraction();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(-x0), correct: false },
        { value: numStr(x0 + 1), correct: false },
        { value: numStr(m), correct: false }
    ]);

    return {
        kind: "solveSimpleFraction",
        taskHTML: `<p class="task-question">${fracHTML(numStr(k), "x")} = ${numStr(m)}<br>Решите уравнение.</p>`,
        correctValue: correct,
        options,
        signature: `solveSimpleFraction:${x0}:${m}`,
        why: `${numStr(k)} = ${numStr(m)} · x, значит x = ${numStr(k)} / ${numStr(m)} = ${correct}. ОДЗ: x ≠ 0 — подходит.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// k/(x−e) = p/q, корень x0 выбирается первым (t=x0−e, k=s·t, p=q·s — гарантирует целые числа)
function genSolveProportionLinear() {
    const t = nonZeroRand(-6, 6);
    const e = nonZeroRand(-9, 9);
    const x0 = e + t;
    const q = rand(2, 5);
    const s = nonZeroRand(-5, 5);
    const p = q * s;
    const k = s * t;
    const correct = numStr(x0);

    const vals = new Set([correct, numStr(-x0), numStr(e), numStr(x0 + 1)]);
    if (vals.size !== 4) return genSolveProportionLinear();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(-x0), correct: false },
        { value: numStr(e), correct: false },
        { value: numStr(x0 + 1), correct: false }
    ]);

    return {
        kind: "solveProportionLinear",
        taskHTML: `<p class="task-question">${fracHTML(numStr(k), denomStr(e))} = ${fracHTML(numStr(p), numStr(q))}<br>Решите уравнение.</p>`,
        correctValue: correct,
        options,
        signature: `solveProportionLinear:${t}:${e}:${q}:${s}`,
        why: `ОДЗ: x ≠ ${numStr(e)}. Крест-накрест: ${numStr(k)} · ${numStr(q)} = ${numStr(p)} · (${denomStr(e)}), откуда x = ${correct}. Значение допустимо по ОДЗ.`
    };
}

// a/(x−b) = c, корень x0 выбирается первым (diff=x0−b, a=c·diff — гарантирует целое a)
function genSolveFractionShift() {
    const b = rand(-9, 9);
    const c = nonZeroRand(-9, 9);
    const diff = nonZeroRand(-6, 6);
    const x0 = b + diff;
    const a = c * diff;
    const correct = numStr(x0);

    const vals = new Set([correct, numStr(-x0), numStr(b), numStr(x0 - 1)]);
    if (vals.size !== 4) return genSolveFractionShift();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(-x0), correct: false },
        { value: numStr(b), correct: false },
        { value: numStr(x0 - 1), correct: false }
    ]);

    return {
        kind: "solveFractionShift",
        taskHTML: `<p class="task-question">${fracHTML(numStr(a), denomStr(b))} = ${numStr(c)}<br>Решите уравнение.</p>`,
        correctValue: correct,
        options,
        signature: `solveFractionShift:${b}:${c}:${diff}`,
        why: `ОДЗ: x ≠ ${numStr(b)}. Умножаем обе части на (${denomStr(b)}): ${numStr(a)} = ${numStr(c)} · (${denomStr(b)}), откуда x = ${correct}. Значение допустимо по ОДЗ.`
    };
}

// k/((x−e1)(x−e2)) = 1 -> два запрещённых значения
function genFindODZTwoFactors() {
    const e1 = nonZeroRand(-9, 9);
    let e2;
    do { e2 = nonZeroRand(-9, 9); } while (e2 === e1);
    const k = nonZeroRand(2, 9);
    const correct = pairStr(e1, e2);

    const vals = new Set([correct, pairStr(-e1, -e2), pairStr(e1, -e2), pairStr(-e1, e2)]);
    if (vals.size !== 4) return genFindODZTwoFactors();

    const options = shuffle([
        { value: correct, correct: true },
        { value: pairStr(-e1, -e2), correct: false },
        { value: pairStr(e1, -e2), correct: false },
        { value: pairStr(-e1, e2), correct: false }
    ]);

    return {
        kind: "findODZTwoFactors",
        taskHTML: `<p class="task-question">${fracHTML(numStr(k), `(${denomStr(e1)})(${denomStr(e2)})`)} = 1<br>Какие значения x недопустимы?</p>`,
        correctValue: correct,
        options,
        signature: `findODZTwoFactors:${e1}:${e2}:${k}`,
        why: `Знаменатель равен 0, если x = ${numStr(e1)} или x = ${numStr(e2)} — оба значения недопустимы.`
    };
}

// x/(x−e1) + p/(x−e2) = q/((x−e1)(x−e2)), корни r1=r2=e1 (двойной корень на исключённом значении) -> "Корней нет"
function genCheckForExtraneous() {
    let e1, e2;
    do {
        e1 = nonZeroRand(-9, 9);
        e2 = nonZeroRand(-9, 9);
    } while (e1 === e2);

    const r1 = e1, r2 = e1;
    const p = e2 - (r1 + r2);
    const q = -p * e1 - r1 * r2;
    if (p === 0 || q === 0) return genCheckForExtraneous();
    const correct = "Корней нет";

    let fakeX1, fakeX2;
    do {
        fakeX1 = nonZeroRand(-9, 9);
        fakeX2 = nonZeroRand(-9, 9);
    } while (fakeX1 === fakeX2);

    const vals = new Set([correct, rootsPairStr(fakeX1, fakeX2), numStr(e1), numStr(e2)]);
    if (vals.size !== 4) return genCheckForExtraneous();

    const options = shuffle([
        { value: correct, correct: true },
        { value: rootsPairStr(fakeX1, fakeX2), correct: false },
        { value: numStr(e1), correct: false },
        { value: numStr(e2), correct: false }
    ]);

    return {
        kind: "checkForExtraneous",
        taskHTML: `<p class="task-question">${fracHTML("x", denomStr(e1))} + ${fracHTML(numStr(p), denomStr(e2))} = ${fracHTML(numStr(q), `(${denomStr(e1)})(${denomStr(e2)})`)}<br>Решите уравнение.</p>`,
        correctValue: correct,
        options,
        signature: `checkForExtraneous:${e1}:${e2}`,
        why: `ОДЗ: x ≠ ${numStr(e1)} и x ≠ ${numStr(e2)}. После умножения на общий знаменатель получается x = ${numStr(e1)} — но это как раз исключённое значение, посторонний корень. Значит уравнение решений не имеет.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// x/(x−e1) + p/(x−e2) = q/((x−e1)(x−e2)), корни r1≠r2 выбираются первыми (оба валидны по ОДЗ)
function genSolveLeadsToQuadratic() {
    let e1, e2, r1, r2;
    do {
        e1 = nonZeroRand(-8, 8);
        e2 = nonZeroRand(-8, 8);
    } while (e1 === e2);
    do {
        r1 = nonZeroRand(-8, 8);
        r2 = nonZeroRand(-8, 8);
    } while (r1 === r2 || r1 === e1 || r1 === e2 || r2 === e1 || r2 === e2);

    const p = e2 - (r1 + r2);
    const q = -p * e1 - r1 * r2;
    if (p === 0 || q === 0) return genSolveLeadsToQuadratic();
    const correct = rootsPairStr(r1, r2);

    const vals = new Set([correct, rootsPairStr(-r1, -r2), rootsPairStr(r1, e1), rootsPairStr(r2, e2)]);
    if (vals.size !== 4) return genSolveLeadsToQuadratic();

    const options = shuffle([
        { value: correct, correct: true },
        { value: rootsPairStr(-r1, -r2), correct: false },
        { value: rootsPairStr(r1, e1), correct: false },
        { value: rootsPairStr(r2, e2), correct: false }
    ]);

    return {
        kind: "solveLeadsToQuadratic",
        taskHTML: `<p class="task-question">${fracHTML("x", denomStr(e1))} + ${fracHTML(numStr(p), denomStr(e2))} = ${fracHTML(numStr(q), `(${denomStr(e1)})(${denomStr(e2)})`)}<br>Решите уравнение.</p>`,
        correctValue: correct,
        options,
        signature: `solveLeadsToQuadratic:${e1}:${e2}:${r1}:${r2}`,
        why: `ОДЗ: x ≠ ${numStr(e1)} и x ≠ ${numStr(e2)}. После умножения на общий знаменатель уравнение сводится к квадратному с корнями ${correct}. Оба значения допустимы по ОДЗ.`
    };
}

// та же схема, но один из корней r1=e1 (посторонний) -> в ответе только r2
function genSolveWithExtraneousRoot() {
    let e1, e2, r2;
    do {
        e1 = nonZeroRand(-8, 8);
        e2 = nonZeroRand(-8, 8);
    } while (e1 === e2);
    do { r2 = nonZeroRand(-8, 8); } while (r2 === e1 || r2 === e2);

    const r1 = e1;
    const p = e2 - (r1 + r2);
    const q = -p * e1 - r1 * r2;
    if (p === 0 || q === 0) return genSolveWithExtraneousRoot();
    const correct = numStr(r2);

    const vals = new Set([correct, rootsPairStr(r1, r2), numStr(r1), "Корней нет"]);
    if (vals.size !== 4) return genSolveWithExtraneousRoot();

    const options = shuffle([
        { value: correct, correct: true },
        { value: rootsPairStr(r1, r2), correct: false },
        { value: numStr(r1), correct: false },
        { value: "Корней нет", correct: false }
    ]);

    return {
        kind: "solveWithExtraneousRoot",
        taskHTML: `<p class="task-question">${fracHTML("x", denomStr(e1))} + ${fracHTML(numStr(p), denomStr(e2))} = ${fracHTML(numStr(q), `(${denomStr(e1)})(${denomStr(e2)})`)}<br>Решите уравнение.</p>`,
        correctValue: correct,
        options,
        signature: `solveWithExtraneousRoot:${e1}:${e2}:${r2}`,
        why: `ОДЗ: x ≠ ${numStr(e1)} и x ≠ ${numStr(e2)}. После умножения на общий знаменатель получаются корни x = ${numStr(r1)} и x = ${numStr(r2)}. Но x = ${numStr(r1)} совпадает с исключённым значением — это посторонний корень. Остаётся только x = ${correct}.`
    };
}

// концептуальный вопрос про ОДЗ и посторонние корни (фикс-пул)
function genOdzConcept() {
    const askWhy = pick([true, false]);
    const pool = askWhy ? ODZ_WHY_POOL : ODZ_ACTION_POOL;
    const correct = pool[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: pool[1], correct: false },
        { value: pool[2], correct: false },
        { value: pool[3], correct: false }
    ]);

    return {
        kind: "odzConcept",
        taskHTML: askWhy
            ? `<p class="task-question">Зачем перед решением дробного уравнения записывают ОДЗ?</p>`
            : `<p class="task-question">Найденный корень уравнения совпал со значением, исключённым по ОДЗ. Что с ним делать?</p>`,
        correctValue: correct,
        options,
        signature: `odzConcept:${askWhy}`,
        why: askWhy
            ? `ОДЗ записывают, чтобы заранее знать, какие значения x запрещены — на ноль делить нельзя, и после решения такие корни нужно будет отбросить.`
            : `Корень, который совпадает с исключённым по ОДЗ значением, называется посторонним — его отбрасывают и не включают в ответ.`
    };
}

// та же схема, что и №9, но с более крупными числами и явной ссылкой на теорему Виета
function genSolveProportionQuadraticVieta() {
    let e1, e2, r1, r2;
    do {
        e1 = nonZeroRand(-12, 12);
        e2 = nonZeroRand(-12, 12);
    } while (e1 === e2);
    do {
        r1 = nonZeroRand(-9, 9);
        r2 = nonZeroRand(-9, 9);
    } while (r1 === r2 || r1 === e1 || r1 === e2 || r2 === e1 || r2 === e2);

    const p = e2 - (r1 + r2);
    const q = -p * e1 - r1 * r2;
    if (p === 0 || q === 0) return genSolveProportionQuadraticVieta();
    const correct = rootsPairStr(r1, r2);

    const vals = new Set([correct, rootsPairStr(-r1, -r2), rootsPairStr(r1, e1), rootsPairStr(r2, e2)]);
    if (vals.size !== 4) return genSolveProportionQuadraticVieta();

    const options = shuffle([
        { value: correct, correct: true },
        { value: rootsPairStr(-r1, -r2), correct: false },
        { value: rootsPairStr(r1, e1), correct: false },
        { value: rootsPairStr(r2, e2), correct: false }
    ]);

    return {
        kind: "solveProportionQuadraticVieta",
        taskHTML: `<p class="task-question">${fracHTML("x", denomStr(e1))} + ${fracHTML(numStr(p), denomStr(e2))} = ${fracHTML(numStr(q), `(${denomStr(e1)})(${denomStr(e2)})`)}<br>Решите уравнение.</p>`,
        correctValue: correct,
        options,
        signature: `solveProportionQuadraticVieta:${e1}:${e2}:${r1}:${r2}`,
        why: `ОДЗ: x ≠ ${numStr(e1)} и x ≠ ${numStr(e2)}. После умножения на общий знаменатель по теореме Виета: сумма корней = ${numStr(r1 + r2)}, произведение = ${numStr(r1 * r2)} → ${correct}. Оба значения допустимы по ОДЗ.`
    };
}

const GENERATORS = {
    findODZSimple: genFindODZSimple,
    findODZPlain: genFindODZPlain,
    isRootAllowed: genIsRootAllowed,
    solveSimpleFraction: genSolveSimpleFraction,
    solveProportionLinear: genSolveProportionLinear,
    solveFractionShift: genSolveFractionShift,
    findODZTwoFactors: genFindODZTwoFactors,
    checkForExtraneous: genCheckForExtraneous,
    solveLeadsToQuadratic: genSolveLeadsToQuadratic,
    solveWithExtraneousRoot: genSolveWithExtraneousRoot,
    odzConcept: genOdzConcept,
    solveProportionQuadraticVieta: genSolveProportionQuadraticVieta
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
            topic: "rational-equations"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
