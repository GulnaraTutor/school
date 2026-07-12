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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["defineNegativeExp", "zeroExponent", "simpleNegativePower", "signOfBase"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["multiplyPowers", "dividePowers", "powerOfPower", "moveFactorFraction"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["combineRules", "standardFormRead", "standardFormWrite", "negativeExponentEquation"] }
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

// база степени: отрицательные числа в скобках, напр. (−2)
function powBaseStr(a) {
    return a < 0 ? `(${numStr(a)})` : `${a}`;
}

// "aⁿ" через <sup> — безопасно внутри <p>/обычного текста (не внутри flex-контейнера)
function powStr(a, n) {
    return `${powBaseStr(a)}<sup>${numStr(n)}</sup>`;
}

// HTML для дроби num/den через общий компонент .frac (никогда слэшем)
function fracHTML(num, den) {
    return `<div class="frac"><span class="frac-num">${num}</span><span class="frac-den">${den}</span></div>`;
}

// aInt × 10ⁿ -> обычная десятичная запись, строкой (без операций с плавающей точкой)
function standardFormToDecimalStr(aInt, n) {
    if (n >= 0) return `${aInt}${"0".repeat(n)}`;
    return `0.${"0".repeat(-n - 1)}${aInt}`;
}

// aInt × 10ⁿ -> HTML стандартного вида
function standardFormStr(aInt, n) {
    return `${aInt} × 10<sup>${numStr(n)}</sup>`;
}

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// aⁿ (n от −1 до −4) -> значение как дробь 1/aⁿ⁻ᵃᵇˢ (проверка определения)
function genDefineNegativeExp() {
    const a = rand(2, 9);
    const n = rand(-4, -1);
    const absN = Math.abs(n);
    const denomVal = Math.pow(a, absN);
    const correct = { num: "1", den: `${denomVal}` };

    const d1 = { num: "1", den: `${a * absN}` };
    const d2 = { num: `${denomVal}`, den: "1" };
    const d3 = { num: "1", den: `${Math.pow(a, absN + 1)}` };

    const vals = new Set([valueKey(correct), valueKey(d1), valueKey(d2), valueKey(d3)]);
    if (vals.size !== 4) return genDefineNegativeExp();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "defineNegativeExp",
        taskHTML: `<p class="task-question">${powStr(a, n)} = ?</p>`,
        correctValue: correct,
        options,
        signature: `defineNegativeExp:${a}:${n}`,
        why: `По определению ${powStr(a, n)} = 1/${powStr(a, absN)} = 1/${denomVal}.`
    };
}

// a⁰ = 1 (a — любое ненулевое целое)
function genZeroExponent() {
    const a = nonZeroRand(-9, 9);
    const correct = "1";

    const vals = new Set([correct, "0", numStr(a), "−1"]);
    if (vals.size !== 4) return genZeroExponent();

    const options = shuffle([
        { value: correct, correct: true },
        { value: "0", correct: false },
        { value: numStr(a), correct: false },
        { value: "−1", correct: false }
    ]);

    return {
        kind: "zeroExponent",
        taskHTML: `<p class="task-question">${powStr(a, 0)} = ?</p>`,
        correctValue: correct,
        options,
        signature: `zeroExponent:${a}`,
        why: `Любое ненулевое число в нулевой степени равно 1: ${powStr(a, 0)} = 1.`
    };
}

// вычислить aⁿ напрямую (n отрицательное, a малое положительное)
function genSimpleNegativePower() {
    const a = rand(2, 9);
    const n = rand(-5, -1);
    const absN = Math.abs(n);
    const denomVal = Math.pow(a, absN);
    const correct = { num: "1", den: `${denomVal}` };

    const d1 = { num: `${denomVal}`, den: "1" };
    const d2 = { num: "1", den: `${Math.pow(a, absN - 1)}` };
    const d3 = { num: `${a}`, den: `${denomVal}` };

    const vals = new Set([valueKey(correct), valueKey(d1), valueKey(d2), valueKey(d3)]);
    if (vals.size !== 4) return genSimpleNegativePower();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "simpleNegativePower",
        taskHTML: `<p class="task-question">Вычислите: ${powStr(a, n)}</p>`,
        correctValue: correct,
        options,
        signature: `simpleNegativePower:${a}:${n}`,
        why: `${powStr(a, n)} = 1/${powStr(a, absN)} = 1/${denomVal}.`
    };
}

