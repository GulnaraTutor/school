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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["identifyBaseInCube", "factorSumOfCubesSimple", "factorDifferenceOfCubesSimple", "conceptIncompleteSquare"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["factorSumOfCubesWithCoeff", "factorDifferenceOfCubesWithCoeff", "computeIncompleteSquareValue", "identifyFormulaDirection"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["recognizeDisguisedCubeCoefficient", "verifyFactorizationBySubstitution", "fullFactorHardCube", "conceptCheckWhenToApply"] }
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

// строит многочлен от одной переменной x из членов {coef, deg}
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

// строит (kx)³ ± b³ в развёрнутом виде: k³x³ ± b³
function cubeExprStr(k, b, isSum) {
    return polyStr([{ coef: Math.pow(k, 3), deg: 3 }, { coef: isSum ? Math.pow(b, 3) : -Math.pow(b, 3), deg: 0 }]);
}

// строит (kx±b)(k²x²±kbx+b²); linSign/quadMidSign — true значит "+" на этом месте
function buildCubeFactored(k, b, linSign, quadMidSign) {
    const linear = polyStr([{ coef: k, deg: 1 }, { coef: linSign ? b : -b, deg: 0 }]);
    const quad = polyStr([{ coef: k * k, deg: 2 }, { coef: quadMidSign ? k * b : -(k * b), deg: 1 }, { coef: b * b, deg: 0 }]);
    return `(${linear})(${quad})`;
}

// верное разложение для a³+b³ (isSum=true) или a³-b³ (isSum=false), где a=kx
function cubeFactoredStr(k, b, isSum) {
    return buildCubeFactored(k, b, isSum, !isSum);
}

// численное значение k³x³±b³ при конкретном x (для why-текста verifyFactorizationBySubstitution)
function evalCubeExprAt(k, b, isSum, x) {
    return Math.pow(k * x, 3) + (isSum ? Math.pow(b, 3) : -Math.pow(b, 3));
}

// численное значение (kx±b)(k²x²±kbx+b²) при конкретном x
function evalFactoredAt(k, b, linSign, quadMidSign, x) {
    const lin = k * x + (linSign ? b : -b);
    const quad = k * k * x * x + (quadMidSign ? k * b * x : -k * b * x) + b * b;
    return lin * quad;
}

const INCOMPLETE_SQUARE_POOL = [
    "В полном квадрате коэффициент при ab равен 2, а в неполном — 1 (просто ab, без удвоения)",
    "Неполный квадрат — это квадрат только одного из чисел, без второго",
    "Неполный квадрат — то же самое, что обычный квадрат суммы, просто другое название",
    "В неполном квадрате отсутствует одно из чисел a или b"
];

const CUBE_RECOGNIZE_POOL = [
    "Когда оба слагаемых — точные кубы (число или переменная в кубе), соединённые знаком + или −",
    "Формулу кубов можно применять к любым двум числам, независимо от степени",
    "Только если оба числа — кубы одинаковых оснований",
    "Формула работает только для чисел, не для выражений с переменной"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// x³±b³ (k=1) -> найти b
function genIdentifyBaseInCube() {
    const b = rand(2, 6);
    const isSum = pick([true, false]);
    const expr = cubeExprStr(1, b, isSum);
    const correct = numStr(b);

    const d1 = numStr(b * b * b);
    const d2 = numStr(b + 1);
    const d3 = numStr(-b);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genIdentifyBaseInCube();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "identifyBaseInCube",
        taskHTML: `<p class="task-question">${expr}<br>Чтобы применить формулу, нужно найти число b, такое что b³ = ${b * b * b}. Чему равно b?</p>`,
        correctValue: correct,
        options,
        signature: `identifyBaseInCube:${b}:${isSum}`,
        why: `${b}³ = ${b * b * b}, значит b = ${b}.`
    };
}

// x³+b³ (k=1) -> разложить на множители
function genFactorSumOfCubesSimple() {
    const b = rand(2, 6);
    const k = 1;
    const expr = cubeExprStr(k, b, true);
    const correct = buildCubeFactored(k, b, true, false);

    const d1 = buildCubeFactored(k, b, false, true);
    const d2 = buildCubeFactored(k, b, true, true);
    const d3 = buildCubeFactored(k, b, false, false);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFactorSumOfCubesSimple();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "factorSumOfCubesSimple",
        taskHTML: `<p class="task-question">${expr}<br>Разложите на множители по формуле суммы кубов.</p>`,
        correctValue: correct,
        options,
        signature: `factorSumOfCubesSimple:${b}`,
        why: `a³+b³=(a+b)(a²−ab+b²), где a=x, b=${b}: ${correct}.`
    };
}

// x³−b³ (k=1) -> разложить на множители
function genFactorDifferenceOfCubesSimple() {
    const b = rand(2, 6);
    const k = 1;
    const expr = cubeExprStr(k, b, false);
    const correct = buildCubeFactored(k, b, false, true);

    const d1 = buildCubeFactored(k, b, true, false);
    const d2 = buildCubeFactored(k, b, false, false);
    const d3 = buildCubeFactored(k, b, true, true);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFactorDifferenceOfCubesSimple();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "factorDifferenceOfCubesSimple",
        taskHTML: `<p class="task-question">${expr}<br>Разложите на множители по формуле разности кубов.</p>`,
        correctValue: correct,
        options,
        signature: `factorDifferenceOfCubesSimple:${b}`,
        why: `a³−b³=(a−b)(a²+ab+b²), где a=x, b=${b}: ${correct}.`
    };
}

// концептуальный вопрос про неполный квадрат
function genConceptIncompleteSquare() {
    const correct = INCOMPLETE_SQUARE_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: INCOMPLETE_SQUARE_POOL[1], correct: false },
        { value: INCOMPLETE_SQUARE_POOL[2], correct: false },
        { value: INCOMPLETE_SQUARE_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptIncompleteSquare",
        taskHTML: `<p class="task-question">Чем неполный квадрат суммы/разности (a² ∓ ab + b²) отличается от обычного квадрата суммы/разности?</p>`,
        correctValue: correct,
        options,
        signature: `conceptIncompleteSquare`,
        why: `В полном квадрате (a±b)²=a²±2ab+b² коэффициент при ab равен 2, а в неполном — только 1.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// k³x³+b³ (k=2,3) -> разложить на множители
function genFactorSumOfCubesWithCoeff() {
    const k = pick([2, 3]);
    const b = rand(1, 5);
    const expr = cubeExprStr(k, b, true);
    const correct = buildCubeFactored(k, b, true, false);

    const d1 = buildCubeFactored(k, b, false, true);
    const d2 = buildCubeFactored(k, b, true, true);
    const d3 = buildCubeFactored(k, b, false, false);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFactorSumOfCubesWithCoeff();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "factorSumOfCubesWithCoeff",
        taskHTML: `<p class="task-question">${expr}<br>Разложите на множители по формуле суммы кубов.</p>`,
        correctValue: correct,
        options,
        signature: `factorSumOfCubesWithCoeff:${k}:${b}`,
        why: `${k}³x³ = (${k}x)³, значит a=${k}x, b=${b}. a³+b³=(a+b)(a²−ab+b²): ${correct}.`
    };
}

// k³x³−b³ (k=2,3) -> разложить на множители
function genFactorDifferenceOfCubesWithCoeff() {
    const k = pick([2, 3]);
    const b = rand(1, 5);
    const expr = cubeExprStr(k, b, false);
    const correct = buildCubeFactored(k, b, false, true);

    const d1 = buildCubeFactored(k, b, true, false);
    const d2 = buildCubeFactored(k, b, false, false);
    const d3 = buildCubeFactored(k, b, true, true);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFactorDifferenceOfCubesWithCoeff();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "factorDifferenceOfCubesWithCoeff",
        taskHTML: `<p class="task-question">${expr}<br>Разложите на множители по формуле разности кубов.</p>`,
        correctValue: correct,
        options,
        signature: `factorDifferenceOfCubesWithCoeff:${k}:${b}`,
        why: `${k}³x³ = (${k}x)³, значит a=${k}x, b=${b}. a³−b³=(a−b)(a²+ab+b²): ${correct}.`
    };
}

// даны конкретные a,b -> вычислить неполный квадрат
function genComputeIncompleteSquareValue() {
    const a = rand(2, 8);
    const b = rand(2, 8);
    const isMinus = pick([true, false]);
    const correct = numStr(isMinus ? a * a - a * b + b * b : a * a + a * b + b * b);

    const d1 = numStr(isMinus ? a * a + a * b + b * b : a * a - a * b + b * b);
    const d2 = numStr(a * a + b * b);
    const d3 = numStr((a + b) * (a + b));

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genComputeIncompleteSquareValue();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "computeIncompleteSquareValue",
        taskHTML: `<p class="task-question">a = ${a}, b = ${b}<br>Вычислите ${isMinus ? "a² − ab + b²" : "a² + ab + b²"} (неполный квадрат).</p>`,
        correctValue: correct,
        options,
        signature: `computeIncompleteSquareValue:${a}:${b}:${isMinus}`,
        why: `a² = ${a * a}, b² = ${b * b}, ab = ${a * b}. ${isMinus ? `a² − ab + b² = ${a * a} − ${a * b} + ${b * b}` : `a² + ab + b² = ${a * a} + ${a * b} + ${b * b}`} = ${correct}.`
    };
}

// дано выражение -> сумма или разность кубов
function genIdentifyFormulaDirection() {
    const b = rand(2, 6);
    const isSum = pick([true, false]);
    const expr = cubeExprStr(1, b, isSum);
    const correct = isSum ? "Сумма кубов" : "Разность кубов";

    const options = shuffle([
        { value: correct, correct: true },
        { value: isSum ? "Разность кубов" : "Сумма кубов", correct: false }
    ]);

    return {
        kind: "identifyFormulaDirection",
        taskHTML: `<p class="task-question">${expr}<br>Какую формулу нужно применить?</p>`,
        correctValue: correct,
        options,
        signature: `identifyFormulaDirection:${b}:${isSum}`,
        why: isSum ? `Между кубами стоит плюс — это сумма кубов.` : `Между кубами стоит минус — это разность кубов.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// k³x³±b³ -> найти k (коэффициент внутри куба)
function genRecognizeDisguisedCubeCoefficient() {
    const k = pick([2, 3]);
    const b = rand(1, 5);
    const isSum = pick([true, false]);
    const expr = cubeExprStr(k, b, isSum);
    const correct = numStr(k);

    const d1 = numStr(Math.pow(k, 3));
    const d2 = numStr(k + 1);
    const d3 = numStr(b);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genRecognizeDisguisedCubeCoefficient();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "recognizeDisguisedCubeCoefficient",
        taskHTML: `<p class="task-question">${expr}<br>Представьте первое слагаемое как (kx)³. Чему равно k?</p>`,
        correctValue: correct,
        options,
        signature: `recognizeDisguisedCubeCoefficient:${k}:${b}:${isSum}`,
        why: `(${k}x)³ = ${Math.pow(k, 3)}x³, значит k = ${k}.`
    };
}

