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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["speedTimeDistanceFindDistance", "speedTimeDistanceFindTime", "speedTimeDistanceFindSpeed", "percentToDecimalConcept"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["mixtureFindAmount", "downstreamUpstreamSetup", "workRateFindTime", "combinedWorkersRate"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["motionWordProblemFull", "mixtureWordProblemFull", "workWordProblemFull", "modelingConceptCheck"] }
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

// p% -> "0.0p" / "0.p" (без операций с плавающей точкой)
function percentToDecimalStr(p) {
    return p < 10 ? `0.0${p}` : `0.${p}`;
}

const MODEL_DISCARD_POOL = ["Отбросить его — оно не подходит по смыслу задачи", "Оставить его в ответе", "Округлить его до целого", "Заменить его на ноль"];
const MODEL_STEP_POOL = ["Проверить, что ответ имеет смысл по условию задачи", "Сразу же округлить все числа", "Умножить ответ на 100%", "Ничего, задача уже решена"];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// v, t -> найти S = v·t
function genSpeedTimeDistanceFindDistance() {
    const v = rand(20, 100);
    const t = rand(2, 8);
    const correct = v * t;
    const correctStr = `${correct}`;

    const vals = new Set([correctStr, `${v + t}`, `${v}`, `${correct + t}`]);
    if (vals.size !== 4) return genSpeedTimeDistanceFindDistance();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${v + t}`, correct: false },
        { value: `${v}`, correct: false },
        { value: `${correct + t}`, correct: false }
    ]);

    return {
        kind: "speedTimeDistanceFindDistance",
        taskHTML: `<p class="task-question">Скорость v = ${v} км/ч, время t = ${t} ч.<br>Найдите расстояние S.</p>`,
        correctValue: correctStr,
        options,
        signature: `speedTimeDistanceFindDistance:${v}:${t}`,
        why: `S = v · t = ${v} · ${t} = ${correct} км.`
    };
}

// S, v (t выбирается первым) -> найти t
function genSpeedTimeDistanceFindTime() {
    const t = rand(2, 8);
    const v = rand(10, 40);
    const S = v * t;
    const correctStr = `${t}`;

    const vals = new Set([correctStr, `${S}`, `${v}`, `${t + 1}`]);
    if (vals.size !== 4) return genSpeedTimeDistanceFindTime();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${S}`, correct: false },
        { value: `${v}`, correct: false },
        { value: `${t + 1}`, correct: false }
    ]);

    return {
        kind: "speedTimeDistanceFindTime",
        taskHTML: `<p class="task-question">Расстояние S = ${S} км, скорость v = ${v} км/ч.<br>Найдите время t.</p>`,
        correctValue: correctStr,
        options,
        signature: `speedTimeDistanceFindTime:${t}:${v}`,
        why: `t = S / v = ${S} / ${v} = ${t} ч.`
    };
}

// S, t (v выбирается первым) -> найти v
function genSpeedTimeDistanceFindSpeed() {
    const v = rand(20, 90);
    const t = rand(2, 8);
    const S = v * t;
    const correctStr = `${v}`;

    const vals = new Set([correctStr, `${S}`, `${t}`, `${v + 1}`]);
    if (vals.size !== 4) return genSpeedTimeDistanceFindSpeed();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${S}`, correct: false },
        { value: `${t}`, correct: false },
        { value: `${v + 1}`, correct: false }
    ]);

    return {
        kind: "speedTimeDistanceFindSpeed",
        taskHTML: `<p class="task-question">Расстояние S = ${S} км, время t = ${t} ч.<br>Найдите скорость v.</p>`,
        correctValue: correctStr,
        options,
        signature: `speedTimeDistanceFindSpeed:${v}:${t}`,
        why: `v = S / t = ${S} / ${t} = ${v} км/ч.`
    };
}

// p% -> десятичная дробь
function genPercentToDecimalConcept() {
    const p = rand(1, 99);
    const correct = percentToDecimalStr(p);

    let d1, d2, d3;
    if (p < 10) {
        d1 = `0.${p}`;
        d2 = `${p}.0`;
        d3 = `0.${p}0`;
    } else {
        d1 = `0.0${p}`;
        d2 = `${p}.0`;
        d3 = `0.${Math.floor(p / 10)}`;
    }

    const vals = new Set([correct, d1, d2, d3]);
    if (vals.size !== 4) return genPercentToDecimalConcept();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "percentToDecimalConcept",
        taskHTML: `<p class="task-question">Переведите ${p}% в десятичную дробь.</p>`,
        correctValue: correct,
        options,
        signature: `percentToDecimalConcept:${p}`,
        why: `${p}% = ${p} / 100 = ${correct}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// масса и процент (кратны 20 и 5) -> найти массу вещества
function genMixtureFindAmount() {
    const k = rand(1, 19);
    const p = 5 * k;
    const j = rand(1, 10);
    const M = 20 * j;
    const amount = k * j;
    const correctStr = `${amount}`;

    const vals = new Set([correctStr, `${p}`, `${M}`, `${amount + 1}`]);
    if (vals.size !== 4) return genMixtureFindAmount();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${p}`, correct: false },
        { value: `${M}`, correct: false },
        { value: `${amount + 1}`, correct: false }
    ]);

    return {
        kind: "mixtureFindAmount",
        taskHTML: `<p class="task-question">Раствор массой ${M} кг имеет концентрацию ${p}%.<br>Сколько килограммов вещества в растворе?</p>`,
        correctValue: correctStr,
        options,
        signature: `mixtureFindAmount:${k}:${j}`,
        why: `A = (${p} / 100) · ${M} = ${percentToDecimalStr(p)} · ${M} = ${amount} кг.`
    };
}

// собственная скорость и скорость течения -> скорость по/против течения
function genDownstreamUpstreamSetup() {
    const v = rand(15, 40);
    const c = rand(1, v - 1);
    const downstream = v + c;
    const upstream = v - c;
    const askDownstream = pick([true, false]);
    const correct = askDownstream ? downstream : upstream;
    const correctStr = `${correct}`;

    const vals = new Set([correctStr, `${askDownstream ? upstream : downstream}`, `${v}`, `${c}`]);
    if (vals.size !== 4) return genDownstreamUpstreamSetup();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${askDownstream ? upstream : downstream}`, correct: false },
        { value: `${v}`, correct: false },
        { value: `${c}`, correct: false }
    ]);

    return {
        kind: "downstreamUpstreamSetup",
        taskHTML: `<p class="task-question">Собственная скорость катера — ${v} км/ч, скорость течения — ${c} км/ч.<br>Найдите скорость катера ${askDownstream ? "по течению" : "против течения"}.</p>`,
        correctValue: correctStr,
        options,
        signature: `downstreamUpstreamSetup:${v}:${c}:${askDownstream}`,
        why: askDownstream
            ? `По течению скорости складываются: ${v} + ${c} = ${correct} км/ч.`
            : `Против течения из собственной скорости вычитают скорость течения: ${v} − ${c} = ${correct} км/ч.`
    };
}

