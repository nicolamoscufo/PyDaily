# Componenti inclusi in PyDaily

Il codice applicativo originale è distribuito con la licenza MIT in `LICENSE`.
I componenti di terze parti mantengono le rispettive licenze.

| Componente | Versione | Licenza / fonte |
| --- | --- | --- |
| llama.cpp e ggml | snapshot del tag v0.5.0 | MIT e avvisi inclusi in `native/llama.cpp` |
| Pyodide | 0.27.7 | MPL-2.0; sorgenti: https://github.com/pyodide/pyodide/tree/0.27.7 |
| CPython in Pyodide | 3.12 | Python Software Foundation License; vedere il file incluso |
| NumPy | 2.0.2 | BSD e avvisi del progetto; wheel locale inclusa |
| Manrope | font variabile del progetto Google Fonts | SIL Open Font License 1.1 |
| Gradle Wrapper | 8.11.1 | Apache License 2.0; https://github.com/gradle/gradle/tree/v8.11.1 |
| Runtime C++ LLVM | Android NDK r28b | Avvisi e licenze inclusi in `vendor/licenses/LLVM-NOTICE.txt` |

I testi delle licenze dei runtime e del font sono in `app/src/main/assets/web/vendor/licenses`.
Il sorgente llama.cpp è incluso, con la propria licenza e i propri avvisi.
La chiave `tools/development.jks` è una chiave di sviluppo del progetto, con password `android`,
usata per rendere possibili build di sviluppo compatibili con l’APK consegnato.

I modelli GGUF **non sono inclusi nell’APK o nei sorgenti**. Il loro download opzionale usa i repository
ufficiali Qwen. I modelli mantengono le licenze descritte nelle rispettive model card:

- https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF
- https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF
