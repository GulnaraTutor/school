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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["identifyQuadrant", "evaluateFunctionLinear", "identifyDefinitionMethod", "identifyCoordinateRole"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["checkPointOnGraph", "findYIntercept", "findXInterceptLinear", "evaluatePiecewiseFunction"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["evaluateFunctionQuadratic", "findBothIntercepts", "checkPointOnGraphQuadratic", "conceptCheckFunctionDefinition"] }
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

const METHOD_DESCRIPTIONS = [
    { desc: "y = 3x − 5", method: "Формула" },
    { desc: "Таблица со столбцами значений x и y", method: "Таблица" },
    { desc: "«Каждому x соответствует его квадрат»", method: "Словесное описание" },
    { desc: "Линия на координатной плоскости", method: "График" }
];

const COORD_ROLE_POOL = [
    "Первое число (x) — абсцисса, второе (y) — ордината",
    "Первое число (x) — ордината, второе (y) — абсцисса",
    "Оба числа называются абсциссами",
    "Порядок чисел в координатах точки значения не имеет"
];

const FUNCTION_DEF_POOL = [
    "Каждому значению x соответствует ровно одно значение y",
    "Каждому значению x может соответствовать несколько значений y",
    "Каждому значению y должно соответствовать только одно значение x",
    "x и y могут быть связаны произвольным образом, без ограничений"
];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// точка (x;y) -> номер четверти
function genIdentifyQuadrant() {
    const x = nonZeroRand(-9, 9);
    const y = nonZeroRand(-9, 9);
    let correct;
    if (x > 0 && y > 0) correct = "I четверть";
    else if (x < 0 && y > 0) correct = "II четверть";
    else if (x < 0 && y < 0) correct = "III четверть";
    else correct = "IV четверть";

    const options = shuffle(["I четверть", "II четверть", "III четверть", "IV четверть"].map(v => ({ value: v, correct: v === correct })));

    return {
        kind: "identifyQuadrant",
        taskHTML: `<p class="task-question">Точка (${numStr(x)}; ${numStr(y)})<br>В какой четверти она находится?</p>`,
        correctValue: correct,
        options,
        signature: `identifyQuadrant:${x}:${y}`,
        why: `x ${x > 0 ? "> 0" : "< 0"}, y ${y > 0 ? "> 0" : "< 0"} — это ${correct}.`
    };
}

// y=kx+b, дано x -> найти y
function genEvaluateFunctionLinear() {
    const k = nonZeroRand(-9, 9);
    const b = rand(-9, 9);
    const x0 = rand(-9, 9);
    const y0 = k * x0 + b;
    const correct = numStr(y0);

    const d1 = numStr(k + x0 + b);
    const d2 = numStr(k * x0);
    const d3 = numStr(y0 + 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genEvaluateFunctionLinear();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "evaluateFunctionLinear",
        taskHTML: `<p class="task-question">y = ${linExprStr(k, b)}<br>Найдите y при x = ${numStr(x0)}.</p>`,
        correctValue: correct,
        options,
        signature: `evaluateFunctionLinear:${k}:${b}:${x0}`,
        why: `y = ${numStr(k)} · ${numStr(x0)} ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${correct}.`
    };
}

// дано описание -> каким способом задана функция
function genIdentifyDefinitionMethod() {
    const item = pick(METHOD_DESCRIPTIONS);
    const correct = item.method;
    const others = METHOD_DESCRIPTIONS.filter(m => m.method !== correct).map(m => m.method);

    const options = shuffle([
        { value: correct, correct: true },
        ...others.map(v => ({ value: v, correct: false }))
    ]);

    return {
        kind: "identifyDefinitionMethod",
        taskHTML: `<p class="task-question">${item.desc}<br>Каким способом задана функция?</p>`,
        correctValue: correct,
        options,
        signature: `identifyDefinitionMethod:${item.method}`,
        why: `Это пример задания функции способом «${correct}».`
    };
}

// концептуальный вопрос про абсциссу/ординату
function genIdentifyCoordinateRole() {
    const correct = COORD_ROLE_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: COORD_ROLE_POOL[1], correct: false },
        { value: COORD_ROLE_POOL[2], correct: false },
        { value: COORD_ROLE_POOL[3], correct: false }
    ]);

    return {
        kind: "identifyCoordinateRole",
        taskHTML: `<p class="task-question">Точка задана координатами (x; y). Как называются эти числа?</p>`,
        correctValue: correct,
        options,
        signature: `identifyCoordinateRole`,
        why: `x — абсцисса (координата по горизонтальной оси), y — ордината (координата по вертикальной оси).`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// y=kx+b, точка (x0;y0) -> принадлежит графику или нет
function genCheckPointOnGraph() {
    const k = nonZeroRand(-9, 9);
    const b = rand(-9, 9);
    const belongs = pick([true, false]);
    const x0 = rand(-9, 9);
    const trueY = k * x0 + b;
    const y0 = belongs ? trueY : trueY + nonZeroRand(1, 5);
    const correct = belongs ? "Да, принадлежит" : "Нет, не принадлежит";

    const options = shuffle([
        { value: correct, correct: true },
        { value: belongs ? "Нет, не принадлежит" : "Да, принадлежит", correct: false }
    ]);

    return {
        kind: "checkPointOnGraph",
        taskHTML: `<p class="task-question">y = ${linExprStr(k, b)}<br>Принадлежит ли графику точка (${numStr(x0)}; ${numStr(y0)})?</p>`,
        correctValue: correct,
        options,
        signature: `checkPointOnGraph:${k}:${b}:${x0}:${y0}`,
        why: `При x = ${numStr(x0)}: y = ${numStr(trueY)}. ${belongs ? "Совпадает с данным y — точка принадлежит графику." : `Не совпадает с ${numStr(y0)} — точка не принадлежит графику.`}`
    };
}

// y=kx+b -> точка пересечения с осью y
function genFindYIntercept() {
    const k = nonZeroRand(-9, 9);
    const b = rand(-9, 9);
    const correct = `(0; ${numStr(b)})`;

    const d1 = `(${numStr(b)}; 0)`;
    const d2 = `(0; ${numStr(-b)})`;
    const d3 = `(0; ${numStr(k)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindYIntercept();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findYIntercept",
        taskHTML: `<p class="task-question">y = ${linExprStr(k, b)}<br>Найдите точку пересечения графика с осью y.</p>`,
        correctValue: correct,
        options,
        signature: `findYIntercept:${k}:${b}`,
        why: `При x = 0: y = ${numStr(k)} · 0 ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${numStr(b)}. Точка: ${correct}.`
    };
}

// y=kx+b -> точка пересечения с осью x
function genFindXInterceptLinear() {
    const k = nonZeroRand(-9, 9);
    const x0 = rand(-9, 9);
    const b = -k * x0;
    const correct = `(${numStr(x0)}; 0)`;

    const d1 = `(0; ${numStr(x0)})`;
    const d2 = `(${numStr(-x0)}; 0)`;
    const d3 = `(${numStr(x0 + 1)}; 0)`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindXInterceptLinear();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findXInterceptLinear",
        taskHTML: `<p class="task-question">y = ${linExprStr(k, b)}<br>Найдите точку пересечения графика с осью x.</p>`,
        correctValue: correct,
        options,
        signature: `findXInterceptLinear:${k}:${x0}:${b}`,
        why: `При y = 0: ${numStr(k)}x ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = 0, x = ${numStr(x0)}. Точка: ${correct}.`
    };
}

// кусочная функция из 2 частей, дано x -> найти f(x)
function genEvaluatePiecewiseFunction() {
    const threshold = rand(-5, 5);
    const k1 = nonZeroRand(-5, 5), b1 = rand(-5, 5);
    const k2 = nonZeroRand(-5, 5), b2 = rand(-5, 5);
    const useFirst = pick([true, false]);
    const x0 = useFirst ? threshold - rand(1, 4) : threshold + rand(0, 4);
    const isFirstBranch = x0 < threshold;
    const y0 = isFirstBranch ? k1 * x0 + b1 : k2 * x0 + b2;
    const correct = numStr(y0);

    const otherY = isFirstBranch ? k2 * x0 + b2 : k1 * x0 + b1;
    const d1 = numStr(otherY);
    const d2 = numStr(y0 + 1);
    const d3 = numStr(-y0);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genEvaluatePiecewiseFunction();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "evaluatePiecewiseFunction",
        taskHTML: `<p class="task-question">f(x) = ${linExprStr(k1, b1)}, если x &lt; ${numStr(threshold)}<br>f(x) = ${linExprStr(k2, b2)}, если x ≥ ${numStr(threshold)}<br>Найдите f(${numStr(x0)}).</p>`,
        correctValue: correct,
        options,
        signature: `evaluatePiecewiseFunction:${threshold}:${k1}:${b1}:${k2}:${b2}:${x0}`,
        why: `x = ${numStr(x0)} ${isFirstBranch ? "<" : "≥"} ${numStr(threshold)}, значит используем ${isFirstBranch ? "первую" : "вторую"} формулу: f(${numStr(x0)}) = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// y=ax²+bx+c, дано x -> найти y
function genEvaluateFunctionQuadratic() {
    const a = nonZeroRand(-5, 5);
    const b = rand(-5, 5);
    const c = rand(-5, 5);
    const x0 = rand(-5, 5);
    const y0 = a * x0 * x0 + b * x0 + c;
    const correct = numStr(y0);

    const d1 = numStr(a * x0 + b * x0 + c);
    const d2 = numStr(y0 + a);
    const d3 = numStr(-y0);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genEvaluateFunctionQuadratic();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "evaluateFunctionQuadratic",
        taskHTML: `<p class="task-question">y = ${quadExprStr(a, b, c)}<br>Найдите y при x = ${numStr(x0)}.</p>`,
        correctValue: correct,
        options,
        signature: `evaluateFunctionQuadratic:${a}:${b}:${c}:${x0}`,
        why: `y = ${numStr(a)} · ${numStr(x0)}² ${b >= 0 ? "+" : "−"} ${Math.abs(b)} · ${numStr(x0)} ${c >= 0 ? "+" : "−"} ${Math.abs(c)} = ${correct}.`
    };
}

// y=kx+b -> обе точки пересечения (с x и с y)
function genFindBothIntercepts() {
    const k = nonZeroRand(-9, 9);
    const x0 = nonZeroRand(-9, 9);
    const b = -k * x0;
    const correct = `x: (${numStr(x0)}; 0), y: (0; ${numStr(b)})`;

    const d1 = `x: (0; ${numStr(x0)}), y: (${numStr(b)}; 0)`;
    const d2 = `x: (${numStr(-x0)}; 0), y: (0; ${numStr(b)})`;
    const d3 = `x: (${numStr(x0)}; 0), y: (0; ${numStr(-b)})`;

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genFindBothIntercepts();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "findBothIntercepts",
        taskHTML: `<p class="task-question">y = ${linExprStr(k, b)}<br>Найдите точки пересечения графика с обеими осями.</p>`,
        correctValue: correct,
        options,
        signature: `findBothIntercepts:${k}:${x0}:${b}`,
        why: `При y=0: x = ${numStr(x0)}. При x=0: y = ${numStr(b)}. Итог: ${correct}.`
    };
}

