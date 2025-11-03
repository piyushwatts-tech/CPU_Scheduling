// app.js — Advanced Scheduling Visualizer
// No modules so <script> without type=module is fine.

class Process {
  constructor(pid, arrival, burst, priority=0, mlqQueue=0) {
    this.pid = pid;
    this.arrival = Number(arrival);
    this.burst = Number(burst);
    this.remaining = Number(burst);
    this.priority = Number(priority);
    this.mlqQueue = Number(mlqQueue);
    this.start = null;
    this.finish = null;
  }
}

class Scheduler {
  // Returns {gantt: [{pid,start,end}], stats: Map, contextSwitches}
  static computeFCFS(procs) {
    const arr = [...procs].sort((a,b)=>a.arrival - b.arrival || a.pid.localeCompare(b.pid));
    let t=0, gantt=[];
    for(const p of arr){
      if(t < p.arrival) t = p.arrival;
      gantt.push({pid:p.pid, start:t, end:t+p.burst});
      t += p.burst;
    }
    return Scheduler._finalize(gantt, procs);
  }

  static computeSJF(procs, preempt=false) {
    if(!preempt) return Scheduler._sjfNonPreemptive(procs);
    return Scheduler._sjfPreemptive(procs);
  }

  static _sjfNonPreemptive(procs){
    const notArr = [...procs].map(p=>Object.assign({},p)).sort((a,b)=>a.arrival-b.arrival);
    let ready = [], t=0, gantt=[];
    while(ready.length || notArr.length){
      while(notArr.length && notArr[0].arrival <= t) ready.push(notArr.shift());
      if(!ready.length){ t = notArr[0].arrival; continue; }
      ready.sort((a,b)=>a.burst - b.burst || a.arrival - b.arrival);
      const p = ready.shift();
      gantt.push({pid:p.pid, start:t, end:t+p.burst});
      t += p.burst;
    }
    return Scheduler._finalize(gantt, procs);
  }

  static _sjfPreemptive(procs){
    const pcs = procs.map(p=>({pid:p.pid, arrival:p.arrival, remaining:p.burst}));
    let t=0, gantt=[], lastPid=null;
    while(pcs.some(p=>p.remaining>0)){
      const available = pcs.filter(p=>p.arrival<=t && p.remaining>0);
      if(!available.length){
        t = Math.min(...pcs.filter(p=>p.remaining>0).map(p=>p.arrival));
        continue;
      }
      available.sort((a,b)=>a.remaining - b.remaining || a.arrival - b.arrival);
      const cur = available[0];
      // run 1 time unit (granularity)
      const start = t;
      t += 1;
      const end = t;
      if(gantt.length && gantt[gantt.length-1].pid === cur.pid && gantt[gantt.length-1].end === start){
        gantt[gantt.length-1].end = end;
      } else {
        gantt.push({pid:cur.pid, start, end});
      }
      cur.remaining -= 1;
    }
    return Scheduler._finalize(gantt, procs);
  }

  static computeRR(procs, quantum=2) {
    const pcs = procs.map(p=>({pid:p.pid, arrival:p.arrival, remaining:p.burst}));
    let t=0, queue=[], gantt=[];
    while(pcs.some(p=>p.remaining>0)){
      pcs.filter(p=>p.arrival<=t && !p.inQueue && p.remaining>0).forEach(p=>{ queue.push(p); p.inQueue=true; });
      if(!queue.length){
        const next = pcs.find(p=>p.remaining>0 && !p.inQueue);
        t = next.arrival;
        pcs.filter(p=>p.arrival<=t && !p.inQueue && p.remaining>0).forEach(p=>{ queue.push(p); p.inQueue=true; });
      }
      const cur = queue.shift();
      const run = Math.min(cur.remaining, quantum);
      const start = t, end = t+run;
      gantt.push({pid:cur.pid, start, end});
      cur.remaining -= run; t = end;
      pcs.filter(p=>p.arrival<=t && !p.inQueue && p.remaining>0).forEach(p=>{ queue.push(p); p.inQueue=true; });
      if(cur.remaining>0) queue.push(cur);
    }
    return Scheduler._finalize(gantt, procs);
  }

