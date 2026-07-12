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
    novice: { label: "Лёгкий",  from: 1,  to: 5,  kinds: ["identifyKSimple", "identifyKFraction", "quadrantsFromK", "substituteXFindY"] },
    middle: { label: "Средний", from: 6,  to: 10, kinds: ["findKFromPoint", "compareClosenessToAxes", "signFromQuadrants", "readGraphSVGFindK"] },
    pro:    { label: "Сложный", from: 11, to: 15, kinds: ["identifyKNegativeFraction", "compareTwoGraphsSVG", "domainQuestion", "graphSVGIdentifySign"] }
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

function valueKey(v) {
    return typeof v === "string" ? v : `${v.num}/${v.den}`;
}

function valueToHTML(v) {
    if (typeof v === "string") {
        return `<span class="task-plain">${v}</span>`;
    }
    return `<div class="frac"><span class="frac-num">${v.num}</span><span class="frac-den">${v.den}</span></div>`;
}

function formulaHTML(numStrVal, denStrVal) {
    return `<span class="formula-eq">y&nbsp;=&nbsp;</span>${valueToHTML({ num: numStrVal, den: denStrVal })}`;
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

// =====================
// SVG ГИПЕРБОЛЫ
// =====================
function buildHyperbolaSVG(k, opts = {}) {
    const w = 220, h = 170;
    const ox = w / 2, oy = h / 2;
    const scale = 13;
    const color = opts.color || "#2470ff";

    const absK = Math.abs(k);
    const yMaxUnits = 6, yMinUnits = 0.6;
    const xMin = absK / yMaxUnits;
    const xMax = absK / yMinUnits;
    const n = 14;
    const r = Math.pow(xMax / xMin, 1 / (n - 1));

    const branch1 = [], branch2 = [];
    for (let i = 0; i < n; i++) {
        const x = xMin * Math.pow(r, i);
        const y = k / x;
        branch1.push([ox + x * scale, oy - y * scale]);
        branch2.push([ox - x * scale, oy + y * scale]);
    }

    const pathStr = pts => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

    let marker = "";
    if (opts.labelPoint) {
        const [mx, my] = opts.labelPoint;
        const px = ox + mx * scale, py = oy - my * scale;
        marker = `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${color}"/>
            <text x="${(px + (mx > 0 ? 8 : -8)).toFixed(1)}" y="${(py - 8).toFixed(1)}" text-anchor="${mx > 0 ? "start" : "end"}" class="hb-point-label">(${numStr(mx)}, ${numStr(my)})</text>`;
    }

    return `<svg viewBox="0 0 ${w} ${h}" class="hb-svg" xmlns="http://www.w3.org/2000/svg">
        <line x1="6" y1="${oy}" x2="${w - 6}" y2="${oy}" class="hb-axis"/>
        <line x1="${ox}" y1="${h - 6}" x2="${ox}" y2="6" class="hb-axis"/>
        <path d="${pathStr(branch1)}" class="hb-curve" stroke="${color}"/>
        <path d="${pathStr(branch2)}" class="hb-curve" stroke="${color}"/>
        ${marker}
    </svg>`;
}

// готовые пулы вариантов для "текстовых" вопросов с фиксированным набором ответов
const QUADRANT_POOL = ["I и III", "II и IV", "I и II", "III и IV"];
const SIGN_POOL = ["k > 0", "k < 0", "k = 0", "k может быть любым"];
const DOMAIN_POOL = ["Все числа, кроме 0", "Все числа", "Только положительные числа", "Только целые числа"];

// =====================
// ГЕНЕРАТОРЫ — ЛЁГКИЙ УРОВЕНЬ
// =====================

// y = k/x -> чему равен k (k целое, может быть отрицательным)
function genIdentifyKSimple() {
    const k = nonZeroRand(-9, 9);
    const correct = numStr(k);

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(-k), correct: false },
        { value: numStr(Math.abs(k) + 1), correct: false },
        { value: numStr(-(Math.abs(k) + 1)), correct: false }
    ]);

    return {
        kind: "identifyKSimple",
        taskHTML: `<div class="formula-box">${formulaHTML(numStr(k), "x")}</div><p class="task-question">Чему равен коэффициент k?</p>`,
        correctValue: correct,
        options,
        signature: `identifyKSimple:${k}`,
        why: `В формуле y = k/x коэффициент k — это число в числителе. Здесь k = ${k}.`
    };
}

