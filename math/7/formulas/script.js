const buttons = document.querySelectorAll(".answer button");
const result = document.querySelector(".result");
const checkBtn = document.querySelector(".check");
const percentEl = document.getElementById("percent");

let currentAnswer = [];

let total = 0;
let correct = 0;

function updatePercent() {
    if (total === 0) {
        percentEl.textContent = "100%";
        return;
    }

    let percent = Math.round((correct / total) * 100);
    percentEl.textContent = percent + "%";
}

function render() {
    result.innerHTML = "";

    currentAnswer.forEach((item, index) => {
        const span = document.createElement("span");
        span.textContent = item;
        span.classList.add("chip");

        span.onclick = () => {
            currentAnswer.splice(index, 1);
            render();
        };

        result.appendChild(span);
    });
}

// клики по карточкам
buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        currentAnswer.push(btn.textContent);
        render();
    });
});

checkBtn.addEventListener("click", () => {

    total++;

    const answer = currentAnswer.join(" ");

    let isCorrect =
        answer.includes("9x²") &&
        answer.includes("−30x") &&
        answer.includes("25");

    if (isCorrect) {
        correct++;
        alert("✅ Верно!");
    } else {
        correct--; // ❗ минус за ошибку
        alert("❌ Ошибка!");
    }

    updatePercent();

    currentAnswer = [];
    render();
});
