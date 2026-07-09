console.log("SCRIPT LOADED ✔");
const result = document.querySelector(".result");
const checkBtn = document.querySelector(".check");
const percentEl = document.getElementById("percent");
const taskText = document.querySelector(".task");
const livesEl = document.querySelector(".lives");
const levelLabel = document.getElementById("levelLabel");

const loginScreen = document.getElementById("loginScreen");
const gameScreen = document.getElementById("gameScreen");
const startBtn = document.getElementById("startBtn");
const nameInput = document.getElementById("studentName");

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

let studentName = "";

let currentAnswer = [];
let currentTask = null;
let buttonsByText = {};

// =====================
// GAME STATE
// =====================
const TOTAL_ROUNDS = 15;
const START_LIVES = 3;

let score = 0;
let lives = START_LIVES;
let roundNumber = 0;
let mistakes = [];

// =====================
// DIFFICULTY TIERS
// rounds 1-5 -> лёгкие, 6-10 -> средние, 11-15 -> сложные
// =====================
const LEVELS = {
    novice: {
        label: "Лёгкий",
        aRange: [2, 5],
        bRange: [2, 6],
        kinds: ["expand_plus", "expand_minus", "factor_diff", "factor_square_plus"]
    },
    middle: {
        label: "Средний",
        aRange: [1, 9],
        bRange: [1, 12],
        kinds: ["expand_plus", "expand_minus", "factor_diff", "factor_square_plus", "factor_square_minus", "expand_pow2var"]
    },
    pro: {
        label: "Сложный",
        aRange: [2, 9],
        bRange: [2, 12],
        kinds: ["diff_squares_2var", "extract_x2", "multiply_diff_squares", "factor_trinomial_2var_deg4"]
    }
};

function getLevelForRound(n) {
    if (n <= 5) return "novice";
    if (n <= 10) return "middle";
    return "pro";
}

// =====================
// START GAME (LOGIN)
// =====================
startBtn.addEventListener("click", () => {

    const name = nameInput.value.trim();

    if (!name) {
        alert("Введите имя!");
        return;
    }

    studentName = name;

    loginScreen.style.display = "none";
    gameScreen.style.display = "block";

    resetGame();
});

// =====================
// HELPERS
// =====================
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function isPerfectSquare(n) {
    const r = Math.round(Math.sqrt(n));
    return r * r === n;
}

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

// omits a coefficient of 1 in front of a variable, e.g. term(1, "x²") -> "x²"
function term(coef, varStr) {
    return coef === 1 ? varStr : `${coef}${varStr}`;
}

// unicode superscript digits, so exponents render as x⁴, x⁵, x¹⁰ etc.
const SUPERSCRIPTS = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

function sup(n) {
    return String(n).split("").map(d => SUPERSCRIPTS[d]).join("");
}

// e.g. powVar("x", 1) -> "x", powVar("x", 4) -> "x⁴"
function powVar(letter, exponent) {
    return exponent === 1 ? letter : letter + sup(exponent);
}

// =====================
// TASK GENERATOR
// =====================
function generateTask() {

    const cfg = LEVELS[getLevelForRound(roundNumber)];
    const kind = pick(cfg.kinds);

    let a, b, n = 1;
    const sign = Math.random() < 0.5 ? "+" : "−";

    switch (kind) {
        case "extract_x2":
            do {
                a = rand(2, 9);
            } while (isPerfectSquare(a));
            b = null;
            break;
        case "factor_trinomial_2var_deg4":
            a = rand(1, 4);
            b = rand(2, 6);
            break;
        case "expand_pow2var":
            a = rand(1, 4);
            b = rand(1, 4);
            n = pick([2, 3, 4, 5]);
            break;
        case "diff_squares_2var":
            a = rand(cfg.aRange[0], cfg.aRange[1]);
            b = rand(cfg.bRange[0], cfg.bRange[1]);
            n = pick([1, 2, 3, 4, 5]);
            break;
        default:
            a = rand(cfg.aRange[0], cfg.aRange[1]);
            b = rand(cfg.bRange[0], cfg.bRange[1]);
    }

    currentTask = { type: kind, a, b, sign, n };

    switch (kind) {
        case "expand_plus":
            return `(${term(a, "x")} + ${b})²`;
        case "expand_minus":
            return `(${term(a, "x")} − ${b})²`;
        case "factor_diff":
            return `${term(a * a, "x²")} − ${b * b}`;
        case "factor_square_plus":
            return `${term(a * a, "x²")} + ${term(2 * a * b, "x")} + ${b * b}`;
        case "factor_square_minus":
            return `${term(a * a, "x²")} − ${term(2 * a * b, "x")} + ${b * b}`;
        case "diff_squares_2var":
            return `${term(a * a, powVar("x", 2 * n))} − ${term(b * b, powVar("y", 2 * n))}`;
        case "expand_pow2var":
            return `(${term(a, powVar("x", n))} ${sign} ${term(b, powVar("y", n))})²`;
        case "extract_x2":
            return `${sign === "−" ? "−" : ""}x² + ${term(a, "x⁴")}`;
        case "multiply_diff_squares":
            return `(${term(a, "x")} − p)(p + ${term(a, "x")})`;
        case "factor_trinomial_2var_deg4":
            return `${term(a * a, "x⁴")} + ${term(b * b, "y²")} ${sign === "−" ? "−" : "+"} ${term(2 * a * b, "x²y")}`;
    }
}

