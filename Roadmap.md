## 🏗️ architecture.md: The Pure-TS Synaptic Engine

This architecture moves the "Cognition" layer from a Python sidecar directly into a **Local Node.js Engine** (integrated via Tauri).

### 1. The Local Intelligence Stack (Native JS/TS)

* **Orchestrator (Mastra.ai):** Handles tool-calling, agent logic, and the Graph-RAG pipeline.
* **Local Vector Store (LibSQL):** A local SQLite-based vector DB. It stores the "Akashic Record" as a `.db` file in the user's app data folder. No server required.
* **Model Provider (Ollama):** Connected via OpenAI-compatible local endpoints. Mastra routes queries to your local Llama3 or Mistral models.

### 2. The Semantic Graph

* **Nodes:** Every Game ID (`B56`, `G1`), Every Frequency (`SAMADHI`), and Every Chat Export.
* **Edges:** Semantic relationships automatically extracted by Mastra's Graph-RAG based on how concepts like "Mimicry" and "Quantum" overlap across your JSON files.

---

## 🗺️ roadmap.md: The JS-Native Evolution

### Phase 1: The Local Nexus (Semanas 1-2)

* **Mastra Setup:** Initialize `@mastra/core` and `@mastra/rag` in your project.
* **Local Embedding:** Configure `@mastra/fastembed` for 100% local, CPU-friendly vector generation.
* **LibSQL Integration:** Point the vector store to `./data/synaptic_core.db`.

### Phase 2: Ingestion & Mapping (Semanas 3-4)

* **Game Ingestion:** Create a script to iterate through `v5_expansion.js` and `games.js`, pushing them into the Mastra `GraphRAG` tool.
* **Graph Linking:** Use Mastra's `threshold` logic to automatically link the `BIRTHRIGHT` skills with the `GROUNDED` practices.

### Phase 3: Agentic Sovereignty (Semanas 5+)

* **Hybrid Agent:** Deploy a Mastra `Agent` that chooses between `vectorQueryTool` (for finding a specific game) and `graphQueryTool` (for analyzing your "Synaptic Journey").
* **Tauri IPC Bridge:** Connect your UI `chat.js` to the Mastra agent via Tauri's `invoke` system.

---

## ✅ task.md: Action Items

### Mastra Configuration

* [ ] Install dependencies: `npm install @mastra/core @mastra/rag @mastra/libsql`.
* [ ] Configure `mastra.config.ts` to use local Ollama endpoints (`http://localhost:11434/v1`).
* [ ] Set up `LibSQL` with a local file path for persistent storage.

### Data Engineering

* [ ] Write an `ingest.ts` script that reads all files from `./data/` and uses `MDocument` to chunk and embed them.
* [ ] Create a "Watcher" that monitors `./exports/` and automatically indexes new chat sessions into the graph.

### UI / Bridge

* [ ] Create a Tauri Command in Rust to call the Mastra Agent.
* [ ] Update `chat.js` to use the new `graphQueryTool` to provide "Synchronicity Suggestions" during games.

---

## 📖 walkthrough.md: The Hybrid Flow

### 1. The Semantic Pulse (Retrieval)

When you type a message, the Mastra Agent triggers.

* **Vector Search:** Finds the most similar text in your games (e.g., you mention "Control," it finds `B59: Sovereign Override`).
* **Graph Traversal:** Looks at the neighbors of `B59` in the graph and notices that it’s connected to `B56: Mimetic Echo`.

### 2. The Integrated Prompt (Augmentation)

Mastra constructs a "Contextual Shield":

> "Human is currently playing B59. This skill is logically supported by B56. Previous chat exports from Tuesday show the human struggled with the 'Mirror' role. Injecting specific advice to focus on 'Mirroring' first."

### 3. The Sovereign Generation (Output)

The local Ollama model generates the AI response, grounded in both the **rules of the game** (Vector) and the **history of the player** (Graph).

---
## New data category Nature Consciousness Expansion.
Including all realms and reigns of Planet Earth Nature.
Focus on communnion with Earth Nature and the laws of the universe.

### Comparison: Why Mastra.ai wins here

* **Latency:** No inter-process communication with Python. Everything is a fast JS call.
* **Sovereignty:** The user owns their `.db` file. There is no cloud.
* **Code Simplicity:** Your `games.js` stays as the "Source of Truth," and Mastra simply builds a mathematical map over it.