  static computePriority(procs, preempt=false) {
    if(!preempt) return Scheduler._priorityNonPreemptive(procs);
    return Scheduler._priorityPreemptive(procs);
  }

  static _priorityNonPreemptive(procs){
    const notArr = [...procs].map(p=>Object.assign({},p)).sort((a,b)=>a.arrival-b.arrival);
    let ready=[], t=0, gantt=[];
    while(ready.length || notArr.length){
      while(notArr.length && notArr[0].arrival<=t) ready.push(notArr.shift());
      if(!ready.length){ t = notArr[0].arrival; continue; }
      ready.sort((a,b)=>a.priority - b.priority || a.arrival - b.arrival);
      const p = ready.shift();
      gantt.push({pid:p.pid, start:t, end:t+p.burst});
      t += p.burst;
    }
    return Scheduler._finalize(gantt, procs);
  }

  static _priorityPreemptive(procs){
    const pcs = procs.map(p=>({pid:p.pid, arrival:p.arrival, remaining:p.burst, priority:p.priority}));
    let t=0, gantt=[];
    while(pcs.some(p=>p.remaining>0)){
      const available = pcs.filter(p=>p.arrival<=t && p.remaining>0);
      if(!available.length){ t = Math.min(...pcs.filter(p=>p.remaining>0).map(p=>p.arrival)); continue; }
      available.sort((a,b)=>a.priority - b.priority || a.arrival - b.arrival);
      const cur = available[0];
      // run 1 unit
      const start = t; t += 1; const end = t;
      if(gantt.length && gantt[gantt.length-1].pid === cur.pid && gantt[gantt.length-1].end === start){
        gantt[gantt.length-1].end = end;
      } else {
        gantt.push({pid:cur.pid, start, end});
      }
      cur.remaining -= 1;
    }
    return Scheduler._finalize(gantt, procs);
  }

  static computeMLQ(procs, quantum=2) {
    // Two-level MLQ:
    // Queue 0: foreground — Round Robin (interactive) with quantum
    // Queue 1: background — FCFS
    // Priority: foreground served before background (no aging here)
    const q0 = procs.filter(p=>p.mlqQueue===0).map(p=>({pid:p.pid, arrival:p.arrival, remaining:p.burst}));
    const q1 = procs.filter(p=>p.mlqQueue===1).map(p=>({pid:p.pid, arrival:p.arrival, remaining:p.burst}));
    let t=0, gantt=[];
    // Serve until all done
    while(q0.some(p=>p.remaining>0) || q1.some(p=>p.remaining>0)){
      // serve foreground RR until empty at current time
      // enqueue q0 arrivals
      // If q0 has available, run RR quantum; else run q1 FCFS
      const available0 = q0.filter(p=>p.arrival<=t && p.remaining>0);
      if(available0.length){
        // Round robin among available
        // simple approach: take smallest arrival order, run one quantum
        const cur = available0.shift();
        const run = Math.min(cur.remaining, quantum);
        const start = t; const end = t+run;
        gantt.push({pid:cur.pid, start, end});
        cur.remaining -= run; t = end;
        // in absence of strict queue structure we reinsert cur with same arrival to be considered again
        // but we must ensure other arrivals are considered
        // Update arrival so that newly arrived will be <=t
        cur.arrival = start; // keep it available for subsequent cycles if remaining
      } else {
        // no foreground ready, serve background FCFS
        const avail1 = q1.filter(p=>p.arrival<=t && p.remaining>0).sort((a,b)=>a.arrival - b.arrival);
        if(!avail1.length){
          // jump to next arrival
          const nextTimes = [...q0, ...q1].filter(p=>p.remaining>0).map(p=>p.arrival);
          if(nextTimes.length===0) break;
          t = Math.min(...nextTimes);
          continue;
        }
        const cur = avail1[0];
        const start = t; const end = t + cur.remaining;
        gantt.push({pid:cur.pid, start, end});
        cur.remaining = 0; t = end;
      }
    }
    return Scheduler._finalize(gantt, procs);
  }

