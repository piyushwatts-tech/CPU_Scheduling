// js/animation.js
// Canvas drawing, legend building, and simple queue DOM rendering.

export class Animator {
  constructor({ canvas, legendEl, readyEl, cpuEl, completedEl }){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.legendEl = legendEl;
    this.readyEl = readyEl;
    this.cpuEl = cpuEl;
    this.completedEl = completedEl;
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', ()=> this.resize());
  }

  resize(){
    const w = this.canvas.clientWidth;
    this.canvas.width = w * this.devicePixelRatio;
    // Keep height 320 CSS pixels
    this.canvas.height = 320 * this.devicePixelRatio;
    this.ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
  }

  clear(){
    this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#010b13';
    this.ctx.fillRect(0,0, this.canvas.width/this.devicePixelRatio, this.canvas.height/this.devicePixelRatio);
  }

  drawGantt(snapshot, processes){
    this.clear();
    const padding = 40;
    const ganttY = 40;
    const height = 120;
    const maxT = snapshot.maxTime || 0;
    const width = this.canvas.width/this.devicePixelRatio - padding*2;
    const scale = maxT > 0 ? width / maxT : 1;

    this.ctx.fillStyle = '#a9c0c9';
    this.ctx.font = '12px sans-serif';
    for(let t=0;t<=maxT;t++){
      const x = padding + t*scale;
      this.ctx.fillRect(x, ganttY+height, 1, 10);
      this.ctx.fillText(String(t), x-6, ganttY+height+26);
    }

    const colors = this._colorMap(processes);
    snapshot.gantt.forEach(item=>{
      const x = padding + item.start * scale;
      const w = Math.max(1, (item.end - item.start) * scale);
      this.ctx.fillStyle = colors[item.pid] || '#2dd4bf';
      this.ctx.fillRect(x, ganttY, w, height);
      this.ctx.fillStyle = '#02141a';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.fillText(item.pid, x + 6, ganttY + 20);
    });

    // info
    this.ctx.fillStyle = '#e6eef7';
    this.ctx.font = '13px sans-serif';
    this.ctx.fillText('Time: ' + snapshot.currentTime, padding, ganttY+height+50);
    this.ctx.fillText('Running: ' + (snapshot.running || '—'), padding + 120, ganttY+height+50);

    this._buildLegend(colors);
  }

  _colorMap(processes){
    const map = {};
    const palette = ['#2dd4bf','#e76f51','#f4a261','#e9c46a','#264653','#9b5de5','#00b4d8','#ff6b6b','#7f5539'];
    processes.forEach((p, idx) => map[p.pid] = palette[idx % palette.length]);
    return map;
  }

  _buildLegend(colors){
    if(!this.legendEl) return;
    this.legendEl.innerHTML = '';
    Object.entries(colors).forEach(([pid, col])=>{
      const div = document.createElement('div');
      div.className = 'legend-item';
      div.innerHTML = `<span style="display:inline-block;width:16px;height:12px;background:${col};margin-right:6px;border-radius:3px;vertical-align:middle"></span><span style="color:var(--muted)">${pid}</span>`;
      this.legendEl.appendChild(div);
    });
  }

  // simple DOM-based queue rendering
  renderQueues(snapshot){
    // ready
    this.readyEl.innerHTML = '';
    snapshot.readyQueue.forEach(p=>{
      const c = document.createElement('div'); c.className = 'card'; c.textContent = p.pid;
      this.readyEl.appendChild(c);
    });
    // cpu
    this.cpuEl.textContent = snapshot.running || '—';
    // completed
    this.completedEl.innerHTML = '';
    snapshot.completed.forEach(pid=>{
      const c = document.createElement('div'); c.className = 'card'; c.textContent = pid;
      this.completedEl.appendChild(c);
    });
  }
}
