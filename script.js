const STORAGE_KEY = "todos";
let currentFilter = "all";

/* ===== LIFF ===== */
liff.init({ liffId: "2008726714-eZTej71E" });

/* ===== Storage ===== */
const getTodos = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const saveTodos = (todos) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));

/* ===== util ===== */
function nowHHMM() {
  return new Date().toTimeString().slice(0,5);
}

function getWeekday(month) {
  if (!month) return "";
  const d = new Date(month + "-01");
  return d.toLocaleDateString("ja-JP",{ weekday: "short" });
}

/* ===== 追加 ===== */
function addTodo() {
  const title = document.getElementById("title").value;
  const startTime = document.getElementById("startTime").value;
  const month = document.getElementById("month").value;

  if (!title) return;

  const todos = getTodos();
  todos.push({
    title,
    startTime,
    month,
    status: "todo",
    notified: false,
    created: Date.now(),
    startedAt: null,
    endedAt: null
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
    todo.startedAt = Date.now();

    if (liff.isInClient()) {
      liff.sendMessages([{
        type: "text",
        text: `▶ 実行開始\n${todo.title}`
      }]);
    }

  } else if (todo.status === "doing") {
    todo.status = "done";
    todo.endedAt = Date.now();
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
  const currentMonth = new Date().toISOString().slice(0,7);
  todos = todos.filter(t=>!t.month || t.month === currentMonth);

  todos.sort((a,b)=>{
    if (a.status==="doing" && b.status!=="doing") return -1;
    if (a.status!=="doing" && b.status==="doing") return 1;
    return a.created - b.created;
  });

  if (currentFilter !== "all") {
    todos = todos.filter(t => t.status === currentFilter);
  }

  if (!todos.length) {
    list.innerHTML = "<p style='text-align:center;'>ToDoなし</p>";
    return;
  }

  const now = nowHHMM();

  todos.forEach((todo,i)=>{
    const div = document.createElement("div");
    div.className = `todo ${todo.status}`;

    if (todo.status==="todo" && todo.startTime && todo.startTime < now) {
      div.classList.add("late");
    }

    if (todo.status==="doing" && todo.startedAt) {
      if (Date.now()-todo.startedAt > 60*60*1000) div.classList.add("over");
    }

    let duration = "";
    if (todo.startedAt && todo.endedAt) {
      const min = Math.floor((todo.endedAt - todo.startedAt)/60000);
      duration = ` ⏱${min}分`;
    }

    const weekday = getWeekday(todo.month);

    div.innerHTML = `
      <div>
        <div class="todo-text">${todo.title}</div>
        <div class="todo-time">
          ${todo.startTime || ""}${duration}
          ${weekday ? " (" + weekday + ")" : ""}
        </div>
      </div>
      <button onclick="changeStatus(${i})">
        ${todo.status==="todo" ? "▶" : todo.status==="doing" ? "✓" : "↩"}
      </button>
    `;

    list.appendChild(div);
  });
}

/* ===== 開始時間通知 ===== */
function checkStartTime() {
  const todos = getTodos();
  const hhmm = nowHHMM();
  let changed = false;

  todos.forEach(todo=>{
    if (todo.startTime===hhmm && todo.status==="todo" && !todo.notified) {
      if (liff.isInClient()) {
        liff.sendMessages([{
          type:"text",
          text:`⏰ ${todo.startTime}\n${todo.title}`
        }]);
      }
      todo.notified = true;
      changed = true;
    }
  });

  if (changed) saveTodos(todos);
}

/* ===== 朝9時まとめ ===== */
function morningSummary() {
  const h = new Date().getHours();
  const key = new Date().toDateString();
  if (h<9 || localStorage.getItem("morning")===key) return;

  const todos = getTodos().filter(t=>t.status==="todo");
  if (todos.length) {
    alert("📋 今日のToDo\n\n" + todos.map(t=>"・"+t.title).join("\n"));
  }
  localStorage.setItem("morning", key);
}

setInterval(checkStartTime, 60000);
morningSummary();
render();
