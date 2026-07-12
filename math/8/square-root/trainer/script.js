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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["simpleSqrt", "equationVsArithmetic", "multiplySqrt", "divideSqrt"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["squareOfNegativeAbs", "addSubtractLikeRadicals", "addUnlikeRadicalsImpossible", "factorOutSquareSimple", "domainOfSqrt"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["factorOutSquareHard", "combineAfterFactoring", "sqrtOfProductHard", "powerAsRootNote"] }
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

function numStr(n) {
    return n < 0 ? `−${Math.abs(n)}` : `${n}`;
}

function nonZeroRand(min, max) {
    let n;
    do { n = rand(min, max); } while (n === 0);
    return n;
}

const LETTERS = ["a", "b", "c", "x", "y", "z", "m", "n"];

function pickLetters(count) {
    return shuffle(LETTERS).slice(0, count);
}

// числа без квадратных множителей — из них корень не упрощается дальше
const SQUAREFREE_POOL = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30];

function radicalStr(coef, radicand) {
    const rad = `√${radicand}`;
    if (coef === 1) return rad;
    if (coef === -1) return `−${rad}`;
    return `${numStr(coef)}${rad}`;
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

const IMPOSSIBLE_POOL = ["Нельзя объединить в один корень", "Можно, получится один корень", "Всегда равно 0", "Нужно перемножить корни"];
const DOMAIN_POOL = ["x ≥ 0", "x > 0", "x ≤ 0", "При любых x"];
const SOLUTIONS_POOL = ["2", "1", "0", "Бесконечно много"];
const POWER_NOTE_POOL = ["То же самое, что √a", "a, делённое на 2", "Квадрат числа a", "Половина от a²"];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// √n, n точный квадрат -> целое число
function genSimpleSqrt() {
    const r = rand(2, 20);
    const n = r * r;
    const correct = `${r}`;

    const options = shuffle([
        { value: correct, correct: true },
        { value: `${r - 1}`, correct: false },
        { value: `${r + 1}`, correct: false },
        { value: `${n}`, correct: false }
    ]);

    return {
        kind: "simpleSqrt",
        taskHTML: `<p class="task-question">√${n} = ?</p>`,
        correctValue: correct,
        options,
        signature: `simpleSqrt:${r}`,
        why: `${r}² = ${n}, значит √${n} = ${r}.`
    };
}

// сколько решений у x²=n (n>0) -> 2
function genEquationVsArithmetic() {
    const n = rand(2, 20) ** 2;
    const correct = "2";

    const options = shuffle([
        { value: correct, correct: true },
        { value: "1", correct: false },
        { value: "0", correct: false },
        { value: "Бесконечно много", correct: false }
    ]);

    return {
        kind: "equationVsArithmetic",
        taskHTML: `<p class="task-question">Сколько решений у уравнения x² = ${n}?</p>`,
        correctValue: correct,
        options,
        signature: `equationVsArithmetic:${n}`,
        why: `Уравнению x² = ${n} подходят два числа — положительное и отрицательное, ведь и их квадраты равны ${n}. Поэтому у уравнения 2 решения.`
    };
}

// √a x √b (a,b точные квадраты) -> целое число
function genMultiplySqrt() {
    let p, q;
    do { p = rand(2, 9); q = rand(2, 9); } while (p === q);
    const a = p * p, b = q * q;
    const correct = `${p * q}`;

    const options = shuffle([
        { value: correct, correct: true },
        { value: `${p + q}`, correct: false },
        { value: `${a * b}`, correct: false },
        { value: `${p}`, correct: false }
    ]);

    return {
        kind: "multiplySqrt",
        taskHTML: `<p class="task-question">√${a} × √${b} = ?</p>`,
        correctValue: correct,
        options,
        signature: `multiplySqrt:${p}:${q}`,
        why: `√${a} = ${p}, √${b} = ${q}. Перемножаем сами корни: ${p} × ${q} = ${p * q}.`
    };
}

// √a ÷ √b (a,b точные квадраты) -> дробь p/q
function genDivideSqrt() {
    let p, q;
    do { p = rand(2, 9); q = rand(2, 9); } while (gcd(p, q) !== 1 || p === q);
    const a = p * p, b = q * q;
    const correct = { num: `${p}`, den: `${q}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${q}`, den: `${p}` }, correct: false },
        { value: { num: `${a}`, den: `${b}` }, correct: false },
        { value: { num: `${p + q}`, den: "1" }, correct: false }
    ]);

    return {
        kind: "divideSqrt",
        taskHTML: `<p class="task-question">√${a} ÷ √${b} = ?</p>`,
        correctValue: correct,
        options,
        signature: `divideSqrt:${p}:${q}`,
        why: `√${a} = ${p}, √${b} = ${q}. Делим сами корни: ${p}/${q} — дальше не сокращается.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// √((-n)^2) -> n (по модулю)
function genSquareOfNegativeAbs() {
    const n = rand(2, 20);
    const correct = `${n}`;

    const options = shuffle([
        { value: correct, correct: true },
        { value: `−${n}`, correct: false },
        { value: `${n * n}`, correct: false },
        { value: `−${n * n}`, correct: false }
    ]);

    return {
        kind: "squareOfNegativeAbs",
        taskHTML: `<p class="task-question">√((−${n})²) = ?</p>`,
        correctValue: correct,
        options,
        signature: `squareOfNegativeAbs:${n}`,
        why: `(−${n})² = ${n * n} — минус исчезает при возведении в квадрат. √${n * n} = ${n}. Результат всегда неотрицательный, даже если под квадратом было отрицательное число.`
    };
}

// p√n +/- q√n -> (p+/-q)√n
function genAddSubtractLikeRadicals() {
    const n = pick(SQUAREFREE_POOL);
    let p = rand(2, 9), q = rand(2, 9);
    if (p === q) q = q === 9 ? q - 1 : q + 1;
    const sign = pick(["+", "−"]);
    if (sign === "−" && p < q) [p, q] = [q, p];

    const resultCoef = sign === "+" ? p + q : p - q;
    const correct = radicalStr(resultCoef, n);

    const options = shuffle([
        { value: correct, correct: true },
        { value: radicalStr(sign === "+" ? p - q : p + q, n), correct: false },
        { value: radicalStr(resultCoef, n * n), correct: false },
        { value: `${resultCoef}`, correct: false }
    ]);

    return {
        kind: "addSubtractLikeRadicals",
        taskHTML: `<p class="task-question">${radicalStr(p, n)} ${sign} ${radicalStr(q, n)} = ?</p>`,
        correctValue: correct,
        options,
        signature: `addSubtractLikeRadicals:${n}:${p}:${q}:${sign}`,
        why: `Корни одинаковые (√${n}) — складываем только числа перед корнем, как обычные слагаемые: ${p}${sign}${q}=${resultCoef}. Получаем ${correct}.`
    };
}

// p√a + q√b (разные, не упрощаются) -> "нельзя объединить"
function genAddUnlikeRadicalsImpossible() {
    let a, b;
    do {
        a = pick(SQUAREFREE_POOL);
        b = pick(SQUAREFREE_POOL);
    } while (a === b);
    const p = rand(2, 9), q = rand(2, 9);
    const correct = IMPOSSIBLE_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: IMPOSSIBLE_POOL[1], correct: false },
        { value: IMPOSSIBLE_POOL[2], correct: false },
        { value: IMPOSSIBLE_POOL[3], correct: false }
    ]);

    return {
        kind: "addUnlikeRadicalsImpossible",
        taskHTML: `<p class="task-question">Как упростить выражение ${radicalStr(p, a)} + ${radicalStr(q, b)}?</p>`,
        correctValue: correct,
        options,
        signature: `addUnlikeRadicalsImpossible:${a}:${b}:${p}:${q}`,
        why: `√${a} и √${b} — разные корни, которые не сводятся друг к другу. Складывать можно только одинаковые корни, поэтому это выражение и остаётся суммой.`
    };
}

// √n, n=k^2*m (m без квадратных множителей) -> k√m
function genFactorOutSquareSimple() {
    const k = rand(2, 6);
    const m = pick(SQUAREFREE_POOL);
    const n = k * k * m;
    const correct = radicalStr(k, m);

    const options = shuffle([
        { value: correct, correct: true },
        { value: radicalStr(k - 1, m), correct: false },
        { value: radicalStr(k, m * m), correct: false },
        { value: `${n}`, correct: false }
    ]);

    return {
        kind: "factorOutSquareSimple",
        taskHTML: `<p class="task-question">Упростите: √${n}</p>`,
        correctValue: correct,
        options,
        signature: `factorOutSquareSimple:${k}:${m}`,
        why: `${n} = ${k * k} × ${m}, а ${k * k} — точный квадрат. √${n} = √${k * k} × √${m} = ${k}√${m}.`
    };
}

// область определения √x
function genDomainOfSqrt() {
    const correct = "x ≥ 0";

    const options = shuffle([
        { value: correct, correct: true },
        { value: "x > 0", correct: false },
        { value: "x ≤ 0", correct: false },
        { value: "При любых x", correct: false }
    ]);

    return {
        kind: "domainOfSqrt",
        taskHTML: `<p class="task-question">При каких x определено выражение √x?</p>`,
        correctValue: correct,
        options,
        signature: `domainOfSqrt`,
        why: `Из отрицательного числа арифметический квадратный корень не извлекается, а из нуля — извлекается (√0 = 0). Значит подходят все x ≥ 0.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// √n, крупные значения -> k√m
function genFactorOutSquareHard() {
    const k = rand(3, 10);
    const m = pick(SQUAREFREE_POOL);
    const n = k * k * m;
    const correct = radicalStr(k, m);

    const options = shuffle([
        { value: correct, correct: true },
        { value: radicalStr(k - 1, m), correct: false },
        { value: radicalStr(k + 1, m), correct: false },
        { value: radicalStr(k, m * 2), correct: false }
    ]);

    return {
        kind: "factorOutSquareHard",
        taskHTML: `<p class="task-question">Упростите: √${n}</p>`,
        correctValue: correct,
        options,
        signature: `factorOutSquareHard:${k}:${m}`,
        why: `${n} = ${k * k} × ${m}, а ${k * k} — точный квадрат (${k}²). √${n} = ${k}√${m}.`
    };
}

// p√n +/- √(k^2 n) -> после упрощения второго слагаемого корни совпадают
function genCombineAfterFactoring() {
    const n = pick(SQUAREFREE_POOL);
    const p = rand(2, 8);
    const k = rand(2, 4);
    const b = k * k * n;
    const sign = pick(["+", "−"]);

    const resultCoef = sign === "+" ? p + k : p - k;
    if (resultCoef === 0) return genCombineAfterFactoring();
    const correct = radicalStr(resultCoef, n);

    const options = shuffle([
        { value: correct, correct: true },
        { value: radicalStr(sign === "+" ? p - k : p + k, n), correct: false },
        { value: radicalStr(p + b, n), correct: false },
        { value: radicalStr(resultCoef, b), correct: false }
    ]);

    return {
        kind: "combineAfterFactoring",
        taskHTML: `<p class="task-question">${radicalStr(p, n)} ${sign} √${b} = ?</p>`,
        correctValue: correct,
        options,
        signature: `combineAfterFactoring:${n}:${p}:${k}:${sign}`,
        why: `Сначала упрощаем второй корень: √${b} = √(${k * k}×${n}) = ${k}√${n}. Теперь оба корня одинаковые (√${n}), складываем коэффициенты: ${p}${sign}${k}=${resultCoef}. Получаем ${correct}.`
    };
}

// √(a²b) -> a√b (буквенный вариант)
function genSqrtOfProductHard() {
    const [A, B] = pickLetters(2);
    const correct = `${A}√${B}`;

    const options = shuffle([
        { value: correct, correct: true },
        { value: `${A}²√${B}`, correct: false },
        { value: `${A}√(${B}²)`, correct: false },
        { value: `${A}${B}`, correct: false }
    ]);

    return {
        kind: "sqrtOfProductHard",
        taskHTML: `<p class="task-question">Упростите (${A}, ${B} &gt; 0): √(${A}²${B})</p>`,
        correctValue: correct,
        options,
        signature: `sqrtOfProductHard:${A}:${B}`,
        why: `√(${A}²${B}) = √${A}² × √${B} = ${A} × √${B} = ${A}√${B} — здесь ${A}² уже точный квадрат, а множитель ${B} остаётся под корнем.`
    };
}

// факт a^(1/2) = √a
function genPowerAsRootNote() {
    const correct = POWER_NOTE_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: POWER_NOTE_POOL[1], correct: false },
        { value: POWER_NOTE_POOL[2], correct: false },
        { value: POWER_NOTE_POOL[3], correct: false }
    ]);

    return {
        kind: "powerAsRootNote",
        taskHTML: `<p class="task-question">Что означает запись a<sup>1/2</sup>?</p>`,
        correctValue: correct,
        options,
        signature: `powerAsRootNote`,
        why: `Извлечение квадратного корня можно записать как возведение в степень 1/2 — это просто другое обозначение того же самого действия: a^(1/2) = √a.`
    };
}

const GENERATORS = {
    simpleSqrt: genSimpleSqrt,
    equationVsArithmetic: genEquationVsArithmetic,
    multiplySqrt: genMultiplySqrt,
    divideSqrt: genDivideSqrt,
    squareOfNegativeAbs: genSquareOfNegativeAbs,
    addSubtractLikeRadicals: genAddSubtractLikeRadicals,
    addUnlikeRadicalsImpossible: genAddUnlikeRadicalsImpossible,
    factorOutSquareSimple: genFactorOutSquareSimple,
    domainOfSqrt: genDomainOfSqrt,
    factorOutSquareHard: genFactorOutSquareHard,
    combineAfterFactoring: genCombineAfterFactoring,
    sqrtOfProductHard: genSqrtOfProductHard,
    powerAsRootNote: genPowerAsRootNote
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
            topic: "square-root"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