  static _finalize(gantt, originalProcs){
    const stats = new Map();
    const byPid = {};
    for(const p of originalProcs) byPid[p.pid] = {arrival:p.arrival, burst:p.burst};
    for(const pid in byPid){
      const arr = gantt.filter(g=>g.pid===pid);
      if(arr.length===0){
        stats.set(pid, {arrival:byPid[pid].arrival, burst:byPid[pid].burst, start:null, finish:null, waiting:null, turnaround:null});
        continue;
      }
      const start = arr[0].start;
      const finish = arr[arr.length-1].end;
      const turnaround = finish - byPid[pid].arrival;
      const waiting = turnaround - byPid[pid].burst;
      stats.set(pid, {arrival:byPid[pid].arrival, burst:byPid[pid].burst, start, finish, waiting, turnaround});
    }
    // context switches: count transitions between different pid in gantt list
    let ctxSwitches = 0;
    for(let i=1;i<gantt.length;i++) if(gantt[i].pid !== gantt[i-1].pid) ctxSwitches++;
    const totalTime = gantt.length? Math.max(...gantt.map(g=>g.end)) : 0;
    // CPU busy time is sum of burst lengths (original)
    const cpuBusy = Object.values(byPid).reduce((s,v)=>s+v.burst,0);
    const cpuUtil = totalTime>0 ? (cpuBusy/totalTime)*100 : 0;
    const throughput = totalTime>0 ? Object.keys(byPid).length / totalTime : 0;
    return {gantt, stats, contextSwitches: ctxSwitches, totalTime, cpuBusy, cpuUtil, throughput};
  }
}

/* ---------------- App State & Elements ---------------- */
const state = {
  processes: [],
  schedule: null,
  snapshots: [],
  stepIndex: 0,
  playing: false,
  rafId: null,
  speed: 1,
  sliceMs: 350
};

const E = {
  pid: document.getElementById('pid'),
  arrival: document.getElementById('arrival'),
  burst: document.getElementById('burst'),
  priority: document.getElementById('priority'),
  mlqQueue: document.getElementById('mlqQueue'),
  addProc: document.getElementById('addProc'),
  clearProcs: document.getElementById('clearProcs'),
  seed: document.getElementById('seed'),
  procTableBody: document.querySelector('#procTable tbody'),
  algorithm: document.getElementById('algorithm'),
  quantumLabel: document.getElementById('quantumLabel'),
  quantum: document.getElementById('quantum'),
  preemptive: document.getElementById('preemptive'),
  preemptLabel: document.getElementById('preemptLabel'),
  rrLabel: document.getElementById('rrLabel'),
  sliceMs: document.getElementById('sliceMs'),
  compute: document.getElementById('compute'),
  play: document.getElementById('play'),
  pause: document.getElementById('pause'),
  stepBack: document.getElementById('stepBack'),
  stepForward: document.getElementById('stepForward'),
  speed: document.getElementById('speed'),
  timeline: document.getElementById('timeline'),
  statsArea: document.getElementById('statsArea'),
  exportPNG: document.getElementById('exportPNG'),
  exportTrace: document.getElementById('exportTrace'),
  canvas: document.getElementById('gantt'),
  legend: document.getElementById('legend'),
  readyQueue: document.getElementById('readyQueue'),
  cpuSlot: document.getElementById('cpuSlot'),
  completedList: document.getElementById('completedList'),
  themeToggle: document.getElementById('themeToggle')
};

const ctx = E.canvas.getContext('2d');

/* ---------------- UI Helpers ---------------- */
function refreshProcTable(){
  const tbody = E.procTableBody;
  tbody.innerHTML = '';
  state.processes.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.pid}</td><td>${p.arrival}</td><td>${p.burst}</td><td>${p.priority}</td><td>${p.mlqQueue}</td>
      <td><button data-idx="${idx}" class="del">Delete</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button.del').forEach(b=>{
    b.addEventListener('click', e=>{
      const i = Number(e.currentTarget.dataset.idx);
      state.processes.splice(i,1);
      refreshProcTable();
    });
  });
}