// =====================
// OPTIONS + CORRECT ANSWER
// =====================
function generateOptions(task) {

    const a = task.a, b = task.b, sign = task.sign, n = task.n || 1;

    if (task.type === "expand_plus" || task.type === "expand_minus") {

        const s = task.type === "expand_plus" ? "+" : "−";
        const mid = 2 * a * b;

        const t1 = term(a * a, "x²");
        const t2 = s === "+" ? `+ ${term(mid, "x")}` : `− ${term(mid, "x")}`;
        const t3 = `+ ${b * b}`;
        const wrongMid = s === "+" ? `− ${term(mid, "x")}` : `+ ${term(mid, "x")}`;

        const options = shuffle([
            t1, t2, t3, wrongMid,
            `(${term(a, "x")} + ${b})²`,
            `(${term(a, "x")} − ${b})²`
        ]);

        return { options, correctSet: [t1, t2, t3], isMulti: true };
    }

    if (task.type === "expand_pow2var") {

        const t1 = term(a * a, powVar("x", 2 * n));
        const cross = 2 * a * b;
        const crossVar = powVar("x", n) + powVar("y", n);
        const t2 = sign === "+" ? `+ ${term(cross, crossVar)}` : `− ${term(cross, crossVar)}`;
        const t3 = `+ ${term(b * b, powVar("y", 2 * n))}`;
        const wrongCross = sign === "+" ? `− ${term(cross, crossVar)}` : `+ ${term(cross, crossVar)}`;

        const options = shuffle([
            t1, t2, t3, wrongCross,
            `(${term(a, powVar("x", n))} + ${term(b, powVar("y", n))})²`,
            `(${term(a, powVar("x", n))} − ${term(b, powVar("y", n))})²`
        ]);

        return { options, correctSet: [t1, t2, t3], isMulti: true };
    }

    let correct, distractors;

    switch (task.type) {

        case "factor_diff":
            correct = `(${term(a, "x")} − ${b})(${term(a, "x")} + ${b})`;
            distractors = [
                `(${term(a, "x")} + ${b})²`,
                `(${term(a, "x")} − ${b})²`,
                `(${term(a, "x²")} − ${b})(${term(a, "x²")} + ${b})`
            ];
            break;

        case "factor_square_plus":
            correct = `(${term(a, "x")} + ${b})²`;
            distractors = [
                `(${term(a, "x")} − ${b})²`,
                `(${term(a, "x")} − ${b})(${term(a, "x")} + ${b})`,
                `(${term(a, "x²")} + ${b})²`
            ];
            break;

        case "factor_square_minus":
            correct = `(${term(a, "x")} − ${b})²`;
            distractors = [
                `(${term(a, "x")} + ${b})²`,
                `(${term(a, "x")} − ${b})(${term(a, "x")} + ${b})`,
                `(${term(a, "x²")} − ${b})²`
            ];
            break;

        case "diff_squares_2var":
            correct = `(${term(a, powVar("x", n))} − ${term(b, powVar("y", n))})(${term(a, powVar("x", n))} + ${term(b, powVar("y", n))})`;
            distractors = [
                `(${term(a, powVar("x", n))} + ${term(b, powVar("y", n))})²`,
                `(${term(a, powVar("x", n))} − ${term(b, powVar("y", n))})²`,
                `(${term(a, powVar("x", n + 1))} − ${term(b, powVar("y", n))})(${term(a, powVar("x", n + 1))} + ${term(b, powVar("y", n))})`
            ];
            break;

        case "extract_x2": {
            const other = sign === "−" ? "+" : "−";
            correct = `x²(${term(a, "x²")} ${sign} 1)`;
            distractors = [
                `x²(${term(a, "x²")} ${other} 1)`,
                `x(${term(a, "x³")} ${sign} x)`,
                `x²(${term(a, "x")} ${sign} 1)`
            ];
            break;
        }

        case "multiply_diff_squares":
            correct = `${term(a * a, "x²")} − p²`;
            distractors = [
                `${term(a * a, "x²")} + p²`,
                `${term(a * a, "x²")} − ${term(2 * a, "xp")} − p²`,
                `${term(a * a, "x²")} + ${term(2 * a, "xp")} − p²`
            ];
            break;

        case "factor_trinomial_2var_deg4": {
            const other = sign === "−" ? "+" : "−";
            correct = `(${term(a, "x²")} ${sign} ${term(b, "y")})²`;
            distractors = [
                `(${term(a, "x²")} ${other} ${term(b, "y")})²`,
                `(${term(a, "x²")} ${sign} ${term(b, "y")})(${term(a, "x²")} ${other} ${term(b, "y")})`,
                `(${term(a, "x")} ${sign} ${term(b, "y")})²`
            ];
            break;
        }
    }

    return {
        options: shuffle([correct, ...distractors]),
        correctSet: [correct],
        isMulti: false
    };
}

