const STORAGE_KEY = "todos";
let currentFilter = "all";

/* ===== LIFF ===== */
liff.init({ liffId: "あなたのLIFF_ID" });

/* ===== Storage ===== */
const getTodos = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTodos = (todos) => localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));

/* ===== util ===== */
function nowHHMM() {
  return new Date().toTimeString().slice(0,5);
}
function todayYYYYMMDD() {
  return new Date().toISOString().slice(0,10);
}

/* ===== 追加 ===== */
function addTodo() {
  const title = document.getElementById("title").value;
  const startTime = document.getElementById("startTime").value;
  const date = document.getElementById("date").value;

  if (!title) return;

  const todos = getTodos();
  todos.push({
    title,
    startTime,
    date,
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

/* ===== 描画 ===== */
function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  let todos = getTodos();

  // 今日タスク優先で表示（旧データも表示）
  const today = todayYYYYMMDD();
  todos.sort((a,b)=>{
    if (a.status === "doing" && b.status !== "doing") return -1;
    if (a.status !== "doing" && b.status === "doing") return 1;
    if (a.date === today && b.date !== today) return -1;
    if (a.date !== today && b.date === today) return 1;
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

    // 遅延・オーバー
    if (todo.status === "todo" && todo.startTime && todo.startTime < now) {
      div.classList.add("late");
    }
    if (todo.status === "doing" && todo.startedAt) {
      if (Date.now() - todo.startedAt > 60*60*1000) {
        div.classList.add("over");
      }
    }

    let duration = "";
    if (todo.startedAt && todo.endedAt) {
      const min = Math.floor((todo.endedAt - todo.startedAt)/60000);
      duration = ` ⏱${min}分`;
    }

    div.innerHTML = `
      <div>
        <div class="todo-text">${todo.title}</div>
        <div class="todo-time">${todo.date} ${todo.startTime || ""}${duration}</div>
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
  const hhmm = nowHHMM();
  const today = todayYYYYMMDD();
  let changed = false;

  todos.forEach(todo=>{
    if (
      todo.startTime === hhmm &&
      todo.date === today &&
      todo.status === "todo" &&
      !todo.notified
    ) {
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
  const key = todayYYYYMMDD();
  if (h < 9 || localStorage.getItem("morning") === key) return;

  const todos = getTodos().filter(t => t.date === key && t.status==="todo");
  if (todos.length) {
    alert("📋 今日のToDo\n\n" + todos.map(t=>"・"+t.title).join("\n"));
  }
  localStorage.setItem("morning", key);
}

setInterval(checkStartTime, 60000);
morningSummary();
render();