// объём работы и производительность -> найти время
function genWorkRateFindTime() {
    const t = rand(2, 8);
    const r = rand(5, 20);
    const W = r * t;
    const correctStr = `${t}`;

    const vals = new Set([correctStr, `${W}`, `${r}`, `${t + 1}`]);
    if (vals.size !== 4) return genWorkRateFindTime();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${W}`, correct: false },
        { value: `${r}`, correct: false },
        { value: `${t + 1}`, correct: false }
    ]);

    return {
        kind: "workRateFindTime",
        taskHTML: `<p class="task-question">Объём работы W = ${W} деталей, производительность — ${r} деталей в час.<br>Найдите время t.</p>`,
        correctValue: correctStr,
        options,
        signature: `workRateFindTime:${t}:${r}`,
        why: `t = W / производительность = ${W} / ${r} = ${t} ч.`
    };
}

// t₁=k(k+1), t₂=k+1 -> совместное время T=k
function genCombinedWorkersRate() {
    const k = rand(2, 6);
    const t1 = k * (k + 1);
    const t2 = k + 1;
    const correctStr = `${k}`;

    const vals = new Set([correctStr, `${t1 + t2}`, `${t1}`, `${k + 1}`]);
    if (vals.size !== 4) return genCombinedWorkersRate();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${t1 + t2}`, correct: false },
        { value: `${t1}`, correct: false },
        { value: `${k + 1}`, correct: false }
    ]);

    return {
        kind: "combinedWorkersRate",
        taskHTML: `<p class="task-question">Рабочий А выполняет работу за ${t1} часов, рабочий Б — за ${t2} часов.<br>За сколько часов они выполнят работу вместе?</p>`,
        correctValue: correctStr,
        options,
        signature: `combinedWorkersRate:${k}`,
        why: `T = t₁t₂ / (t₁ + t₂) = ${t1} · ${t2} / (${t1} + ${t2}) = ${t1 * t2} / ${t1 + t2} = ${correctStr} ч.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// встречное движение (t выбирается первым, D=(v1+v2)·t) -> найти время встречи
function genMotionWordProblemFull() {
    const t = rand(1, 8);
    const v1 = rand(30, 60);
    const v2 = rand(30, 90);
    const D = (v1 + v2) * t;
    const correctStr = `${t}`;

    const vals = new Set([correctStr, `${D}`, `${v1 + v2}`, `${t + 1}`]);
    if (vals.size !== 4) return genMotionWordProblemFull();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${D}`, correct: false },
        { value: `${v1 + v2}`, correct: false },
        { value: `${t + 1}`, correct: false }
    ]);

    return {
        kind: "motionWordProblemFull",
        taskHTML: `<p class="task-question">Из двух городов, расстояние между которыми ${D} км, одновременно навстречу друг другу выехали два автомобиля со скоростями ${v1} км/ч и ${v2} км/ч.<br>Через сколько часов они встретятся?</p>`,
        correctValue: correctStr,
        options,
        signature: `motionWordProblemFull:${t}:${v1}:${v2}`,
        why: `Скорости при встречном движении складываются: ${v1} + ${v2} = ${v1 + v2} км/ч. t = S / v = ${D} / ${v1 + v2} = ${t} ч.`
    };
}

