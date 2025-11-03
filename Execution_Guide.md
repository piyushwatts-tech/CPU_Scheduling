2. **Open in Visual Studio Code.**  
3. Install the **Live Server** extension (by *Ritwick Dey*).  
4. Right-click on `index.html` → **Open with Live Server**.  
- Alternatively, open a terminal in the folder and run:  
  ```
  python -m http.server 5500
  ```
- Then visit: `http://localhost:5500`

✅ The application opens in your default browser.  
No internet or backend server required.

---

## 🧠 Supported Algorithms

| Category | Algorithm | Notes |
|-----------|------------|-------|
| **CPU Scheduling** | FCFS | Non-preemptive |
| | SJF | Preemptive / Non-preemptive |
| | Round Robin | Configurable quantum |
| | Priority | Preemptive / Non-preemptive |
| | Multilevel Queue | Foreground (RR) + Background (FCFS) |

---

## 🕹️ User Interface Guide

### ➤ Process Input Panel
- **PID** – Unique process ID (e.g., P1, P2).  
- **Arrival** – Arrival time (integer ≥ 0).  
- **Burst** – CPU burst time (integer ≥ 1).  
- **Priority** – Lower value = higher priority.  
- **Queue (MLQ)** – Choose `0` (foreground) or `1` (background).  
- Buttons:  
- **Add** – Add process to list.  
- **Clear** – Reset all.  
- **Load Demo** – Load sample data.

### ➤ Algorithm & Controls
- **Algorithm Dropdown** – Select one of the scheduling types.  
- **Quantum** – Time slice (for RR/MLQ).  
- **Preemptive Toggle** – For SJF or Priority algorithms.  
- **Compute** – Generate schedule and metrics.  
- **Play / Pause / Step** – Control animation playback.  
- **Speed Slider** – Control animation speed.  
- **Timeline Slider** – Jump to any execution time.

---

## 🧭 Animation & Visualization
- **Gantt Chart:**  
Displays real-time CPU execution timeline (Canvas).  
Each process has a unique color bar.  

- **Queues (Bottom Section):**  
- **Ready Queue** – Processes waiting for CPU.  
- **CPU Slot** – Currently executing process.  
- **Completed** – Finished processes.

- **Theme Toggle:**  
Switch between **Dark** and **Light** mode using the toggle at top-right.

---

## 📈 Metrics & Statistics
Displayed in the **Metrics Panel:**
- Start, Finish, Waiting, and Turnaround Time (per process)  
- **Average Waiting Time**  
- **Average Turnaround Time**  
- **CPU Utilization (%)**  
- **Throughput (Processes / Time Unit)**  
- **Context Switch Count**

---

## 📤 Export Options
| Button | Function |
|---------|-----------|
| **Screenshot** | Saves the Gantt chart as a PNG image |
| **Export JSON** | Downloads the entire execution trace (process data + snapshots) |

---

## 🌐 Browser Requirements
| Browser | Minimum Version |
|----------|-----------------|
| Google Chrome | 90+ |
| Mozilla Firefox | 88+ |
| Microsoft Edge | 90+ |
| Apple Safari | 14+ |

---

## 🧾 Notes
- The simulation runs entirely in the browser — no server or database.  
- Adjust **Quantum** and **Speed** to explore algorithm behavior.  
- Multilevel Queue uses **Foreground (RR)** for interactive jobs and **Background (FCFS)** for batch jobs.  
- Works cross-platform on **Windows, macOS, and Linux**.  

---

© 2025 – School of Computer Science and Engineering  
**Project DA-1 | Operating Systems Course (BCSE303L)**
