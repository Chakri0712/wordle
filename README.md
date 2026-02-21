# Wordle Multiplayer

A real-time multiplayer Wordle game built with React, Node.js, and Socket.io. Compete with friends to solve the Wordle in a shared environment!

## 🚀 Features

- **Real-time Multiplayer**: Powered by Socket.io for instantaneous gameplay updates.
- **Customizable Rooms**: Game hosts can create rooms, set rounds, timer duration, and difficulty.
- **Dynamic Board**: Shared guess grid where players contribute to a collective effort (or competition).
- **Word Length Support**: Play with words ranging from 5 to 8 letters.
- **Adaptive UI**: Responsive design with support for various board sizes.

## 🛠️ Tech Stack

- **Frontend**: React (with Vite), React Router, Socket.io-client, CSS3.
- **Backend**: Node.js, Express, Socket.io.
- **Management**: Concurrently (to run client and server together).

## 🏁 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install root dependencies:
   ```bash
   npm install
   ```

2. Install client dependencies:
   ```bash
   cd client
   npm install
   cd ..
   ```

### Running the App

To start both the server and the client in development mode, run:

```bash
npm run dev
```

The server will run on `http://localhost:3001` and the client on `http://localhost:5173`.

## 🌐 Deployment (Hybrid Mode)

For the best performance, host the **Frontend on Vercel** and the **Backend on Render**.

### 1. Backend (Render)
- **Repo Root**: `./`
- **Build Command**: `npm install`
- **Start Command**: `node server/index.js`
- **Environment Variables**: `NODE_ENV=production`

### 2. Frontend (Vercel)
- **Framework Preset**: Vite
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: 
    - `VITE_BACKEND_URL`: (Your Render Service URL, e.g., `https://wordle-multiplayer.onrender.com`)

## 📁 Project Structure

- `client/`: React application (Vite-based).
- `server/`: Node.js/Express server and game logic.
- `prompts/`: Documentation and project AI prompts.
- `package.json`: Main project configuration and scripts.
