#[tauri::command]
async fn ollama_stream_proxy(
    url: String, 
    body: serde_json::Value,
    on_event: tauri::ipc::Channel<serde_json::Value>
) -> Result<(), String> {
    use futures_util::StreamExt;
    
    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let mut stream = res.bytes_stream();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&chunk);
        
        // Ollama sends JSON objects line by line
        for line in text.lines() {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                on_event.send(json).map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
async fn ollama_proxy(method: String, url: String, body: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    let mut request = match method.to_uppercase().as_str() {
        "POST" => client.post(&url),
        "GET" => client.get(&url),
        _ => return Err(format!("Unsupported method: {}", method)),
    };

    if let Some(json_body) = body {
        request = request.json(&json_body);
    }

    let res = request.send().await.map_err(|e| e.to_string())?;
    
    let status = res.status();
    if !status.is_success() {
        let err_text = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Ollama error ({}): {}", status, err_text));
    }

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}

#[tauri::command]
async fn ask_ollama(prompt: String) -> Result<String, String> {
    let body = serde_json::json!({
        "model": "gemma3",
        "prompt": prompt,
        "stream": false
    });
    
    let res = ollama_proxy(
        "POST".to_string(), 
        "http://127.0.0.1:11434/api/generate".to_string(), 
        Some(body)
    ).await?;
    Ok(res["response"].as_str().unwrap_or("No response").to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      ask_ollama, 
      ollama_proxy, 
      ollama_stream_proxy
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
