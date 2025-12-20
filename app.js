let userId = "";
const STORAGE_KEY = "todos";
let currentFilter = "all";

/* ===== LIFF 初期化 ===== */
window.addEventListener("load", async () => {
  await liff.init({ liffId: "2008726714-eZTej71E" });
  userId = liff.getContext().userId || "local_user";

  document.getElementById("addBtn").addEventListener("click", addTodo);

  render();
  setInterval(drawClock, 1000); // 時計更新
});

/* ===== Storage ===== */
const getTodos = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTodos = (todos) => localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));

/* ===== util ===== */
function nowHHMM() { return new Date().toTimeString().slice(0,5); }
function dayOfWeek(dateStr) {
  const days = ["日","月","火","水","木","金","土"];
  return days[new Date(dateStr).getDay()];
}

/* ===== タスク追加 ===== */
function addTodo() {
  const title = document.getElementById("title").value;
  const date = document.getElementById("date").value;
  const startTime = document.getElementById("startTime").value;
  if (!title || !date) return;

  const todos = getTodos();
  const todo = {
    id: Date.now().toString(),
    userId,
    title,
    date,
    startTime,
    status: "todo",
    notifiedBefore: false,
    notifiedLate: false,
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null
  };
  todos.push(todo);
  saveTodos(todos);

  // Worker に送信
  fetch("https://empty-haze-29be.kanikani34423.workers.dev", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(todo)
  });

  document.getElementById("title").value="";
  render();
}

/* ===== フィルタ ===== */
function setFilter(filter) { currentFilter = filter; render(); }

/* ===== 状態変更 ===== */
function changeStatus(index){
  const todos = getTodos();
  const todo = todos[index];

  if(todo.status==="todo"){ todo.status="doing"; todo.startedAt=Date.now(); }
  else if(todo.status==="doing"){ todo.status="done"; todo.endedAt=Date.now(); }
  else { todo.status="todo"; todo.notifiedBefore=false; todo.notifiedLate=false; }

  saveTodos(todos);
  render();
}

/* ===== 描画 ===== */
function render(){
  const list = document.getElementById("list");
  list.innerHTML="";
  let todos = getTodos();

  todos.sort((a,b)=>{
    if(a.status==="doing"&&b.status!=="doing") return -1;
    if(a.status!=="doing"&&b.status==="doing") return 1;
    return a.createdAt - b.createdAt;
  });

  if(currentFilter!=="all") todos = todos.filter(t=>t.status===currentFilter);
  if(!todos.length){ list.innerHTML="<p style='text-align:center;'>ToDoなし</p>"; return; }

  const now = nowHHMM();
  todos.forEach((todo,i)=>{
    const div = document.createElement("div");
    div.className=`todo ${todo.status}`;
    if(todo.status==="todo" && todo.startTime && todo.startTime<now) div.classList.add("late");
    if(todo.status==="doing" && todo.startedAt && Date.now()-todo.startedAt>60*60*1000) div.classList.add("over");

    let duration="";
    if(todo.startedAt && todo.endedAt){
      const min = Math.floor((todo.endedAt - todo.startedAt)/60000);
      duration = ` ⏱${min}分`;
    }

    div.innerHTML=`
      <div>
        <div class="todo-text">${todo.title}</div>
        <div class="todo-time">${todo.date}(${dayOfWeek(todo.date)}) ${todo.startTime || ""}${duration}</div>
      </div>
      <button onclick="changeStatus(${i})">${todo.status==="todo"?"▶":todo.status==="doing"?"✓":"↩"}</button>
    `;
    list.appendChild(div);
  });
}

/* ===== アナログ時計 & 今やること ===== */
const canvas = document.getElementById("analogClock");
const ctx = canvas.getContext("2d");
const radius = canvas.width / 2;
ctx.translate(radius, radius);

function drawClock() {
  ctx.clearRect(-radius, -radius, canvas.width, canvas.height);
  drawFace();
  drawHands();
}

function drawFace() {
  ctx.beginPath();
  ctx.arc(0, 0, radius - 5, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.font = `${radius * 0.15}px Arial`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for(let num = 1; num <= 12; num++){
    const ang = num * Math.PI / 6;
    const x = Math.sin(ang) * (radius - 25);
    const y = -Math.cos(ang) * (radius - 25);
    ctx.fillStyle = "#000";
    ctx.fillText(num, x, y);
  }
}

function drawHands() {
  const now = new Date();
  const hour = now.getHours() % 12;
  const minute = now.getMinutes();
  const second = now.getSeconds();

  drawHand((hour + minute/60) * Math.PI/6, radius*0.5, 6);
  drawHand((minute + second/60) * Math.PI/30, radius*0.7, 4);
  drawHand(second * Math.PI/30, radius*0.85, 2, "red");

  updateTasks(now.getHours());
}

function drawHand(pos, length, width, color="#000"){
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.moveTo(0,0);
  ctx.rotate(pos);
  ctx.lineTo(0, -length);
  ctx.stroke();
  ctx.rotate(-pos);
}

function updateTasks(currentHour){
  const tasksList = document.getElementById("tasksList");
  tasksList.innerHTML = "";

  const todos = getTodos();
  const filtered = todos.filter(t=>{
    const taskHour = parseInt(t.startTime?.split(":")[0]);
    return (!t.status || t.status!=="done") && taskHour === currentHour;
  });

  filtered.forEach(t=>{
    const li = document.createElement("li");
    li.textContent = t.title;
    tasksList.appendChild(li);
  });
}
