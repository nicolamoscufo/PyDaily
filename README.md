# PyDaily 1.0

App Android in italiano per allenarsi ogni giorno con Python e capire cosa ripassare.

## Installazione

1. Scarica **PyDaily-Android.apk** sul telefono o tablet.
2. Apri il file. Se Android lo richiede, consenti l’installazione di app da quella specifica sorgente, poi scegli **Installa**.
3. Apri PyDaily e scegli un obiettivo: 1, 3 o 5 problemi al giorno.
4. Per le sfide generate, apri **Profilo → Il tuo tutor locale → Qwen2.5-Coder 3B → Scarica**. Usa preferibilmente Wi-Fi e tieni l’app aperta durante il download.
5. Quando il tutor è pronto, tocca **Genera una sfida**. Gli esercizi inclusi sono già disponibili prima del download.

Requisiti: **Android 8 o successivo, processore ARM a 64 bit** e Android System WebView aggiornato. L’APK non supporta dispositivi Android a 32 bit o emulatori x86. Il 3B è la scelta consigliata per il dispositivo con almeno 8 GB di RAM indicato durante la creazione. Se la generazione è lenta, scegli il modello 1.5B.

## Cosa trovi

- 70 esercizi con esecuzione reale di Python 3.12 e NumPy, tutti inclusi offline.
- 7 percorsi: Python, algoritmi, dati e NumPy, machine learning, deep learning, reinforcement learning, automazione.
- 22 mini-lezioni con spiegazioni, esempi e domande di comprensione.
- Suggerimenti progressivi e pulsante **Non ho capito** per aprire una spiegazione collegata al problema.
- Obiettivo quotidiano, XP, giorni consecutivi e calendario dell’attività.
- Ripasso dei concetti dopo 1, 3, 7 e 14 giorni. Un errore riporta il concetto al ripasso di oggi.
- Notifica quotidiana opzionale, con orario scelto. Android può ritardarla per risparmio energetico.
- Backup JSON esportabile e importabile, con codice e sfide generate. I pesi GGUF non sono inclusi nel backup.

## Progressione

Ogni percorso parte dal livello 1 e sale dopo **due problemi diversi risolti senza vedere la soluzione completa**. I tip non impediscono di avanzare. La soluzione completa rende la prova guidata: assegna meno XP e non aumenta il livello; il giorno successivo puoi riprovarla autonomamente.

Ripetere la stessa soluzione non moltiplica gli XP. Per l’obiettivo giornaliero conta una sola risoluzione di ogni esercizio nella stessa giornata. Puoi comunque ripassare un esercizio nei giorni successivi.

Il tutor riceve percorso, livello, concetti da consolidare ed esercizi recenti. Genera nuovi problemi con consegna, firma della funzione, soluzione di riferimento, casi di test, tip e spiegazione. La banca generata può crescere nel tempo e il livello non ha un tetto numerico. Non è una promessa di difficoltà sempre maggiore o di originalità assoluta: la qualità dipende anche dal modello.

Quando il tutor non è attivo, puoi usare la banca editoriale e, dopo averla completata in un percorso, laboratori con nuovi dati riproducibili.

## Modello locale

| Modello | File scaricato | Scelta pratica |
| --- | --- | --- |
| Qwen2.5-Coder 3B Instruct Q4_K_M | 2.10 GB circa | Più capace; consigliato con 8+ GB di RAM |
| Qwen2.5-Coder 1.5B Instruct Q4_K_M | 1.12 GB circa | Più leggero e generalmente più rapido |

I modelli sono scaricati dai repository ufficiali Qwen su Hugging Face, con revisione fissata e controllo SHA-256. Puoi interrompere e riprendere un download; il modello attivo precedente resta disponibile fino al completamento del nuovo. Usa **Importa GGUF** per un modello compatibile già presente nei tuoi file. I GGUF importati vengono copiati nell’area privata dell’app e verificati come formato; non vengono convertiti.

Il modello si carica quando serve, usa la CPU con un massimo di 4 thread e viene liberato al termine della generazione. Prompt, progressi e codice non vengono inviati a un servizio di inferenza. La connessione serve soltanto per scaricare i pesi.

I tempi reali dipendono dal dispositivo: un 3B può richiedere da decine di secondi a diversi minuti. Mantieni l’app aperta durante una generazione. Dopo quattro minuti il tentativo viene interrotto; il modello 1.5B è disponibile come alternativa.

## Come vengono controllate le nuove sfide