// =====================
// RENDER ANSWER (chips)
// =====================
function render() {

    result.innerHTML = "";

    currentAnswer.forEach((item, index) => {

        const span = document.createElement("span");
        span.classList.add("chip");
        span.textContent = item;

        span.onclick = () => {
            currentAnswer.splice(index, 1);

            if (currentTask.isMulti) {
                const btn = buttonsByText[item];
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove("used");
                }
            } else {
                Object.values(buttonsByText).forEach(b => b.classList.remove("selected"));
            }

            render();
        };

        result.appendChild(span);
    });
}

// =====================
// BUTTONS
// =====================
function renderButtons(task) {

    const container = document.querySelector(".answer");
    container.innerHTML = "";
    buttonsByText = {};

    task.options.forEach(opt => {

        const btn = document.createElement("button");
        btn.textContent = opt;
        buttonsByText[opt] = btn;

        btn.onclick = () => {

            if (task.isMulti) {
                if (currentAnswer.includes(opt)) return;
                currentAnswer.push(opt);
                btn.disabled = true;
                btn.classList.add("used");
            } else {
                currentAnswer = [opt];
                Object.values(buttonsByText).forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
            }

            render();
        };

        container.appendChild(btn);
    });
}

// =====================
// CHECK ANSWER (exact match — no missing pieces, no extra ones)
// =====================
function isCorrectAnswer() {

    const ans = currentAnswer;
    const correct = currentTask.correctSet;

    if (ans.length !== correct.length) return false;

    const sortedAns = [...ans].sort();
    const sortedCorrect = [...correct].sort();

    return sortedAns.every((v, i) => v === sortedCorrect[i]);
}

// =====================
// UI UPDATE
// =====================
function updateUI() {
    percentEl.textContent = `${score} / ${TOTAL_ROUNDS}`;
    livesEl.innerHTML = "❤️ ".repeat(lives);

    if (levelLabel) {
        const tier = LEVELS[getLevelForRound(roundNumber)].label;
        levelLabel.textContent = `Раунд ${roundNumber} / ${TOTAL_ROUNDS} · Уровень: ${tier}`;
    }
}

// =====================
// ANALYZE MISTAKES
// =====================
function analyzeMistakes() {

    console.log("📊 АНАЛИЗ ОШИБОК:");

    const stats = {};

    mistakes.forEach(m => {
        stats[m.task] = (stats[m.task] || 0) + 1;
    });

    console.table(stats);
}

