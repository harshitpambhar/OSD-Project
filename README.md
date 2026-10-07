# 💿 Disk Scheduling Simulator

> **Visualize • Compare • Understand Disk Scheduling Algorithms**  
> An interactive, responsive, and educational web application developed for **Operating Systems (OS) / Fundamentals of Operating Systems Design (FOSD)** coursework and viva demonstrations.

---

## 📖 Introduction

Secondary storage management is a cornerstone of operating system design. Traditional Hard Disk Drives (HDDs) contain spinning magnetic platters and mechanical read/write arms. Because mechanical **seek time** dominates total I/O latency, the order in which pending disk I/O requests are serviced directly impacts system throughput and response times.

This **Disk Scheduling Simulator** provides an interactive simulation environment allowing students, professors, and engineers to observe disk-head movements in real-time, inspect boundary turnarounds and circular resets, view mathematical step-by-step reasoning, and conduct side-by-side performance benchmarks across six major disk scheduling algorithms.

---

## ✨ Features

- **Dynamic Visualization Engine**:
  - **Horizontal Platter Track Ruler**: Displays cylinder tracks $[0 \dots \text{DiskSize}-1]$ with an animated glowing magnetic read/write head, seek lines, and color-coded status pins.
  - **2D Seek-Sequence Trajectory Graph**: Plots Cylinder Track ($X$-axis) versus Service Sequence ($Y$-axis), mirroring standard textbook diagrams (Silberschatz / Galvin).
  - **Dual View Mode**: Switch seamlessly between Dual View, Ruler Only, or Graph Only.
- **Full Algorithmic Suite (6 Algorithms)**:
  1. **FCFS** (First-Come First-Serve)
  2. **SSTF** (Shortest Seek Time First)
  3. **SCAN** (Elevator Algorithm)
  4. **C-SCAN** (Circular SCAN)
  5. **LOOK** (Adaptive Elevator)
  6. **C-LOOK** (Adaptive Circular)
- **Interactive Simulation Controls**:
  - Play / Pause (Spacebar)
  - Next Step ($\rightarrow$) & Previous Step ($\leftarrow$)
  - Restart Animation ($R$)
  - Speed Adjustment ($0.25\times$ to $3.0\times$)
  - Interactive Progress Bar ($\%$)
- **Live Telemetry HUD**:
  - Current Head Position
  - Next Target Request
  - Current Step Movement ($|\text{prev} - \text{curr}| = \Delta$ tracks)
  - Cumulative Head Movement
  - Average Seek Distance ($\text{Total} / \text{Served}$)
  - Requests Serviced & Remaining
- **🎓 Educational Mode**:
  - Mathematical distance comparisons for every candidate track at every step (e.g., displaying candidate tables for SSTF).
  - Contextual explanations for boundary reversals (SCAN/C-SCAN) and adaptive turnaround (LOOK/C-LOOK).
- **⚡ Compare All 6 Algorithms**:
  - One-click benchmarking on the exact same queue, initial head, disk size, and direction.
  - Comparative Performance Table with Starvation Risk and Complexity.
  - Interactive Bar Chart (powered by Chart.js) with color-coded algorithms.
  - 🏆 **Best Algorithm Analysis**: Highlights the winning algorithm for the specific queue while articulating why no disk scheduling algorithm is universally "best".
- **Presets & Random Queue Generator**:
  - One-click presets: *Classic (53)*, *Right-Heavy*, *Left-Heavy*, *Duplicates & Extremes*.
  - Random Queue Generator ($8$–$12$ valid cylinder requests + randomized head).
- **Audio Feedback**:
  - Synthesized mechanical seek clicks / beeps via the HTML5 Web Audio API (toggleable).
- **Dark & Light Mode**:
  - Modern OS dark dashboard theme by default with seamless toggle to light mode.
- **Export & Sharing**:
  - Copy summary results or step logs to clipboard.
  - Export full simulation telemetry as CSV.

---

## 🧠 Algorithms Implemented

| Algorithm | Full Form | Strategy | Direction Dependent? | Starvation Risk | Time Complexity |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **FCFS** | First-Come First-Serve | FIFO order of arrival | No | None (Fair) | $O(N)$ |
| **SSTF** | Shortest Seek Time First | Greedy: picks track with $\min \|t - \text{head}\|$ | No | High | $O(N^2)$ greedy |
| **SCAN** | Elevator Algorithm | Sweeps in direction to disk boundary, then reverses | Yes (Left/Right) | None | $O(N \log N)$ |
| **C-SCAN** | Circular SCAN | Sweeps to boundary, jumps to opposite boundary, continues | Yes (Left/Right) | None | $O(N \log N)$ |
| **LOOK** | Look Algorithm | Sweeps to furthest pending request, reverses immediately | Yes (Left/Right) | None | $O(N \log N)$ |
| **C-LOOK** | Circular LOOK | Sweeps to furthest request, jumps to furthest opposite request | Yes (Left/Right) | None | $O(N \log N)$ |

