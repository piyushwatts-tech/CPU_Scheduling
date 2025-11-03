// js/ui.js
// Handles DOM, state, event wiring. Uses Scheduler and Animator.

import { Scheduler } from './algorithms.js';
import { Animator } from './animation.js';

export class UI {
  constructor() {
    this.state = {
      processes: [],
      schedule: null,
      snapshots: [],
      stepIndex: 0,
      playing: false,
      rafId: null,
      speed: 1
    };

    // Elements
    this.E = {
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

    // Animator
    this.animator = new Animator({
      canvas: this.E.canvas,
      legendEl: this.E.legend,
      readyEl: this.E.readyQueue,
      cpuEl: this.E.cpuSlot,
      completedEl: this.E.completedList
    });

    this._bind();
    this._seedDemo();
  }

  _bind(){
    const E = this.E;

    E.addProc.addEventListener('click', ()=> this._addProcess());
    E.clearProcs.addEventListener('click', ()=> {
      if(!confirm('Clear all processes?')) return;
      this.state.processes = []; this._refreshTable();
    });
    E.seed.addEventListener('click', ()=> this._seedDemo());

    E.algorithm.addEventListener('change', ()=> {
      const algo = E.algorithm.value;
      E.quantumLabel.style.display = (algo==='RR' || algo==='MLQ') ? 'inline-block' : 'none';
      E.preemptLabel.style.display = (algo==='SJF' || algo==='PR') ? 'inline-block' : 'none';
      E.rrLabel.style.display = (algo==='SJF' || algo==='PR') ? 'inline-block' : 'none';
    });

    E.compute.addEventListener('click', ()=> {
      if(this.state.processes.length === 0) { alert('Add processes first'); return; }
      this._computeAndPrepare();
    });

    E.play.addEventListener('click', ()=> {
      if(!this.state.schedule) { alert('Compute first'); return; }
      this._startPlay();
    });
    E.pause.addEventListener('click', ()=> this._stopPlay());
    E.stepForward.addEventListener('click', ()=> this._gotoStep(this.state.stepIndex + 1));
    E.stepBack.addEventListener('click', ()=> this._gotoStep(this.state.stepIndex - 1));
    E.timeline.addEventListener('input', (e)=> this._gotoStep(Number(e.target.value)));
    E.speed.addEventListener('input', (e)=> this.state.speed = Number(e.target.value));
    E.exportPNG.addEventListener('click', ()=> {
      const url = this.E.canvas.toDataURL('image/png');
      const a = document.createElement('a'); a.href = url; a.download = 'gantt.png'; a.click();
    });
    E.exportTrace.addEventListener('click', ()=> {
      if(!this.state.schedule){ alert('Compute first'); return; }
      const trace = { processes: this.state.processes, schedule: this.state.schedule, snapshots: this.state.snapshots };
      const blob = new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'trace.json'; a.click();
      URL.revokeObjectURL(url);
    });

    E.themeToggle.addEventListener('change', (ev)=> {
      document.body.classList.toggle('light', ev.target.checked);
    });
  }

  _addProcess(){
    const E = this.E;
    const pid = E.pid.value.trim() || `P${this.state.processes.length+1}`;
    const arrival = Number(E.arrival.value) || 0;
    const burst = Number(E.burst.value) || 1;
    const priority = Number(E.priority.value) || 0;
    const mlqQueue = Number(E.mlqQueue.value) || 0;
    if(this.state.processes.some(p=>p.pid===pid)){ alert('PID must be unique'); return; }
    this.state.processes.push({ pid, arrival, burst, priority, mlqQueue });
    this._refreshTable();
    E.pid.value = `P${this.state.processes.length+1}`;
  }

  _refreshTable(){
    const tbody = this.E.procTableBody;
    tbody.innerHTML = '';
    this.state.processes.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.pid}</td><td>${p.arrival}</td><td>${p.burst}</td><td>${p.priority}</td><td>${p.mlqQueue}</td><td><button data-idx="${idx}" class="del">Delete</button></td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('button.del').forEach(b=>{
      b.addEventListener('click', e=>{
        const i = Number(e.currentTarget.dataset.idx);
        this.state.processes.splice(i,1);
        this._refreshTable();
      });
    });
  }

  _computeAndPrepare(){
    const algo = this.E.algorithm.value;
    const q = Number(this.E.quantum.value) || 2;
    const pre = this.E.preemptive.checked;
    const procs = this.state.processes.map(p => ({ pid: p.pid, arrival: p.arrival, burst: p.burst, priority: p.priority, mlqQueue: p.mlqQueue }));
    let result = null;
    if(algo === 'FCFS') result = Scheduler.computeFCFS(procs);
    else if(algo === 'SJF') result = Scheduler.computeSJF(procs, pre);
    else if(algo === 'RR') result = Scheduler.computeRR(procs, q);
    else if(algo === 'PR') result = Scheduler.computePriority(procs, pre);
    else if(algo === 'MLQ') result = Scheduler.computeMLQ(procs, q);

    this.state.schedule = result;
    this._buildSnapshots();
    this._renderStats();
    this._gotoStep(0);
  }