// =====================
// ПОЯСНЕНИЯ К ТИПАМ ЗАДАНИЙ (почему ответ именно такой)
// =====================
const EXPLANATIONS = {

    expand_plus: m => {
        const aStr = `${m.a}x`, bStr = `${m.b}`;
        return `Это квадрат суммы: (a+b)² = a² + 2ab + b². ` +
               `Здесь a = ${aStr}, b = ${bStr} → a² = ${m.a*m.a}x², 2ab = ${2*m.a*m.b}x, b² = ${m.b*m.b}.`;
    },

    expand_minus: m => {
        const aStr = `${m.a}x`, bStr = `${m.b}`;
        return `Это квадрат разности: (a−b)² = a² − 2ab + b². ` +
               `Здесь a = ${aStr}, b = ${bStr} → a² = ${m.a*m.a}x², 2ab = ${2*m.a*m.b}x, b² = ${m.b*m.b}.`;
    },

    factor_diff: m => {
        const aStr = `${m.a}x`, bStr = `${m.b}`;
        return `Это разность квадратов: a² − b² = (a−b)(a+b). ` +
               `Здесь a = ${aStr}, b = ${bStr} → (${aStr}−${bStr})(${aStr}+${bStr}).`;
    },

    factor_square_plus: m => {
        const aStr = `${m.a}x`, bStr = `${m.b}`;
        return `Формула квадрата суммы: a² + 2ab + b² = (a+b)². Проверяем средний член: ` +
               `2ab = 2·${aStr}·${bStr} = ${2*m.a*m.b} — совпадает со знаком «+» в задании, значит здесь a = ${aStr}, b = ${bStr} → (a+b)² = (${aStr}+${bStr})².`;
    },

    factor_square_minus: m => {
        const aStr = `${m.a}x`, bStr = `${m.b}`;
        return `Формула квадрата разности: a² − 2ab + b² = (a−b)². Средний член в задании отрицательный: ` +
               `−2ab = −${2*m.a*m.b} — значит здесь a = ${aStr}, b = ${bStr} → (a−b)² = (${aStr}−${bStr})².`;
    },

    expand_pow2var: m => {
        const aStr = term(m.a, powVar("x", m.n)), bStr = term(m.b, powVar("y", m.n));
        return `Та же формула (a±b)² = a² ± 2ab + b², только a и b — не просто буквы, а целые слагаемые со степенями. ` +
               `Здесь a = ${aStr}, b = ${bStr} → a² = ${m.a*m.a}${powVar("x", 2*m.n)}, 2ab = ${2*m.a*m.b}${powVar("x", m.n)}${powVar("y", m.n)}, b² = ${m.b*m.b}${powVar("y", 2*m.n)}.`;
    },

    diff_squares_2var: m => {
        const aStr = term(m.a, powVar("x", m.n)), bStr = term(m.b, powVar("y", m.n));
        return `Разность квадратов: a² − b² = (a−b)(a+b). ` +
               `Здесь a = ${aStr}, b = ${bStr} → (${aStr}−${bStr})(${aStr}+${bStr}).`;
    },

    extract_x2: m =>
        `Здесь не формула сокращённого умножения, а вынесение общего множителя: у обоих слагаемых есть x², ` +
        `его выносим за скобку: ${m.sign==='−'?'−':''}x² ${m.sign} ${m.a}x⁴ = x²(${m.a}x² ${m.sign} 1).`,

    multiply_diff_squares: m => {
        const aStr = `${m.a}x`, bStr = "p";
        return `Это тоже разность квадратов a² − b² = (a−b)(a+b), просто нужно было перемножить готовые скобки. ` +
               `Здесь a = ${aStr}, b = ${bStr}: (${aStr}−${bStr})(${bStr}+${aStr}) — во второй скобке слагаемые ` +
               `переставлены (${bStr}+${aStr} вместо ${aStr}+${bStr}), от перестановки сумма не меняется: (a−b)(a+b) = a²−b² = ${m.a*m.a}x² − p².`;
    },

    factor_trinomial_2var_deg4: m => {
        const aStr = `${m.a}x²`, bStr = `${m.b}y`;
        return `Слагаемые даны не по убыванию степени, из-за этого легко ошибиться. Это формула (a±b)² = a²±2ab+b². ` +
               `Крайние члены — точные квадраты: отсюда a = ${aStr}, b = ${bStr}. Знак посередине (${m.sign}) — это знак внутри скобки: ` +
               `(${aStr} ${m.sign} ${bStr})².`;
    }
};

