/* ==========================
   設定
========================== */
const STORAGE_KEY = "todos";
let currentFilter = "all";

/* ===== LIFF ===== */
liff.init({ liffId: "2008726714-eZTej71E" });

/* ===== util ===== */
const getTodos = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTodos = (t) => localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
const nowHHMM = () => new Date().toTimeString().slice(0, 5);
const dayOfWeek = (d) => ["日","月","火","水","木","金","土"][new Date(d).getDay()];

/* ===== 初期表示 ===== */
const todayEl = document.getElementById("today");
const dateEl = document.getElementById("date");
const titleEl = document.getElementById("title");
const timeEl = document.getElementById("startTime");
const listEl = document.getElementById("list");

const now = new Date();
todayEl.textContent =
  `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}（${dayOfWeek(now)}）`;
dateEl.value = now.toISOString().slice(0,10);

/* ===== 追加 ===== */
document.getElementById("addBtn").onclick = addTodo;

function addTodo(){
  if(!titleEl.value || !dateEl.value) return;

  const todo = {
    title: titleEl.value,
    date: dateEl.value,
    startTime: timeEl.value,
    status: "todo",
    notifiedBefore: false,
    notifiedAfter: false,
    created: Date.now(),
    startedAt: null,
    endedAt: null
  };

  const todos = getTodos();
  todos.push(todo);
  saveTodos(todos);
  titleEl.value = "";
  render();

  // Worker送信（将来 Push / Mail）
  fetch("https://YOUR_WORKER_DOMAIN/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(todo)
  });
}

/* ===== フィルタ ===== */
document.querySelectorAll(".filters button").forEach(btn=>{
  btn.onclick = () => {
    document.querySelectorAll(".filters button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  };
});

/* ===== 状態変更 ===== */
function changeStatus(i){
  const todos = getTodos();
  const t = todos[i];

  if(t.status === "todo"){
    t.status = "doing";
    t.startedAt = Date.now();
    if(liff.isInClient()){
      liff.sendMessages([{ type:"text", text:`▶ 開始\n${t.title}` }]);
    }
  } else if(t.status === "doing"){
    t.status = "done";
    t.endedAt = Date.now();
  } else {
    t.status = "todo";
    t.notifiedBefore = false;
    t.notifiedAfter = false;
  }

  saveTodos(todos);
  render();
}

/* ===== 描画 ===== */
function render(){
  listEl.innerHTML = "";
  let todos = getTodos();

  if(currentFilter !== "all"){
    todos = todos.filter(t => t.status === currentFilter);
  }

  if(!todos.length){
    listEl.innerHTML = "<p style='text-align:center;color:#64748b;'>ToDoなし</p>";
    return;
  }

  const nowTime = nowHHMM();

  todos.forEach((t,i)=>{
    const div = document.createElement("div");
    div.className = `todo ${t.status}`;

    if(t.status==="todo" && t.startTime && t.startTime < nowTime) div.classList.add("late");
    if(t.status==="doing" && Date.now()-t.startedAt > 3600000) div.classList.add("over");

    let duration="";
    if(t.startedAt && t.endedAt){
      duration = ` ⏱${Math.floor((t.endedAt - t.startedAt)/60000)}分`;
    }

    div.innerHTML = `
      <div>
        <div class="todo-text">${t.title}</div>
        <div class="todo-time">${t.date}(${dayOfWeek(t.date)}) ${t.startTime || ""}${duration}</div>
      </div>
      <button onclick="changeStatus(${i})">
        ${t.status==="todo"?"▶":t.status==="doing"?"✓":"↩"}
      </button>
    `;
    listEl.appendChild(div);
  });
}

/* ===== 5分前 / 5分遅れ ===== */
setInterval(()=>{
  const todos = getTodos();
  const now = new Date();

  todos.forEach(t=>{
    if(!t.startTime || t.status==="done") return;
    const due = new Date(`${t.date}T${t.startTime}`);
    const diff = (due - now) / 60000;

    if(diff<=5 && diff>4 && !t.notifiedBefore){
      if(liff.isInClient()){
        liff.sendMessages([{ type:"text", text:`⏰ 5分前\n${t.title}` }]);
      }
      t.notifiedBefore = true;
    }

    if(diff<=-5 && diff>-6 && !t.notifiedAfter){
      if(liff.isInClient()){
        liff.sendMessages([{ type:"text", text:`⚠ 遅れています\n${t.title}` }]);
      }
      t.notifiedAfter = true;
    }
  });

  saveTodos(todos);
}, 60000);

render();