// y=ax²+bx+c, точка -> принадлежит графику или нет
function genCheckPointOnGraphQuadratic() {
    const a = nonZeroRand(-5, 5);
    const b = rand(-5, 5);
    const c = rand(-5, 5);
    const belongs = pick([true, false]);
    const x0 = rand(-5, 5);
    const trueY = a * x0 * x0 + b * x0 + c;
    const y0 = belongs ? trueY : trueY + nonZeroRand(1, 5);
    const correct = belongs ? "Да, принадлежит" : "Нет, не принадлежит";

    const options = shuffle([
        { value: correct, correct: true },
        { value: belongs ? "Нет, не принадлежит" : "Да, принадлежит", correct: false }
    ]);

    return {
        kind: "checkPointOnGraphQuadratic",
        taskHTML: `<p class="task-question">y = ${quadExprStr(a, b, c)}<br>Принадлежит ли графику точка (${numStr(x0)}; ${numStr(y0)})?</p>`,
        correctValue: correct,
        options,
        signature: `checkPointOnGraphQuadratic:${a}:${b}:${c}:${x0}:${y0}`,
        why: `При x = ${numStr(x0)}: y = ${numStr(trueY)}. ${belongs ? "Совпадает — точка принадлежит графику." : `Не совпадает с ${numStr(y0)} — точка не принадлежит графику.`}`
    };
}

