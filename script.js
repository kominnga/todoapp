const STORAGE_KEY = "todos";
let currentFilter = "all";

/* ===== LIFF ===== */
liff.init({ liffId: "2008726714-eZTej71E" });

/* ===== Storage ===== */
const getTodos = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const saveTodos = (todos) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));

/* ===== 追加 ===== */
function addTodo() {
  const title = document.getElementById("title").value;
  const startTime = document.getElementById("startTime").value;

  if (!title) return;

  const todos = getTodos();
  todos.push({
    title,
    startTime,
    status: "todo",
    notified: false,
    created: Date.now()
  });

  saveTodos(todos);
  document.getElementById("title").value = "";
  render();
}

/* ===== フィルタ ===== */
function setFilter(filter) {
  currentFilter = filter;
  render();
}

/* ===== 状態変更 ===== */
function changeStatus(index) {
  const todos = getTodos();
  const todo = todos[index];

  if (todo.status === "todo") {
    todo.status = "doing";

    if (liff.isInClient()) {
      liff.sendMessages([{
        type: "text",
        text: `▶ 実行開始\n${todo.title}`
      }]);
    }

  } else if (todo.status === "doing") {
    todo.status = "done";
  } else {
    todo.status = "todo";
    todo.notified = false;
  }

  saveTodos(todos);
  render();
}

/* ===== 表示 ===== */
function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  let todos = getTodos();

  // 実行中を最上段
  todos.sort((a, b) => {
    if (a.status === "doing" && b.status !== "doing") return -1;
    if (a.status !== "doing" && b.status === "doing") return 1;
    return a.created - b.created;
  });

  if (currentFilter !== "all") {
    todos = todos.filter(t => t.status === currentFilter);
  }

  if (!todos.length) {
    list.innerHTML = "<p style='text-align:center;'>ToDoなし</p>";
    return;
  }

  todos.forEach((todo, i) => {
    const div = document.createElement("div");
    div.className = `todo ${todo.status}`;

    div.innerHTML = `
      <div>
        <div class="todo-text">${todo.title}</div>
        <div class="todo-time">${todo.startTime || ""}</div>
      </div>
      <button onclick="changeStatus(${i})">
        ${todo.status === "todo" ? "▶" :
          todo.status === "doing" ? "✓" : "↩"}
      </button>
    `;

    list.appendChild(div);
  });
}

/* ===== 開始時間通知 ===== */
function checkStartTime() {
  const todos = getTodos();
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);

  let changed = false;

  todos.forEach(todo => {
    if (
      todo.startTime === hhmm &&
      todo.status === "todo" &&
      !todo.notified
    ) {
      if (liff.isInClient()) {
        liff.sendMessages([{
          type: "text",
          text: `⏰ ${todo.startTime}\n${todo.title}`
        }]);
      }
      todo.notified = true;
      changed = true;
    }
  });

  if (changed) saveTodos(todos);
}

setInterval(checkStartTime, 60000);
render();
