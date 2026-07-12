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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["eventTypeClassify", "sumRuleCount", "productRuleCount", "simpleProbabilityFind"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["probabilityComplement", "probabilityFromCounts", "frequencyFind", "compareFrequencyProbability"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["diceProbability", "combinedCombinatoricsProbability", "impossibleCertainRecognize", "probabilityConceptCheck"] }
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

// HTML для дроби num/den через общий компонент .frac (никогда слэшем)
function fracHTML(num, den) {
    return `<div class="frac"><span class="frac-num">${num}</span><span class="frac-den">${den}</span></div>`;
}

// склонение по числительному: 1 -> one, 2-4 -> few, 5+ (и 11-14) -> many
function pluralRu(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

// "3 красных карандаша" — число + верная форма фразы
function countedNoun(n, one, few, many) {
    return `${n} ${pluralRu(n, one, few, many)}`;
}

const EVENT_POOL = ["Случайное", "Достоверное", "Невозможное"];
const EVENT_DESCRIPTIONS = {
    "Случайное": ["При броске кубика выпадет чётное число", "Наугад вынутая карта окажется тузом", "Завтра пойдёт дождь", "Случайно выбранное число окажется больше 5"],
    "Достоверное": ["В сутках 24 часа", "При броске кубика выпадет число от 1 до 6", "Из коробки с одними красными шарами вынут красный шар", "Сумма углов треугольника равна 180°"],
    "Невозможное": ["При броске кубика выпадет 7", "Из коробки с одними синими шарами вынут красный шар", "Число оказалось одновременно чётным и нечётным", "Треугольник имеет четыре стороны"]
};

const FREQ_PROB_POOL = ["Вероятность — теоретическая величина, частота — экспериментальная", "Это одно и то же", "Частота всегда больше вероятности", "Вероятность можно найти только опытным путём"];
const CERTAIN_IMPOSSIBLE_POOL = ["Достоверное (P = 1)", "Невозможное (P = 0)", "Случайное (0 &lt; P &lt; 1)"];
const PROB_RANGE_POOL = ["От 0 до 1 включительно", "От −1 до 1", "От 0 до 100", "Любое число"];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// дано описание события -> Случайное / Достоверное / Невозможное
function genEventTypeClassify() {
    const type = pick(EVENT_POOL);
    const desc = pick(EVENT_DESCRIPTIONS[type]);
    const correct = type;

    const options = shuffle([
        { value: correct, correct: true },
        ...EVENT_POOL.filter(t => t !== type).map(t => ({ value: t, correct: false }))
    ]);

    return {
        kind: "eventTypeClassify",
        taskHTML: `<p class="task-question">${desc}.<br>Это какое событие?</p>`,
        correctValue: correct,
        options,
        signature: `eventTypeClassify:${type}:${desc}`,
        why: `Это ${correct.toLowerCase()} событие.`
    };
}

// m и n предметов двух видов -> сколькими способами выбрать один
function genSumRuleCount() {
    const m = rand(2, 9);
    const n = rand(2, 9);
    const correct = m + n;
    const correctStr = `${correct}`;

    const vals = new Set([correctStr, `${m * n}`, `${Math.abs(m - n)}`, `${correct + 1}`]);
    if (vals.size !== 4) return genSumRuleCount();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${m * n}`, correct: false },
        { value: `${Math.abs(m - n)}`, correct: false },
        { value: `${correct + 1}`, correct: false }
    ]);

    return {
        kind: "sumRuleCount",
        taskHTML: `<p class="task-question">В коробке ${countedNoun(m, "красный карандаш", "красных карандаша", "красных карандашей")} и ${countedNoun(n, "синий карандаш", "синих карандаша", "синих карандашей")}.<br>Сколькими способами можно выбрать один карандаш (любого из этих цветов)?</p>`,
        correctValue: correctStr,
        options,
        signature: `sumRuleCount:${m}:${n}`,
        why: `Выбрать можно либо красный, либо синий — по правилу суммы: ${m} + ${n} = ${correct} способов.`
    };
}

// m вариантов одного, n другого -> сколько независимых комбинаций
function genProductRuleCount() {
    const m = rand(2, 6);
    const n = rand(2, 6);
    const correct = m * n;
    const correctStr = `${correct}`;

    const vals = new Set([correctStr, `${m + n}`, `${m}`, `${correct + 1}`]);
    if (vals.size !== 4) return genProductRuleCount();

    const options = shuffle([
        { value: correctStr, correct: true },
        { value: `${m + n}`, correct: false },
        { value: `${m}`, correct: false },
        { value: `${correct + 1}`, correct: false }
    ]);

    return {
        kind: "productRuleCount",
        taskHTML: `<p class="task-question">У Пети ${countedNoun(m, "футболка", "футболки", "футболок")} и ${n} шорт.<br>Сколько разных комплектов одежды (футболка + шорты) он может составить?</p>`,
        correctValue: correctStr,
        options,
        signature: `productRuleCount:${m}:${n}`,
        why: `Футболку и шорты выбирают независимо друг от друга — по правилу произведения: ${m} · ${n} = ${correct} комплектов.`
    };
}

// N всего, M благоприятных -> P = M/N
function genSimpleProbabilityFind() {
    const N = rand(6, 20);
    const M = rand(1, N - 1);
    const correct = { num: `${M}`, den: `${N}` };

    const d1 = { num: `${N - M}`, den: `${N}` };
    const d2 = { num: `${N}`, den: `${M}` };
    const d3 = { num: `${M + 1}`, den: `${N}` };

    const vals = new Set([valueKey(correct), valueKey(d1), valueKey(d2), valueKey(d3)]);
    if (vals.size !== 4) return genSimpleProbabilityFind();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "simpleProbabilityFind",
        taskHTML: `<p class="task-question">В коробке ${N} шаров, из них ${countedNoun(M, "красный шар", "красных шара", "красных шаров")}. Наугад вынимают один шар.<br>Найдите вероятность того, что он окажется красным.</p>`,
        correctValue: correct,
        options,
        signature: `simpleProbabilityFind:${N}:${M}`,
        why: `P = M / N, где M = ${M} (благоприятные исходы), N = ${N} (все исходы): P = ${fracHTML(M, N)}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// дана P(A) = M/N -> найти P(не A) = (N-M)/N
function genProbabilityComplement() {
    const N = rand(6, 20);
    const M = rand(1, N - 1);
    const complement = N - M;
    const correct = { num: `${complement}`, den: `${N}` };

    const d1 = { num: `${M}`, den: `${N}` };
    const d2 = { num: `${N}`, den: `${complement}` };
    const d3 = { num: `${complement}`, den: `${M}` };

    const vals = new Set([valueKey(correct), valueKey(d1), valueKey(d2), valueKey(d3)]);
    if (vals.size !== 4) return genProbabilityComplement();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "probabilityComplement",
        taskHTML: `<p class="task-question">Вероятность события A равна ${fracHTML(M, N)}.<br>Найдите вероятность того, что событие A НЕ произойдёт.</p>`,
        correctValue: correct,
        options,
        signature: `probabilityComplement:${N}:${M}`,
        why: `P(не A) = 1 − P(A) = 1 − ${fracHTML(M, N)} = ${fracHTML(complement, N)}.`
    };
}

// m мальчиков, n девочек -> вероятность выбрать девочку
function genProbabilityFromCounts() {
    const boys = rand(5, 15);
    const girls = rand(5, 15);
    const N = boys + girls;
    const correct = { num: `${girls}`, den: `${N}` };

    const d1 = { num: `${boys}`, den: `${N}` };
    const d2 = { num: `${N}`, den: `${girls}` };
    const d3 = { num: `${girls}`, den: `${boys}` };

    const vals = new Set([valueKey(correct), valueKey(d1), valueKey(d2), valueKey(d3)]);
    if (vals.size !== 4) return genProbabilityFromCounts();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "probabilityFromCounts",
        taskHTML: `<p class="task-question">В классе ${boys} мальчиков и ${girls} девочек. Наугад выбирают одного ученика.<br>Найдите вероятность того, что это будет девочка.</p>`,
        correctValue: correct,
        options,
        signature: `probabilityFromCounts:${boys}:${girls}`,
        why: `Всего учеников: ${boys} + ${girls} = ${N}. P = ${fracHTML(girls, N)}.`
    };
}

// n испытаний, k успехов -> частота = k/n
function genFrequencyFind() {
    const n = rand(2, 20) * 10;
    const k = rand(1, n - 1);
    const correct = { num: `${k}`, den: `${n}` };

    const d1 = { num: `${n - k}`, den: `${n}` };
    const d2 = { num: `${n}`, den: `${k}` };
    const d3 = { num: `${k + 1}`, den: `${n}` };

    const vals = new Set([valueKey(correct), valueKey(d1), valueKey(d2), valueKey(d3)]);
    if (vals.size !== 4) return genFrequencyFind();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "frequencyFind",
        taskHTML: `<p class="task-question">Монету подбросили ${countedNoun(n, "раз", "раза", "раз")}, орёл выпал ${countedNoun(k, "раз", "раза", "раз")}.<br>Найдите частоту выпадения орла.</p>`,
        correctValue: correct,
        options,
        signature: `frequencyFind:${n}:${k}`,
        why: `Частота = число появлений события / число всех испытаний = ${fracHTML(k, n)}.`
    };
}

