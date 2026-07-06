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

// ===== КЛИК ПО КНОПКАМ =====
buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        currentAnswer.push(btn.textContent);
        render();
    });
});

// ===== ФОРМАТ ОТВЕТА (+ и − красиво) =====


// ===== ПРОВЕРКА =====
checkBtn.addEventListener("click", () => {

    total++;

    const answer = currentAnswer;

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
