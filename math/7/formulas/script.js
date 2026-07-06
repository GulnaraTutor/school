const buttons = document.querySelectorAll(".answer button");
const result = document.querySelector(".result");
const checkBtn = document.querySelector(".check");

let currentAnswer = [];

function render() {
    result.innerHTML = "";

    currentAnswer.forEach((item, index) => {
        const span = document.createElement("span");
        span.textContent = item;
        span.classList.add("chip");

        // клик — удалить элемент
        span.onclick = () => {
            currentAnswer.splice(index, 1);
            render();
        };

        result.appendChild(span);
    });
}

// клик по карточкам
buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        currentAnswer.push(btn.textContent);
        render();
    });
});

// проверка (пока простая версия)
checkBtn.addEventListener("click", () => {
    const answer = currentAnswer.join(" ");

    if (answer.includes("9x²") && answer.includes("−30x") && answer.includes("25")) {
        alert("✅ Правильно!");
    } else {
        alert("❌ Попробуй ещё раз");
    }
});
