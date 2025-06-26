use deno_core::op2;
use deno_core::{Extension, JsRuntime, OpState, PollEventLoopOptions, RuntimeOptions};
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
    eventName: String,
    payload: String,
}

#[op2(async)]
#[allow(dead_code)]
pub async fn op_publish_event(
    state: Rc<RefCell<OpState>>,
    #[string] event_name: String,
    #[string] payload: String,
) -> Result<(), deno_core::anyhow::Error> {
    let app_handle = {
        let state = state.borrow();
        state.borrow::<AppHandle>().clone()
    };
    app_handle.emit(
        "deno-event",
        EventPayload {
            eventName: event_name,
            payload: payload,
        },
    )?;
    Ok(())
}

async fn load_extensions(app_handle: AppHandle) {
    let extensions_result = reqwest::get("http://localhost:8000/api/extensions").await;
    if let Err(e) = extensions_result {
        eprintln!("Failed to fetch extensions: {}", e);
        return;
    }

    let extensions = match extensions_result
        .unwrap()
        .json::<Vec<TakosExtensionInfo>>()
        .await
    {
        Ok(ext) => ext,
        Err(e) => {
            eprintln!("Failed to parse extensions: {}", e);
            return;
        }
    };

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

            if let Err(e) = js_runtime.execute_script(
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
            ) {
                eprintln!("Error setting up runtime for {}: {}", ext.identifier, e);
                continue;
            }

            let specifier: &'static str = Box::leak(ext.identifier.clone().into_boxed_str());
            let result = js_runtime.execute_script(specifier, client_code);
            if let Err(e) = result {
                eprintln!("Error executing extension {}: {}", ext.identifier, e);
                continue;
            }

            let options = PollEventLoopOptions {
                wait_for_inspector: false,
                ..Default::default()
            };
            if let Err(e) = js_runtime.run_event_loop(options).await {
                eprintln!("Error running event loop for {}: {}", ext.identifier, e);
            }

            println!("Loaded extension: {}", ext.identifier);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
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
                    load_extensions(app_handle).await;
                });
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