// дано разложение (верное или одна из ошибок) -> верно/неверно, с подстановкой x=1 в why
function genVerifyFactorizationBySubstitution() {
    const k = pick([1, 2]);
    const b = rand(2, 5);
    const isSum = pick([true, false]);
    const expr = cubeExprStr(k, b, isSum);

    const showCorrect = pick([true, false]);
    const shownLinSign = showCorrect ? isSum : !isSum;
    const shownQuadMidSign = showCorrect ? !isSum : isSum;
    const shown = buildCubeFactored(k, b, shownLinSign, shownQuadMidSign);

    const correct = showCorrect ? "Верно" : "Неверно";
    const options = shuffle([
        { value: correct, correct: true },
        { value: correct === "Верно" ? "Неверно" : "Верно", correct: false }
    ]);

    const lhs1 = evalCubeExprAt(k, b, isSum, 1);
    const rhs1 = evalFactoredAt(k, b, shownLinSign, shownQuadMidSign, 1);

    return {
        kind: "verifyFactorizationBySubstitution",
        taskHTML: `<p class="task-question">${expr} = ${shown}<br>Это разложение верное?</p>`,
        correctValue: correct,
        options,
        signature: `verifyFactorizationBySubstitution:${k}:${b}:${isSum}:${showCorrect}`,
        why: `При x=1: левая часть = ${numStr(lhs1)}, правая часть = ${numStr(rhs1)}. ${lhs1 === rhs1 ? "Совпадает — разложение верное." : "Не совпадает — разложение неверное."}`
    };
}

