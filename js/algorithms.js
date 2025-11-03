// js/algorithms.js
// Pure algorithm implementations. Returns {gantt, stats, contextSwitches, totalTime, cpuBusy, cpuUtil, throughput}

export class Scheduler {
  static computeFCFS(procs) {
    const arr = [...procs].sort((a,b)=>a.arrival - b.arrival || a.pid.localeCompare(b.pid));
    let t = 0, gantt = [];
    for(const p of arr){
      if(t < p.arrival) t = p.arrival;
      gantt.push({ pid: p.pid, start: t, end: t + p.burst });
      t += p.burst;
    }
    return Scheduler._finalize(gantt, procs);
  }

  static computeSJF(procs, preempt = false){
    return preempt ? Scheduler._sjfPreemptive(procs) : Scheduler._sjfNonPreemptive(procs);
  }

  static _sjfNonPreemptive(procs){
    const notArr = [...procs].map(p=>Object.assign({}, p)).sort((a,b)=>a.arrival - b.arrival);
    let ready = [], t = 0, gantt = [];
    while(ready.length || notArr.length){
      while(notArr.length && notArr[0].arrival <= t) ready.push(notArr.shift());
      if(!ready.length){ t = notArr[0].arrival; continue; }
      ready.sort((a,b)=>a.burst - b.burst || a.arrival - b.arrival);
      const p = ready.shift();
      gantt.push({ pid: p.pid, start: t, end: t + p.burst });
      t += p.burst;
    }
    return Scheduler._finalize(gantt, procs);
  }

  static _sjfPreemptive(procs){
    const pcs = procs.map(p=>({ pid: p.pid, arrival: p.arrival, remaining: p.burst }));
    let t = 0, gantt = [];
    while(pcs.some(p=>p.remaining > 0)){
      const available = pcs.filter(p => p.arrival <= t && p.remaining > 0);
      if(!available.length){
        t = Math.min(...pcs.filter(p=>p.remaining>0).map(p=>p.arrival));
        continue;
      }
      available.sort((a,b)=>a.remaining - b.remaining || a.arrival - b.arrival);
      const cur = available[0];
      const start = t; t += 1; const end = t;
      if(gantt.length && gantt[gantt.length-1].pid === cur.pid && gantt[gantt.length-1].end === start){
        gantt[gantt.length-1].end = end;
      } else {
        gantt.push({ pid: cur.pid, start, end });
      }
      cur.remaining -= 1;
    }
    return Scheduler._finalize(gantt, procs);
  }

  static computeRR(procs, quantum = 2){
    const pcs = procs.map(p=>({ pid: p.pid, arrival: p.arrival, remaining: p.burst }));
    let t = 0, queue = [], gantt = [];
    while(pcs.some(p=>p.remaining>0)){
      pcs.filter(p=>p.arrival<=t && !p.inQueue && p.remaining>0).forEach(p=>{ queue.push(p); p.inQueue = true; });
      if(!queue.length){
        const next = pcs.find(p=>p.remaining>0 && !p.inQueue);
        t = next.arrival;
        pcs.filter(p=>p.arrival<=t && !p.inQueue && p.remaining>0).forEach(p=>{ queue.push(p); p.inQueue = true; });
      }
      const cur = queue.shift();
      const run = Math.min(cur.remaining, quantum);
      const start = t, end = t + run;
      gantt.push({ pid: cur.pid, start, end });
      cur.remaining -= run; t = end;
      pcs.filter(p=>p.arrival<=t && !p.inQueue && p.remaining>0).forEach(p=>{ queue.push(p); p.inQueue = true; });
      if(cur.remaining>0) queue.push(cur);
    }
    return Scheduler._finalize(gantt, procs);
  }

  static computePriority(procs, preempt = false){
    return preempt ? Scheduler._priorityPreemptive(procs) : Scheduler._priorityNonPreemptive(procs);
  }

  static _priorityNonPreemptive(procs){
    const notArr = [...procs].map(p=>Object.assign({},p)).sort((a,b)=>a.arrival - b.arrival);
    let ready = [], t = 0, gantt = [];
    while(ready.length || notArr.length){
      while(notArr.length && notArr[0].arrival <= t) ready.push(notArr.shift());
      if(!ready.length){ t = notArr[0].arrival; continue; }
      ready.sort((a,b)=>a.priority - b.priority || a.arrival - b.arrival);
      const p = ready.shift();
      gantt.push({ pid: p.pid, start: t, end: t + p.burst });
      t += p.burst;
    }
    return Scheduler._finalize(gantt, procs);
  }

