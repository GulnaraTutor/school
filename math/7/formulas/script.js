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
let currentLevel = "novice";

let currentAnswer = [];
let currentTask = null;
let buttonsByText = {};

// =====================
// GAME STATE
// =====================
let score = 0;
let lives = 3;
let mistakes = [];

// =====================
// LEVELS
// =====================
const LEVELS = {
    novice: {
        label: "Новичок",
        aRange: [2, 5],
        bRange: [2, 6],
        kinds: ["expand_plus", "expand_minus", "factor_diff", "factor_square_plus"]
    },
    middle: {
        label: "Середнячок",
        aRange: [2, 9],
        bRange: [2, 12],
        kinds: ["expand_plus", "expand_minus", "factor_diff", "factor_square_plus", "factor_square_minus"]
    },
    pro: {
        label: "Профи",
        aRange: [2, 9],
        bRange: [2, 12],
        kinds: ["factor_diff", "factor_square_plus", "factor_square_minus", "cube_sum", "cube_diff", "diff_squares_2var"]
    }
};

document.querySelectorAll(".levelBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".levelBtn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentLevel = btn.dataset.level;
    });
});

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
// RANDOM
// =====================
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

// =====================
// TASK GENERATOR
// =====================
function generateTask() {

    const cfg = LEVELS[currentLevel];
    const kind = pick(cfg.kinds);
    const a = rand(cfg.aRange[0], cfg.aRange[1]);
    const b = rand(cfg.bRange[0], cfg.bRange[1]);

    currentTask = { type: kind, a, b };

    switch (kind) {
        case "expand_plus":
            return `(${a}x + ${b})²`;
        case "expand_minus":
            return `(${a}x − ${b})²`;
        case "factor_diff":
            return `${a * a}x² − ${b * b}`;
        case "factor_square_plus":
            return `${a * a}x² + ${2 * a * b}x + ${b * b}`;
        case "factor_square_minus":
            return `${a * a}x² − ${2 * a * b}x + ${b * b}`;
        case "cube_sum":
            return `${a * a * a}x³ + ${b * b * b}`;
        case "cube_diff":
            return `${a * a * a}x³ − ${b * b * b}`;
        case "diff_squares_2var":
            return `${a * a}x² − ${b * b}y²`;
    }
}

// =====================
// OPTIONS + CORRECT ANSWER
// (each task gets: options to show, the exact correctSet,
//  and whether several parts need to be collected (isMulti))
// =====================
function generateOptions(task) {

    const a = task.a;
    const b = task.b;

    if (task.type === "expand_plus" || task.type === "expand_minus") {

        const sign = task.type === "expand_plus" ? "+" : "−";
        const mid = 2 * a * b;

        const t1 = `${a * a}x²`;
        const t2 = sign === "+" ? `${mid}x` : `−${mid}x`;
        const t3 = `${b * b}`;
        const wrongMid = sign === "+" ? `−${mid}x` : `${mid}x`;

        const options = shuffle([
            t1, t2, t3, wrongMid,
            `(${a}x + ${b})²`,
            `(${a}x − ${b})²`
        ]);

        return { options, correctSet: [t1, t2, t3], isMulti: true };
    }

    let correct, distractors;

    switch (task.type) {

        case "factor_diff":
            correct = `(${a}x − ${b})(${a}x + ${b})`;
            distractors = [
                `(${a}x + ${b})²`,
                `(${a}x − ${b})²`,
                `(${a}x² − ${b})(${a}x² + ${b})`
            ];
            break;

        case "factor_square_plus":
            correct = `(${a}x + ${b})²`;
            distractors = [
                `(${a}x − ${b})²`,
                `(${a}x − ${b})(${a}x + ${b})`,
                `(${a}x² + ${b})²`
            ];
            break;

        case "factor_square_minus":
            correct = `(${a}x − ${b})²`;
            distractors = [
                `(${a}x + ${b})²`,
                `(${a}x − ${b})(${a}x + ${b})`,
                `(${a}x² − ${b})²`
            ];
            break;

        case "cube_sum":
            correct = `(${a}x + ${b})(${a * a}x² − ${a * b}x + ${b * b})`;
            distractors = [
                `(${a}x + ${b})(${a * a}x² + ${a * b}x + ${b * b})`,
                `(${a}x − ${b})(${a * a}x² + ${a * b}x + ${b * b})`,
                `(${a}x² + ${b})(${a * a}x² − ${a * b}x + ${b * b})`
            ];
            break;

        case "cube_diff":
            correct = `(${a}x − ${b})(${a * a}x² + ${a * b}x + ${b * b})`;
            distractors = [
                `(${a}x − ${b})(${a * a}x² − ${a * b}x + ${b * b})`,
                `(${a}x + ${b})(${a * a}x² + ${a * b}x + ${b * b})`,
                `(${a}x² − ${b})(${a * a}x² + ${a * b}x + ${b * b})`
            ];
            break;

        case "diff_squares_2var":
            correct = `(${a}x − ${b}y)(${a}x + ${b}y)`;
            distractors = [
                `(${a}x + ${b}y)²`,
                `(${a}x − ${b}y)²`,
                `(${a}x² − ${b}y)(${a}x² + ${b}y)`
            ];
            break;
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
    percentEl.textContent = `${score} / 4`;
    livesEl.innerHTML = "❤️ ".repeat(lives);
    if (levelLabel) {
        levelLabel.textContent = "Уровень: " + LEVELS[currentLevel].label;
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
            status: status,
            level: currentLevel
        })
    }).catch(err => console.log("Ошибка отправки результата:", err));
}

// =====================
// RESET GAME
// =====================
function resetGame() {

    score = 0;
    lives = 3;
    mistakes = [];

    updateUI();
    newRound();
}

// =====================
// NEW ROUND
// =====================
function newRound() {

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

    updateUI();

    currentAnswer = [];

    if (lives <= 0) {

        sendResult("lose");

        alert("💀 Жизни закончились!");

        analyzeMistakes();
        resetGame();
        return;
    }

    if (score >= 4) {

        sendResult("win");

        alert(`🏆 ${studentName}, ты прошёл уровень!`);
        resetGame();
        return;
    }

    newRound();
});