1. La generazione è vincolata a un JSON valido tramite grammatica.
2. L’app controlla firma, campi, tipi JSON e almeno 3 test con risultati differenti.
3. Esegue la soluzione del modello contro tutti i test nel motore Python locale.
4. Controlla che una risposta costante non superi tutti i test.
5. Rifiuta titoli o soluzioni già presenti fra le sfide generate.
6. Scarta una sfida non valida e prova una seconda generazione; nessun esercizio scartato influenza XP o livello.

Dopo una sfida del tutor, **Prossimo problema** ne genera un’altra usando il livello aggiornato.

Queste verifiche controllano **coerenza eseguibile**, non dimostrano che la consegna sia semanticamente perfetta o che i test siano esaustivi. Un LLM piccolo può sbagliare. Puoi leggere i test e richiedere una nuova sfida se il problema è poco chiaro.

## Codice Python e dati

Ogni verifica gira in un worker separato dalla UI. Un’esecuzione che dura più di quattro secondi viene fermata e il motore viene riavviato. Sono disponibili la libreria standard selezionata e NumPy. Non sono inclusi pandas, scikit-learn, PyTorch o TensorFlow: i percorsi ML, DL e RL implementano i concetti con funzioni Python e piccoli dataset.

I moduli non inclusi, input interattivo e accesso ai file non sono disponibili negli esercizi. Questo isolamento è pensato per il codice scritto dall’utente di un’app personale, non come sandbox di sicurezza per codice ostile multiutente.

I progressi sono salvati nel WebView sul dispositivo. Disinstallare l’app elimina questi dati e i modelli. **Esporta un backup** prima di reinstallarla o cambiare dispositivo. Non è presente sincronizzazione cloud o login.

## Sorgenti e build

Apri questa cartella in Android Studio con JDK 17. Installa SDK 35, NDK 28.1.13356709 e CMake 3.22.1 quando richiesto, poi esegui:

```bash
./gradlew assembleDebug
```

Il progetto include la versione fissata **llama.cpp v0.5.0**, il bridge JNI, il catalogo didattico e i file Pyodide. Per aggiornare i contenuti, modifica `tools/make_curriculum.py` e rigenera `app/src/main/assets/web/curriculum.js`:

```bash
python3 tools/make_curriculum.py
node --test tests/core.test.mjs
python3 tools/verify_curriculum.py
```

Il test Python richiede NumPy nell’ambiente di sviluppo. Per una preview web del contenuto:

```bash
python3 -m http.server 8765 --directory app/src/main/assets/web
```

Apri `http://localhost:8765` in un browser moderno. L’inferenza GGUF è disponibile soltanto nell’app Android. Il test `tests/browser.test.mjs` usa Playwright e un Chrome headless indicato nel file di test; adatta i percorsi alla tua installazione prima di eseguirlo.

L’APK consegnato è una build di sviluppo firmata, non un’app pubblicata su Google Play. `tools/build_apk.py` documenta anche la pipeline diretta usata per la build consegnata: AAPT2, ECJ, D8, JNI, zipalign a 16 KB e apksigner. La chiave di sviluppo non è una chiave di pubblicazione del Play Store.

## Verifiche

Il file `VERIFICA.md` riporta le verifiche effettivamente completate. Non è stata effettuata una prova su un telefono Android fisico: prestazioni, notifiche e download dal dispositivo richiedono la prima prova sul tuo telefono.

## Idee per le prossime versioni

- Sessione diagnostica iniziale per adattare il punto di partenza nei singoli percorsi.
- Tutor che analizza il codice errato e dà un indizio senza rivelare la soluzione.
- Mini-progetti conclusivi: analizzatore CSV, kNN, piccola rete neurale, agente Q-learning.
- Metriche di qualità per i problemi generati e una revisione indipendente del contratto.
- Modelli più efficienti e accelerazione GPU quando supportata dal dispositivo.

## Componenti e fonti

- [Qwen2.5-Coder 3B GGUF ufficiale](https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF)
- [Qwen2.5-Coder 1.5B GGUF ufficiale](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF)
- [llama.cpp](https://github.com/ggml-org/llama.cpp), licenza MIT, inclusa nei sorgenti.
- [Pyodide 0.27.7](https://pyodide.org/en/0.27.7/), licenza MPL-2.0; Python e NumPy mantengono le proprie licenze.
- [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope), SIL Open Font License.

Consulta `THIRD_PARTY_NOTICES.md` e la cartella `app/src/main/assets/web/vendor/licenses`.
