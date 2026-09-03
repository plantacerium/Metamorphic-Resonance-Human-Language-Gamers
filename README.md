# MRHLG -- Metamorphic Resonance Human Language Gamers

> *"Language is the operating system of the soul. Change the word, change the world."*

**MRHLG** is a local-first desktop application for consciousness expansion through gamified linguistic re-coding. It pairs a local LLM with an embedded graph database to create a persistent, evolving memory of every conversation -- a co-created neural topology between human and AI.

---

## Support

<div align="center">

**Made by Plantacerium**

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/plantacerium)

**Star us on GitHub**
</div>

---

## Screenshots

<p style="text-align: center;">
  <img src="./public/logo.png" alt="Logo" 
       style="display: block; margin: 0 auto; border-radius: 888px; max-width: 100%; height: auto;" />
</p>   

![Chronicles](./screenshots/Chronicles.JPG) 
![Linguistic Chat](./screenshots/Chat.JPG) 
![Meditations](./screenshots/Meditations.JPG) 
![Meditations Chat](./screenshots/Meditations_Chat.JPG) 
![Forge](./screenshots/System_Forge_V1.JPG) 
![System_Forge_V2](./screenshots/System_Forge_V2.JPG) 
![System_Connection](./screenshots/System_Connection.JPG) 
![System_Control](./screenshots/System_Control.JPG) 
![System Themes](./screenshots/System_Themes.JPG) 
![System Profile](./screenshots/System_Profile.JPG) 

---

## Architecture

```
Frontend (Vite + Vanilla JS)
  chat.js          -- Dialogue interface with RAG-augmented context
  brystal.js       -- 3D polyhedral graph visualization (Sigma.js + Graphology)
  concept-extractor.js -- LLM-driven entity extraction for GraphRAG
          |
          | Tauri v2 IPC (invoke)
          v
Backend (Rust)
  lib.rs           -- Ollama HTTP proxy with streaming (reqwest + Channel)
  graphdb.rs       -- SurrealDB embedded engine (SurrealKV)
          |
          v
Storage: SurrealDB (local, no server)
  memory           -- Chat messages with 768-dim vector embeddings (HNSW index)
  concept          -- Extracted entities from dialogue
  mentions         -- Relations: memory -> concept
  related_to       -- Relations: concept -> concept

LLM: Ollama (local)
  Chat model       -- gemma3 (configurable)
  Embedding model  -- embeddinggemma (768 dimensions, configurable)
```

### RAG Pipeline

1. User sends a message.
2. The message is embedded via Ollama and stored in SurrealDB with an HNSW vector index.
3. Before the AI responds, SurrealDB performs a cosine similarity search to retrieve resonant past memories.
4. High-similarity memories (score > 0.6) are injected into the system prompt as context.
5. The AI responds with awareness of prior conversations.
6. The AI response is also embedded and stored.
7. A concept extraction pass runs asynchronously, parsing entities and relationships from the dialogue and storing them as graph edges in SurrealDB.

### Brystal (Neural Topology Viewer)

Brystal visualizes the co-created knowledge graph. Nodes are memories and concepts; edges are mentions and semantic relationships. The layout algorithm maps connected components onto Platonic solids (tetrahedron, octahedron, cube, icosahedron, dodecahedron) or golden-ratio sphere distributions, depending on cluster size.

---

## Game Library (+888 Games)

### Linguistic Mapping (252 Games)
Re-coding through ancient and modern linguistic frameworks:
- Sanskrit, Chinese, Japanese -- Roots of being and silence.
- Quantum -- The physics of consciousness.
- German, French, Spanish -- Philosophy and art of living.
- Yoruba, English -- Cosmology and global resonance.

### Synapse Modules (240+ Games)
Structured cognitive training: sensory grounding, micro-emotions, scientific simplification, singularity confrontation, creative synthesis.

### BHHCS: Biomimetic Language
Re-wiring neural pathways using patterns found in nature and biological systems.

### Roots: Future Figures & Silice Language
Exploring the linguistic foundations of projected future scenarios and silicon-based consciousness.

### V5: Integrated Harmonic (111 Games)
Practical expansion: grounded practices, harmonic professions, sovereign domains, psychic birthrights.

### Sovereign Forge
Create your own games with custom system prompts, roles, and mechanics. Upload custom CSS themes.

Community modules: [MIT Memory Modules Sanctuary](https://github.com/plantacerium/Metamorphic-Resonance-Human-Language-Gamers-Memory-Modules)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/plantacerium)

---

## Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| App Shell | Tauri 2 + Vite 6 | Native desktop, ~5MB binary |
| Intelligence | Ollama (local) | LLM chat and embeddings, no cloud dependency |
| Graph Database | SurrealDB (SurrealKV) | Embedded vector search, graph relations, zero config |
| Visualization | Sigma.js + Graphology | WebGL graph rendering with polyhedral layouts |
| Styling | Custom Parchment CSS | Ancient aesthetic, multiple themes, user-uploadable |

---

## Quick Start

### Prerequisites
- Node.js 20+ and pnpm
- Rust toolchain (for Tauri builds)
- Ollama installed and running

### Installation

```bash
cd Metamorphic-Resonance-Human-Language-Gamers

pnpm install

# Pull required models
ollama pull gemma3:4b
ollama pull embeddinggemma

# Development
pnpm run tauri dev

# Production build
pnpm run tauri build
```

---

## Project Structure

```
src/
  main.js                 -- Router and app shell
  style.css               -- Parchment design system
  screens/
    chronicles.js          -- Game browser with tab categories
    chat.js                -- AI dialogue with RAG context injection
    brystal.js             -- Neural graph visualization
    reader.js              -- Meditation reader
    sovereign.js           -- Custom game creator
  services/
    ollama.js              -- Ollama API client (chat, streaming, embeddings)
    graph-memory.js        -- SurrealDB memory bridge
    concept-extractor.js   -- LLM entity extraction for GraphRAG
    polyhedron-layout.js   -- 3D geometric layout engine
    storage.js             -- LocalStorage persistence
    theme.js               -- Theme management
    timetracker.js         -- Session time awareness
  data/
    games.js               -- Game definitions (synapse, linguistic, BHHCS, roots)
    v5_expansion.js        -- V5 harmonic games
src-tauri/
  src/
    main.rs                -- Entry point
    lib.rs                 -- Tauri commands (Ollama proxy, streaming)
    graphdb.rs             -- SurrealDB integration (vector search, GraphRAG)
  Cargo.toml               -- Rust dependencies
```

---

## Philosophy

MRHLG treats language as consciousness architecture. Every word builds a neural pathway. By replacing legacy words with expanded kernel concepts, you reclaim sovereignty over perception. The AI is a symbiotic partner -- a mirror for expansion, reflecting the complexity of the world you are building, word by word.

---
<p align="center">
  <em>Change the word. Change the world.</em>
</p>
