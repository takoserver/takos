use deno_core::FsModuleLoader;
use deno_core::{
    error::{CoreError, JsError},
    op2, Extension, ModuleSpecifier, OpState,
};
use deno_fs::RealFs;
use deno_permissions::UnstableSubdomainWildcards;
use deno_resolver::npm::{DenoInNpmPackageChecker, NpmResolver};
use deno_runtime::deno_permissions::PermissionsContainer;
use deno_runtime::permissions::RuntimePermissionDescriptorParser;
use deno_runtime::worker::{MainWorker, WorkerOptions, WorkerServiceOptions};
use once_cell::sync::Lazy;
use reqwest;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::{Arc, Mutex};
use std::thread;
use sys_traits::impls::RealSys;
use tauri::{AppHandle, Emitter, Manager};
use tokio::runtime::Builder;
use tokio::sync::{mpsc, oneshot};

// --- Worker Management ---

struct ExtensionWorker {
    command_tx: mpsc::Sender<WorkerCommand>,
}

static WORKERS: Lazy<Mutex<HashMap<String, ExtensionWorker>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

enum WorkerCommand {
    Invoke {
        fn_name: String,
        args: Vec<serde_json::Value>,
        response_tx: oneshot::Sender<Result<serde_json::Value, String>>,
    },
    Shutdown,
}

// --- Deno Runtime Setup ---

const TAKOS_SETUP_SCRIPT: &str = r#"
globalThis.takos = {
    events: {
        publish: async (eventName, payload) => {
            await Deno.core.ops.op_publish_event(eventName, payload);
        }
    }
};
"#;

fn type_error_str(err: impl std::fmt::Display) -> String {
    err.to_string()
}

fn type_error_core(err: impl std::fmt::Display) -> CoreError {
    CoreError::Js(JsError {
        name: Some("TypeError".into()),
        message: Some(err.to_string()),
        stack: None,
        cause: None,
        exception_message: err.to_string(),
        frames: vec![],
        source_line: None,
        source_line_frame_index: None,
        aggregated: None,
        additional_properties: vec![],
    })
}

#[derive(Serialize, Clone)]
struct EventPayload {
    identifier: String,
    #[serde(rename = "eventName")]
    event_name: String,
    payload: serde_json::Value,
}

#[op2(async)]
async fn op_publish_event(
    state: Rc<RefCell<OpState>>,
    #[string] event_name: String,
    #[serde] payload: serde_json::Value,
) -> Result<(), CoreError> {
    let (app_handle, identifier) = {
        let state = state.borrow();
        let app_handle = state.borrow::<AppHandle>().clone();
        let identifier = state.borrow::<String>().clone();
        (app_handle, identifier)
    };
    app_handle
        .emit(
            "deno-event",
            EventPayload {
                identifier,
                event_name,
                payload,
            },
        )
        .map_err(type_error_core)?;
    Ok(())
}

fn spawn_extension_worker(
    app_handle: AppHandle,
    identifier: String,
    client_code: String,
) -> Result<mpsc::Sender<WorkerCommand>, String> {
    let (command_tx, mut command_rx) = mpsc::channel::<WorkerCommand>(1);
    let thread_identifier = identifier.clone();

    thread::spawn(move || {
        let runtime = Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();

        runtime.block_on(async move {
            let deno_extension = Extension {
                name: "takos_ext",
                ops: std::borrow::Cow::from(vec![op_publish_event::DECL]),
                ..Default::default()
            };

            let main_module = ModuleSpecifier::parse("ext:bootstrap").unwrap();
            let permission_desc_parser = Arc::new(RuntimePermissionDescriptorParser::new(
                RealSys,
                UnstableSubdomainWildcards::Enabled,
            ));
            let fs = Arc::new(RealFs);
            let services = WorkerServiceOptions::<DenoInNpmPackageChecker, NpmResolver<RealSys>, RealSys> {
                deno_rt_native_addon_loader: None,
                module_loader: Rc::new(FsModuleLoader),
                permissions: PermissionsContainer::allow_all(permission_desc_parser),
                blob_store: Default::default(),
                broadcast_channel: Default::default(),
                feature_checker: Default::default(),
                node_services: Default::default(),
                npm_process_state_provider: Default::default(),
                root_cert_store_provider: Default::default(),
                fetch_dns_resolver: Default::default(),
                shared_array_buffer_store: Default::default(),
                compiled_wasm_module_store: Default::default(),
                v8_code_cache: Default::default(),
                fs,
            };
            let worker_options = WorkerOptions {
                extensions: vec![deno_extension],
                ..Default::default()
            };

            let mut worker = MainWorker::bootstrap_from_options(&main_module, services, worker_options);

            // Store app_handle and identifier in OpState
            worker.js_runtime.op_state().borrow_mut().put(app_handle);
            worker.js_runtime.op_state().borrow_mut().put(thread_identifier.clone());

            if let Err(e) = worker.execute_script("<setup>", TAKOS_SETUP_SCRIPT.to_string().into()) {
                eprintln!("[{}] Failed to setup takos object: {}", thread_identifier, e);
                return;
            }

            let specifier: &'static str = Box::leak(thread_identifier.clone().into_boxed_str());
            if let Err(e) = worker.execute_script(specifier, client_code.into()) {
                eprintln!("[{}] Failed to execute client code: {}", thread_identifier, e);
                return;
            }

            println!("[{}] Worker started successfully.", thread_identifier);

            // Main worker loop
            loop {
                tokio::select! {
                    // Wait for commands from the main thread
                    Some(command) = command_rx.recv() => {
                        match command {
                            WorkerCommand::Invoke { fn_name, args, response_tx } => {
                                // TODO: Implement function invocation in Deno
                                // This is a simplified example. A robust implementation would
                                // use `worker.js_runtime.call_function` or similar, which
                                // requires more setup to get the function handle.
                                // For now, we'll simulate it.
                                println!("[{}] Invoking function '{}' with args: {:?}", thread_identifier, fn_name, args);
                                let result = Ok(serde_json::json!({ "status": "invoked" }));
                                let _ = response_tx.send(result);
                            },
                            WorkerCommand::Shutdown => {
                                println!("[{}] Shutdown command received.", thread_identifier);
                                break;
                            }
                        }
                    },
                    // Run the Deno event loop
                    result = worker.run_event_loop(false) => {
                        if let Err(e) = result {
                            eprintln!("[{}] Event loop error: {}", thread_identifier, e);
                            break;
                        }
                    }
                }
            }

            println!("[{}] Worker terminated.", thread_identifier);
        });
    });

    Ok(command_tx)
}

