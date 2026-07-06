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
        kinds: ["factor_diff", "factor_square_plus", "factor_square_minus",
                "diff_squares_2var", "extract_x2", "multiply_diff_squares", "factor_trinomial_2var_deg4"]
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
        const t2 = s === "+" ? term(mid, "x") : `−${term(mid, "x")}`;
        const t3 = `${b * b}`;
        const wrongMid = s === "+" ? `−${term(mid, "x")}` : term(mid, "x");

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
        const t2 = sign === "+" ? term(cross, crossVar) : `−${term(cross, crossVar)}`;
        const t3 = term(b * b, powVar("y", 2 * n));
        const wrongCross = sign === "+" ? `−${term(cross, crossVar)}` : term(cross, crossVar);

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

        let display = item;

        if (currentTask.isMulti && index > 0 && !item.startsWith("−") && !item.startsWith("-")) {
            display = "+ " + item;
        }

        span.textContent = display;

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

    alert("Смотри консоль — разбор ошибок готов");
}

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
            answer: [...currentAnswer],
            student: studentName
        });
    }

    if (lives <= 0) {

        updateUI();
        sendResult("lose");

        alert(`💀 Жизни закончились! Результат: ${score} / ${roundNumber}`);

        analyzeMistakes();
        resetGame();
        return;
    }

    if (roundNumber >= TOTAL_ROUNDS) {

        updateUI();
        sendResult("win");

        alert(`🏆 ${studentName}, готово! Результат: ${score} / ${TOTAL_ROUNDS}`);
        resetGame();
        return;
    }

    newRound();
});
