console.log("SCRIPT LOADED ✔");
const result = document.querySelector(".result");
const checkBtn = document.querySelector(".check");
const percentEl = document.getElementById("percent");
const taskText = document.querySelector(".task");
const answerContainer = document.querySelector(".answer");

let currentAnswer = [];
let total = 0;
let correct = 0;

let currentTask = null;

// =====================
// РАНДОМ
// =====================
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// =====================
// ГЕНЕРАЦИЯ ЗАДАЧ
// =====================
function generateTask() {

    const type = Math.floor(Math.random() * 3);

    // (a ± b)^2
    if (type === 0 || type === 1) {

        const a = rand(2, 5);
        const b = rand(2, 6);

        currentTask = {
            type: "square",
            a,
            b,
            sign: type === 0 ? "+" : "-"
        };

        return `(${a}x ${type === 0 ? "+" : "−"} ${b})²`;
    }

    // ⭐ РАЗНОСТЬ КВАДРАТОВ = РАЗЛОЖЕНИЕ НА МНОЖИТЕЛИ
    const a = rand(2, 6);
    const b = rand(2, 6);

    currentTask = {
        type: "factor",
        a,
        b
    };

    return `${a * a}x² − ${b * b}`;
}

// =====================
// ОТРИСОВКА ОТВЕТА
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
// ВАРИАНТЫ ОТВЕТОВ
// =====================
function generateOptions(task) {

    let options = [];

    // квадрат суммы/разности
    if (task.type === "square") {

        const a = task.a;
        const b = task.b;
        const mid = 2 * a * b;

        options = [
            `${a * a}x²`,
            `${mid}x`,
            `−${mid}x`,
            `${b * b}`,
            `${a * b}x`,
            `${(a + b) * 2}x`
        ];
    }

    // ⭐ РАЗЛОЖЕНИЕ НА МНОЖИТЕЛИ
    if (task.type === "factor") {

        const a = task.a;
        const b = task.b;

        options = [
            `(${a}x − ${b})`,
            `(${a}x + ${b})`,
            `(x − ${b})(x + ${b})`,
            `${a}x² − ${b}`,
            `(${b}x − ${a})`
        ];
    }

    return options.sort(() => Math.random() - 0.5);
}

// =====================
// РЕНДЕР КНОПОК
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
// ПРОВЕРКА
// =====================
function isCorrectAnswer() {

    const ans = currentAnswer;

    // квадрат суммы/разности
    if (currentTask.type === "square") {

        const a = currentTask.a;
        const b = currentTask.b;
        const sign = currentTask.sign;

        const mid = 2 * a * b;

        const term1 = `${a * a}x²`;
        const term2 = sign === "+" ? `${mid}x` : `−${mid}x`;
        const term3 = `${b * b}`;

        return ans.includes(term1) &&
               ans.includes(term2) &&
               ans.includes(term3);
    }

    // ⭐ РАЗЛОЖЕНИЕ НА МНОЖИТЕЛИ
    if (currentTask.type === "factor") {

        const a = currentTask.a;
        const b = currentTask.b;

        return (
            ans.includes(`(${a}x − ${b})`) &&
            ans.includes(`(${a}x + ${b})`)
        );
    }

    return false;
}

// =====================
// ПРОЦЕНТ
// =====================
function updatePercent() {

    if (total === 0) {
        percentEl.textContent = "100%";
        return;
    }

    const percent = Math.round((correct / total) * 100);
    percentEl.textContent = percent + "%";
}

// =====================
// НОВЫЙ РАУНД
// =====================
function newRound() {

    const taskStr = generateTask();

    taskText.textContent = taskStr;

    currentAnswer = [];
    render();

    renderButtons(currentTask);
}

// =====================
// ПРОВЕРКА КНОПКА
// =====================
checkBtn.addEventListener("click", () => {

    total++;

    if (isCorrectAnswer()) {
        correct++;
        alert("✅ Верно!");
    } else {
        correct = Math.max(0, correct - 1);
        alert("❌ Ошибка!");
    }

    updatePercent();

    newRound();
});

// =====================
// СТАРТ
// =====================
newRound();