// концептуальный вопрос про разницу частоты и вероятности
function genCompareFrequencyProbability() {
    const correct = FREQ_PROB_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: FREQ_PROB_POOL[1], correct: false },
        { value: FREQ_PROB_POOL[2], correct: false },
        { value: FREQ_PROB_POOL[3], correct: false }
    ]);

    return {
        kind: "compareFrequencyProbability",
        taskHTML: `<p class="task-question">В чём разница между вероятностью события и его частотой?</p>`,
        correctValue: correct,
        options,
        signature: `compareFrequencyProbability`,
        why: `Вероятность — теоретическое число, которое можно посчитать заранее (P = M/N). Частота — то, что получилось по факту после серии испытаний; она может немного отличаться от вероятности.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// бросок кубика, конкретный список благоприятных чисел -> P
function genDiceProbability() {
    const favorableCount = rand(1, 5);
    const correct = { num: `${favorableCount}`, den: "6" };

    const d1 = { num: `${6 - favorableCount}`, den: "6" };
    const d2 = { num: "6", den: `${favorableCount}` };
    const d3 = { num: `${favorableCount + 1}`, den: "6" };

    const vals = new Set([valueKey(correct), valueKey(d1), valueKey(d2), valueKey(d3)]);
    if (vals.size !== 4) return genDiceProbability();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    const numbers = [];
    {
        let pool = [1, 2, 3, 4, 5, 6];
        for (let i = 0; i < favorableCount; i++) {
            const idx = rand(0, pool.length - 1);
            numbers.push(pool[idx]);
            pool.splice(idx, 1);
        }
    }
    numbers.sort((a, b) => a - b);

    return {
        kind: "diceProbability",
        taskHTML: `<p class="task-question">Бросили игральный кубик. Найдите вероятность того, что выпадет одно из чисел: ${numbers.join(", ")}.</p>`,
        correctValue: correct,
        options,
        signature: `diceProbability:${favorableCount}:${numbers.join(",")}`,
        why: `Благоприятных исходов ${favorableCount} (числа ${numbers.join(", ")}), всего исходов 6. P = ${fracHTML(favorableCount, 6)}.`
    };
}

// три группы (красные/синие/зелёные) -> вероятность вынуть заданный цвет
function genCombinedCombinatoricsProbability() {
    const red = rand(3, 10);
    const blue = rand(3, 10);
    const green = rand(3, 10);
    const N = red + blue + green;
    const correct = { num: `${red}`, den: `${N}` };

    const d1 = { num: `${blue + green}`, den: `${N}` };
    const d2 = { num: `${N}`, den: `${red}` };
    const d3 = { num: `${red}`, den: `${blue}` };

    const vals = new Set([valueKey(correct), valueKey(d1), valueKey(d2), valueKey(d3)]);
    if (vals.size !== 4) return genCombinedCombinatoricsProbability();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "combinedCombinatoricsProbability",
        taskHTML: `<p class="task-question">В корзине ${red} красных, ${blue} синих и ${green} зелёных шаров. Наугад вынимают один шар.<br>Найдите вероятность того, что он красный.</p>`,
        correctValue: correct,
        options,
        signature: `combinedCombinatoricsProbability:${red}:${blue}:${green}`,
        why: `Всего шаров: ${red} + ${blue} + ${green} = ${N}. P = ${fracHTML(red, N)}.`
    };
}

// сценарий (все одного цвета / смешанные) -> Достоверное / Невозможное / Случайное
function genImpossibleCertainRecognize() {
    const mode = pick(["certain", "impossible", "random"]);
    const totalBalls = rand(5, 15);
    let taskText, correct, why;

    if (mode === "certain") {
        taskText = `В коробке ${totalBalls} шаров, все они красные. Наугад вынимают один шар. Какое это событие: «вынутый шар красный»?`;
        correct = CERTAIN_IMPOSSIBLE_POOL[0];
        why = `Все шары красные, значит вынутый шар точно будет красным — это достоверное событие.`;
    } else if (mode === "impossible") {
        taskText = `В коробке ${totalBalls} шаров, все они красные. Наугад вынимают один шар. Какое это событие: «вынутый шар синий»?`;
        correct = CERTAIN_IMPOSSIBLE_POOL[1];
        why = `Синих шаров нет, значит вынуть синий шар невозможно — это невозможное событие.`;
    } else {
        const red = rand(1, totalBalls - 1);
        taskText = `В коробке ${totalBalls} шаров, из них ${countedNoun(red, "красный шар", "красных шара", "красных шаров")} (остальные — другого цвета). Наугад вынимают один шар. Какое это событие: «вынутый шар красный»?`;
        correct = CERTAIN_IMPOSSIBLE_POOL[2];
        why = `Есть и красные, и другие шары — заранее неизвестно, какой шар вынут, это случайное событие.`;
    }

    const options = shuffle([
        { value: correct, correct: true },
        ...CERTAIN_IMPOSSIBLE_POOL.filter(l => l !== correct).map(l => ({ value: l, correct: false }))
    ]);

    return {
        kind: "impossibleCertainRecognize",
        taskHTML: `<p class="task-question">${taskText}</p>`,
        correctValue: correct,
        options,
        signature: `impossibleCertainRecognize:${mode}:${totalBalls}`,
        why
    };
}

// концептуальный вопрос про диапазон значений вероятности
function genProbabilityConceptCheck() {
    const correct = PROB_RANGE_POOL[0];

    const options = shuffle([
        { value: correct, correct: true },
        { value: PROB_RANGE_POOL[1], correct: false },
        { value: PROB_RANGE_POOL[2], correct: false },
        { value: PROB_RANGE_POOL[3], correct: false }
    ]);

    return {
        kind: "probabilityConceptCheck",
        taskHTML: `<p class="task-question">В каких пределах может находиться вероятность любого события?</p>`,
        correctValue: correct,
        options,
        signature: `probabilityConceptCheck`,
        why: `Вероятность всегда от 0 (невозможное событие) до 1 (достоверное событие) включительно.`
    };
}

const GENERATORS = {
    eventTypeClassify: genEventTypeClassify,
    sumRuleCount: genSumRuleCount,
    productRuleCount: genProductRuleCount,
    simpleProbabilityFind: genSimpleProbabilityFind,
    probabilityComplement: genProbabilityComplement,
    probabilityFromCounts: genProbabilityFromCounts,
    frequencyFind: genFrequencyFind,
    compareFrequencyProbability: genCompareFrequencyProbability,
    diceProbability: genDiceProbability,
    combinedCombinatoricsProbability: genCombinedCombinatoricsProbability,
    impossibleCertainRecognize: genImpossibleCertainRecognize,
    probabilityConceptCheck: genProbabilityConceptCheck
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
            topic: "probability"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