---

## 🛠 Technologies Used

- **HTML5**: Semantic layout, accessible forms, audio element hooks, and responsive containers.
- **CSS3**: Custom design system, CSS Variables (Dark/Light themes), Glassmorphism (`backdrop-filter`), animations, and Flexbox/Grid layouts.
- **Vanilla JavaScript (ES6+)**: Pure algorithmic implementations, state machine playback, Canvas 2D API rendering, and Web Audio API synthesizer.
- **Canvas 2D API**: High-DPI hardware-accelerated rendering for the platter track ruler and 2D seek trajectory diagram.
- **Chart.js (v4.4.1)**: Responsive comparison bar chart.

---

## 🚀 How to Run

No build tools, bundlers, Node packages, or backend servers are required!

### Option 1: Direct File Opening
1. Download or clone this repository.
2. Double-click [index.html](file:///e:/5thsem/OSD/project/index.html) to open directly in any modern web browser (Chrome, Edge, Firefox, Safari).

### Option 2: VS Code Live Server
1. Open the project folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click [index.html](file:///e:/5thsem/OSD/project/index.html) and select **Open with Live Server**.

### Option 3: Local Python HTTP Server
```bash
# In the project directory:
python -m http.server 8080
# Open http://localhost:8080 in your browser
```

---

## 📝 Example Test Cases

### Test Case A: Classic Textbook Benchmark
- **Queue**: `98, 183, 37, 122, 14, 124, 65, 67`
- **Initial Head**: `53`
- **Disk Size**: `200` (tracks $0$ to $199$)
- **Direction**: `Right`

**Results**:
- **FCFS**: Total movement = `640` tracks (Average = $80.0$)
- **SSTF**: Total movement = `236` tracks (Average = $29.5$)
- **SCAN**: Total movement = `331` tracks (Average = $41.4$)
- **C-SCAN**: Total movement = `382` tracks (Average = $47.8$)
- **LOOK**: Total movement = `299` tracks (Average = $37.4$)
- **C-LOOK**: Total movement = `322` tracks (Average = $40.3$)

### Test Case B: Boundary & Extremes
- **Queue**: `0, 50, 50, 99, 50`
- **Initial Head**: `50`
- **Disk Size**: `100` (tracks $0$ to $99$)
- **Behavior**: Handles requests at track $0$, track $99$, duplicate requests at track $50$ (movement between identical tracks $= 0$), and initial head matching requests.

---

## 📁 Project Structure

```
disk-scheduling-simulator/
│
├── index.html        # Main application structure, control panel, canvases, modals & footer
├── style.css         # Modern OS dark/light theme, glassmorphism, responsive grid & animations
├── script.js         # Algorithmic engine, Canvas renderers, simulation state machine & Chart.js
└── README.md         # Comprehensive academic documentation and reference guide
```

---

## 🔬 Mathematical Formulas

### Total Head Movement ($M_{\text{total}}$)
$$M_{\text{total}} = \sum_{i=1}^{k} \left| \text{track}_i - \text{track}_{i-1} \right|$$
*Where $\text{track}_0$ is the initial head position, and $\text{track}_k$ is the final track reached (including boundary stops and circular jumps).*

### Average Seek Distance ($S_{\text{avg}}$)
$$S_{\text{avg}} = \frac{M_{\text{total}}}{N}$$
*Where $N$ is the total count of I/O requests serviced.*

---

## ⌨ Keyboard Shortcuts

| Shortcut | Action |
| :---: | :--- |
| <kbd>Space</kbd> | Play / Pause Simulation |
| <kbd>→</kbd> | Step Forward (Next Request) |
| <kbd>←</kbd> | Step Backward (Previous Request) |
| <kbd>R</kbd> | Restart Simulation from Step 0 |

---

## 🎓 Academic Purpose

This project was built for the **Operating Systems (OS) / Fundamentals of Operating Systems Design (FOSD)** undergraduate engineering curriculum. It demonstrates:
1. Secondary storage hardware architecture (Platters, Spindle, Actuator Arm, Cylinders).
2. Seek time vs. Rotational latency vs. Transfer time.
3. Why mechanical scheduling was essential in HDDs and why modern SSDs (Flash memory) employ queue scheduling for wear-leveling and bandwidth quality-of-service rather than seek optimization.

---

## 👤 Author Information

- **Student Name**: Harshit
- **Course**: Operating Systems / FOSD
- **Project Title**: Interactive Disk Scheduling Simulator
- **Academic Year**: 2026–2027
#   O S D - P r o j e c t  
 