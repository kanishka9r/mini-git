# Mini-Git

A full-stack, Git-like version control system built entirely from scratch in C++ with a React web interface.

The backend is a lightweight VCS engine that handles most of the core version control operations and exposes them through a local REST API. The frontend is a React web application that connects to it, providing a fully visual interface for managing your repository without needing to memorize or type any version control commands.

---

## Features

**C++ Backend**
- **Content-Addressed Blob Storage:** Files are stored as hashed objects inside `.vcs/objects/`, with automatic deduplication — identical content is stored only once.
- **Staging Area & Commits:** A `.vcs/index` file tracks staged files. Each commit records the parent hash, timestamp, message, and the complete file-to-hash mapping, persisted in `.vcs/commits/`.
- **Branching & Safe Checkout:** Branches are stored as pointer files in `.vcs/refs/`. Checkout restores the working directory to match the target branch's snapshot and blocks switching if there are unsaved local changes.
- **LCS Diff Engine:** Line-level differences are calculated using a custom Longest Common Subsequence (LCS) dynamic programming algorithm, optimized with prefix/suffix pruning to reduce unnecessary comparisons.
- **Embedded REST Server:** Uses `cpp-httplib` to serve all VCS operations as JSON endpoints on port 8080, with a custom JSON parser (no external dependency) and full CORS support for browser access.

**React Frontend**
- **Workspace & User Setup:** Configure the active project folder, set your username and email for commits, and connect a GitHub Personal Access Token to enable remote repository operations.
- **File Staging & Commits:** View all modified, added, and deleted files in the current workspace. Select files to stage them individually and write a commit message to snapshot the changes.
- **Branch Management:** Create new branches and switch between existing ones directly from the UI. The backend enforces a safety check to prevent checkout from overwriting local unsaved work.
- **Commit History, Diff Viewer & Revert:** Browse the full commit timeline. Clicking any commit reveals the tracked file snapshot, and selecting a file fetches a color-coded line-by-line diff — additions in green, deletions in red. Any commit can be reverted to restore the workspace to that state.
- **GitHub Sync (Push & Pull):** Push local commits to GitHub by building blobs, trees, and commit objects via the GitHub Git Data API — without using Git. Pull remote changes by fetching the file tree and syncing blob content back to the local workspace.

---

## Tech Stack

**Backend**
- C++17 (Core VCS engine)
- `cpp-httplib` (Single-header HTTP server library)

**Frontend**
- React 19 + TypeScript
- Vite (Build tool and dev server)
- Tailwind CSS v4 (Styling)
- Zustand (State management)
- React Router DOM v7 (Navigation)
- GitHub REST API v2022-11-28 (Remote sync)

---

## Requirements

**Backend**
- MSYS2 MinGW-w64 (includes `g++` compiler with C++17 support) — https://www.msys2.org/
- Windows OS (the build script uses Windows-specific APIs)

**Frontend**
- Node.js v18 or higher — https://nodejs.org/
- npm (comes bundled with Node.js)

npm Packages (installed automatically via `npm install`):
- `react` v19
- `react-dom` v19
- `react-router-dom` v7
- `zustand` v5
- `tailwindcss` v4
- `typescript` v6
- `vite` v8
- `@vitejs/plugin-react`
- `@tailwindcss/vite`
- `eslint` + related plugins (dev only)

---

## How to Run

### 1. Build the Backend
Run the build script from the root directory:
```cmd
.\build.bat
```
This compiles all C++ source files and produces `vcs.exe` in the root folder.

### 2. Start the API Server
Run the executable to start the local HTTP server on port 8080:
```cmd
.\vcs.exe serve 8080
```
The server must stay running while you use the frontend. It manages all reads and writes to your local `.vcs` repository.

### 3. Start the Frontend
Navigate to the client folder and install the required packages :
```cmd
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## CLI Reference

The compiled executable also supports a direct command-line interface:

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

All endpoints are served on `http://localhost:8080` (backend must be running locally).

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
- **Cross-Platform Build:** Replace Windows-specific APIs with portable alternatives to support Linux and macOS.
- **Stash:** Temporarily shelve local changes without committing, and restore them later.
