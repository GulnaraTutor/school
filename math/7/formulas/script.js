const buttons = document.querySelectorAll(".answer button");
const result = document.querySelector(".result");
const checkBtn = document.querySelector(".check");
const percentEl = document.getElementById("percent");

let currentAnswer = [];

let total = 0;
let correct = 0;

// ===== текущая задача =====
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
taskText.textContent = generateTask();

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

    currentAnswer = [];
    render();

    // новая задача
    taskText.textContent = generateTask();
});
