const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const titleInput = document.getElementById("title");
const addBtn = document.getElementById("addBtn");
const todoList = document.getElementById("todoList");
const todayEl = document.getElementById("today");
const selectedDateEl = document.getElementById("selectedDate");

let todos = [];

// 今日の日付表示
const now = new Date();
todayEl.textContent =
  `${now.getFullYear()}年 ${now.getMonth() + 1}月 ${now.getDate()}日`;

dateInput.value = now.toISOString().slice(0, 10);
timeInput.value = "12:00";

updateSelectedDate();

// TODO追加
addBtn.addEventListener("click", () => {
  if (!titleInput.value) return;

  const datetime = `${dateInput.value}T${timeInput.value}`;

  todos.push({
    id: crypto.randomUUID(),
    title: titleInput.value,
    datetime,
    done: false
  });

  titleInput.value = "";
  render();
});

// 日付変更時
dateInput.addEventListener("change", updateSelectedDate);

function updateSelectedDate() {
  const d = new Date(dateInput.value);
  selectedDateEl.textContent =
    `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日`;
  render();
}

// 描画
function render() {
  todoList.innerHTML = "";

  const selected = dateInput.value;

  todos
    .filter(t => t.datetime.startsWith(selected))
    .sort((a, b) => a.datetime.localeCompare(b.datetime))
    .forEach(todo => {
      const li = document.createElement("li");
      li.className = "todo" + (todo.done ? " done" : "");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = todo.done;
      checkbox.onchange = () => {
        todo.done = checkbox.checked;
        render();
      };

      const time = document.createElement("time");
      time.textContent = todo.datetime.slice(11, 16);

      const span = document.createElement("span");
      span.textContent = todo.title;

      li.appendChild(checkbox);
      li.appendChild(time);
      li.appendChild(span);

      todoList.appendChild(li);
    });
}