// (−a)ⁿ, n отрицательный -> значение с правильным знаком
function genSignOfBase() {
    const a = rand(2, 6);
    const n = rand(-4, -1);
    const absN = Math.abs(n);
    const denomVal = Math.pow(a, absN);
    const isOdd = absN % 2 === 1;
    const correct = isOdd ? { num: "−1", den: `${denomVal}` } : { num: "1", den: `${denomVal}` };

    const wrongSign = isOdd ? { num: "1", den: `${denomVal}` } : { num: "−1", den: `${denomVal}` };
    const d2 = { num: "1", den: `${a * absN}` };
    const d3 = { num: `${denomVal}`, den: "1" };

    const vals = new Set([valueKey(correct), valueKey(wrongSign), valueKey(d2), valueKey(d3)]);
    if (vals.size !== 4) return genSignOfBase();

    const options = shuffle([
        { value: correct, correct: true },
        { value: wrongSign, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "signOfBase",
        taskHTML: `<p class="task-question">${powStr(-a, n)} = ?</p>`,
        correctValue: correct,
        options,
        signature: `signOfBase:${a}:${n}`,
        why: isOdd
            ? `Показатель ${numStr(absN)} нечётный, значит знак минус сохраняется: ${powStr(-a, n)} = 1/(${numStr(-a)})${absN === 1 ? "" : `<sup>${absN}</sup>`} = −1/${denomVal}.`
            : `Показатель ${numStr(absN)} чётный, значит минус «съедается»: ${powStr(-a, n)} = 1/${denomVal}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// aᵐ·aⁿ = aᵐ⁺ⁿ -> найти показатель результата
function genMultiplyPowers() {
    const a = rand(2, 9);
    const e1 = rand(-5, 5), e2 = rand(-5, 5);
    const correct = numStr(e1 + e2);

    const vals = new Set([correct, numStr(e1 - e2), numStr(e1 * e2), numStr(e1 + e2 + 1)]);
    if (vals.size !== 4) return genMultiplyPowers();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(e1 - e2), correct: false },
        { value: numStr(e1 * e2), correct: false },
        { value: numStr(e1 + e2 + 1), correct: false }
    ]);

    return {
        kind: "multiplyPowers",
        taskHTML: `<p class="task-question">${powStr(a, e1)} · ${powStr(a, e2)} = ${powBaseStr(a)}<sup>?</sup><br>Чему равен показатель результата?</p>`,
        correctValue: correct,
        options,
        signature: `multiplyPowers:${a}:${e1}:${e2}`,
        why: `При умножении степеней с одинаковым основанием показатели складываются: ${numStr(e1)} + ${numStr(e2)} = ${correct}.`
    };
}

// aᵐ÷aⁿ = aᵐ⁻ⁿ -> найти показатель результата
function genDividePowers() {
    const a = rand(2, 9);
    const e1 = rand(-5, 5), e2 = rand(-5, 5);
    const correct = numStr(e1 - e2);

    const vals = new Set([correct, numStr(e1 + e2), numStr(e2 - e1), numStr(e1 - e2 + 1)]);
    if (vals.size !== 4) return genDividePowers();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(e1 + e2), correct: false },
        { value: numStr(e2 - e1), correct: false },
        { value: numStr(e1 - e2 + 1), correct: false }
    ]);

    return {
        kind: "dividePowers",
        taskHTML: `<p class="task-question">${powStr(a, e1)} ÷ ${powStr(a, e2)} = ${powBaseStr(a)}<sup>?</sup><br>Чему равен показатель результата?</p>`,
        correctValue: correct,
        options,
        signature: `dividePowers:${a}:${e1}:${e2}`,
        why: `При делении степеней с одинаковым основанием показатели вычитаются: ${numStr(e1)} − ${numStr(e2)} = ${correct}.`
    };
}

// (aᵐ)ⁿ = aᵐⁿ -> найти показатель результата
function genPowerOfPower() {
    const a = rand(2, 9);
    const e1 = nonZeroRand(-4, 4), e2 = nonZeroRand(-4, 4);
    const correct = numStr(e1 * e2);

    const vals = new Set([correct, numStr(e1 + e2), numStr(e1 - e2), numStr(e1 * e2 + 1)]);
    if (vals.size !== 4) return genPowerOfPower();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(e1 + e2), correct: false },
        { value: numStr(e1 - e2), correct: false },
        { value: numStr(e1 * e2 + 1), correct: false }
    ]);

    return {
        kind: "powerOfPower",
        taskHTML: `<p class="task-question">(${powStr(a, e1)})<sup>${numStr(e2)}</sup> = ${powBaseStr(a)}<sup>?</sup><br>Чему равен показатель результата?</p>`,
        correctValue: correct,
        options,
        signature: `powerOfPower:${a}:${e1}:${e2}`,
        why: `При возведении степени в степень показатели перемножаются: ${numStr(e1)} × ${numStr(e2)} = ${correct}.`
    };
}

// 1/aᵏ -> записать как степень с отрицательным показателем (без дроби)
function genMoveFactorFraction() {
    const a = rand(2, 9);
    const k = rand(1, 5);
    const correct = powStr(a, -k);

    const d1 = powStr(a, k);
    const d2 = powStr(-a, -k);
    const d3 = powStr(a, -(k + 1));

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genMoveFactorFraction();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "moveFactorFraction",
        taskHTML: `<p class="task-question">Запишите выражение ${fracHTML("1", powStr(a, k))} в виде степени с отрицательным показателем (без дроби).</p>`,
        correctValue: correct,
        options,
        signature: `moveFactorFraction:${a}:${k}`,
        why: `По определению 1/aᵏ = a⁻ᵏ: 1/${powStr(a, k)} = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// aᵐ·aⁿ÷aᵏ -> найти итоговый показатель
function genCombineRules() {
    const a = rand(2, 9);
    const e1 = rand(-5, 5), e2 = rand(-5, 5), e3 = rand(-5, 5);
    const correct = numStr(e1 + e2 - e3);

    const vals = new Set([correct, numStr(e1 - e2 - e3), numStr(e1 + e2 + e3), numStr(e1 + e2 - e3 + 1)]);
    if (vals.size !== 4) return genCombineRules();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(e1 - e2 - e3), correct: false },
        { value: numStr(e1 + e2 + e3), correct: false },
        { value: numStr(e1 + e2 - e3 + 1), correct: false }
    ]);

    return {
        kind: "combineRules",
        taskHTML: `<p class="task-question">${powStr(a, e1)} · ${powStr(a, e2)} ÷ ${powStr(a, e3)} = ${powBaseStr(a)}<sup>?</sup><br>Чему равен итоговый показатель?</p>`,
        correctValue: correct,
        options,
        signature: `combineRules:${a}:${e1}:${e2}:${e3}`,
        why: `Складываем показатели при умножении и вычитаем при делении: ${numStr(e1)} + ${numStr(e2)} − ${numStr(e3)} = ${correct}.`
    };
}

// aInt × 10ⁿ -> обычное число
function genStandardFormRead() {
    const aInt = rand(1, 9);
    const n = nonZeroRand(-6, 6);
    const correct = standardFormToDecimalStr(aInt, n);

    const d1 = standardFormToDecimalStr(aInt, n + 1);
    const d2 = standardFormToDecimalStr(aInt, n - 1);
    const d3 = standardFormToDecimalStr(aInt, -n);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genStandardFormRead();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "standardFormRead",
        taskHTML: `<p class="task-question">${standardFormStr(aInt, n)} = ?<br>Запишите обычным числом.</p>`,
        correctValue: correct,
        options,
        signature: `standardFormRead:${aInt}:${n}`,
        why: n >= 0
            ? `Умножаем на 10 в положительной степени — сдвигаем запятую вправо на ${n} знаков: ${correct}.`
            : `Умножаем на 10 в отрицательной степени — сдвигаем запятую влево на ${Math.abs(n)} знаков: ${correct}.`
    };
}