/* ---------------- Input Handlers ---------------- */
E.addProc.addEventListener('click', ()=>{
  const pid = E.pid.value.trim() || `P${state.processes.length+1}`;
  const arrival = Number(E.arrival.value) || 0;
  const burst = Number(E.burst.value) || 1;
  const priority = Number(E.priority.value) || 0;
  const mlqQueue = Number(E.mlqQueue.value) || 0;
  if(state.processes.some(p=>p.pid===pid)){ alert('PID must be unique'); return; }
  state.processes.push(new Process(pid, arrival, burst, priority, mlqQueue));
  refreshProcTable();
  E.pid.value = `P${state.processes.length+1}`;
});

E.clearProcs.addEventListener('click', ()=>{
  if(!confirm('Clear all processes?')) return;
  state.processes = []; refreshProcTable();
});

E.seed.addEventListener('click', ()=>{
  state.processes = [
    new Process('P1',0,4,1,0),
    new Process('P2',1,3,3,0),
    new Process('P3',2,1,2,1),
    new Process('P4',3,2,4,1),
  ];
  refreshProcTable();
});

/* Algorithm options visibility */
E.algorithm.addEventListener('change', ()=>{
  const algo = E.algorithm.value;
  E.quantumLabel.style.display = (algo==='RR' || algo==='MLQ') ? 'inline-block' : 'none';
  E.preemptLabel.style.display = (algo==='SJF' || algo==='PR') ? 'inline-block' : 'none';
  E.rrLabel.style.display = (algo==='SJF' || algo==='PR') ? 'inline-block' : 'none';
});

/* Compute & snapshot builder */
E.compute.addEventListener('click', ()=> {
  if(state.processes.length===0){ alert('Add processes first'); return; }
  computeAndPrepare();
});

function computeAndPrepare(){
  const algo = E.algorithm.value;
  const q = Number(E.quantum.value) || 2;
  const pre = E.preemptive.checked;
  let result = null;
  const procs = state.processes.map(p=>({pid:p.pid, arrival:p.arrival, burst:p.burst, priority:p.priority, mlqQueue:p.mlqQueue}));

  if(algo==='FCFS') result = Scheduler.computeFCFS(procs);
  else if(algo==='SJF') result = Scheduler.computeSJF(procs, pre);
  else if(algo==='RR') result = Scheduler.computeRR(procs, q);
  else if(algo==='PR') result = Scheduler.computePriority(procs, pre);
  else if(algo==='MLQ') result = Scheduler.computeMLQ(procs, q);

  state.schedule = result;
  buildSnapshots();
  renderStats();
  gotoStep(0);
}

function buildSnapshots(){
  const sched = state.schedule;
  const maxTime = sched.totalTime || 0;
  const snapshots = [];
  for(let t=0;t<=maxTime;t++){
    const runningSeg = sched.gantt.find(g=>g.start<=t && g.end>t);
    const ganttUntilT = sched.gantt.filter(g=>g.end<=t).map(g=>Object.assign({},g));
    if(runningSeg) ganttUntilT.push({pid:runningSeg.pid, start:runningSeg.start, end:Math.min(runningSeg.end,t)});
    // ready = arrived & not completed & not running (presence in ganttUntilT)
    const completedPids = new Set(sched.gantt.filter(g=>g.end<=t).map(g=>g.pid));
    const arrived = state.processes.filter(p=>p.arrival<=t).map(p=>p.pid);
    const ready = arrived.filter(pid=>{
      if(completedPids.has(pid)) return false;
      const running = runningSeg && runningSeg.pid === pid;
      return !running;
    }).map(pid=>state.processes.find(p=>p.pid===pid));
    snapshots.push({
      currentTime: t,
      readyQueue: ready,
      running: runningSeg ? runningSeg.pid : null,
      gantt: ganttUntilT,
      completed: Array.from(completedPids),
      maxTime
    });
  }
  state.snapshots = snapshots;
  E.timeline.max = Math.max(0, snapshots.length-1);
  E.timeline.value = 0;
  E.stepBack.disabled = false;
  E.stepForward.disabled = false;
  E.pause.disabled = true;
  E.play.disabled = false;
}