// =====================
// ВИЗУАЛЬНАЯ ПОДПИСЬ a / b НАД ПРИМЕРОМ
// кружки вокруг частей выражения + стрелки к буквам a и b
// =====================

// какую часть примера обводить кружком для каждого типа задания
// (для типов, где формула — это (a±b)² или (a−b)(a+b))
const ANNOTATION_SPECS = {
    expand_plus:               m => ({ prefix: "(", aPart: `${m.a}x`,               mid: " + ",         bPart: `${m.b}`,                          suffix: ")²" }),
    expand_minus:               m => ({ prefix: "(", aPart: `${m.a}x`,               mid: " − ",         bPart: `${m.b}`,                          suffix: ")²" }),
    factor_square_plus:         m => ({ prefix: "(", aPart: `${m.a}x`,               mid: " + ",         bPart: `${m.b}`,                          suffix: ")²" }),
    factor_square_minus:        m => ({ prefix: "(", aPart: `${m.a}x`,               mid: " − ",         bPart: `${m.b}`,                          suffix: ")²" }),
    expand_pow2var:              m => ({ prefix: "(", aPart: term(m.a, powVar("x", m.n)), mid: ` ${m.sign} `, bPart: term(m.b, powVar("y", m.n)),  suffix: ")²" }),
    factor_trinomial_2var_deg4: m => ({ prefix: "(", aPart: `${m.a}x²`,              mid: ` ${m.sign} `, bPart: `${m.b}y`,                         suffix: ")²" }),
    factor_diff:                 m => ({ prefix: "(", aPart: `${m.a}x`,               mid: " − ",         bPart: `${m.b}`,                          suffix: ")" }),
    diff_squares_2var:           m => ({ prefix: "(", aPart: term(m.a, powVar("x", m.n)), mid: " − ",     bPart: term(m.b, powVar("y", m.n)),      suffix: ")" }),
    multiply_diff_squares:       m => ({ prefix: "(", aPart: `${m.a}x`,               mid: " − ",         bPart: "p",                               suffix: ")" })
};

function measureTextWidth(text, font) {
    if (!measureTextWidth._ctx) {
        measureTextWidth._ctx = document.createElement("canvas").getContext("2d");
    }
    measureTextWidth._ctx.font = font;
    return measureTextWidth._ctx.measureText(text).width;
}

function buildAnnotatedSVG(spec) {

    const font = "bold 28px Arial, sans-serif";
    const baselineY = 92;
    const svgHeight = 130;
    const padX = 16;

    const segments = [
        { text: spec.prefix, tag: null },
        { text: spec.aPart,  tag: "a" },
        { text: spec.mid,    tag: null },
        { text: spec.bPart,  tag: "b" },
        { text: spec.suffix, tag: null }
    ];

    let x = padX;
    const laidOut = segments.map(seg => {
        const w = measureTextWidth(seg.text, font);
        const item = Object.assign({}, seg, { x, width: w });
        x += w;
        return item;
    });

    const svgWidth = x + padX;

    let body = "";

    laidOut.forEach(seg => {
        const color = seg.tag === "a" ? "#2470ff" : seg.tag === "b" ? "#ff5c5c" : "#222";
        body += `<text x="${seg.x}" y="${baselineY}" style="font:${font};" fill="${color}">${seg.text}</text>`;
    });

    laidOut.filter(seg => seg.tag).forEach(seg => {
        const cx = seg.x + seg.width / 2;
        const cy = baselineY - 9;
        const rx = seg.width / 2 + 10;
        const ry = 26;
        const color = seg.tag === "a" ? "#2470ff" : "#ff5c5c";

        body += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
        body += `<line x1="${cx}" y1="${cy - ry}" x2="${cx}" y2="22" stroke="${color}" stroke-width="2.5" marker-end="url(#arrowhead-${seg.tag})"/>`;
        body += `<text x="${cx}" y="16" text-anchor="middle" style="font: bold 20px Arial, sans-serif;" fill="${color}">${seg.tag}</text>`;
    });

    const defs = `<defs>
        <marker id="arrowhead-a" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#2470ff"/>
        </marker>
        <marker id="arrowhead-b" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#ff5c5c"/>
        </marker>
    </defs>`;

    return `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%; max-width:280px; height:auto; display:block; margin:12px auto;" xmlns="http://www.w3.org/2000/svg">${defs}${body}</svg>`;
}

