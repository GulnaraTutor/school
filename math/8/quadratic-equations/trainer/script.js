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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["identifyCoefficients", "computeDiscriminant", "numberOfRootsFromD", "vietaSumProduct"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["solveViaDiscriminant", "solveDZero", "vietaFindRoots", "noRealRootsRecognize"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["solveNonUnitA", "constructFromRoots", "discriminantSignConcept", "solveHarderNonUnitA"] }
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

function sqTerm(n) {
    return n < 0 ? `(${numStr(n)})` : `${n}`;
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

// строка вида "3x² − 5x + 2 = 0" по коэффициентам a,b,c
function equationStr(a, b, c) {
    let s = a === 1 ? "x²" : a === -1 ? "−x²" : `${numStr(a)}x²`;
    if (b !== 0) {
        const bAbs = Math.abs(b);
        s += ` ${b > 0 ? "+" : "−"} ${bAbs === 1 ? "" : bAbs}x`;
    }
    if (c !== 0) {
        s += ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}`;
    }
    s += " = 0";
    return s;
}

// строка вида "x₁ = −2, x₂ = 3" — корни всегда в порядке возрастания
function rootsPairStr(r1, r2) {
    const lo = Math.min(r1, r2), hi = Math.max(r1, r2);
    return `x₁ = ${numStr(lo)}, x₂ = ${numStr(hi)}`;
}

const ROOTS_COUNT_POOL = ["2", "1", "0"];
const D_SIGN_POOL = ["D > 0", "D = 0", "D < 0"];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// дано ax²+bx+c=0 -> назвать a, b или c
function genIdentifyCoefficients() {
    const a = pick([1, 2, 3, -1, -2, 4, 5]);
    let b, c;
    do { b = nonZeroRand(-9, 9); } while (false);
    do { c = nonZeroRand(-9, 9); } while (false);

    const ask = pick(["a", "b", "c"]);
    const correctNum = ask === "a" ? a : ask === "b" ? b : c;
    const correct = numStr(correctNum);

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(-correctNum), correct: false },
        { value: numStr(correctNum + 1), correct: false },
        { value: numStr(correctNum - 1), correct: false }
    ]);

    return {
        kind: "identifyCoefficients",
        taskHTML: `<p class="task-question">${equationStr(a, b, c)}<br>Чему равен коэффициент ${ask}?</p>`,
        correctValue: correct,
        options,
        signature: `identifyCoefficients:${a}:${b}:${c}:${ask}`,
        why: `В уравнении ${equationStr(a, b, c)} коэффициент ${ask} равен ${correct}.`
    };
}

// даны a,b,c -> вычислить D
function genComputeDiscriminant() {
    const a = rand(1, 6);
    const b = nonZeroRand(-9, 9);
    const c = nonZeroRand(-9, 9);
    const D = b * b - 4 * a * c;
    const correct = numStr(D);

    const vals = new Set([correct, numStr(b * b + 4 * a * c), numStr(-D), numStr(b * b - a * c)]);
    if (vals.size !== 4) return genComputeDiscriminant();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(b * b + 4 * a * c), correct: false },
        { value: numStr(-D), correct: false },
        { value: numStr(b * b - a * c), correct: false }
    ]);

    return {
        kind: "computeDiscriminant",
        taskHTML: `<p class="task-question">${equationStr(a, b, c)}<br>Чему равен дискриминант D = b² − 4ac?</p>`,
        correctValue: correct,
        options,
        signature: `computeDiscriminant:${a}:${b}:${c}`,
        why: `D = ${sqTerm(b)}² − 4×${a}×${numStr(c)} = ${b * b} ${(-4 * a * c) >= 0 ? "+" : "−"} ${Math.abs(4 * a * c)} = ${D}.`
    };
}

// дано D -> сколько корней
function genNumberOfRootsFromD() {
    const D = nonZeroRand(-20, 20);
    const correct = D > 0 ? "2" : "0";

    const options = shuffle([
        { value: correct, correct: true },
        { value: correct === "2" ? "0" : "2", correct: false },
        { value: "1", correct: false }
    ]);

    return {
        kind: "numberOfRootsFromD",
        taskHTML: `<p class="task-question">Дискриминант уравнения равен D = ${D}. Сколько у уравнения корней?</p>`,
        correctValue: correct,
        options,
        signature: `numberOfRootsFromD:${D}`,
        why: D > 0
            ? `D > 0, значит у уравнения два корня.`
            : `D < 0, значит у уравнения нет корней.`
    };
}

// x²+px+q=0 с целыми корнями -> сумма или произведение корней по Виета
function genVietaSumProduct() {
    let x1, x2;
    do { x1 = nonZeroRand(-9, 9); x2 = nonZeroRand(-9, 9); } while (x1 === x2);
    const p = -(x1 + x2), q = x1 * x2;
    const askSum = pick([true, false]);
    const correctNum = askSum ? x1 + x2 : q;
    const correct = numStr(correctNum);

    const vals = new Set([correct, numStr(-correctNum), numStr(askSum ? q : x1 + x2), numStr(correctNum + 1)]);
    if (vals.size !== 4) return genVietaSumProduct();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(-correctNum), correct: false },
        { value: numStr(askSum ? q : x1 + x2), correct: false },
        { value: numStr(correctNum + 1), correct: false }
    ]);

    return {
        kind: "vietaSumProduct",
        taskHTML: `<p class="task-question">${equationStr(1, p, q)}<br>Чему ${askSum ? "равна сумма" : "равно произведение"} корней этого уравнения?</p>`,
        correctValue: correct,
        options,
        signature: `vietaSumProduct:${x1}:${x2}:${askSum}`,
        why: askSum
            ? `По теореме Виета сумма корней x₁+x₂ = −p = −(${numStr(p)}) = ${x1 + x2}.`
            : `По теореме Виета произведение корней x₁·x₂ = q = ${q}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// корни целые -> решить через дискриминант, найти оба корня
function genSolveViaDiscriminant() {
    let x1, x2, vals;
    do {
        x1 = nonZeroRand(-9, 9);
        x2 = nonZeroRand(-9, 9);
    } while (x1 === x2);

    const b = -(x1 + x2), c = x1 * x2;
    const correct = rootsPairStr(x1, x2);

    vals = new Set([correct, rootsPairStr(-x1, -x2), rootsPairStr(x1, -x2), rootsPairStr(-x1, x2)]);
    if (vals.size !== 4) return genSolveViaDiscriminant();

    const options = shuffle([
        { value: correct, correct: true },
        { value: rootsPairStr(-x1, -x2), correct: false },
        { value: rootsPairStr(x1, -x2), correct: false },
        { value: rootsPairStr(-x1, x2), correct: false }
    ]);

    const D = b * b - 4 * c;

    return {
        kind: "solveViaDiscriminant",
        taskHTML: `<p class="task-question">Решите уравнение: ${equationStr(1, b, c)}</p>`,
        correctValue: correct,
        options,
        signature: `solveViaDiscriminant:${x1}:${x2}`,
        why: `D = ${sqTerm(b)}² − 4×${c} = ${D}, √D = ${Math.round(Math.sqrt(D))}. x = (${numStr(-b)} ± ${Math.round(Math.sqrt(D))}) / 2 → ${correct}.`
    };
}

// корень x0 -> развёрнутое (x-x0)²=0, найти единственный корень
function genSolveDZero() {
    const x0 = nonZeroRand(-9, 9);
    const b = -2 * x0, c = x0 * x0;
    const correct = numStr(x0);

    const vals = new Set([correct, numStr(-x0), numStr(2 * x0), numStr(x0 + 1)]);
    if (vals.size !== 4) return genSolveDZero();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(-x0), correct: false },
        { value: numStr(2 * x0), correct: false },
        { value: numStr(x0 + 1), correct: false }
    ]);

    return {
        kind: "solveDZero",
        taskHTML: `<p class="task-question">Решите уравнение: ${equationStr(1, b, c)}</p>`,
        correctValue: correct,
        options,
        signature: `solveDZero:${x0}`,
        why: `D = ${sqTerm(b)}² − 4×${c} = 0, значит корень один: x = ${numStr(-b)} / 2 = ${x0}.`
    };
}

