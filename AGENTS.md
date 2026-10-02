# PyDaily: istruzioni per gli agenti

Leggi README.md e OPENCODE.md prima di modificare il progetto. Questo è un progetto Android già implementato: continua i sorgenti esistenti.

## Prodotto e vincoli

- Interfaccia, consegne e spiegazioni in italiano, chiare e adatte allo studio.
- Esercizi quotidiani, difficoltà adattiva distinta per ciascuno dei sette percorsi.
- Python e NumPy realmente eseguiti offline. Non sostituire l'esecuzione con valutazioni del LLM.
- Tutor locale con GGUF e llama.cpp. Mantieni Qwen2.5-Coder 3B e l'alternativa 1.5B.
- Prompt, codice e progressi rimangono sul dispositivo; nessun servizio remoto di inferenza.
- Due problemi diversi risolti autonomamente fanno salire di livello. I tip non bloccano il progresso; vedere la soluzione completa rende la prova guidata.
- La banca generata può crescere; non promettere correttezza semantica o originalità assoluta.
- Mantieni compatibilità con i backup esistenti pydaily-v1 e schema 1; se cambi lo schema, implementa una migrazione.
- Preserva XP, ripasso, progressi e salvataggio delle bozze nelle modifiche dell'interfaccia.

## Struttura

- app/src/main/assets/web/app.js: schermate e interazioni.
- core.js: stato e progressione; tutor.js: prompt e validazione.
- runner.js e python-worker.js: motore Python in worker con timeout.
- app/src/main/java/it/pydaily/app/: Android, modello e notifiche.
- native/tutor.cpp: JNI, inferenza e grammatica.
- native/llama.cpp/: dipendenza vendorizzata. Modificala solo quando il compito riguarda quella dipendenza; in quel caso leggi le sue istruzioni locali.
- tools/make_curriculum.py: fonte del catalogo. Rigenera curriculum.js dopo gli aggiornamenti.

## Verifica

- Stato/progressione: npm test.
- Catalogo: python3 tools/verify_curriculum.py (richiede NumPy).
- Interfaccia/worker: npm run test:browser dopo npm install e npx playwright install chromium.
- Preview: npm run preview.
- Android: ./gradlew assembleDebug; Windows: gradlew.bat assembleDebug.
- Esegui verifiche appropriate alle modifiche e indica quali non puoi completare.
- Test con bridge nativo simulato non provano prestazioni o qualità del modello reale.
- Non descrivere come completata una prova su Android fisico se non è stata eseguita.

## Build e igiene

JDK 17, SDK 35, NDK 28.1.13356709 e CMake 3.22.1. Il Gradle wrapper è incluso.
La chiave originale non è inclusa: il debug usa la chiave standard se tools/development.jks manca.
Non aggiungere chiavi, token, pesi GGUF dell'utente, APK, cache, build o node_modules a Git.
Preserva asset Pyodide/NumPy, font e licenze. I file GGUF già vendorizzati dentro llama.cpp sono fixture upstream, non i pesi del tutor.
Non sostituire l'architettura né introdurre un backend senza una richiesta dell'utente.