// концептуальный вопрос: что обязательно для функции
function genConceptCheckFunctionDefinition() {
    const correct = FUNCTION_DEF_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: FUNCTION_DEF_POOL[1], correct: false },
        { value: FUNCTION_DEF_POOL[2], correct: false },
        { value: FUNCTION_DEF_POOL[3], correct: false }
    ]);

    return {
        kind: "conceptCheckFunctionDefinition",
        taskHTML: `<p class="task-question">Что обязательно должно выполняться, чтобы зависимость y от x называлась функцией?</p>`,
        correctValue: correct,
        options,
        signature: `conceptCheckFunctionDefinition`,
        why: `Главное условие функции — каждому x соответствует ровно одно значение y.`
    };
}

const GENERATORS = {
    identifyQuadrant: genIdentifyQuadrant,
    evaluateFunctionLinear: genEvaluateFunctionLinear,
    identifyDefinitionMethod: genIdentifyDefinitionMethod,
    identifyCoordinateRole: genIdentifyCoordinateRole,
    checkPointOnGraph: genCheckPointOnGraph,
    findYIntercept: genFindYIntercept,
    findXInterceptLinear: genFindXInterceptLinear,
    evaluatePiecewiseFunction: genEvaluatePiecewiseFunction,
    evaluateFunctionQuadratic: genEvaluateFunctionQuadratic,
    findBothIntercepts: genFindBothIntercepts,
    checkPointOnGraphQuadratic: genCheckPointOnGraphQuadratic,
    conceptCheckFunctionDefinition: genConceptCheckFunctionDefinition
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
            topic: "functions"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