// даны сумма и произведение корней -> подобрать сами корни
function genVietaFindRoots() {
    let x1, x2, vals;
    do {
        x1 = nonZeroRand(-9, 9);
        x2 = nonZeroRand(-9, 9);
    } while (x1 === x2);

    const S = x1 + x2, P = x1 * x2;
    const correct = rootsPairStr(x1, x2);

    vals = new Set([correct, rootsPairStr(-x1, -x2), rootsPairStr(x1, -x2), rootsPairStr(-x1, x2)]);
    if (vals.size !== 4) return genVietaFindRoots();

    const options = shuffle([
        { value: correct, correct: true },
        { value: rootsPairStr(-x1, -x2), correct: false },
        { value: rootsPairStr(x1, -x2), correct: false },
        { value: rootsPairStr(-x1, x2), correct: false }
    ]);

    return {
        kind: "vietaFindRoots",
        taskHTML: `<p class="task-question">Сумма корней уравнения равна ${numStr(S)}, а произведение — ${numStr(P)}. Найдите сами корни.</p>`,
        correctValue: correct,
        options,
        signature: `vietaFindRoots:${x1}:${x2}`,
        why: `Ищем два числа с суммой ${numStr(S)} и произведением ${numStr(P)}: подходят ${numStr(x1)} и ${numStr(x2)}.`
    };
}