// k³x³±b³ с более крупными k,b -> полное разложение
function genFullFactorHardCube() {
    const k = pick([2, 3]);
    const b = rand(4, 9);
    const isSum = pick([true, false]);
    const expr = cubeExprStr(k, b, isSum);
    const correct = buildCubeFactored(k, b, isSum, !isSum);

    const d1 = buildCubeFactored(k, b, !isSum, isSum);
    const d2 = buildCubeFactored(k, b, isSum, isSum);
    const d3 = buildCubeFactored(k, b, !isSum, !isSum);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFullFactorHardCube();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "fullFactorHardCube",
        taskHTML: `<p class="task-question">${expr}<br>Разложите на множители.</p>`,
        correctValue: correct,
        options,
        signature: `fullFactorHardCube:${k}:${b}:${isSum}`,
        why: `a=${k}x, b=${b}. ${isSum ? "a³+b³=(a+b)(a²−ab+b²)" : "a³−b³=(a−b)(a²+ab+b²)"}: ${correct}.`
    };
}

// концептуальный вопрос: как распознать применимость формулы кубов
function genConceptCheckWhenToApply() {
    const correct = CUBE_RECOGNIZE_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: CUBE_RECOGNIZE_POOL[1], correct: false },
        { value: CUBE_RECOGNIZE_POOL[2], correct: false },
        { value: CUBE_RECOGNIZE_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptCheckWhenToApply",
        taskHTML: `<p class="task-question">Как понять, что к выражению можно применить формулу суммы или разности кубов?</p>`,
        correctValue: correct,
        options,
        signature: `conceptCheckWhenToApply`,
        why: `Нужно, чтобы оба члена были точными кубами (число или переменная в кубе), соединёнными знаком + или −.`
    };
}

const GENERATORS = {
    identifyBaseInCube: genIdentifyBaseInCube,
    factorSumOfCubesSimple: genFactorSumOfCubesSimple,
    factorDifferenceOfCubesSimple: genFactorDifferenceOfCubesSimple,
    conceptIncompleteSquare: genConceptIncompleteSquare,
    factorSumOfCubesWithCoeff: genFactorSumOfCubesWithCoeff,
    factorDifferenceOfCubesWithCoeff: genFactorDifferenceOfCubesWithCoeff,
    computeIncompleteSquareValue: genComputeIncompleteSquareValue,
    identifyFormulaDirection: genIdentifyFormulaDirection,
    recognizeDisguisedCubeCoefficient: genRecognizeDisguisedCubeCoefficient,
    verifyFactorizationBySubstitution: genVerifyFactorizationBySubstitution,
    fullFactorHardCube: genFullFactorHardCube,
    conceptCheckWhenToApply: genConceptCheckWhenToApply
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
            topic: "cubes"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
