# PyDaily

App Android in italiano per esercizi Python quotidiani, con difficoltà adattiva e un tutor LLM eseguito sul dispositivo.

Questa repository contiene il progetto esistente completo: app Android, interfaccia WebView, Python/NumPy offline, bridge JNI, sorgenti fissati di llama.cpp, catalogo didattico e test. I pesi dei modelli si scaricano dall'app e non fanno parte della repository.

## Riprendere in OpenCode

Apri questa cartella in OpenCode, oppure avvia dalla radice:

```bash
opencode .
```

Il file [AGENTS.md](AGENTS.md) fornisce le regole del progetto. [OPENCODE.md](OPENCODE.md) contiene lo stato dei lavori, le priorità e un prompt iniziale pronto da usare.

## Funzionalità presenti

- 70 esercizi offline, 22 mini-lezioni e 7 percorsi: Python, algoritmi, dati/NumPy, ML, DL, RL e automazione.
- Esecuzione reale di Python 3.12 e NumPy in un worker separato.
- Difficoltà per percorso: un livello in più dopo due problemi diversi risolti autonomamente.
- Suggerimenti progressivi, indizi personali basati sul codice e sulla sua esecuzione Python, spiegazioni, soluzione guidata e ripasso a 1/3/7/14 giorni.
- XP, obiettivo quotidiano, streak, notifiche opzionali e backup JSON.
- Temi Chiaro, Scuro e Come il telefono in Profilo → Aspetto; scorciatoie dell'editor leggibili anche su telefoni stretti.
- Qwen2.5-Coder 3B/1.5B e opzioni sperimentali Qwen3-0.6B, Qwen3-1.7B e **MobileLLM-R1.5-950M**, in GGUF Q4_K_M, download verificato e inferenza locale su CPU. MobileLLM richiede consenso alla licenza non commerciale.
- Cambio fra modelli scaricati senza eliminare i precedenti; misure locali esportabili di tempi, token e cicli di generazione.
- Nuove sfide sottoposte a controlli del formato e all'esecuzione della soluzione prima di essere mostrate.
- **Tutor → Sfide del tutor**: archivio numerato per percorso, bozze da riprendere, risultati autonomi/guidati e continuazione dalla prima sfida ancora da svolgere, anche senza modello attivo.

La guida completa per usare l'app è in [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

**Limite della pubblicazione:** la patch MobileLLM in `native/llama.cpp/src/models/llama4.cpp` resta soltanto nella copia di lavoro locale ed è esclusa da commit e push. Il catalogo conserva MobileLLM, ma una build dai soli sorgenti pubblicati non include la correzione necessaria al suo caricamento. Anche il test nativo del loader denso richiede quella patch. Qwen e le modifiche del bridge PyDaily non dipendono da essa.

## Verifiche rapide

Richiede Node.js 20 o successivo. I test dello stato non richiedono installazioni npm:

```bash
npm test
```

Per verificare tutte le soluzioni del catalogo:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-dev.txt
python3 tools/verify_curriculum.py
```

Su Windows usa `python` al posto di `python3` e attiva l'ambiente con `.venv\Scripts\Activate.ps1` in PowerShell.

Per l'interfaccia e il motore Python nel browser:

```bash
npm install
npx playwright install chromium
npm run test:browser
```

Gli screenshot del test vengono salvati in `artifacts/`. Per usare un browser già installato, imposta `PYDAILY_BROWSER_EXECUTABLE` al suo percorso. Il test sceglie una porta locale libera.

Per le prove native ARM64 con fixture sintetiche, dopo la build Android: `tools/test_native.ps1 -DeviceSerial SERIAL_ADB`. Non installa l'app né usa i suoi modelli/progressi. Dettagli in [docs/TUTOR_MODELS.md](docs/TUTOR_MODELS.md).

## Preview

```bash
npm run preview
```

Apri [http://localhost:8765](http://localhost:8765). La preview esegue gli esercizi offline; il GGUF richiede l'app Android.

## Build Android

Apri la radice del progetto in Android Studio. Usa JDK 17, Android SDK 35, NDK 28.1.13356709 e CMake 3.22.1. Gradle scarica le proprie dipendenze alla prima build:

```bash
./gradlew assembleDebug
```

Su Windows: `gradlew.bat assembleDebug`. L'APK viene prodotto in `app/build/outputs/apk/debug/`.

La chiave di sviluppo che firmava il vecchio APK non era nell'archivio recuperato. Se `tools/development.jks` manca, il progetto usa la normale chiave debug di Android. Se possiedi la chiave originale, inseriscila in quel percorso; resta esclusa da Git. Una firma diversa impedisce di installare sopra il vecchio APK: esporta i progressi dall'app prima di qualsiasi reinstallazione.

La vecchia pipeline diretta è conservata in `tools/build_apk.py`: richiede un ambiente SDK/ECJ/NDK preparato separatamente. Non è necessaria per usare Android Studio.

## Mappa del codice

| Percorso | Contenuto |
| --- | --- |
| `app/src/main/assets/web/` | Interfaccia e logica JavaScript |
| `core.js` | Stato, XP, livelli, ripasso e backup |
| `tutor.js` | Prompt, parsing e collegamento al tutor nativo |
| `practice.js` / `metrics.js` | Diagnosi delle prove e misure locali limitate |
| `models.json` | Catalogo unico dei GGUF, revisioni, dimensioni e SHA-256 |
| `runner.js` / `python-worker.js` | Esecuzione Python e timeout |
| `app/src/main/java/it/pydaily/app/` | WebView, download GGUF, notifiche e bridge |
| `native/tutor.cpp` | Inferenza JNI e grammatica JSON |
| `native/llama.cpp/` | Dipendenza vendorizzata fissata, con licenza; patch MobileLLM solo nella copia locale |
| `tools/make_curriculum.py` | Fonte editoriale del catalogo |
| `tests/` | Test dello stato e flussi browser |

Modifica i contenuti in `tools/make_curriculum.py`, poi rigenera con `python3 tools/make_curriculum.py`. `curriculum.js` è un file generato.

[VERIFICA.md](VERIFICA.md) distingue le verifiche originali da quelle successive, comprese build/installazione ARM64, editor/tema sul telefono e misure sul GGUF reale. I test con bridge simulato non attestano prestazioni o qualità del modello; il collaudo completo dei sette percorsi e delle notifiche rimane da eseguire.

Licenze: [LICENSE](LICENSE) e [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