// уравнение с D<0 -> "корней нет"
function genNoRealRootsRecognize() {
    const b = nonZeroRand(-9, 9);
    const minC = Math.ceil((b * b) / 4) + 1;
    const c = minC + rand(0, 5);
    const correct = "Корней нет";

    const fakeX1 = nonZeroRand(-9, 9), fakeX2 = nonZeroRand(-9, 9);

    const options = shuffle([
        { value: correct, correct: true },
        { value: rootsPairStr(fakeX1, fakeX2), correct: false },
        { value: rootsPairStr(-fakeX1, fakeX2), correct: false },
        { value: `x = ${numStr(-b)}`, correct: false }
    ]);

    return {
        kind: "noRealRootsRecognize",
        taskHTML: `<p class="task-question">Решите уравнение: ${equationStr(1, b, c)}</p>`,
        correctValue: correct,
        options,
        signature: `noRealRootsRecognize:${b}:${c}`,
        why: `D = ${sqTerm(b)}² − 4×${c} = ${b * b - 4 * c} — отрицательное число, значит у уравнения нет корней.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// a != 1, корни целые -> найти оба корня
function genSolveNonUnitA() {
    const a = rand(2, 5);
    let x1, x2, vals;
    do {
        x1 = nonZeroRand(-6, 6);
        x2 = nonZeroRand(-6, 6);
    } while (x1 === x2);

    const b = -a * (x1 + x2), c = a * x1 * x2;
    const correct = rootsPairStr(x1, x2);

    vals = new Set([correct, rootsPairStr(-x1, -x2), rootsPairStr(x1, -x2), rootsPairStr(-x1, x2)]);
    if (vals.size !== 4) return genSolveNonUnitA();

    const options = shuffle([
        { value: correct, correct: true },
        { value: rootsPairStr(-x1, -x2), correct: false },
        { value: rootsPairStr(x1, -x2), correct: false },
        { value: rootsPairStr(-x1, x2), correct: false }
    ]);

    const D = b * b - 4 * a * c;

    return {
        kind: "solveNonUnitA",
        taskHTML: `<p class="task-question">Решите уравнение: ${equationStr(a, b, c)}</p>`,
        correctValue: correct,
        options,
        signature: `solveNonUnitA:${a}:${x1}:${x2}`,
        why: `D = ${sqTerm(b)}² − 4×${a}×${numStr(c)} = ${D}, √D = ${Math.round(Math.sqrt(D))}. x = (${numStr(-b)} ± ${Math.round(Math.sqrt(D))}) / ${2 * a} → ${correct}.`
    };
}

// даны корни -> найти p и q приведённого уравнения
function genConstructFromRoots() {
    let x1, x2;
    do { x1 = nonZeroRand(-9, 9); x2 = nonZeroRand(-9, 9); } while (x1 === x2);
    const p = -(x1 + x2), q = x1 * x2;
    const askP = pick([true, false]);
    const correctNum = askP ? p : q;
    const correct = numStr(correctNum);

    const vals = new Set([correct, numStr(-correctNum), numStr(askP ? q : p), numStr(correctNum + 1)]);
    if (vals.size !== 4) return genConstructFromRoots();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(-correctNum), correct: false },
        { value: numStr(askP ? q : p), correct: false },
        { value: numStr(correctNum + 1), correct: false }
    ]);

    return {
        kind: "constructFromRoots",
        taskHTML: `<p class="task-question">Корни уравнения x² + px + q = 0 равны ${numStr(x1)} и ${numStr(x2)}. Чему равен коэффициент ${askP ? "p" : "q"}?</p>`,
        correctValue: correct,
        options,
        signature: `constructFromRoots:${x1}:${x2}:${askP}`,
        why: askP
            ? `p = −(x₁+x₂) = −(${numStr(x1)}+${numStr(x2)}) = ${p}.`
            : `q = x₁·x₂ = ${numStr(x1)}×${numStr(x2)} = ${q}.`
    };
}

// даны a,b,c -> знак дискриминанта (без явного значения)
function genDiscriminantSignConcept() {
    const a = rand(1, 6);
    const b = nonZeroRand(-9, 9);
    const c = nonZeroRand(-9, 9);
    const D = b * b - 4 * a * c;
    const correct = D > 0 ? "D > 0" : D === 0 ? "D = 0" : "D < 0";

    const pool = D_SIGN_POOL.filter(v => v !== correct);

    const options = shuffle([
        { value: correct, correct: true },
        { value: pool[0], correct: false },
        { value: pool[1], correct: false }
    ]);

    return {
        kind: "discriminantSignConcept",
        taskHTML: `<p class="task-question">${equationStr(a, b, c)}<br>Каков знак дискриминанта этого уравнения?</p>`,
        correctValue: correct,
        options,
        signature: `discriminantSignConcept:${a}:${b}:${c}`,
        why: `D = ${sqTerm(b)}² − 4×${a}×${numStr(c)} = ${D}, значит ${correct}.`
    };
}

// a != 1, более крупные значения
function genSolveHarderNonUnitA() {
    const a = rand(2, 7);
    let x1, x2, vals;
    do {
        x1 = nonZeroRand(-9, 9);
        x2 = nonZeroRand(-9, 9);
    } while (x1 === x2);

    const b = -a * (x1 + x2), c = a * x1 * x2;
    const correct = rootsPairStr(x1, x2);

    vals = new Set([correct, rootsPairStr(-x1, -x2), rootsPairStr(x1, -x2), rootsPairStr(-x1, x2)]);
    if (vals.size !== 4) return genSolveHarderNonUnitA();

    const options = shuffle([
        { value: correct, correct: true },
        { value: rootsPairStr(-x1, -x2), correct: false },
        { value: rootsPairStr(x1, -x2), correct: false },
        { value: rootsPairStr(-x1, x2), correct: false }
    ]);

    const D = b * b - 4 * a * c;

    return {
        kind: "solveHarderNonUnitA",
        taskHTML: `<p class="task-question">Решите уравнение: ${equationStr(a, b, c)}</p>`,
        correctValue: correct,
        options,
        signature: `solveHarderNonUnitA:${a}:${x1}:${x2}`,
        why: `D = ${sqTerm(b)}² − 4×${a}×${numStr(c)} = ${D}, √D = ${Math.round(Math.sqrt(D))}. x = (${numStr(-b)} ± ${Math.round(Math.sqrt(D))}) / ${2 * a} → ${correct}.`
    };
}

const GENERATORS = {
    identifyCoefficients: genIdentifyCoefficients,
    computeDiscriminant: genComputeDiscriminant,
    numberOfRootsFromD: genNumberOfRootsFromD,
    vietaSumProduct: genVietaSumProduct,
    solveViaDiscriminant: genSolveViaDiscriminant,
    solveDZero: genSolveDZero,
    vietaFindRoots: genVietaFindRoots,
    noRealRootsRecognize: genNoRealRootsRecognize,
    solveNonUnitA: genSolveNonUnitA,
    constructFromRoots: genConstructFromRoots,
    discriminantSignConcept: genDiscriminantSignConcept,
    solveHarderNonUnitA: genSolveHarderNonUnitA
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
            topic: "quadratic-equations"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
