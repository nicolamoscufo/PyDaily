# Tutor: modelli, indizi e verifica tecnica

## Catalogo e download

`app/src/main/assets/web/models.json` è la fonte unica letta da Java e dall'interfaccia. Contiene cinque GGUF Q4_K_M: Qwen3-0.6B/1.7B, MobileLLM-**R1.5**-950M e i Qwen2.5-Coder 3B/1.5B originali. Ogni URL usa una revisione fissata; `bytes` e `sha256` sono obbligatori per download e riuso della cache. Il MobileLLM R1 precedente non è nel catalogo.

Il consenso FAIR Noncommercial Research v1 è una preferenza Android, non un campo dei progressi. Il bridge controlla il consenso al download e JNI controlla `general.license.name` anche sui GGUF importati. Non è una verifica legale o un'identificazione infallibile di file importati con metadati mancanti/alterati.

## Patch locale della dipendenza

La modifica approvata è limitata a `native/llama.cpp/src/models/llama4.cpp`, senza aggiornamento della dipendenza o invio upstream:

**La patch resta esclusa dalla pubblicazione Git ed è presente soltanto nella copia di lavoro locale.** Le build dai soli sorgenti pubblicati non includono la correzione del caricamento MobileLLM; il relativo test del loader denso richiede la patch locale. Le prove native riportate in `VERIFICA.md` sono state eseguite con essa.

- Zero esperti ammesso soltanto senza layer MoE; i tensori FFN densi e il relativo grafo esistevano già.
- Per `attention.sliding_window=0`, passo di esclusione RoPE maggiore del numero di layer: anche l'ultimo mantiene RoPE.
- Nessuna scala d'attenzione dei layer senza RoPE nel grafo full-attention: evitato l'assert su parametri di temperatura nulli. Il grafo SWA/MoE la conserva.
- Identificazione delle taglie dense dalle dimensioni nascoste 576/1024/1536; Q/K normalization mantenuta.

Il GGUF R1.5 selezionato dichiara architettura `llama4`, 22 layer, embedding 1536, 24 teste/6 KV, RoPE a 64 dimensioni, zero esperti e sliding window zero. La prova sintetica non dimostra compatibilità di tutti i tensori/quantizzazioni del file completo.

`native/tutor_policy.h` raccoglie grammatiche della sfida/indizio e suffisso Qwen3: il prefisso assistant termina con `<think>\n\n</think>\n\n` prima della tokenizzazione, evitando di richiedere una traccia da nascondere dopo. Per Llama4 senza chat template si usa il formato Llama3, aggiungendo `<|begin_of_text|>` soltanto se il tokenizer non lo inserisce automaticamente e il prompt non lo contiene già. Il GGUF MobileLLM selezionato ha `add_bos_token=false` e nessun chat template: il formatter Llama3 da solo non inserisce quel marcatore. Queste politiche non provano qualità o compatibilità di ogni GGUF importato.

## Campionamento vincolato nel bridge

`native/tutor_sampling.h` prepara i candidati prima della catena top-k/top-p/temperatura/distribuzione. Il filtro della grammatica invalida l'ordinamento della shortlist: `sorted` viene azzerato prima del nuovo top-k, altrimenti i token validi possono essere esclusi e le probabilità diventare NaN, causando l'assert nativo `llama_sampler_dist_apply: found`.

Se la shortlist non contiene token validi, il bridge riprova sul vocabolario completo. NaN, infiniti positivi, assenza di risultati finiti o di token compatibili producono un errore gestito, non vengono passati alla distribuzione. Non si aggira la grammatica con token arbitrari e non si elimina l'assert di llama.cpp. Questa correzione riguarda soltanto il bridge PyDaily, non richiede altre modifiche alla dipendenza. Errori numerici o di vocabolario interrompono il ciclo senza una rigenerazione automatica.

Entrambe le grammatiche limitano gli spazi JSON esterni alle stringhe a quattro caratteri consecutivi. Sul MobileLLM completo, con prompt sintetico e seed fisso, la grammatica precedente permetteva di consumare i token in soli spazi dopo il titolo. Il vincolo conserva JSON compatto, piccole indentazioni e tutti gli spazi/newline escapati del codice nelle stringhe. Non corregge automaticamente i contenuti: una risposta JSON completa può ancora essere scartata dal parser o da Python.

L'ordine della risposta nativa è `title, function, params, description, solution, cases, tips, study`: firma e parametri vengono scritti prima della consegna che deve nominarli. Prompt di generazione, esempio, revisione e grammatica usano lo stesso ordine. Il parser e i backup non dipendono dall'ordine delle chiavi; i campi salvati restano schema 1. Non vengono aggiunti nomi o regole alla descrizione dopo la risposta del modello per aggirarne la validazione.