// обычное число -> стандартный вид aInt × 10ⁿ
function genStandardFormWrite() {
    const aInt = rand(1, 9);
    const n = nonZeroRand(-6, 6);
    const numberStr = standardFormToDecimalStr(aInt, n);
    const correct = standardFormStr(aInt, n);

    const d1 = standardFormStr(aInt, -n);
    const d2 = standardFormStr(aInt, n + 1);
    const d3 = standardFormStr(aInt, n - 1);

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genStandardFormWrite();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "standardFormWrite",
        taskHTML: `<p class="task-question">Запишите число ${numberStr} в стандартном виде.</p>`,
        correctValue: correct,
        options,
        signature: `standardFormWrite:${aInt}:${n}`,
        why: `${numberStr} = ${correct}.`
    };
}

// aˣ = 1/aᵏ -> x = −k
function genNegativeExponentEquation() {
    const a = rand(2, 9);
    const k = rand(1, 6);
    const correct = numStr(-k);

    const vals = new Set([correct, numStr(k), numStr(-k + 1), numStr(-k - 1)]);
    if (vals.size !== 4) return genNegativeExponentEquation();

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(k), correct: false },
        { value: numStr(-k + 1), correct: false },
        { value: numStr(-k - 1), correct: false }
    ]);

    return {
        kind: "negativeExponentEquation",
        taskHTML: `<p class="task-question">${powBaseStr(a)}<sup>x</sup> = ${fracHTML("1", powStr(a, k))}<br>Найдите x.</p>`,
        correctValue: correct,
        options,
        signature: `negativeExponentEquation:${a}:${k}`,
        why: `1/${powStr(a, k)} = ${powStr(a, -k)}, значит x = ${correct}.`
    };
}

const GENERATORS = {
    defineNegativeExp: genDefineNegativeExp,
    zeroExponent: genZeroExponent,
    simpleNegativePower: genSimpleNegativePower,
    signOfBase: genSignOfBase,
    multiplyPowers: genMultiplyPowers,
    dividePowers: genDividePowers,
    powerOfPower: genPowerOfPower,
    moveFactorFraction: genMoveFactorFraction,
    combineRules: genCombineRules,
    standardFormRead: genStandardFormRead,
    standardFormWrite: genStandardFormWrite,
    negativeExponentEquation: genNegativeExponentEquation
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
            topic: "negative-exponents"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