/* Rendering gantt & legend */
function clearCanvas(){ ctx.clearRect(0,0,E.canvas.width,E.canvas.height); ctx.fillStyle='#010b13'; ctx.fillRect(0,0,E.canvas.width,E.canvas.height); }
function drawGantt(snapshot){
  clearCanvas();
  const padding = 40; const height = 120; const ganttY = 40;
  const maxT = snapshot.maxTime || 0; const width = E.canvas.width - padding*2;
  const scale = maxT>0 ? width/maxT : 1;
  ctx.fillStyle='#a9c0c9'; ctx.font='12px sans-serif';
  for(let t=0;t<=maxT;t++){
    const x = padding + t*scale;
    ctx.fillRect(x, ganttY+height, 1, 10);
    if(t%1===0) ctx.fillText(String(t), x-6, ganttY+height+26);
  }
  const colors = buildColorMap(state.processes);
  snapshot.gantt.forEach(item=>{
    const x = padding + item.start*scale; const w = Math.max(1, (item.end-item.start)*scale);
    ctx.fillStyle = colors[item.pid] || '#2dd4bf';
    ctx.fillRect(x, ganttY, w, height);
    ctx.fillStyle = '#02141a'; ctx.font='bold 13px sans-serif';
    ctx.fillText(item.pid, x+6, ganttY+20);
  });
  buildLegend(colors);
  // draw current time & running
  ctx.fillStyle = '#e6eef7'; ctx.font='13px sans-serif';
  ctx.fillText('Time: ' + snapshot.currentTime, padding, ganttY+height+50);
  ctx.fillText('Running: ' + (snapshot.running || '—'), padding+120, ganttY+height+50);
}

function buildColorMap(procs){
  const map={}; const palette=['#2dd4bf','#e76f51','#f4a261','#e9c46a','#264653','#9b5de5','#00b4d8','#ff6b6b','#7f5539'];
  procs.forEach((p,idx)=> map[p.pid] = palette[idx % palette.length]);
  return map;
}

function buildLegend(colors){
  E.legend.innerHTML = '';
  Object.entries(colors).forEach(([pid,col])=>{
    const el = document.createElement('div'); el.className='legend-item';
    el.innerHTML = `<span style="display:inline-block;width:16px;height:12px;background:${col};margin-right:6px;border-radius:3px;vertical-align:middle"></span><span style="color:var(--muted)">${pid}</span>`;
    E.legend.appendChild(el);
  });
}

/* Queue animations (simple DOM card movement) */
function renderQueues(snapshot){
  E.readyQueue.innerHTML = '';
  snapshot.readyQueue.forEach(p=>{
    const c = document.createElement('div'); c.className='card'; c.textContent = `${p.pid}`;
    E.readyQueue.appendChild(c);
  });
  E.cpuSlot.textContent = snapshot.running || '—';
  E.completedList.innerHTML = '';
  snapshot.completed.forEach(pid=>{
    const c = document.createElement('div'); c.className='card'; c.textContent = pid;
    E.completedList.appendChild(c);
  });
}

/* Snapshot stepping & play */
function gotoStep(idx){
  if(!state.snapshots.length) return;
  idx = Math.max(0, Math.min(state.snapshots.length-1, idx));
  state.stepIndex = idx;
  E.timeline.value = idx;
  const snap = state.snapshots[idx];
  drawGantt(snap);
  renderQueues(snap);
  E.stepBack.disabled = idx===0;
  E.stepForward.disabled = idx===state.snapshots.length-1;
  // update stats current time
  document.querySelectorAll('.stat-currentTime').forEach(el=>el.remove());
  const el = document.createElement('div'); el.className='stat-currentTime'; el.textContent = `Current time: ${snap.currentTime}`;
  E.statsArea.prepend(el);
}

E.stepForward.addEventListener('click', ()=>{ if(state.snapshots.length) gotoStep(state.stepIndex+1); });
E.stepBack.addEventListener('click', ()=>{ if(state.snapshots.length) gotoStep(state.stepIndex-1); });

