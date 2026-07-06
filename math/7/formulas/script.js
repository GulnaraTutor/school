const result = document.querySelector(".result");
const checkBtn = document.querySelector(".check");
const percentEl = document.getElementById("percent");
const taskText = document.querySelector(".task");
const answerContainer = document.querySelector(".answer");

let currentAnswer = [];
let total = 0;
let correct = 0;

let currentTask = null;

// ===== РАНДОМ =====
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===== ГЕНЕРАЦИЯ ЗАДАЧ =====
function generateTask() {

    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
        const a = rand(2, 5);
        const b = rand(2, 6);

        currentTask = { type: "square", a, b, sign: "+" };
        return `(${a}x + ${b})²`;
    }

    if (type === 1) {
        const a = rand(2, 5);
        const b = rand(2, 6);

        currentTask = { type: "square", a, b, sign: "-" };
        return `(${a}x − ${b})²`;
    }

    const a = rand(2, 9);
    const b = rand(2, 9);

    currentTask = { type: "diff", a, b };
    return `${a * a}x² − ${b * b}`;
}

// ===== ОТВЕТ =====
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

// ===== ВАРИАНТЫ =====
function generateOptions(task) {

    let options = [];

    if (task.type === "square") {

        const a = task.a;
        const b = task.b;
        const mid = 2 * a * b;

        options = [
            `${a * a}x²`,
            `${mid}x`,
            `−${mid}x`,
            `${b * b}`,
            `${(a + b) * 2}x`,
            `${a * b}x`
        ];
    }

    if (task.type === "diff") {

        const a = task.a;
        const b = task.b;

        options = [
            `${a * a}x²`,
            `−${b * b}`,
            `+${b * b}`,
            `${(a + b)}x`,
            `${(a - b)}x`
        ];
    }

    return options.sort(() => Math.random() - 0.5);
}

// ===== КНОПКИ =====
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

// ===== ПРОВЕРКА =====
function isCorrectAnswer() {

    const ans = currentAnswer;

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

    if (currentTask.type === "diff") {

        const a = currentTask.a;
        const b = currentTask.b;

        return ans.includes(`${a * a}x²`) &&
               ans.includes(`−${b * b}`);
    }

    return false;
}

// ===== ПРОЦЕНТ =====
function updatePercent() {

    if (total === 0) {
        percentEl.textContent = "100%";
        return;
    }

    const percent = Math.round((correct / total) * 100);
    percentEl.textContent = percent + "%";
}

// ===== НОВЫЙ РАУНД =====
function newRound() {

    const taskStr = generateTask();

    taskText.textContent = taskStr;

    currentAnswer = [];
    render();

    renderButtons(currentTask);
}

// ===== КНОПКА ПРОВЕРКИ =====
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

// ===== СТАРТ =====
newRound();
