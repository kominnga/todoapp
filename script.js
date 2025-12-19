const STORAGE_KEY = "todos";
let currentFilter = "all";

/* ===== LIFF ===== */
liff.init({ liffId: "2008726714-eZTej71E" });

/* ===== Storage ===== */
const getTodos = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTodos = (todos) => localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));

/* ===== util ===== */
function nowHHMM() { return new Date().toTimeString().slice(0,5); }
function dayOfWeek(date) { return ["日","月","火","水","木","金","土"][date.getDay()]; }

/* ===== 追加 ===== */
async function addTodo() {
  const title = document.getElementById("title").value;
  const startTime = document.getElementById("startTime").value;
  const month = document.getElementById("month").value;

  if (!title) return;

  const todos = getTodos();
  todos.push({
    title,
    startTime,
    month,
    date,
    us: "todo",
    notified: false,
    created: Date.now(),
    startedAt: null,
    endedAt: null,
    weekday: dayOfWeek(new Date(`${month}-01`))
  });

  saveTodos(todos);
  document.getElementById("title").value = "";
  render();

  // Worker に同期
  await fetch("https://silent-star-fba7.kanikani34423.workers.dev", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month, todos })
  });
}

/* ===== フィルタ ===== */
function setFilter(filter) { currentFilter = filter; render(); }

/* ===== 状態変更 ===== */
async function changeStatus(index) {
  const todos = getTodos();
  const todo = todos[index];

  if (todo.status === "todo") {
    todo.status = "doing";
    todo.startedAt = Date.now();

    if (liff.isInClient()) {
      liff.sendMessages([{ type: "text", text: `▶ 実行開始\n${todo.title}` }]);
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

  // Worker に同期
  const month = todo.month || new Date().toISOString().slice(0,7);
  await fetch("https://silent-star-fba7.kanikani34423.workers.dev", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month, todos })
  });
}

/* ===== 表示 ===== */
function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";
  let todos = getTodos();
  const currentMonth = new Date().toISOString().slice(0,7);
  todos = todos.filter(t=>!t.month || t.month===currentMonth);

  todos.sort((a,b)=>{
    if(a.status==="doing" && b.status!=="doing") return -1;
    if(a.status!=="doing" && b.status==="doing") return 1;
    return a.created - b.created;
  });

  if(currentFilter!=="all") todos = todos.filter(t=>t.status===currentFilter);
  if(!todos.length){ list.innerHTML="<p style='text-align:center;'>ToDoなし</p>"; return; }

  const now = nowHHMM();
  todos.forEach((todo,i)=>{
    const div = document.createElement("div");
    div.className = `todo ${todo.status}`;

    if(todo.status==="todo" && todo.startTime && todo.startTime<now) div.classList.add("late");
    if(todo.status==="doing" && todo.startedAt && Date.now()-todo.startedAt>60*60*1000) div.classList.add("over");

    let duration = "";
    if(todo.startedAt && todo.endedAt){
      const min = Math.floor((todo.endedAt-todo.startedAt)/60000);
      duration=` ⏱${min}分`;
    }

    div.innerHTML=`
      <div>
        <div class="todo-text">${todo.title} (${todo.weekday})</div>
        <div class="todo-time">${todo.startTime||""}${duration}</div>
      </div>
      <button onclick="changeStatus(${i})">
        ${todo.status==="todo"?"▶":todo.status==="doing"?"✓":"↩"}
      </button>
    `;
    list.appendChild(div);
  });
}

/* ===== 朝9時まとめ ===== */
function morningSummary() {
  const h=new Date().getHours();
  const key=new Date().toDateString();
  if(h<9 || localStorage.getItem("morning")===key) return;

  const todos = getTodos().filter(t=>t.status==="todo");
  if(todos.length) alert("📋 今日のToDo\n\n"+todos.map(t=>"・"+t.title).join("\n"));
  localStorage.setItem("morning", key);
}

setInterval(render, 60000); // UI更新
morningSummary();
render();
