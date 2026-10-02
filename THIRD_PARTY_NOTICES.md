# Componenti inclusi in PyDaily

Il codice applicativo originale è distribuito con la licenza MIT in `LICENSE`.
I componenti di terze parti mantengono le rispettive licenze.

| Componente | Versione | Licenza / fonte |
| --- | --- | --- |
| llama.cpp e ggml | snapshot del tag v0.5.0; patch densa Llama4/MobileLLM solo nella copia locale, non pubblicata | MIT e avvisi inclusi in `native/llama.cpp` |
| Pyodide | 0.27.7 | MPL-2.0; sorgenti: https://github.com/pyodide/pyodide/tree/0.27.7 |
| CPython in Pyodide | 3.12 | Python Software Foundation License; vedere il file incluso |
| NumPy | 2.0.2 | BSD e avvisi del progetto; wheel locale inclusa |
| Manrope | font variabile del progetto Google Fonts | SIL Open Font License 1.1 |
| Gradle Wrapper | 8.11.1 | Apache License 2.0; https://github.com/gradle/gradle/tree/v8.11.1 |
| Runtime C++ LLVM | Android NDK r28b | Avvisi e licenze inclusi in `vendor/licenses/LLVM-NOTICE.txt` |

I testi delle licenze dei runtime e del font sono in `app/src/main/assets/web/vendor/licenses`.
Il sorgente llama.cpp è incluso, con la propria licenza e i propri avvisi.
La chiave originale `tools/development.jks` non è inclusa. Se manca, la build usa la chiave debug standard di Android; non è una chiave di pubblicazione.

I pesi dei tutor GGUF **non sono inclusi nell’APK o nei sorgenti**. Le fixture GGUF upstream di llama.cpp non sono questi pesi. Il download opzionale usa repository ufficiali Qwen2.5 e conversioni comunitarie Qwen3/MobileLLM; revisioni, fonti e SHA-256 sono in `app/src/main/assets/web/models.json`:

- https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF
- https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF
- https://huggingface.co/unsloth/Qwen3-0.6B-GGUF (Apache-2.0; modello originale Qwen)
- https://huggingface.co/unsloth/Qwen3-1.7B-GGUF (Apache-2.0; modello originale Qwen)
- https://huggingface.co/SantoshV007/MobileLLM-R1.5-950M-Q4_K_M-GGUF (modello originale Meta: https://huggingface.co/facebook/MobileLLM-R1.5-950M)

Qwen2.5-Coder 3B mantiene la Qwen Research License; il 1.5B è Apache-2.0. MobileLLM-R1.5 mantiene la **FAIR Noncommercial Research License v1, 18 agosto 2025**, non la licenza MIT dell'app: limita usi e output a usi non commerciali consentiti. Il testo completo e la FAIR Acceptable Use Policy sono inclusi in `app/src/main/assets/web/vendor/licenses/mobilellm-r15.txt`, dalla fonte https://github.com/facebookresearch/MobileLLM-R1/blob/main/LICENSE. L'app richiede consenso esplicito prima del download. La conversione comunitaria non elimina queste restrizioni.
