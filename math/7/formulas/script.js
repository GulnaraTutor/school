console.log("SCRIPT LOADED ✔");
const result = document.querySelector(".result");
const checkBtn = document.querySelector(".check");
const percentEl = document.getElementById("percent");
const taskText = document.querySelector(".task");

let currentAnswer = [];
let total = 0;
let correct = 0;

let currentTask = null;

// =====================
// RANDOM
// =====================
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// =====================
// GENERATE TASK
// =====================
function generateTask() {

    const type = Math.floor(Math.random() * 4);

    // 1. expand (ax ± b)^2
    if (type === 0) {

        const a = rand(2, 5);
        const b = rand(2, 6);

        currentTask = { type: "expand_square", a, b, sign: "+" };

        return `(${a}x + ${b})²`;
    }

    if (type === 1) {

        const a = rand(2, 5);
        const b = rand(2, 6);

        currentTask = { type: "expand_square", a, b, sign: "-" };

        return `(${a}x − ${b})²`;
    }

    // 2. expand difference of squares
    if (type === 2) {

        const a = rand(2, 6);
        const b = rand(2, 6);

        currentTask = { type: "factor_diff", a, b };

        return `${a * a}x² − ${b * b}`;
    }

    // 3. factor square trinomial
    const a = rand(2, 5);
    const b = rand(2, 6);

    const A = a * a;
    const B = 2 * a * b;
    const C = b * b;

    currentTask = {
        type: "factor_square",
        a,
        b
    };

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
            `${(a + b) * 2}x`,
            `${a * b}x`,
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
            `(${a}x − ${b})²`,
            `${a * a}x² + ${b * b}`
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
            `${A}x² + ${B}x + ${C}`,
            `${A}x² − ${B}x + ${C}`
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
// CHECK
// =====================
function isCorrectAnswer() {

    const ans = currentAnswer;

    // expand square
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

    // factor difference of squares
    if (currentTask.type === "factor_diff") {

        const a = currentTask.a;
        const b = currentTask.b;

        return ans.includes(`(${a}x − ${b})(${a}x + ${b})`) ||
               ans.includes(`${a * a}x² − ${b * b}`);
    }

    // factor trinomial
    if (currentTask.type === "factor_square") {

        const a = currentTask.a;
        const b = currentTask.b;

        return ans.includes(`(${a}x + ${b})²`) ||
               ans.includes(`(${a}x − ${b})²`);
    }

    return false;
}

// =====================
// PERCENT
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
// ROUND
// =====================
function newRound() {

    const taskStr = generateTask();

    taskText.textContent = taskStr;

    currentAnswer = [];
    render();

    renderButtons(currentTask);
}

// =====================
// CHECK BUTTON
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
// START
// =====================
newRound();
