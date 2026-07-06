const result = document.querySelector(".result");
const checkBtn = document.querySelector(".check");
const percentEl = document.getElementById("percent");
const taskText = document.querySelector(".task");
const answerContainer = document.querySelector(".answer");

let currentAnswer = [];
let total = 0;
let correct = 0;

let currentTask = null;

// ===== ГЕНЕРАЦИЯ ЗАДАЧ =====
function generateTask() {

    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
        // (a + b)^2
        const a = rand(2, 5);
        const b = rand(2, 6);

        currentTask = {
            type: "square",
            a: a,
            b: b,
            sign: "+"
        };

        return `(${a}x + ${b})²`;
    }

    if (type === 1) {
        // (a - b)^2
        const a = rand(2, 5);
        const b = rand(2, 6);

        currentTask = {
            type: "square",
            a: a,
            b: b,
            sign: "-"
        };

        return `(${a}x − ${b})²`;
    }

    // difference of squares
    const a = rand(2, 9);
    const b = rand(2, 9);

    currentTask = {
        type: "diff",
        a: a,
        b: b
    };

    return `${a * a}x² − ${b * b}`;
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===== СЛЕДУЮЩАЯ ЗАДАЧА =====
let taskText = document.querySelector(".task");
const taskText = document.querySelector(".task");

function newRound() {
    const taskStr = generateTask();

    taskText.textContent = taskStr;

    currentAnswer = [];
    render();

    renderButtons(currentTask);
}
// старт игры
newRound();

// ===== РЕНДЕР =====
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

// ===== КНОПКИ =====
buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        currentAnswer.push(btn.textContent);
        render();
    });
});

// ===== ПРОВЕРКА (самое главное) =====
function isCorrectAnswer() {

    const ans = currentAnswer;

    if (currentTask.type === "square") {

        const a = currentTask.a;
        const b = currentTask.b;
        const sign = currentTask.sign;

        // (ax ± b)^2 = a^2 x^2 ± 2ab x + b^2
        const mid = 2 * a * b;

        const term1 = `${a * a}x²`;
        const term2 = sign === "+"
            ? `${mid}x`
            : `−${mid}x`;
        const term3 = `${b * b}`;

        return (
            ans.includes(term1) &&
            ans.includes(term2) &&
            ans.includes(term3)
        );
    }

    if (currentTask.type === "diff") {

        const a = currentTask.a;
        const b = currentTask.b;

        const term1 = `${a * a}x²`;
        const term2 = `−${b * b}`;

        return (
            ans.includes(term1) &&
            ans.includes(term2)
        );
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

// ===== ПРОВЕРКА КНОПКА =====

    // новая задача
    
});
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

    return shuffle(options);
}
function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
}
function renderButtons(task) {

    const container = document.querySelector(".answer");
    container.innerHTML = "";

    const options = generateOptions(task);

    options.forEach(opt => {

        const btn = document.createElement("button");
        btn.textContent = opt;

        btn.addEventListener("click", () => {
            currentAnswer.push(opt);
            render();
        });

        container.appendChild(btn);
    });
}