function buildDiagramFor(m) {
    const specFn = ANNOTATION_SPECS[m.type];
    if (!specFn) return "";
    return buildAnnotatedSVG(specFn(m));
}

function explainMistake(m) {
    const fn = EXPLANATIONS[m.type];
    return fn ? fn(m) : "Сверьте свой ответ с правильным вариантом по формулам сокращённого умножения.";
}

function renderMistakes() {

    mistakesList.innerHTML = "";

    mistakes.forEach((m, i) => {

        const card = document.createElement("div");
        card.classList.add("mistake-item");

        card.innerHTML = `
            <div class="mistake-num">Ошибка ${i + 1}</div>
            <div class="mistake-task">Задание: ${m.task}</div>
            ${buildDiagramFor(m)}
            <div class="mistake-your">Ваш ответ: ${m.studentAnswer.join(", ")}</div>
            <div class="mistake-correct">Правильный ответ: ${m.correctAnswer.join(", ")}</div>
            <div class="mistake-why">${explainMistake(m)}</div>
        `;

        mistakesList.appendChild(card);
    });
}

// =====================
// РЕАКЦИИ ПО СЧЁТУ (эмодзи + подпись)
// диапазоны заданы по score (0..TOTAL_ROUNDS), проверяются по порядку сверху вниз
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

function showResultScreen(status, finalScore) {

    const reaction = getReaction(finalScore);

    resultEmoji.textContent = reaction.emoji;
    resultMessage.textContent = reaction.text(studentName);
    resultScore.textContent = `Результат: ${finalScore} / ${TOTAL_ROUNDS}`;

    reviewMistakesBtn.style.display = mistakes.length > 0 ? "inline-block" : "none";

    gameScreen.style.display = "none";
    resultScreen.style.display = "flex";
}

function goToLogin() {
    mistakesScreen.style.display = "none";
    resultScreen.style.display = "none";
    loginScreen.style.display = "flex";
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

// =====================
// ОТПРАВКА РЕЗУЛЬТАТА НА СЕРВЕР
// =====================
function sendResult(status) {

    fetch("https://script.google.com/macros/s/AKfycbzW3CPziLkHUCvFAq1WsVX5Mh_WTViiM_Xj8MINOzUeOb2ba6cP2bQYz0RKLERh2A/exec", {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            name: studentName,
            score: score,
            roundsCompleted: roundNumber,
            status: status
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}

// =====================
// RESET GAME
// =====================
function resetGame() {

    score = 0;
    lives = START_LIVES;
    roundNumber = 0;
    mistakes = [];

    newRound();
}

// =====================
// NEW ROUND
// =====================
function newRound() {

    roundNumber++;

    const taskStr = generateTask();
    const meta = generateOptions(currentTask);

    currentTask.options = meta.options;
    currentTask.correctSet = meta.correctSet;
    currentTask.isMulti = meta.isMulti;

    taskText.textContent = taskStr;

    currentAnswer = [];
    render();

    renderButtons(currentTask);
    updateUI();
}

// =====================
// CHECK BUTTON
// =====================
checkBtn.addEventListener("click", () => {

    if (currentAnswer.length === 0) {
        alert("Сначала выбери ответ!");
        return;
    }

    if (isCorrectAnswer()) {

        score++;

    } else {

        lives--;

        mistakes.push({
            task: taskText.textContent,
            studentAnswer: [...currentAnswer],
            correctAnswer: [...currentTask.correctSet],
            type: currentTask.type,
            a: currentTask.a,
            b: currentTask.b,
            sign: currentTask.sign,
            n: currentTask.n || 1
        });
    }

    if (lives <= 0) {

        updateUI();
        sendResult("lose");
        analyzeMistakes();

        showResultScreen("lose", score);
        return;
    }

    if (roundNumber >= TOTAL_ROUNDS) {

        updateUI();
        sendResult("win");
        analyzeMistakes();

        showResultScreen("win", score);
        return;
    }

    newRound();
});