// y = p/(qx) -> k = p/q (дробью, p и q взаимно простые)
function genIdentifyKFraction() {
    let p, q;
    do { p = rand(2, 9); q = rand(2, 9); } while (gcd(p, q) !== 1 || p === q);

    const correct = { num: `${p}`, den: `${q}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${q}`, den: `${p}` }, correct: false },
        { value: { num: `${p * q}`, den: "1" }, correct: false },
        { value: { num: `${p}`, den: `${q + 1}` }, correct: false }
    ]);

    return {
        kind: "identifyKFraction",
        taskHTML: `<div class="formula-box">${formulaHTML(`${p}`, `${q}x`)}</div><p class="task-question">Чему равен коэффициент k?</p>`,
        correctValue: correct,
        options,
        signature: `identifyKFraction:${p}:${q}`,
        why: `y = ${p}/(${q}x) — это то же самое, что y = (${p}/${q})/x. Значит, k = ${p}/${q}.`
    };
}

// дано k -> в каких четвертях ветви
function genQuadrantsFromK() {
    const k = nonZeroRand(-9, 9);
    const correct = k > 0 ? "I и III" : "II и IV";
    const pool = QUADRANT_POOL.filter(v => v !== correct);

    const options = shuffle([
        { value: correct, correct: true },
        { value: pool[0], correct: false },
        { value: pool[1], correct: false },
        { value: pool[2], correct: false }
    ]);

    return {
        kind: "quadrantsFromK",
        taskHTML: `<div class="formula-box">${formulaHTML(numStr(k), "x")}</div><p class="task-question">В каких четвертях лежат ветки графика?</p>`,
        correctValue: correct,
        options,
        signature: `quadrantsFromK:${k}`,
        why: `k ${k > 0 ? ">" : "<"} 0, значит x и y ${k > 0 ? "одного" : "разных"} знака — ветки лежат в ${correct} четвертях.`
    };
}

