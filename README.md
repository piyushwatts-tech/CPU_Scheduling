# CPU Scheduling Visualizer — Advanced Edition

**Course:** Operating Systems (BCSE303L)  
**Project:** Interactive Animation & Simulation Tool  
**Author:** (Your Name)  
**Semester:** Fall 2025–2026  

---

## 🧩 Overview

This is a **web-based interactive visualization tool** that demonstrates **core CPU scheduling algorithms** using real-time animations.  
It allows users to enter process parameters, choose scheduling algorithms, and observe algorithmic behavior through step-by-step animated Gantt charts and queue transitions.

The tool runs entirely on the **client-side** using **HTML5, CSS3, and JavaScript (Canvas API)** — no server dependencies.

---

## ⚙️ Technology Stack

| Component | Technology |
|------------|-------------|
| UI / Frontend | HTML5, CSS3, JavaScript (ES6) |
| Animation | HTML5 Canvas + DOM transitions |
| Compatibility | Chrome, Edge, Firefox, Safari |
| Dependencies | None (pure client-side) |

---

## 🧠 Algorithms Implemented

### Process Management
- **First Come First Serve (FCFS)**
- **Shortest Job First (SJF)** — preemptive & non-preemptive
- **Round Robin (RR)** — with configurable quantum
- **Priority Scheduling** — preemptive & non-preemptive
- **Multilevel Queue (MLQ)** — foreground (RR) + background (FCFS)

### Additional Features
- Interactive ready queue and completed process visualization  
- Real-time **Gantt Chart animation**  
- Step, play, pause, and timeline navigation  
- Adjustable animation **speed control**  
- **Screenshot** and **trace (JSON)** export  
- **Light/Dark theme toggle**

---

## 📊 Metrics Displayed

- Per-process Start, Finish, Waiting, and Turnaround times  
- **Average Waiting Time**  
- **Average Turnaround Time**  
- **CPU Utilization (%)**  
- **Throughput** (processes/time unit)  
- **Context Switches count**

---

## 💻 How to Run the Project

1. Place all files in the same folder:
