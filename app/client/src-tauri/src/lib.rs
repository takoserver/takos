use deno_core::{op2, type_error, Extension, JsRuntime, OpState, PollEventLoopOptions, RuntimeOptions};
use deno_core::error::CoreError;
use reqwest;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::rc::Rc;
use std::thread;
use tauri::{AppHandle, Emitter};
use tokio::runtime::Builder;

#[derive(Deserialize, Debug)]
struct TakosExtensionInfo {
    identifier: String,
    client: Option<String>,
}

#[derive(Serialize, Clone)]
struct EventPayload {
    #[serde(rename = "eventName")]
    event_name: String,
    payload: String,
}

#[op2(async)]
pub async fn op_publish_event(
    state: Rc<RefCell<OpState>>,
    #[string] event_name: String,
    #[string] payload: String,
) -> Result<(), CoreError> {
    let app_handle = {
        let state = state.borrow();
        state.borrow::<AppHandle>().clone()
    };
    app_handle.emit(
        "deno-event",
        EventPayload { event_name, payload },
    ).map_err(type_error)?;
    Ok(())
}

async fn load_extensions(app_handle: AppHandle) -> Result<(), CoreError> {
    let extensions_result = reqwest::get("http://localhost:8000/api/extensions").await
        .map_err(type_error)?;

    let extensions = extensions_result
        .json::<Vec<TakosExtensionInfo>>()
        .await
        .map_err(type_error)?;

    for ext in extensions {
        if let Some(client_code) = ext.client {
            let deno_extension = Extension {
                name: "takos_ext",
                ops: std::borrow::Cow::from(vec![op_publish_event()]),
                ..Default::default()
            };

            let mut js_runtime = JsRuntime::new(RuntimeOptions {
                extensions: vec![deno_extension],
                ..Default::default()
            });

            js_runtime.op_state().borrow_mut().put(app_handle.clone());

            js_runtime.execute_script(
                "<setup>",
                r#"
                globalThis.takos = {
                    events: {
                        publish: async (eventName, payload) => {
                            await Deno.core.ops.op_publish_event(eventName, JSON.stringify(payload));
                        }
                    }
                };
            "#,
            ).map_err(type_error)?;

            let specifier: &'static str = Box::leak(ext.identifier.clone().into_boxed_str());
            js_runtime.execute_script(specifier, client_code)
                .map_err(type_error)?;

            let options = PollEventLoopOptions {
                wait_for_inspector: false,
                ..Default::default()
            };
            js_runtime.run_event_loop(options).await
                .map_err(type_error)?;

            println!("Loaded extension: {}", ext.identifier);
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tauri::command]
async fn kv_read(identifier: String, key: String) -> Result<serde_json::Value, String> {
    println!("KV Read: identifier={}, key={}", identifier, key);
    Ok(serde_json::json!({ "value": "dummy_value" }))
}

#[tauri::command]
async fn kv_write(identifier: String, key: String, value: serde_json::Value) -> Result<(), String> {
    println!("KV Write: identifier={}, key={}, value={}", identifier, key, value);
    Ok(())
}

#[tauri::command]
async fn kv_delete(identifier: String, key: String) -> Result<(), String> {
    println!("KV Delete: identifier={}, key={}", identifier, key);
    Ok(())
}

#[tauri::command]
async fn kv_list(identifier: String, prefix: Option<String>) -> Result<Vec<String>, String> {
    println!("KV List: identifier={}, prefix={:?}", identifier, prefix);
    Ok(vec!["dummy_key_1".to_string(), "dummy_key_2".to_string()])
}

#[tauri::command]
async fn cdn_read(identifier: String, path: String) -> Result<String, String> {
    println!("CDN Read: identifier={}, path={}", identifier, path);
    Ok("dummy_cdn_content".to_string())
}

#[tauri::command]
async fn cdn_write(
    identifier: String,
    path: String,
    data: String,
    cache_ttl: Option<u64>,
) -> Result<String, String> {
    println!(
        "CDN Write: identifier={}, path={}, data_len={}, cache_ttl={:?}",
        identifier, path, data.len(), cache_ttl
    );
    Ok("dummy_cdn_url".to_string())
}

#[tauri::command]
async fn cdn_delete(identifier: String, path: String) -> Result<(), String> {
    println!("CDN Delete: identifier={}, path={}", identifier, path);
    Ok(())
}

#[tauri::command]
async fn cdn_list(identifier: String, prefix: Option<String>) -> Result<Vec<String>, String> {
    println!("CDN List: identifier={}, prefix={:?}", identifier, prefix);
    Ok(vec!["dummy_cdn_path_1".to_string(), "dummy_cdn_path_2".to_string()])
}

#[tauri::command]
async fn activate_extension(identifier: String) -> Result<serde_json::Value, String> {
    println!("Activate Extension: identifier={}", identifier);
    // This is a placeholder. In a real scenario, you'd activate the extension
    // and return its exposed API.
    Ok(serde_json::json!({ "publish": "dummy_publish_function" }))
}

#[tauri::command]
async fn invoke_extension_event(
    _app_handle: tauri::AppHandle,
    identifier: String,
    fn_name: String,
    args: Vec<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    // This is a placeholder. In a real scenario, you'd need to
    // route this to the correct Deno runtime instance for the given extension.
    // For now, we'll just return a dummy success.
    println!(
        "Invoke extension event: {} - {} with args: {:?}",
        identifier, fn_name, args
    );
    Ok(serde_json::json!({ "success": true, "result": null }))
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                if let Err(e) = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                ) {
                    eprintln!("Failed to initialize logger: {}", e);
                }
            }

            let app_handle = app.handle().clone();

            thread::spawn(move || {
                let runtime = Builder::new_current_thread().enable_all().build().unwrap();

                runtime.block_on(async move {
                    if let Err(e) = load_extensions(app_handle).await {
                        eprintln!("Error loading extensions: {}", e);
                    }
                });
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            invoke_extension_event,
            kv_read,
            kv_write,
            kv_delete,
            kv_list,
            cdn_read,
            cdn_write,
            cdn_delete,
            cdn_list,
            activate_extension
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
