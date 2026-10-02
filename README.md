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
- Suggerimenti progressivi, spiegazioni, soluzione guidata e ripasso a 1/3/7/14 giorni.
- XP, obiettivo quotidiano, streak, notifiche opzionali e backup JSON.
- Qwen2.5-Coder 3B o 1.5B quantizzato in GGUF, download verificato e inferenza locale su CPU.
- Nuove sfide sottoposte a controlli del formato e all'esecuzione della soluzione prima di essere mostrate.

La guida completa per usare l'app è in [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

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
| `runner.js` / `python-worker.js` | Esecuzione Python e timeout |
| `app/src/main/java/it/pydaily/app/` | WebView, download GGUF, notifiche e bridge |
| `native/tutor.cpp` | Inferenza JNI e grammatica JSON |
| `native/llama.cpp/` | Dipendenza vendorizzata fissata, con licenza |
| `tools/make_curriculum.py` | Fonte editoriale del catalogo |
| `tests/` | Test dello stato e flussi browser |

Modifica i contenuti in `tools/make_curriculum.py`, poi rigenera con `python3 tools/make_curriculum.py`. `curriculum.js` è un file generato.

[VERIFICA.md](VERIFICA.md) distingue le verifiche effettuate sulla versione originale da quelle rieseguite durante questa consegna. La nuova build Gradle e una prova su Android fisico restano da eseguire.

Licenze: [LICENSE](LICENSE) e [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