// --- Tauri Commands ---

#[tauri::command]
async fn load_extension_client(
    app_handle: AppHandle,
    identifier: String,
    client_code: String,
) -> Result<(), String> {
    println!("Loading client extension: {}", identifier);
    let mut workers = WORKERS.lock().map_err(type_error_str)?;
    if workers.contains_key(&identifier) {
        println!("Extension {} already loaded. Unloading first.", identifier);
        unload_extension_client(identifier.clone()).await?;
    }

    let command_tx =
        spawn_extension_worker(app_handle, identifier.clone(), client_code)?;
    workers.insert(identifier.clone(), ExtensionWorker { command_tx });
    println!("Successfully loaded client extension: {}", identifier);
    Ok(())
}

#[tauri::command]
async fn unload_extension_client(identifier: String) -> Result<(), String> {
    println!("Unloading client extension: {}", identifier);
    let mut workers = WORKERS.lock().map_err(type_error_str)?;
    if let Some(worker) = workers.remove(&identifier) {
        // Send shutdown command, but don't wait for it to complete.
        // The thread will clean itself up.
        let _ = worker.command_tx.send(WorkerCommand::Shutdown).await;
        println!("Successfully unloaded client extension: {}", identifier);
        Ok(())
    } else {
        Err(format!("Extension {} not found.", identifier))
    }
}

#[tauri::command]
async fn invoke_extension_client(
    identifier: String,
    fn_name: String,
    args: Vec<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let command_tx = {
        let workers = WORKERS.lock().map_err(type_error_str)?;
        workers
            .get(&identifier)
            .ok_or_else(|| format!("Extension '{}' not found or not running.", identifier))?
            .command_tx
            .clone()
    };

    let (response_tx, response_rx) = oneshot::channel();

    let command = WorkerCommand::Invoke {
        fn_name,
        args,
        response_tx,
    };

    command_tx
        .send(command)
        .await
        .map_err(|e| format!("Failed to send command to worker: {}", e))?;

    response_rx
        .await
        .map_err(|e| format!("Failed to receive response from worker: {}", e))?
}

// --- Application Setup ---

#[derive(Deserialize, Debug)]
struct TakosExtensionInfo {
    identifier: String,
    client: Option<String>,
}

async fn initial_load_extensions(app_handle: AppHandle) {
    println!("Fetching extensions from backend...");
    // It's better to use a configurable URL
    let extensions_result = reqwest::get("http://localhost:8000/api/extensions").await;

    let extensions = match extensions_result {
        Ok(res) => match res.json::<Vec<TakosExtensionInfo>>().await {
            Ok(exts) => exts,
            Err(e) => {
                eprintln!("Failed to parse extensions list: {}", e);
                return;
            }
        },
        Err(e) => {
            eprintln!("Failed to fetch extensions list: {}", e);
            return;
        }
    };

    for ext in extensions {
        if let Some(client_code) = ext.client {
            if !client_code.trim().is_empty() {
                 if let Err(e) = load_extension_client(app_handle.clone(), ext.identifier, client_code).await {
                     eprintln!("Failed to load extension: {}", e);
                 }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle().clone();
            // Load extensions in a separate async task
            tauri::async_runtime::spawn(async move {
                initial_load_extensions(app_handle).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_extension_client,
            unload_extension_client,
            invoke_extension_client
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}