// y = k/x, x = a -> найти y
function genSubstituteXFindY() {
    let k, a, correct, correctVal, d1, d1val, d2, d2val, d3, d3val;
    do {
        k = nonZeroRand(-9, 9);
        a = nonZeroRand(-9, 9);
    } while (a === k || a === -k);

    const g = gcd(k, a);
    let num = k / g, den = a / g;
    if (den < 0) { num = -num; den = -den; }
    correct = { num: numStr(num), den: `${den}` };
    correctVal = num / den;

    let dNum1 = a, dDen1 = k;
    if (dDen1 < 0) { dNum1 = -dNum1; dDen1 = -dDen1; }
    d1 = { num: numStr(dNum1), den: `${dDen1}` };
    d1val = dNum1 / dDen1;

    d2 = { num: numStr(k + a), den: "1" };
    d2val = k + a;

    d3 = { num: numStr(-num), den: `${den}` };
    d3val = -num / den;

    if (new Set([correctVal, d1val, d2val, d3val].map(v => v.toFixed(6))).size !== 4) return genSubstituteXFindY();

    const options = shuffle([
        { value: correct, correct: true },
        { value: d1, correct: false },
        { value: d2, correct: false },
        { value: d3, correct: false }
    ]);

    return {
        kind: "substituteXFindY",
        taskHTML: `<div class="formula-box">${formulaHTML(numStr(k), "x")}</div><p class="task-question">При x = ${numStr(a)} чему равен y?</p>`,
        correctValue: correct,
        options,
        signature: `substituteXFindY:${k}:${a}`,
        why: `Подставляем x = ${numStr(a)} в y = k/x: y = ${numStr(k)}/${numStr(a)}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СРЕДНИЙ УРОВЕНЬ
// =====================

// график проходит через точку (a,b) -> k = a*b
function genFindKFromPoint() {
    let a, b, k, vals;
    do {
        a = nonZeroRand(-9, 9);
        b = nonZeroRand(-9, 9);
        k = a * b;
        vals = [k, a + b, b - a, -k];
    } while (new Set(vals).size !== 4);

    const correct = numStr(k);

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(a + b), correct: false },
        { value: numStr(b - a), correct: false },
        { value: numStr(-k), correct: false }
    ]);

    return {
        kind: "findKFromPoint",
        taskHTML: `<p class="task-question">График y = k/x проходит через точку (${numStr(a)}, ${numStr(b)}). Чему равен k?</p>`,
        correctValue: correct,
        options,
        signature: `findKFromPoint:${a}:${b}`,
        why: `Если точка (${numStr(a)}, ${numStr(b)}) лежит на графике, то её координаты подходят под формулу: k = x·y = ${numStr(a)}×${numStr(b)} = ${numStr(k)}.`
    };
}

// два k -> у какого графика ветки ближе к осям
function genCompareClosenessToAxes() {
    let k1, k2;
    do { k1 = rand(1, 9); k2 = rand(1, 9); } while (k1 === k2);

    const correct = k1 < k2 ? "График с k₁" : "График с k₂";

    const options = shuffle([
        { value: correct, correct: true },
        { value: k1 < k2 ? "График с k₂" : "График с k₁", correct: false },
        { value: "Одинаково близко", correct: false },
        { value: "Нельзя определить", correct: false }
    ]);

    return {
        kind: "compareClosenessToAxes",
        taskHTML: `<p class="task-question">k₁ = ${k1}, k₂ = ${k2}. У какого графика ветки ближе к осям?</p>`,
        correctValue: correct,
        options,
        signature: `compareClosenessToAxes:${k1}:${k2}`,
        why: `Чем меньше │k│, тем ближе ветки гиперболы к осям. Здесь ${Math.min(k1, k2)} меньше ${Math.max(k1, k2)}, значит ближе к осям график с k${k1 < k2 ? "₁" : "₂"}.`
    };
}

// дано "ветки в ..." -> знак k
function genSignFromQuadrants() {
    const positive = pick([true, false]);
    const quadrantsText = positive ? "I и III" : "II и IV";
    const correct = positive ? "k > 0" : "k < 0";
    const pool = SIGN_POOL.filter(v => v !== correct);

    const options = shuffle([
        { value: correct, correct: true },
        { value: pool[0], correct: false },
        { value: pool[1], correct: false },
        { value: pool[2], correct: false }
    ]);

    return {
        kind: "signFromQuadrants",
        taskHTML: `<p class="task-question">Ветки графика y = k/x лежат в ${quadrantsText} четвертях. Каков знак k?</p>`,
        correctValue: correct,
        options,
        signature: `signFromQuadrants:${positive}`,
        why: `Ветки в ${quadrantsText} четвертях означают, что x и y ${positive ? "одного" : "разных"} знака — это бывает только при ${correct}.`
    };
}

// показан график с подписанной точкой -> чему равен k
function genReadGraphSVGFindK() {
    let x0, y0, k, vals;
    do {
        x0 = nonZeroRand(-6, 6);
        y0 = nonZeroRand(-6, 6);
        k = x0 * y0;
        vals = [k, x0 + y0, x0, -k];
    } while (Math.abs(k) > 20 || new Set(vals).size !== 4); // избегаем слишком вытянутых графиков и совпадающих вариантов

    const correct = numStr(k);

    const options = shuffle([
        { value: correct, correct: true },
        { value: numStr(x0 + y0), correct: false },
        { value: numStr(x0), correct: false },
        { value: numStr(-k), correct: false }
    ]);

    return {
        kind: "readGraphSVGFindK",
        taskHTML: `<div class="graph-box-inline">${buildHyperbolaSVG(k, { labelPoint: [x0, y0] })}</div><p class="task-question">На графике y = k/x отмечена точка. Чему равен k?</p>`,
        correctValue: correct,
        options,
        signature: `readGraphSVGFindK:${x0}:${y0}`,
        why: `Точка (${numStr(x0)}, ${numStr(y0)}) лежит на графике, значит k = x·y = ${numStr(x0)}×${numStr(y0)} = ${numStr(k)}.`
    };
}

// =====================
// ГЕНЕРАТОРЫ — СЛОЖНЫЙ УРОВЕНЬ
// =====================

// y = -p/(qx) или p/(-qx) -> k отрицательной дробью, сокращённой
function genIdentifyKNegativeFraction() {
    let p0, q0, g, p, q, vals;
    do {
        p0 = rand(2, 9); q0 = rand(2, 9);
        g = gcd(p0, q0);
        p = p0 / g; q = q0 / g;
        vals = [-p / q, p / q, -q / p, q0 / p0];
    } while (p0 === q0 || new Set(vals.map(v => v.toFixed(6))).size !== 4);
    const numOnLeft = pick([true, false]); // −p0/(q0 x)  или  p0/(−q0 x)

    const correct = { num: `−${p}`, den: `${q}` };

    const options = shuffle([
        { value: correct, correct: true },
        { value: { num: `${p}`, den: `${q}` }, correct: false },
        { value: { num: `−${q}`, den: `${p}` }, correct: false },
        { value: { num: `${q0}`, den: `${p0}` }, correct: false }
    ]);

    return {
        kind: "identifyKNegativeFraction",
        taskHTML: `<div class="formula-box">${formulaHTML(numOnLeft ? `−${p0}` : `${p0}`, numOnLeft ? `${q0}x` : `−${q0}x`)}</div><p class="task-question">Чему равен коэффициент k?</p>`,
        correctValue: correct,
        options,
        signature: `identifyKNegativeFraction:${p0}:${q0}:${numOnLeft}`,
        why: `Минус можно перенести в числитель: получаем −${p0}/(${q0}x), то есть k = −${p0}/${q0}. После сокращения k = −${p}/${q}.`
    };
}

// два SVG-графика -> у какого больше |k|
function genCompareTwoGraphsSVG() {
    let k1, k2;
    do { k1 = rand(2, 9); k2 = rand(2, 9); } while (k1 === k2);

    const correct = k1 > k2 ? "График A" : "График B";

    const options = shuffle([
        { value: correct, correct: true },
        { value: k1 > k2 ? "График B" : "График A", correct: false },
        { value: "Одинаковый │k│", correct: false },
        { value: "Нельзя определить", correct: false }
    ]);

    const graphsHTML = `<div class="graph-pair">
        <div class="graph-pair-item"><span class="graph-pair-label">График A</span>${buildHyperbolaSVG(k1, { color: "#2470ff" })}</div>
        <div class="graph-pair-item"><span class="graph-pair-label">График B</span>${buildHyperbolaSVG(k2, { color: "#8b5cf6" })}</div>
    </div>`;

    return {
        kind: "compareTwoGraphsSVG",
        taskHTML: `${graphsHTML}<p class="task-question">У какого графика больше │k│?</p>`,
        correctValue: correct,
        options,
        signature: `compareTwoGraphsSVG:${k1}:${k2}`,
        why: `Чем дальше ветки от осей, тем больше │k│. У графика A │k│=${k1}, у графика B │k│=${k2} — больше у ${correct === "График A" ? "графика A" : "графика B"}.`
    };
}

// область определения y=k/x
function genDomainQuestion() {
    const k = nonZeroRand(-9, 9);
    const correct = "Все числа, кроме 0";
    const pool = DOMAIN_POOL.filter(v => v !== correct);

    const options = shuffle([
        { value: correct, correct: true },
        { value: pool[0], correct: false },
        { value: pool[1], correct: false },
        { value: pool[2], correct: false }
    ]);

    return {
        kind: "domainQuestion",
        taskHTML: `<div class="formula-box">${formulaHTML(numStr(k), "x")}</div><p class="task-question">Какова область определения этой функции?</p>`,
        correctValue: correct,
        options,
        signature: `domainQuestion:${k}`,
        why: `x стоит в знаменателе, а на 0 делить нельзя. Значит x может быть любым числом, кроме 0.`
    };
}

// показан один SVG-график (нейтральный цвет) -> знак k по четвертям
function genGraphSVGIdentifySign() {
    const positive = pick([true, false]);
    const k = positive ? rand(2, 9) : -rand(2, 9);
    const correct = positive ? "k > 0" : "k < 0";
    const pool = SIGN_POOL.filter(v => v !== correct);

    const options = shuffle([
        { value: correct, correct: true },
        { value: pool[0], correct: false },
        { value: pool[1], correct: false },
        { value: pool[2], correct: false }
    ]);

    return {
        kind: "graphSVGIdentifySign",
        taskHTML: `<div class="graph-box-inline">${buildHyperbolaSVG(k, { color: "#2470ff" })}</div><p class="task-question">В каких четвертях лежат ветки — и каков знак k?</p>`,
        correctValue: correct,
        options,
        signature: `graphSVGIdentifySign:${k}`,
        why: `Ветки на графике лежат в ${positive ? "I и III" : "II и IV"} четвертях — там, где x и y ${positive ? "одного" : "разных"} знака. Значит, ${correct}.`
    };
}

const GENERATORS = {
    identifyKSimple: genIdentifyKSimple,
    identifyKFraction: genIdentifyKFraction,
    quadrantsFromK: genQuadrantsFromK,
    substituteXFindY: genSubstituteXFindY,
    findKFromPoint: genFindKFromPoint,
    compareClosenessToAxes: genCompareClosenessToAxes,
    signFromQuadrants: genSignFromQuadrants,
    readGraphSVGFindK: genReadGraphSVGFindK,
    identifyKNegativeFraction: genIdentifyKNegativeFraction,
    compareTwoGraphsSVG: genCompareTwoGraphsSVG,
    domainQuestion: genDomainQuestion,
    graphSVGIdentifySign: genGraphSVGIdentifySign
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
            topic: "inverse-proportion"
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}