  _buildSnapshots(){
    const sched = this.state.schedule;
    const maxTime = sched.totalTime || 0;
    const snapshots = [];
    for(let t=0;t<=maxTime;t++){
      const runningSeg = sched.gantt.find(g=>g.start<=t && g.end>t);
      const ganttUntilT = sched.gantt.filter(g=>g.end<=t).map(g=>Object.assign({},g));
      if(runningSeg) ganttUntilT.push({ pid: runningSeg.pid, start: runningSeg.start, end: Math.min(runningSeg.end, t) });
      const completedPids = new Set(sched.gantt.filter(g=>g.end<=t).map(g=>g.pid));
      const arrived = this.state.processes.filter(p=>p.arrival<=t).map(p=>p.pid);
      const ready = arrived.filter(pid=>{
        if(completedPids.has(pid)) return false;
        const running = runningSeg && runningSeg.pid === pid;
        return !running;
      }).map(pid=>this.state.processes.find(p=>p.pid===pid));
      snapshots.push({
        currentTime: t,
        readyQueue: ready,
        running: runningSeg ? runningSeg.pid : null,
        gantt: ganttUntilT,
        completed: Array.from(completedPids),
        maxTime
      });
    }
    this.state.snapshots = snapshots;
    this.E.timeline.max = Math.max(0, snapshots.length-1);
    this.E.timeline.value = 0;
    this.E.stepBack.disabled = false;
    this.E.stepForward.disabled = false;
    this.E.pause.disabled = true;
    this.E.play.disabled = false;
  }

  _startPlay(){
    if(this.state.playing) return;
    this.state.playing = true;
    this.E.play.disabled = true;
    this.E.pause.disabled = false;
    let last = performance.now();
    const stepMs = Number(this.E.sliceMs.value) || 350;
    const speed = Number(this.E.speed.value) || 1;
    const loop = (now) => {
      const delta = (now - last) * speed;
      if(delta >= stepMs){
        last = now;
        if(this.state.stepIndex < this.state.snapshots.length - 1) this._gotoStep(this.state.stepIndex + 1);
        else { this._stopPlay(); return; }
      }
      this.state.rafId = requestAnimationFrame(loop);
    };
    this.state.rafId = requestAnimationFrame(loop);
  }

  _stopPlay(){
    this.state.playing = false;
    this.E.play.disabled = false;
    this.E.pause.disabled = true;
    if(this.state.rafId) cancelAnimationFrame(this.state.rafId);
    this.state.rafId = null;
  }

  _gotoStep(idx){
    if(!this.state.snapshots.length) return;
    idx = Math.max(0, Math.min(this.state.snapshots.length-1, idx));
    this.state.stepIndex = idx;
    this.E.timeline.value = idx;
    const snap = this.state.snapshots[idx];
    this.animator.drawGantt(snap, this.state.processes);
    this.animator.renderQueues(snap);
    this.E.stepBack.disabled = idx===0;
    this.E.stepForward.disabled = idx===this.state.snapshots.length - 1;
    document.querySelectorAll('.stat-currentTime').forEach(el=>el.remove());
    const el = document.createElement('div'); el.className = 'stat-currentTime'; el.textContent = `Current time: ${snap.currentTime}`;
    this.E.statsArea.prepend(el);
  }

  _renderStats(){
    if(!this.state.schedule){ this.E.statsArea.innerHTML = '<p>No schedule yet.</p>'; return; }
    const s = this.state.schedule;
    let html = '<table style="width:100%;font-size:13px"><thead><tr><th>PID</th><th>A</th><th>B</th><th>Start</th><th>Finish</th><th>Waiting</th><th>Turnaround</th></tr></thead><tbody>';
    let sumW=0, sumT=0, count = 0;
    for(const [pid, st] of s.stats){
      html += `<tr><td>${pid}</td><td>${st.arrival}</td><td>${st.burst}</td><td>${st.start===null?'-':st.start}</td><td>${st.finish===null?'-':st.finish}</td><td>${st.waiting===null?'-':st.waiting}</td><td>${st.turnaround===null?'-':st.turnaround}</td></tr>`;
      if(Number.isFinite(st.waiting)){ sumW += st.waiting; sumT += st.turnaround; count++; }
    }
    const avgW = count ? (sumW/count).toFixed(2) : '-';
    const avgT = count ? (sumT/count).toFixed(2) : '-';
    html += `</tbody></table>
      <p style="margin-top:8px">Avg waiting: <strong>${avgW}</strong> &nbsp; Avg turnaround: <strong>${avgT}</strong></p>
      <p>CPU Utilization: <strong>${s.cpuUtil.toFixed(2)}%</strong> &nbsp; Throughput: <strong>${s.throughput.toFixed(3)}</strong> &nbsp; Context switches: <strong>${s.contextSwitches}</strong></p>`;
    this.E.statsArea.innerHTML = html;
  }

  _seedDemo(){
    this.state.processes = [
      { pid: 'P1', arrival:0, burst:4, priority:1, mlqQueue:0 },
      { pid: 'P2', arrival:1, burst:3, priority:3, mlqQueue:0 },
      { pid: 'P3', arrival:2, burst:1, priority:2, mlqQueue:1 },
      { pid: 'P4', arrival:3, burst:2, priority:4, mlqQueue:1 }
    ];
    this._refreshTable();
  }
}