// смешали два раствора (оба конструируются как в mixtureFindAmount) -> найти суммарное количество вещества
function genMixtureWordProblemFull() {
    const k1 = rand(1, 15), j1 = rand(1, 8);
    const p1 = 5 * k1, m1 = 20 * j1, amt1 = k1 * j1;
    const k2 = rand(1, 15), j2 = rand(1, 8);
    const p2 = 5 * k2, m2 = 20 * j2, amt2 = k2 * j2;
    const correct = amt1 + amt2;
    const correctStr = `${correct}`;

    const vals = new Set([correctStr, `${amt1}`, `${amt2}`, `${correct + 1}`]);
    if (vals.size !== 4) return genMixtureWordProblemFull();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${amt1}`, correct: false },
        { value: `${amt2}`, correct: false },
        { value: `${correct + 1}`, correct: false }
    ]);

    return {
        kind: "mixtureWordProblemFull",
        taskHTML: `<p class="task-question">Смешали ${m1} кг раствора с концентрацией ${p1}% и ${m2} кг раствора с концентрацией ${p2}%.<br>Сколько килограммов вещества в получившейся смеси?</p>`,
        correctValue: correctStr,
        options,
        signature: `mixtureWordProblemFull:${k1}:${j1}:${k2}:${j2}`,
        why: `В первом растворе вещества: (${p1}/100) · ${m1} = ${amt1} кг. Во втором: (${p2}/100) · ${m2} = ${amt2} кг. Всего: ${amt1} + ${amt2} = ${correct} кг.`
    };
}

// обратная задача к combinedWorkersRate: даны t₁ и совместное T=k -> найти t₂
function genWorkWordProblemFull() {
    const k = rand(2, 6);
    const t1 = k * (k + 1);
    const combined = k;
    const t2 = k + 1;
    const correctStr = `${t2}`;

    const vals = new Set([correctStr, `${t1}`, `${combined}`, `${t2 + 1}`]);
    if (vals.size !== 4) return genWorkWordProblemFull();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${t1}`, correct: false },
        { value: `${combined}`, correct: false },
        { value: `${t2 + 1}`, correct: false }
    ]);

    return {
        kind: "workWordProblemFull",
        taskHTML: `<p class="task-question">Рабочий А выполняет работу за ${t1} часов. Вместе с рабочим Б они выполняют её за ${combined} часа.<br>За сколько часов рабочий Б выполнит работу один?</p>`,
        correctValue: correctStr,
        options,
        signature: `workWordProblemFull:${k}`,
        why: `1/t₂ = 1/T − 1/t₁ = 1/${combined} − 1/${t1}. После приведения к общему знаменателю получаем t₂ = ${t2} ч.`
    };
}

// концептуальный вопрос про анализ результата / отбрасывание посторонних корней
function genModelingConceptCheck() {
    const askDiscard = pick([true, false]);
    const pool = askDiscard ? MODEL_DISCARD_POOL : MODEL_STEP_POOL;
    const correct = pool[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: pool[1], correct: false },
        { value: pool[2], correct: false },
        { value: pool[3], correct: false }
    ]);

    return {
        kind: "modelingConceptCheck",
        taskHTML: askDiscard
            ? `<p class="task-question">При решении задачи на движение получили два значения времени: одно отрицательное, другое положительное. Как поступить с отрицательным значением?</p>`
            : `<p class="task-question">Что обязательно нужно сделать на последнем этапе решения текстовой задачи?</p>`,
        correctValue: correct,
        options,
        signature: `modelingConceptCheck:${askDiscard}`,
        why: askDiscard
            ? `Время не может быть отрицательным, значит это посторонний корень — его отбрасывают.`
            : `На последнем этапе всегда проверяют, что найденное значение имеет смысл по условию задачи (например, время и скорость не могут быть отрицательными).`
    };
}

const GENERATORS = {
    speedTimeDistanceFindDistance: genSpeedTimeDistanceFindDistance,
    speedTimeDistanceFindTime: genSpeedTimeDistanceFindTime,
    speedTimeDistanceFindSpeed: genSpeedTimeDistanceFindSpeed,
    percentToDecimalConcept: genPercentToDecimalConcept,
    mixtureFindAmount: genMixtureFindAmount,
    downstreamUpstreamSetup: genDownstreamUpstreamSetup,
    workRateFindTime: genWorkRateFindTime,
    combinedWorkersRate: genCombinedWorkersRate,
    motionWordProblemFull: genMotionWordProblemFull,
    mixtureWordProblemFull: genMixtureWordProblemFull,
    workWordProblemFull: genWorkWordProblemFull,
    modelingConceptCheck: genModelingConceptCheck
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
            topic: "word-problems"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