  static _priorityPreemptive(procs){
    const pcs = procs.map(p=>({ pid: p.pid, arrival: p.arrival, remaining: p.burst, priority: p.priority }));
    let t = 0, gantt = [];
    while(pcs.some(p=>p.remaining>0)){
      const available = pcs.filter(p=>p.arrival<=t && p.remaining>0);
      if(!available.length){ t = Math.min(...pcs.filter(p=>p.remaining>0).map(p=>p.arrival)); continue; }
      available.sort((a,b)=>a.priority - b.priority || a.arrival - b.arrival);
      const cur = available[0];
      const start = t; t += 1; const end = t;
      if(gantt.length && gantt[gantt.length-1].pid === cur.pid && gantt[gantt.length-1].end === start){
        gantt[gantt.length-1].end = end;
      } else {
        gantt.push({ pid: cur.pid, start, end });
      }
      cur.remaining -= 1;
    }
    return Scheduler._finalize(gantt, procs);
  }

  static computeMLQ(procs, quantum = 2){
    const q0 = procs.filter(p=>p.mlqQueue===0).map(p=>({ pid:p.pid, arrival:p.arrival, remaining:p.burst }));
    const q1 = procs.filter(p=>p.mlqQueue===1).map(p=>({ pid:p.pid, arrival:p.arrival, remaining:p.burst }));
    let t = 0, gantt = [];
    while(q0.some(p=>p.remaining>0) || q1.some(p=>p.remaining>0)){
      const available0 = q0.filter(p=>p.arrival<=t && p.remaining>0);
      if(available0.length){
        const cur = available0.shift();
        const run = Math.min(cur.remaining, quantum);
        const start = t, end = t + run;
        gantt.push({ pid: cur.pid, start, end });
        cur.remaining -= run; t = end;
        // keep cur's arrival small so it can be reselected if remaining
        cur.arrival = start;
      } else {
        const avail1 = q1.filter(p=>p.arrival<=t && p.remaining>0).sort((a,b)=>a.arrival - b.arrival);
        if(!avail1.length){
          const nextTimes = [...q0, ...q1].filter(p=>p.remaining>0).map(p=>p.arrival);
          if(nextTimes.length===0) break;
          t = Math.min(...nextTimes); continue;
        }
        const cur = avail1[0];
        const start = t, end = t + cur.remaining;
        gantt.push({ pid: cur.pid, start, end });
        cur.remaining = 0; t = end;
      }
    }
    return Scheduler._finalize(gantt, procs);
  }

  static _finalize(gantt, originalProcs){
    const stats = new Map();
    const byPid = {};
    for(const p of originalProcs) byPid[p.pid] = { arrival: p.arrival, burst: p.burst };
    for(const pid in byPid){
      const arr = gantt.filter(g=>g.pid===pid);
      if(arr.length===0){
        stats.set(pid, { arrival: byPid[pid].arrival, burst: byPid[pid].burst, start:null, finish:null, waiting:null, turnaround:null });
        continue;
      }
      const start = arr[0].start;
      const finish = arr[arr.length-1].end;
      const turnaround = finish - byPid[pid].arrival;
      const waiting = turnaround - byPid[pid].burst;
      stats.set(pid, { arrival: byPid[pid].arrival, burst: byPid[pid].burst, start, finish, waiting, turnaround });
    }
    let ctxSwitches = 0;
    for(let i=1;i<gantt.length;i++) if(gantt[i].pid !== gantt[i-1].pid) ctxSwitches++;
    const totalTime = gantt.length ? Math.max(...gantt.map(g=>g.end)) : 0;
    const cpuBusy = Object.values(byPid).reduce((s,v)=>s+v.burst,0);
    const cpuUtil = totalTime > 0 ? (cpuBusy/totalTime)*100 : 0;
    const throughput = totalTime > 0 ? Object.keys(byPid).length / totalTime : 0;
    return { gantt, stats, contextSwitches: ctxSwitches, totalTime, cpuBusy, cpuUtil, throughput };
  }
}
