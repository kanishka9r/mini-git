# Mini-Git

A full-stack, Git-like version control system built entirely from scratch in C++ with a React web interface.

It operates as a fully standalone portable desktop application. The C++ engine handles the core version control operations and simultaneously serves the compiled React UI. Simply run the executable to manage your local repositories using a beautiful web interface, without needing to type any git commands.

---

## Features

**C++ Backend**
- **Content-Addressed Blob Storage:** Files are stored as hashed objects inside `.vcs/objects/`, with automatic deduplication — identical content is stored only once.
- **Staging Area & Commits:** A `.vcs/index` file tracks staged files. Each commit records the parent hash, timestamp, message, and the complete file-to-hash mapping, persisted in `.vcs/commits/`.
- **Branching & Safe Checkout:** Branches are stored as pointer files in `.vcs/refs/`. Checkout restores the working directory to match the target branch's snapshot and blocks switching if there are unsaved local changes.
- **LCS Diff Engine:** Line-level differences are calculated using a custom Longest Common Subsequence (LCS) dynamic programming algorithm, optimized with prefix/suffix pruning to reduce unnecessary comparisons.
- **Embedded REST Server:** Uses `cpp-httplib` to serve all VCS operations as JSON endpoints and static files on port 8080, with a custom JSON parser (no external dependency).
- **Cross-Platform & Portable:** Distributed via GitHub Actions as a single standalone executable for Windows, macOS, and Linux. No installation or dependencies required.

**React Frontend**
- **Workspace & User Setup:** Configure the active project folder, set your username and email for commits, and connect a GitHub Personal Access Token to enable remote repository operations.
- **File Staging & Commits:** View all modified, added, and deleted files in the current workspace. Select files to stage them individually and write a commit message to snapshot the changes.
- **Branch Management:** Create new branches and switch between existing ones directly from the UI. The backend enforces a safety check to prevent checkout from overwriting local unsaved work.
- **Commit History, Diff Viewer & Compare:** Browse the full commit timeline. Click "Compare Commits" to select any two points in history and see exactly what changed between them. Clicking any commit reveals the tracked file snapshot, and selecting a file fetches a color-coded line-by-line diff. Any commit can be reverted to restore the workspace to that state.
- **GitHub Sync (Push & Pull):** Push local commits to GitHub by building blobs, trees, and commit objects via the GitHub Git Data API — without using Git. Pull remote changes by fetching the file tree and syncing blob content back to the local workspace.

---

## Tech Stack

**Backend & Distribution**
- C++17 (Core VCS engine)
- `cpp-httplib` (Single-header HTTP server library)
- GitHub Actions (Automated multi-OS CI/CD release pipeline)

**Frontend**
- React 19 + TypeScript
- Vite (Build tool and dev server)
- Tailwind CSS v4 (Styling)
- Zustand (State management)
- React Router DOM v7 (Navigation)
- GitHub REST API v2022-11-28 (Remote sync)

---

## Requirements

### For End-Users
**None** You do not need to install Node.js, C++, or any external dependencies. Just download the pre-compiled application from the Releases tab.

### For Developers (If modifying the code)
**Backend:**
- C++17 compatible compiler (`g++` or `clang++`)
- Windows: MSYS2 MinGW-w64 (or similar)
- macOS / Linux: `make` and `g++`

**Frontend:**
- Node.js v20 or higher
- npm (comes bundled with Node.js)

---

## How to Run

### 1. For End-Users
1. Go to the **Releases** tab on GitHub.
2. Download the ZIP file for your operating system (Windows, Mac, or Linux).
3. Unzip the folder.
4. Double-click the executable (`vcs.exe` on Windows, or `vcs` on Mac/Linux).
5. The application will start and your default web browser will automatically open to `http://localhost:8080`!

### 2. For Developers (Building from Source)
If you want to modify the source code, you must build both the frontend and backend locally:

**Build the Frontend:**
```bash
cd client
npm install
npm run build
```

**Build the Backend:**
- **On Windows:** Run `.\build.bat`
- **On Mac/Linux:** Run `make`

**Start the App:**
Run the compiled executable:
- **Windows:** `.\vcs.exe`
- **Mac/Linux:** `./vcs`

---

## CLI Reference

The compiled executable defaults to the GUI web-server mode when run without arguments, but it also supports a direct command-line interface:

- `vcs` - Starts the API server and auto-opens the web GUI on `localhost:8080`.
- `vcs init` – Initialize an empty repository in the current directory.
- `vcs add <file>` – Stage a file for the next commit.
- `vcs unstage <file>` – Remove a file from the staging index.
- `vcs untrack <file>` – Mark a tracked file for deletion in the next commit.
- `vcs commit "<message>"` – Commit all staged changes with a message.
- `vcs log` – Print the commit history from HEAD.
- `vcs log --graph` – Print the commit history as an ASCII graph.
- `vcs branch <name>` – Create a new branch pointing at the current commit.
- `vcs checkout <branch>` – Switch to a branch and restore the working directory.
- `vcs diff <file1> <file2>` – Run the LCS diff engine on two files and print changes.
- `vcs cat-object <hash>` – Print the raw content of a stored blob object by its hash.

---

## API Endpoints

All endpoints are served on `http://localhost:8080` when the backend is running.

- `GET /api/status` – Check if the workspace is an initialized VCS repository.
- `POST /api/workspace` – Set the server's active working directory.
- `POST /api/init` – Initialize a new repository.
- `POST /api/add` – Stage one or more files.
- `POST /api/commit` – Create a new commit from staged files.
- `GET /api/log` – Retrieve the full commit history.
- `GET /api/changes` – Get all modified, added, and deleted files in the workspace.
- `POST /api/diff` – Get the line-by-line diff for a specific file.
- `POST /api/branch` – Create a new branch.
- `POST /api/checkout` – Checkout a branch.
- `GET /api/config` – Get repository configuration.
- `POST /api/config` – Update configuration (user info, remote URL).
- `GET /api/object/:hash` – Retrieve the raw content of a stored blob.
- `POST /api/revert` – Revert the workspace back to a specific commit.

---

## Future Features

- **Merge Support:** Implement a three-way merge algorithm to combine diverged branches.
- **Conflict Resolution:** Detect and highlight merge conflicts, allowing users to manually resolve them before committing.
- **Clone Support:** Clone an existing local or remote repository into a new directory.
- **Stash:** Temporarily shelve local changes without committing, and restore them later.
- **Git Ignore:** Support for a `.vcsignore` file to ignore untracked files and directories.
