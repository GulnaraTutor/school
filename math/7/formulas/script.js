const buttons = document.querySelectorAll(".answer button");
const result = document.querySelector(".result");
const checkBtn = document.querySelector(".check");
const percentEl = document.getElementById("percent");

let currentAnswer = [];

let total = 0;
let correct = 0;

// ===== ПРОЦЕНТ =====
function updatePercent() {
    if (total === 0) {
        percentEl.textContent = "100%";
        return;
    }

    const percent = Math.round((correct / total) * 100);
    percentEl.textContent = percent + "%";
}

// ===== ОТОБРАЖЕНИЕ ОТВЕТА =====
function render() {
    result.innerHTML = "";

    currentAnswer.forEach((item, index) => {
        const span = document.createElement("span");
        span.classList.add("chip");
        span.textContent = item;

        // клик = удалить
        span.onclick = () => {
            currentAnswer.splice(index, 1);
            render();
        };

        result.appendChild(span);
    });
}

// ===== КЛИК ПО КНОПКАМ =====
buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        currentAnswer.push(btn.textContent);
        render();
    });
});

// ===== ФОРМАТ ОТВЕТА (+ и − красиво) =====
function formatAnswer(arr) {
    let out = "";

    arr.forEach((item, i) => {

        if (i > 0) {
            const clean = item.trim();

            if (clean.startsWith("−") || clean.startsWith("-")) {
                out += " ";
            } else {
                out += " + ";
            }
        }

        out += item;
    });

    return out;
}

// ===== ПРОВЕРКА =====
checkBtn.addEventListener("click", () => {

    total++;

    const answer = formatAnswer(currentAnswer);

    // правильный ответ для (3x − 5)²
    const isCorrect =
        answer.includes("9x²") &&
        answer.includes("−30x") &&
        answer.includes("25");

    if (isCorrect) {
        correct++;
        alert("✅ Верно!");
    } else {
        correct = Math.max(0, correct - 1);
        alert("❌ Ошибка!");
    }

    updatePercent();

    currentAnswer = [];
    render();
});