E.play.addEventListener('click', ()=>{ if(!state.schedule){ alert('Compute first'); return; } startPlay(); });
E.pause.addEventListener('click', stopPlay);

function startPlay(){
  if(state.playing) return;
  state.playing = true; E.play.disabled = true; E.pause.disabled = false;
  let last = performance.now();
  const speed = Number(E.speed.value) || 1;
  const stepMs = Number(E.sliceMs.value) || 350;
  function loop(now){
    const delta = (now - last) * speed;
    if(delta >= stepMs){
      last = now;
      if(state.stepIndex < state.snapshots.length - 1) gotoStep(state.stepIndex + 1);
      else { stopPlay(); return; }
    }
    state.rafId = requestAnimationFrame(loop);
  }
  state.rafId = requestAnimationFrame(loop);
}
function stopPlay(){ state.playing=false; E.play.disabled=false; E.pause.disabled=true; if(state.rafId) cancelAnimationFrame(state.rafId); state.rafId=null; }

/* Timeline */
E.timeline.addEventListener('input', (e)=> gotoStep(Number(e.target.value)));

/* Speed */
E.speed.addEventListener('input', (e)=> state.speed = Number(e.target.value));

/* Exports */
E.exportPNG.addEventListener('click', ()=>{
  const url = E.canvas.toDataURL('image/png');
  const a = document.createElement('a'); a.href = url; a.download = 'gantt.png'; a.click();
});

E.exportTrace.addEventListener('click', ()=>{
  if(!state.schedule){ alert('Compute first'); return; }
  const trace = {processes: state.processes, schedule: state.schedule, snapshots: state.snapshots};
  const blob = new Blob([JSON.stringify(trace,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download='trace.json'; a.click();
  URL.revokeObjectURL(url);
});

/* Stats rendering */
function renderStats(){
  if(!state.schedule){ E.statsArea.innerHTML='<p>No schedule yet.</p>'; return; }
  const s = state.schedule;
  let html = '<table style="width:100%;font-size:13px"><thead><tr><th>PID</th><th>A</th><th>B</th><th>Start</th><th>Finish</th><th>Waiting</th><th>Turnaround</th></tr></thead><tbody>';
  let sumW=0,sumT=0,count=0;
  for(const [pid, st] of s.stats){
    html += `<tr><td>${pid}</td><td>${st.arrival}</td><td>${st.burst}</td><td>${st.start===null?'-':st.start}</td><td>${st.finish===null?'-':st.finish}</td><td>${st.waiting===null?'-':st.waiting}</td><td>${st.turnaround===null?'-':st.turnaround}</td></tr>`;
    if(Number.isFinite(st.waiting)){ sumW+=st.waiting; sumT+=st.turnaround; count++; }
  }
  const avgW = count? (sumW/count).toFixed(2): '-';
  const avgT = count? (sumT/count).toFixed(2): '-';
  html += `</tbody></table>
    <p style="margin-top:8px">Avg waiting: <strong>${avgW}</strong> &nbsp; Avg turnaround: <strong>${avgT}</strong></p>
    <p>CPU Utilization: <strong>${s.cpuUtil.toFixed(2)}%</strong> &nbsp; Throughput: <strong>${s.throughput.toFixed(3)}</strong> &nbsp; Context switches: <strong>${s.contextSwitches}</strong></p>`;
  E.statsArea.innerHTML = html;
}

/* Theme toggle */
E.themeToggle.addEventListener('change', (e)=>{
  document.body.classList.toggle('light', e.target.checked);
});

/* Resize canvas to parent width */
function resizeCanvas(){
  E.canvas.width = E.canvas.clientWidth * devicePixelRatio;
  E.canvas.height = 320 * devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  if(state.snapshots.length) gotoStep(state.stepIndex);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* Initialize demo */
function seedDemo(){
  state.processes = [
    new Process('P1',0,4,1,0),
    new Process('P2',1,3,3,0),
    new Process('P3',2,1,2,1),
    new Process('P4',3,2,4,1),
  ];
  refreshProcTable();
}
seedDemo();
