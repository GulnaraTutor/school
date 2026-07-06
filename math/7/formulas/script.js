console.log("SCRIPT LOADED ✔");
const result = document.querySelector(".result");
const checkBtn = document.querySelector(".check");
const percentEl = document.getElementById("percent");
const taskText = document.querySelector(".task");
const livesEl = document.querySelector(".lives");

let currentAnswer = [];
let currentTask = null;

// =====================
// GAME STATE
// =====================
let score = 0;
let lives = 3;
let mistakes = [];

// =====================
// RANDOM
// =====================
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// =====================
// TASK GENERATOR
// =====================
function generateTask() {

    const type = Math.floor(Math.random() * 4);

    if (type === 0 || type === 1) {

        const a = rand(2, 5);
        const b = rand(2, 6);

        currentTask = {
            type: "expand_square",
            a,
            b,
            sign: type === 0 ? "+" : "-"
        };

        return `(${a}x ${type === 0 ? "+" : "−"} ${b})²`;
    }

    if (type === 2) {

        const a = rand(2, 6);
        const b = rand(2, 6);

        currentTask = {
            type: "factor_diff",
            a,
            b
        };

        return `${a * a}x² − ${b * b}`;
    }

    const a = rand(2, 5);
    const b = rand(2, 6);

    currentTask = {
        type: "factor_square",
        a,
        b
    };

    const A = a * a;
    const B = 2 * a * b;
    const C = b * b;

    return `${A}x² + ${B}x + ${C}`;
}

// =====================
// RENDER ANSWER
// =====================
function render() {

    result.innerHTML = "";

    currentAnswer.forEach((item, index) => {

        const span = document.createElement("span");
        span.classList.add("chip");

        let display = item;

        if (index > 0 && !item.startsWith("−") && !item.startsWith("-")) {
            display = "+ " + item;
        }

        span.textContent = display;

        span.onclick = () => {
            currentAnswer.splice(index, 1);
            render();
        };

        result.appendChild(span);
    });
}

// =====================
// OPTIONS
// =====================
function generateOptions(task) {

    let options = [];

    if (task.type === "expand_square") {

        const a = task.a;
        const b = task.b;
        const mid = 2 * a * b;

        options = [
            `${a * a}x²`,
            `${mid}x`,
            `−${mid}x`,
            `${b * b}`,
            `(${a}x + ${b})²`,
            `(${a}x − ${b})²`
        ];
    }

    if (task.type === "factor_diff") {

        const a = task.a;
        const b = task.b;

        options = [
            `${a * a}x² − ${b * b}`,
            `(${a}x − ${b})(${a}x + ${b})`,
            `(${a}x + ${b})²`,
            `(${a}x − ${b})²`
        ];
    }

    if (task.type === "factor_square") {

        const a = task.a;
        const b = task.b;

        const A = a * a;
        const B = 2 * a * b;
        const C = b * b;

        options = [
            `(${a}x + ${b})²`,
            `(${a}x − ${b})²`,
            `${A}x² + ${B}x + ${C}`
        ];
    }

    return options.sort(() => Math.random() - 0.5);
}

// =====================
// BUTTONS
// =====================
function renderButtons(task) {

    const container = document.querySelector(".answer");
    container.innerHTML = "";

    const options = generateOptions(task);

    options.forEach(opt => {

        const btn = document.createElement("button");
        btn.textContent = opt;

        btn.onclick = () => {
            currentAnswer.push(opt);
            render();
        };

        container.appendChild(btn);
    });
}

// =====================
// CHECK ANSWER
// =====================
function isCorrectAnswer() {

    const ans = currentAnswer;

    if (currentTask.type === "expand_square") {

        const a = currentTask.a;
        const b = currentTask.b;
        const mid = 2 * a * b;

        const t1 = `${a * a}x²`;
        const t2 = currentTask.sign === "+" ? `${mid}x` : `−${mid}x`;
        const t3 = `${b * b}`;

        return ans.includes(t1) &&
               ans.includes(t2) &&
               ans.includes(t3);
    }

    if (currentTask.type === "factor_diff") {

        const a = currentTask.a;
        const b = currentTask.b;

        return ans.includes(`(${a}x − ${b})(${a}x + ${b})`) ||
               ans.includes(`${a * a}x² − ${b * b}`);
    }

    if (currentTask.type === "factor_square") {

        const a = currentTask.a;
        const b = currentTask.b;

        return (
            ans.includes(`(${a}x + ${b})²`) ||
            ans.includes(`(${a}x − ${b})²`) ||
            ans.includes(`${a * a}x² + ${2 * a * b}x + ${b * b}`)
        );
    }

    return false;
}

// =====================
// UI UPDATE
// =====================
function updateUI() {

    percentEl.textContent = `${score} / 20`;
    livesEl.innerHTML = "❤️ ".repeat(lives);
}

// =====================
// ANALYSIS
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

    if (isCorrectAnswer()) {

        score++;

    } else {

        lives--;

        mistakes.push({
            task: taskText.textContent,
            answer: [...currentAnswer]
        });
    }

    updateUI();

    currentAnswer = [];

    if (lives <= 0) {

        alert("💀 Жизни закончились!");

        analyzeMistakes();
        resetGame();
        return;
    }

    if (score >= 20) {

        alert("🏆 20 правильных ответов! Победа!");

        resetGame();
        return;
    }

    newRound();
});

// =====================
// START
// =====================
newRound();
const saveBtn = document.getElementById("saveResult");
const nameInput = document.getElementById("studentName");
const historyDiv = document.getElementById("history");

// =====================
// СОХРАНЕНИЕ РЕЗУЛЬТАТА
// =====================
saveBtn.addEventListener("click", () => {

    const name = nameInput.value.trim();

    if (!name) {
        alert("Введите имя ученика!");
        return;
    }

    const result = {
        name: name,
        score: score,
        date: new Date().toLocaleString()
    };

    let data = JSON.parse(localStorage.getItem("results")) || [];

    data.push(result);

    localStorage.setItem("results", JSON.stringify(data));

    alert("Результат сохранён!");

    renderHistory();
});
function renderHistory() {

    let data = JSON.parse(localStorage.getItem("results")) || [];

    historyDiv.innerHTML = "<h3>Прошедшие ученики:</h3>";

    data.forEach(item => {

        const div = document.createElement("div");

        div.textContent =
            `${item.name} — ${item.score}/20 — ${item.date}`;

        historyDiv.appendChild(div);
    });
}
renderHistory();
