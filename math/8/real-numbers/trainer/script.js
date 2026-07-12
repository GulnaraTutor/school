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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["classifyIntegerRational", "classifyFractionRational", "isNatural", "isInteger"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["classifySqrt", "classifyKnownConstant", "narrowestSet", "subsetTrueFalse"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["classifySqrtHard", "closurePropertyRational", "mixedClassification"] }
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

function isPerfectSquare(n) {
    const r = Math.round(Math.sqrt(n));
    return r * r === n;
}

// случайное n, которое НЕ является точным квадратом (для "точно иррационального" √n)
function randNonSquare(min, max) {
    let n;
    do { n = rand(min, max); } while (isPerfectSquare(n));
    return n;
}

// случайное n, которое ЯВЛЯЕТСЯ точным квадратом (для "точно рационального" √n)
function randSquare(minRoot, maxRoot) {
    return rand(minRoot, maxRoot) ** 2;
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

const RQ_POOL = ["Рациональное", "Иррациональное"];
const YESNO_POOL = ["Да", "Нет"];
const SET_POOL = ["N", "Z", "Q"];
const TRUEFALSE_POOL = ["Верно", "Неверно"];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// целое число -> рационально или иррационально (всегда рационально)
function genClassifyIntegerRational() {
    const n = nonZeroRand(-50, 50);
    const correct = "Рациональное";

    const options = shuffle([
        { value: correct, correct: true },
        { value: "Иррациональное", correct: false },
        { value: "Натуральное, но не рациональное", correct: false },
        { value: "Ни рациональное, ни иррациональное", correct: false }
    ]);

    return {
        kind: "classifyIntegerRational",
        taskHTML: `<p class="task-question">Число ${numStr(n)} — рациональное или иррациональное?</p>`,
        correctValue: correct,
        options,
        signature: `classifyIntegerRational:${n}`,
        why: `Любое целое число можно записать в виде дроби n/1, значит ${numStr(n)} = ${numStr(n)}/1 — рациональное число.`
    };
}

// простая дробь -> всегда рационально
function genClassifyFractionRational() {
    const p = nonZeroRand(-9, 9);
    const q = rand(2, 9);
    const correct = "Рациональное";

    const options = shuffle([
        { value: correct, correct: true },
        { value: "Иррациональное", correct: false },
        { value: "Целое, но не рациональное", correct: false },
        { value: "Ни рациональное, ни иррациональное", correct: false }
    ]);

    return {
        kind: "classifyFractionRational",
        taskHTML: `<div class="formula-box">${valueToHTML({ num: numStr(p), den: `${q}` })}</div><p class="task-question">Это число — рациональное или иррациональное?</p>`,
        correctValue: correct,
        options,
        signature: `classifyFractionRational:${p}:${q}`,
        why: `Число уже записано в виде дроби m/n с целыми m и n — значит, по определению, оно рациональное.`
    };
}

// дано целое число -> натуральное ли оно
function genIsNatural() {
    const n = rand(-20, 20);
    const correct = n > 0 ? "Да" : "Нет";

    const options = shuffle([
        { value: correct, correct: true },
        { value: n > 0 ? "Нет" : "Да", correct: false }
    ]);

    return {
        kind: "isNatural",
        taskHTML: `<p class="task-question">Число ${numStr(n)} — натуральное?</p>`,
        correctValue: correct,
        options,
        signature: `isNatural:${n}`,
        why: n > 0
            ? `${n} — целое положительное число, оно используется при счёте, значит оно натуральное.`
            : `Натуральные числа — это только 1, 2, 3… Число ${numStr(n)} ${n === 0 ? "равно нулю" : "отрицательное"}, значит оно не натуральное.`
    };
}

// дано число (целое или дробь) -> целое ли оно
function genIsInteger() {
    const isFraction = pick([true, false]);
    let n, p, q;
    if (isFraction) {
        p = nonZeroRand(-20, 20);
        do { q = rand(2, 5); } while (p % q === 0);
    } else {
        n = rand(-20, 20);
    }
    const correct = isFraction ? "Нет" : "Да";

    const taskHTML = isFraction
        ? `<div class="formula-box">${valueToHTML({ num: numStr(p), den: `${q}` })}</div><p class="task-question">Это число — целое?</p>`
        : `<p class="task-question">Число ${numStr(n)} — целое?</p>`;

    const options = shuffle([
        { value: correct, correct: true },
        { value: correct === "Да" ? "Нет" : "Да", correct: false }
    ]);

    return {
        kind: "isInteger",
        taskHTML,
        correctValue: correct,
        options,
        signature: `isInteger:${isFraction}:${isFraction ? p + ":" + q : n}`,
        why: isFraction
            ? `Эта дробь не делится нацело (${p} не делится на ${q}), значит число не целое — оно рациональное, но не целое.`
            : `${n} — число без дробной части, значит оно целое.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// корень из n -> рационально (n точный квадрат) или иррационально
function genClassifySqrt() {
    const isSquare = pick([true, false]);
    const n = isSquare ? randSquare(2, 9) : randNonSquare(2, 99);
    const correct = isSquare ? "Рациональное" : "Иррациональное";

    const options = shuffle([
        { value: correct, correct: true },
        { value: isSquare ? "Иррациональное" : "Рациональное", correct: false }
    ]);

    return {
        kind: "classifySqrt",
        taskHTML: `<p class="task-question">√${n} — рациональное или иррациональное число?</p>`,
        correctValue: correct,
        options,
        signature: `classifySqrt:${n}`,
        why: isSquare
            ? `${n} — точный квадрат (${Math.round(Math.sqrt(n))}² = ${n}), значит √${n} = ${Math.round(Math.sqrt(n))} — рациональное число.`
            : `${n} не является точным квадратом ни одного целого числа, значит √${n} — иррациональное число.`
    };
}

// π или e vs целое/дробь -> классификация
function genClassifyKnownConstant() {
    const useConstant = pick([true, false]);
    const constant = pick(["π", "e"]);
    let n;
    if (!useConstant) n = nonZeroRand(-30, 30);

    const correct = useConstant ? "Иррациональное" : "Рациональное";
    const taskHTML = useConstant
        ? `<p class="task-question">Число ${constant} — рациональное или иррациональное?</p>`
        : `<p class="task-question">Число ${numStr(n)} — рациональное или иррациональное?</p>`;

    const options = shuffle([
        { value: correct, correct: true },
        { value: useConstant ? "Рациональное" : "Иррациональное", correct: false }
    ]);

    return {
        kind: "classifyKnownConstant",
        taskHTML,
        correctValue: correct,
        options,
        signature: `classifyKnownConstant:${useConstant}:${useConstant ? constant : n}`,
        why: useConstant
            ? `${constant} — известная иррациональная константа: её нельзя точно записать в виде дроби m/n.`
            : `${numStr(n)} — целое число, любое целое число рационально.`
    };
}

// дано число -> самое узкое множество (N/Z/Q)
function genNarrowestSet() {
    const kind = pick(["natural", "integerNotNatural", "fractionNotInteger"]);
    let n, p, q, correct, taskHTML;

    if (kind === "natural") {
        n = rand(1, 30);
        correct = "N";
        taskHTML = `<p class="task-question">${n} — какое самое узкое множество из N (натуральные), Z (целые), Q (рациональные) ему подходит?</p>`;
    } else if (kind === "integerNotNatural") {
        n = pick([0, ...Array.from({ length: 20 }, (_, i) => -(i + 1))]);
        correct = "Z";
        taskHTML = `<p class="task-question">${n} — какое самое узкое множество из N, Z, Q ему подходит?</p>`;
    } else {
        p = nonZeroRand(-20, 20);
        do { q = rand(2, 5); } while (p % q === 0);
        correct = "Q";
        taskHTML = `<div class="formula-box">${valueToHTML({ num: numStr(p), den: `${q}` })}</div><p class="task-question">Какое самое узкое множество из N, Z, Q подходит этому числу?</p>`;
    }

    const pool = SET_POOL.filter(v => v !== correct);

    const options = shuffle([
        { value: correct, correct: true },
        { value: pool[0], correct: false },
        { value: pool[1], correct: false }
    ]);

    return {
        kind: "narrowestSet",
        taskHTML,
        correctValue: correct,
        options,
        signature: `narrowestSet:${kind}:${kind === "fractionNotInteger" ? p + ":" + q : n}`,
        why: kind === "natural"
            ? `Это положительное целое число, используемое при счёте — значит подходит уже самое узкое множество N.`
            : kind === "integerNotNatural"
                ? `Это число не натуральное (ноль или отрицательное), но целое — значит самое узкое подходящее множество Z.`
                : `Это не целое число, но его можно записать дробью — значит самое узкое подходящее множество Q.`
    };
}

// утверждение о вложенности -> верно/неверно
const SUBSET_STATEMENTS = [
    { text: "Каждое натуральное число является целым", correct: true },
    { text: "Каждое целое число является натуральным", correct: false },
    { text: "Каждое целое число является рациональным", correct: true },
    { text: "Каждое рациональное число является целым", correct: false },
    { text: "Каждое натуральное число является рациональным", correct: true },
    { text: "Каждое иррациональное число является рациональным", correct: false }
];

function genSubsetTrueFalse() {
    const statement = pick(SUBSET_STATEMENTS);
    const correct = statement.correct ? "Верно" : "Неверно";

    const options = shuffle([
        { value: correct, correct: true },
        { value: statement.correct ? "Неверно" : "Верно", correct: false }
    ]);

    return {
        kind: "subsetTrueFalse",
        taskHTML: `<p class="task-question">${statement.text}.</p>`,
        correctValue: correct,
        options,
        signature: `subsetTrueFalse:${statement.text}`,
        why: statement.correct
            ? `Это верное утверждение — множества чисел вложены друг в друга именно в таком порядке.`
            : `Это неверно: можно привести число из более широкого множества, которое не входит в более узкое.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// корень с крупными/менее очевидными n
function genClassifySqrtHard() {
    const isSquare = pick([true, false]);
    const n = isSquare ? randSquare(8, 20) : randNonSquare(100, 400);
    const correct = isSquare ? "Рациональное" : "Иррациональное";

    const options = shuffle([
        { value: correct, correct: true },
        { value: isSquare ? "Иррациональное" : "Рациональное", correct: false }
    ]);

    return {
        kind: "classifySqrtHard",
        taskHTML: `<p class="task-question">√${n} — рациональное или иррациональное число?</p>`,
        correctValue: correct,
        options,
        signature: `classifySqrtHard:${n}`,
        why: isSquare
            ? `${n} = ${Math.round(Math.sqrt(n))}² — точный квадрат, значит √${n} = ${Math.round(Math.sqrt(n))} — рациональное число.`
            : `${n} не является точным квадратом ни одного целого числа — значит √${n} иррационально, даже если корень "почти круглый".`
    };
}

// свойство замкнутости: целое÷целое / рац+рац -> рационально
function genClosurePropertyRational() {
    const kind = pick(["divide", "add"]);
    let a, b, taskHTML;

    if (kind === "divide") {
        a = nonZeroRand(-20, 20);
        b = nonZeroRand(-9, 9);
        taskHTML = `<p class="task-question">Целое число ${numStr(a)} разделили на целое число ${numStr(b)} (не 0). Каким получится результат?</p>`;
    } else {
        a = nonZeroRand(-9, 9);
        b = nonZeroRand(-9, 9);
        taskHTML = `<p class="task-question">Сложили два рациональных числа. Каким обязательно получится результат?</p>`;
    }

    const correct = "Рациональным";

    const options = shuffle([
        { value: correct, correct: true },
        { value: "Иррациональным", correct: false },
        { value: "Может быть и рациональным, и иррациональным", correct: false }
    ]);

    return {
        kind: "closurePropertyRational",
        taskHTML,
        correctValue: correct,
        options,
        signature: `closurePropertyRational:${kind}:${a}:${b}`,
        why: kind === "divide"
            ? `Частное двух целых чисел всегда можно записать дробью m/n — значит результат всегда рациональный.`
            : `Сумма двух дробей — снова дробь с целыми числителем и знаменателем — значит результат всегда рациональный.`
    };
}

// смешанный набор -> выбрать иррациональное число среди четырёх
function genMixedClassification() {
    const irrationalN = randNonSquare(2, 50);
    const irrationalChoice = pick([`√${irrationalN}`, "π"]);

    const intVal = nonZeroRand(-20, 20);
    const squareN = randSquare(2, 9);
    let fp = nonZeroRand(-9, 9), fq;
    do { fq = rand(2, 9); } while (fp % fq === 0);

    const rationalOptions = shuffle([
        `${numStr(intVal)}`,
        `√${squareN}`,
        `${numStr(fp)}/${fq}`
    ]);

    const options = shuffle([
        { value: irrationalChoice, correct: true },
        { value: rationalOptions[0], correct: false },
        { value: rationalOptions[1], correct: false },
        { value: rationalOptions[2], correct: false }
    ]);

    return {
        kind: "mixedClassification",
        taskHTML: `<p class="task-question">Какое из этих чисел иррациональное?</p>`,
        correctValue: irrationalChoice,
        options,
        signature: `mixedClassification:${irrationalChoice}:${intVal}:${squareN}:${fp}:${fq}`,
        why: `${irrationalChoice} нельзя записать дробью m/n — это иррациональное число. Остальные варианты — целое число, корень из точного квадрата (${squareN} = ${Math.round(Math.sqrt(squareN))}²) и обычная дробь — все они рациональные.`
    };
}

const GENERATORS = {
    classifyIntegerRational: genClassifyIntegerRational,
    classifyFractionRational: genClassifyFractionRational,
    isNatural: genIsNatural,
    isInteger: genIsInteger,
    classifySqrt: genClassifySqrt,
    classifyKnownConstant: genClassifyKnownConstant,
    narrowestSet: genNarrowestSet,
    subsetTrueFalse: genSubsetTrueFalse,
    classifySqrtHard: genClassifySqrtHard,
    closurePropertyRational: genClosurePropertyRational,
    mixedClassification: genMixedClassification
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
            topic: "real-numbers"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