Android riusa `MainActivity` con `singleTask`: riaprire l'app non crea un secondo WebView/LocalTutor. Il completamento della singola inferenza è annunciato come proposta ancora da verificare, non come sfida pronta. Soltanto il salvataggio dopo revisione e test autorizza **Apri la sfida**; dopo un errore è disponibile **Cambia modello** senza rimuovere quelli già scaricati.

## Indizi, stato e progressione

`practice.js` conserva `lastRun`, `lastFailure` e `lastRunAt` in `attempts[id]`, più al massimo tre `personalHints`. Sono campi opzionali dello schema **1**; `pydaily-v1` e i vecchi backup rimangono validi. I dati dei casi sono compattati; nessuna cronologia illimitata di esecuzioni o prompt.

`hintPrompt` include solo consegna, firma, bozza limitata e diagnosi Python reale: mai `solution`, `tips` o `study`. `parseHint` ammette soltanto testo breve e un focus enumerato, scartando codice esplicito/frammenti riconoscibili; non prova l'assenza di anticipazioni in linguaggio naturale né correttezza/italiano del modello.

Bridge separato `generateHint`, massimo 280 token e 60 secondi nativi/75 secondi JS. La bozza viene prima eseguita dal worker; timeout del codice distinto da errore del motore. Annullamento durante Python riavvia il worker, durante inferenza cancella JNI; busy nativo non viene azzerato artificialmente. Navigazione annulla l'indizio e una bozza cambiata impedisce il salvataggio della risposta. Aggiornamenti mirati preservano editor, cursore e scroll. Nessun premio o `revealedDay` dall'indizio.

La generazione successiva riceve l'ultimo errore dello **stesso percorso**, una sintesi del caso fallito e l'eventuale focus dell'indizio; dopo test superati il contesto segnala la correzione. Restano revisione cieca, casi incrociati e regole di progressione originali. L'adattamento è un vincolo di prompt, non una garanzia di difficoltà.

`generatedSequence` e `generatedProgress` in `core.js` derivano numeri, stati e prossima sfida dai campi schema 1 già presenti. L'ordine di inserimento delle chiavi `ai-*` rimane stabile nel JSON; la numerazione riparte per ogni percorso, non richiede una migrazione o premi aggiuntivi. Archivio e riapertura non dipendono dalla disponibilità del GGUF. Il completamento asincrono apre l'esercizio solo se la schermata di partenza è ancora attiva, visibile e senza dialogo; altrimenti aggiorna soltanto il pannello di disponibilità.

## Metriche

`metrics.js` applica una whitelist e conserva al massimo 40 record nella chiave separata `pydaily-tutor-metrics-v1`. Inferenze e cicli completi hanno esiti distinti; il ciclo misura generazione, eventuale secondo tentativo, revisione e validazione Python. Export manuale `PyDaily-misure-tutor.json`, nessun invio automatico, prompt o codice.

I tempi nativi di caricamento/prompt/decode/campionamento e i token sono disponibili quando JNI completa la risposta. Errori/timeout possono avere solo durata ed esito. Il PSS Java viene misurato dopo il rilascio; `peakProcessRssMiB` è il massimo del processo dalla sua partenza, non un picco per richiesta né la memoria totale dei processi dell'app. Token/s usa `decodeTokens`, non tutti i token di output. Non confondere velocità/accettazione automatica con qualità didattica.

## Test riproducibili

```powershell
npm test
npm run test:browser
.venv\Scripts\python.exe tools/verify_curriculum.py
.\gradlew.bat assembleDebug
.\tools\test_native.ps1 -DeviceSerial "SERIAL_ADB"
```

Il test nativo richiede NDK del progetto, NumPy e le librerie prodotte dalla build Gradle. `-Sdk` e `-Python` consentono percorsi diversi; senza seriale compila soltanto. Genera tre GGUF sintetici di pochi KB fuori dalla repository, compila i test JSON/policy e loader, li esegue via ADB ARM64 e rimuove soltanto i propri file temporanei dal telefono. Non installa l'APK né legge/modifica modelli o progressi dell'app. Verifica decodifica finita densa e MoE, RoPE/QK, grammatica indizi e rifiuto del MoE senza esperti. Il test del campionamento usa grammatica e samplers reali: ordinamento invalidato, token raro fuori shortlist, vocabolario incompatibile e logits non finiti. Verifica anche JSON completo di sfida/indizio, whitespace compatto/indentato, codice escapato e rifiuto di spazi esterni eccessivi. Output: `JSON_COMPLETION_OK`, `BOUNDED_JSON_OK`, `GRAMMAR_SAMPLING_OK`, `DENSE_LOADER_OK`; **non è un benchmark MobileLLM**.

Prima di promuovere un nuovo modello: confrontare sullo stesso dispositivo casi di errore Python, indizi in italiano senza soluzione, cicli nei sette percorsi, rifiuti/timeout, RAM e latenza. Le conversioni Q4 comunitarie e i punteggi di coding esterni non attestano capacità di tutoraggio italiano.
