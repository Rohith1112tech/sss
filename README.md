# School Substitution System - Full-Stack Dashboard

This project is a fully responsive Web Dashboard for managing daily teacher absences, school break schedules, and auto-calculating replacement assignments. It uses a **Node.js + Express** server backend backed by a **PostgreSQL** database.

---

## Daily School Schedule & Timings
The system integrates the following daily period and break timings:
*   **Class Incharge (Roll Call)**: 08:45 AM - 09:30 AM
*   **Period 1**: 09:30 AM - 10:15 AM
*   **Period 2**: 10:15 AM - 11:00 AM
*   *Morning Break (C.I)*: 11:00 AM - 11:20 AM
*   **Period 3**: 11:20 AM - 12:00 PM
*   **Period 4**: 12:00 PM - 12:40 PM
*   *Lunch Break*: 12:40 PM - 01:20 PM
*   **Period 5**: 01:20 PM - 02:00 PM
*   **Period 6**: 02:00 PM - 02:40 PM
*   *Evening Break (C.I)*: 02:40 PM - 02:50 PM
*   **Period 7**: 02:50 PM - 03:30 PM
*   **Period 8**: 03:30 PM - 04:05 PM
*   **Diary (C.I)**: 04:05 PM - 04:15 PM
*   **Evening Games**: 04:15 PM - 05:30 PM

---

## How to Run in VS Code

### Step 1: Open the Project in VS Code
1. Open **VS Code**.
2. Click **File > Open Folder...** and select **`D:\ssss`**.

---

### Step 2: Open the Terminal & Start the Server
1. Open a new terminal in VS Code (click **Terminal > New Terminal** or press ``Ctrl + ` ``).
2. Start the backend server by typing:
   ```bash
   node server.js
   ```
3. *Note: If PowerShell blocks running scripts, run `node.exe server.js` or type `Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process` first.*
4. The terminal will log:
   ```
   Connecting to PostgreSQL default database...
   Connecting to 'substitution_db'...
   Tables verified.
   Database initialization finished.
   Backend server running at http://localhost:3000
   ```

---

### Step 3: Launch the Dashboard
Once the server is running:
1. Leave the server running in the terminal.
2. In VS Code's left sidebar, right-click on [index.html](file:///d:/ssss/index.html).
3. Select **Reveal in File Explorer**.
4. Double-click the `index.html` file to open the dashboard dashboard in your web browser.
5. Alternatively, open a second terminal tab in VS Code and run `npx.cmd serve` to host the frontend at `http://localhost:5000`.

---

## Database Configuration
The server connects to PostgreSQL running locally on port `5432` with username `postgres` and password `Rohith@2006`.
* On the very first run, the server automatically checks if the database `substitution_db` exists, creates it, establishes the tables (`teachers`, `timetable`, `absentees`, `sub_log`), and seeds them with your conflict-free master timetable and teacher registries.
