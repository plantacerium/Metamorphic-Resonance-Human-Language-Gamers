use serde::{Deserialize, Serialize};
use surrealdb::engine::local::{Db, SurrealKv};
use surrealdb::Surreal;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

pub struct GraphDbState {
    pub db: Arc<Surreal<Db>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Memory {
    text: String,
    role: String,
    game_id: String,
    embedding: Vec<f32>,
}


#[derive(Debug, Deserialize, Serialize)]
pub struct QueryResult {
    pub id: Option<String>,
    pub text: String,
    pub role: String,
    pub score: f32,
}

use surrealdb::sql::Thing;

#[derive(Debug, Deserialize)]
struct MemRecord {
    id: Thing,
    text: String,
    role: String,
}

#[derive(Debug, Deserialize)]
struct ConceptRecord {
    id: Thing,
    name: String,
}

#[derive(Debug, Deserialize)]
struct RelRecord {
    id: Thing,
    #[serde(rename = "in")]
    in_id: Thing,
    #[serde(rename = "out")]
    out_id: Thing,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportNode {
    pub id: String,
    pub label: String,
    pub group: String,
    pub full_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub rel_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BrainGraph {
    pub nodes: Vec<ExportNode>,
    pub edges: Vec<ExportEdge>,
}

pub async fn init_graphdb(app_handle: &AppHandle) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let db_path = app_data_dir.join("surrealdb");
    
    // Conectar a SurrealKV embebido
    let db = Surreal::new::<SurrealKv>(db_path.to_str().unwrap())
        .await
        .map_err(|e| e.to_string())?;

    db.use_ns("mhlg").use_db("graphrag").await.map_err(|e| e.to_string())?;

    // Definir el esquema
    let schema = r#"
        DEFINE TABLE memory SCHEMAFULL;
        DEFINE FIELD text      ON memory TYPE string;
        DEFINE FIELD role      ON memory TYPE string;
        DEFINE FIELD game_id   ON memory TYPE string;
        DEFINE FIELD embedding ON memory TYPE array<float>;
        DEFINE INDEX idx_mem_vec ON memory FIELDS embedding
            HNSW DIMENSION 768 DIST COSINE;

        DEFINE TABLE concept SCHEMAFULL;
        DEFINE FIELD name        ON concept TYPE string;
        DEFINE FIELD description ON concept TYPE string;
        DEFINE INDEX idx_concept_name ON concept FIELDS name UNIQUE;

        DEFINE TABLE mentions SCHEMAFULL TYPE RELATION;
        DEFINE FIELD confidence ON mentions TYPE float;

        DEFINE TABLE related_to SCHEMAFULL TYPE RELATION;
        DEFINE FIELD strength ON related_to TYPE float;
    "#;

    db.query(schema).await.map_err(|e| e.to_string())?;

    app_handle.manage(GraphDbState {
        db: Arc::new(db),
    });

    println!("🌀 SurrealDB (GraphRAG) initialized successfully");
    Ok(())
}

#[tauri::command]
pub async fn graph_store_memory(
    text: String,
    embedding: Vec<f32>,
    role: String,
    game_id: String,
    state: State<'_, GraphDbState>,
) -> Result<(), String> {
    let memory = Memory {
        text,
        role,
        game_id,
        embedding,
    };

    let _: Option<serde_json::Value> = state
        .db
        .create("memory")
        .content(memory)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn graph_search_memory(
    embedding: Vec<f32>,
    game_id: String,
    top_k: u32,
    state: State<'_, GraphDbState>,
) -> Result<Vec<QueryResult>, String> {
    // Vector search in SurrealDB
    // We use the <|K, COSINE|> operator
    let query = r#"
        SELECT id, text, role, vector::similarity::cosine(embedding, $query_vec) AS score
        FROM memory
        WHERE game_id = $game_id AND embedding <|10, COSINE|> $query_vec
        ORDER BY score DESC
        LIMIT $limit;
    "#;

    let mut response = state.db
        .query(query)
        .bind(("query_vec", embedding))
        .bind(("game_id", game_id))
        .bind(("limit", top_k))
        .await
        .map_err(|e| e.to_string())?;

    let results: Vec<QueryResult> = response.take(0).map_err(|e| e.to_string())?;
    
    Ok(results)
}

#[tauri::command]
pub async fn graph_delete_game(
    game_id: String,
    state: State<'_, GraphDbState>,
) -> Result<(), String> {
    let query = "DELETE FROM memory WHERE game_id = $game_id";
    state.db
        .query(query)
        .bind(("game_id", game_id))
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn graph_export_brain(state: State<'_, GraphDbState>) -> Result<BrainGraph, String> {
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    // Fetch memory nodes
    let mut mem_resp = state.db.query("SELECT id, text, role FROM memory").await.map_err(|e| e.to_string())?;
    let mem_records: Vec<MemRecord> = mem_resp.take(0).map_err(|e| e.to_string())?;
    for r in mem_records {
        nodes.push(ExportNode {
            id: r.id.to_string(),
            label: format!("{}: {}...", r.role, r.text.chars().take(15).collect::<String>()),
            group: "memory".to_string(),
            full_text: r.text,
        });
    }

    // Fetch concept nodes
    let mut conc_resp = state.db.query("SELECT id, name FROM concept").await.map_err(|e| e.to_string())?;
    let conc_records: Vec<ConceptRecord> = conc_resp.take(0).map_err(|e| e.to_string())?;
    for r in conc_records {
        nodes.push(ExportNode {
            id: r.id.to_string(),
            label: r.name.clone(),
            group: "concept".to_string(),
            full_text: r.name,
        });
    }

    // Fetch mentions (memory -> concept)
    let mut mentions_resp = state.db.query("SELECT id, in, out FROM mentions").await.map_err(|e| e.to_string())?;
    let mentions: Vec<RelRecord> = mentions_resp.take(0).map_err(|e| e.to_string())?;
    for r in mentions {
        edges.push(ExportEdge {
            id: r.id.to_string(),
            source: r.in_id.to_string(),
            target: r.out_id.to_string(),
            rel_type: "mentions".to_string(),
        });
    }

    // Fetch related_to (concept -> concept)
    let mut related_resp = state.db.query("SELECT id, in, out FROM related_to").await.map_err(|e| e.to_string())?;
    let related: Vec<RelRecord> = related_resp.take(0).map_err(|e| e.to_string())?;
    for r in related {
        edges.push(ExportEdge {
            id: r.id.to_string(),
            source: r.in_id.to_string(),
            target: r.out_id.to_string(),
            rel_type: "related_to".to_string(),
        });
    }

    Ok(BrainGraph { nodes, edges })
}
