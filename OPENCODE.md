# Riprendere PyDaily in OpenCode

## Obiettivo

Creare un'app Android in italiano in cui risolvere problemi Python ogni giorno, ricevere suggerimenti, studiare i concetti mancanti ed esplorare percorsi fino a machine learning, deep learning e reinforcement learning. La difficoltà cresce con i risultati. Un piccolo LLM locale specializzato nel codice genera ulteriori sfide.

La scelta dell'utente del 2 ottobre 2026 è proseguire il progetto in OpenCode. Questi sono i sorgenti recuperati dalla versione PyDaily 1.0; non è un nuovo progetto.

## Stato concreto

Il progetto comprende 70 esercizi, 22 lezioni, 234 test del catalogo, editor Python/NumPy offline, progressi locali, backup, ripasso e notifiche. Il tutor mantiene Qwen2.5-Coder 3B/1.5B e aggiunge Qwen3-0.6B/1.7B e MobileLLM-R1.5-950M Q4_K_M come opzioni sperimentali. Indizi personali, contesto degli errori e misure locali sono descritti in `docs/TUTOR_MODELS.md`.

Architettura: Activity Android con WebView → interfaccia JavaScript → PythonRunner con Pyodide in worker; per il tutor, JavaScript → bridge Java → JNI → llama.cpp. Gli asset di esecuzione sono inclusi.

Controllo delle sfide generate: JSON vincolato dalla grammatica, quattro ingressi distinti, firma verificata con AST Python, ritorni JSON finiti e controllo delle ripetizioni. Dopo l'esecuzione iniziale, lo stesso tutor locale deriva da zero una soluzione e nuovi test dalla sola descrizione/firma (senza vedere soluzione, output attesi, tips o study originali). Entrambe le soluzioni devono superare i casi incrociati realmente eseguiti in Python. Si rifiutano contratti dichiarati ambigui dal revisore, contraddizioni, test senza almeno due ingressi nuovi e test che accettano una costante o un parametro invariato. Rimane il secondo tentativo automatico, anche dopo un errore di revisione.

Questa revisione non è una prova formale della semantica: generatore e revisore usano lo stesso modello e possono condividere un errore. Il filtro delle ripetizioni confronta titolo, descrizione e codice normalizzati, non dimostra originalità assoluta. Una prova richiede normalmente due inferenze, fino a quattro con la rigenerazione: latenza e qualità sul telefono restano da misurare.

## Verifica durante la preparazione della repository

- Rieseguiti gli 8 test dello stato: tutti superati.
- Rieseguite le 70 soluzioni del catalogo contro 234 casi: tutte superate.
- Conservato VERIFICA.md con le prove effettuate nella sessione originale.
- Il test browser è stato reso portabile: dipendenza Playwright dichiarata, browser standard o percorso configurabile, porta libera e artefatti dentro la repository.
- Controllata la sintassi del test browser; i flussi UI non sono stati rieseguiti perché il download di Chromium nell'ambiente di consegna ha restituito un archivio non valido.
- La configurazione debug usa la chiave standard di Android quando la chiave recuperata manca.
- Nessuna nuova funzionalità didattica è stata implementata durante la preparazione della repository.
- Una nuova build Gradle, l'inferenza del modello reale e i test su Android fisico non sono stati rieseguiti qui. Aggiorna questa sezione solo dopo le prove effettive.

## Sviluppo successivo — 2 ottobre 2026

- Riprodotti nel browser la sostituzione del primo tip e la perdita di selezione dell'editor; riprodotta l'accettazione di una consegna con soluzione/test reciprocamente concordi ma semanticamente errati.
- Pannello cumulativo dei suggerimenti: aggiornamento del solo pannello senza ricreare l'editor né scorrere automaticamente la pagina. Il numero sbloccato è salvato in `attempts[id].tipsUnlocked`, campo opzionale nello schema 1, e viene recuperato alla riapertura. Nessuna rivelazione automatica della soluzione; XP, prove guidate e progressione restano invariati.
- Implementati prompt più esplicito, revisione cieca locale, controlli Python e test incrociati descritti sopra. Grammatica JNI, llama.cpp e modelli 3B/1.5B invariati. Gli ultimi dieci messaggi di rifiuto sono disponibili in memoria tramite `window.PyDailyNative.diagnostics()`; non vengono salvati nel backup o inviati a servizi esterni.
- Corretta la generazione del catalogo su Windows: UTF-8 esplicito e nessuna scrittura durante l'importazione da parte del verificatore. Rigenerato il catalogo, senza modifiche ai contenuti. Corretti i percorsi degli screenshot Windows nel test browser.
- `npm test`: **23 test superati**. Catalogo con Python dell'ambiente `.venv` e NumPy: **70 soluzioni, 234 casi superati**. `tools/test_curriculum_generation.py`: **2 test superati**.
- `npm run test:browser`: superati flussi mobile 393×852 e desktop 1200×900, suggerimenti cumulativi/persistenti, codice/selezione/scroll invariati durante i tips, XP e prova guidata, NumPy e timeout reale. Superati anche incoerenza semantica, soluzione che memorizza i test, controlli AST/ritorni, secondo tentativo, ripetizioni, annullamento durante la revisione e risposta tardiva ignorata. Il bridge LLM è simulato; Python/NumPy sono realmente eseguiti.
- Sintassi JavaScript e `tests/browser.test.mjs` verificata con `node --check`.
- Primo tentativo di `gradlew.bat assembleDebug` con JDK 17 bloccato perché l'SDK Android non era configurato; risolto durante l'installazione successiva descritta sotto. Dettagli e limiti in `VERIFICA.md`.

## Installazione sul telefono — 2 ottobre 2026

- Installati SDK 35, Build Tools 35.0.0, NDK 28.1.13356709 e CMake 3.22.1 sul PC. Nessun cambio alle dipendenze del progetto.
- `gradlew.bat assembleDebug`: **BUILD SUCCESSFUL**, inclusa la libreria JNI ARM64. Verificate firma APK v2 e allineamento a pagine da 16 KB.
- Installazione USB con ADB: **Success** sul telefono ARM64 modello 2506BPN68G, API 37. Avvio di `it.pydaily.app/.MainActivity`: **Status: ok**; interfaccia WebView osservata nella schermata Profilo. Nei log del processo: caricamento di NumPy completato dagli asset locali, senza errori fatali rilevati nel campione controllato.
- Verifica limitata a build/installazione/avvio: non provati esercizi, tastiera, notifiche, download o inferenza GGUF sul telefono. Nessun modello scaricato dall'agente. Aggiunta l'esclusione Git della cache CMake `.cxx`.

## Prima sessione consigliata

1. Leggi AGENTS.md, README.md e questa guida.
2. Esegui npm test e python3 tools/verify_curriculum.py.
3. Installa Playwright/Chromium e riesegui npm run test:browser.
4. Apri il progetto in Android Studio ed esegui assembleDebug.
5. Verifica installazione, tastiera, suggerimenti, salvataggio, download del GGUF, generazione e notifiche su un dispositivo ARM64.

SDK/NDK/CMake e la versione fissata di llama.cpp sono nei file Gradle/CMake. Non aggiornare queste dipendenze come prima operazione senza un motivo concreto.

## Modelli piccoli e indizi personali — 2 ottobre 2026

- Scelta aggiornata dell'utente: **MobileLLM-R1.5-950M**, non R1. Aggiunto catalogo unico `models.json` con fonti comunitarie esplicite, revisioni/hash/dimensioni fissati, consenso FAIR non commerciale, cache conservata e rimozione selettiva anche dei download parziali.
- Indizio dalla bozza e dal risultato Python reale, senza soluzione di riferimento; grammatica/bridge dedicati e budget 60 secondi. Tre indizi salvati per esercizio, ripasso dopo errore, nessun XP o soluzione guidata automatica; editor/cursore/scroll preservati. Timeout del codice analizzabile, errori del motore non usati come diagnosi dell'allievo.
- Campi diagnostici opzionali nello schema 1; ultimo errore dello stesso percorso e sua correzione orientano la prossima generazione senza modificare i livelli. Metriche separate limitate a 40 record, export manuale senza prompt/codice; significato di RSS/PSS documentato.
- Patch locale mirata approvata per dense Llama4/MobileLLM; nessun aggiornamento completo di llama.cpp o invio upstream. Corretti zero esperti, RoPE dell'ultimo layer, scala d'attenzione inutilizzata e identificazione della taglia; Q/K norm e percorso MoE mantenuti.
- `npm test`: **45/45**; browser con Python/NumPy reali e LLM simulato: **superato**. Catalogo: **70 soluzioni/234 casi**. Test C++ ARM64 con fixture sintetiche sul telefono: **JSON_COMPLETION_OK** e **DENSE_LOADER_OK**, incluse decodifica densa/MoE e grammatica indizi.
- Build Android riuscita. Nessuna installazione di questa nuova versione né download/inferenza dei tre nuovi GGUF completi; qualità degli indizi italiani, prestazioni e compatibilità del MobileLLM completo rimangono da collaudare. Dettagli aggiornati in `VERIFICA.md`.

## Sfide del tutor e crash — aggiornamento successivo del 2 ottobre 2026

- Nuova schermata **Tutor → Sfide del tutor**: tutte le sfide salvate in ordine, numero per percorso, stati da iniziare/in corso/guidata/risolta da te, contatori e continuazione dalla prima incompleta. Prossimo problema riusa una sfida salvata prima di generare. Stesso schema 1, XP e livelli condivisi con il percorso; funzionamento anche senza GGUF attivo.
- Riprodotta nel browser una sfida aperta dietro un dialogo di lezione; il completamento ora apre automaticamente solo dalla schermata originaria ancora visibile e senza dialoghi, altrimenti mostra Apri la sfida senza sostituire l'editor.
- Crash fisico segnalato dall'utente con MobileLLM: log Android `llama_sampler_dist_apply`, assert `found`, SIGABRT nel thread local-inference. Il bridge non invalidava `sorted` dopo il filtro grammaticale della shortlist. Corretto in `native/tutor_sampling.h`, aggiunti controlli di candidati/numerica e fallback al vocabolario completo; nessuna nuova modifica a llama.cpp.
- `npm test`: **51/51**. Browser: **superato** con Python/NumPy reali e bridge LLM simulato, compresi archivio, ripresa, risultati, dialoghi/editor, offline e backup. Test ARM64 sintetici sul telefono: **GRAMMAR_SAMPLING_OK**, più JSON e dense/MoE.
- Build, firma v2 e allineamento 16 KB superati. Aggiornamento autorizzato via `adb install -r`: **Success**. Progressi byte per byte identici dopo l'installazione: 25 XP, 1 risultato, 5 bozze, 0 sfide generate. MobileLLM da 618.907.200 byte conservato, SHA-256 corrispondente al catalogo. Risultati della prova con GGUF completo e limiti in `VERIFICA.md`.
- Segnalazione successiva di sfida annunciata ma non utilizzabile: trovate due Activity/WebView; la prima prova CDP era dell'istanza non visibile. Aggiunto riuso `singleTask`, installato e verificato con dati invariati. Messaggi ora distinguono proposta ricevuta da sfida pronta dopo i controlli, con Cambia modello dopo un errore.
- Riprodotto con GGUF MobileLLM completo e prompt sintetico un ciclo di whitespace dopo il titolo; limitato `ws` a quattro caratteri nelle grammatiche PyDaily. JSON poi completato, ma ancora contenuti non validi: nessun successo del ciclo MobileLLM dichiarato. **52/52** unit test, suite browser e **BOUNDED_JSON_OK** ARM64 superati. Esiti successivi in `VERIFICA.md`.
- Qwen3-0.6B scaricato e selezionato per le prove autorizzate, MobileLLM conservato. Primo ciclo scartato due volte per parametri assenti dalla descrizione. Riordinati prompt/grammatica per produrre firma e parametri prima della consegna, senza indebolire il parser o modificare i backup. Ripristinato BOS mancante nel fallback Llama3 del MobileLLM; nessun prefisso di ragionamento vuoto aggiunto a quel modello. **53/53**, browser, test ARM64 e build superati; nuova correzione installata con progressi ancora invariati. Risultato reale successivo in `VERIFICA.md`.

## Attenzioni utili

- La chiave che firmava l'APK originale non era nei sorgenti. Non puoi aggiornare quel pacchetto con una chiave diversa: esporta i progressi prima di reinstallare.
- validateState in core.js disattiva il promemoria anche quando carica lo stato all'avvio; verifica se distinguere caricamento locale e importazione di un backup. È un'osservazione del codice, da riprodurre prima della correzione.
- Il pannello cumulativo dei tip è ora verificato nel browser; tastiera e comportamento del WebView Android restano da provare sul dispositivo.
- Il tutor piccolo può ancora condividere errori fra generazione e revisione. Misura i nuovi prompt sul GGUF reale prima di considerare provata la qualità didattica.
- La preview web non esegue il GGUF. Un bridge simulato serve soltanto a verificare i flussi UI.
- pandas, scikit-learn, PyTorch e TensorFlow non sono inclusi. Le sfide ML/DL/RL insegnano i concetti con Python, NumPy e piccoli dati.

## Priorità successive proposte

Questa lista è una proposta di sviluppo, non lavoro già svolto:

1. Completare il collaudo sul telefono e misurare il ciclo generazione → revisione → verifica con GGUF reale, inclusi tempi, RAM, rifiuti e casi semanticamente errati sfuggiti ai controlli.
2. Collaudare l'aiuto personale implementato e confrontare i tre modelli sperimentali con i Qwen2.5 originali: lingua italiana, indizi senza anticipazioni, qualità dei sette percorsi e metriche sul dispositivo.
3. Aggiungere una breve diagnosi iniziale per scegliere il punto di partenza in ogni percorso.
4. Introdurre mini-progetti conclusivi: analizzatore CSV, kNN, rete neurale semplice e Q-learning.
5. Misurare tempi, RAM e qualità del 3B sul dispositivo; valutare accelerazione solo dopo una baseline.

## Prompt iniziale pronto

```text
Continua questo progetto PyDaily esistente. Leggi AGENTS.md, README.md,
OPENCODE.md e VERIFICA.md. Prima verifica il funzionamento dei test e della
build Android; poi controlla i suggerimenti e il ciclo di generazione del
tutor locale. Mantieni esecuzione reale offline di Python/NumPy, interfaccia
italiana, progressione per percorso e compatibilità dei progressi.
Non ricreare l'app da zero. Dimmi quali problemi hai riprodotto, correggili
e indica le verifiche realmente completate.
```

## Repository e GitHub

L'archivio consegnato contiene la cartella pydaily con repository Git e cronologia. Il bundle alternativo si clona con:

```bash
git clone PyDaily-repository.bundle pydaily
cd pydaily
opencode .
```

Il remoto `origin` è ora configurato su `https://github.com/nicolamoscufo/PyDaily.git`; il branch `main` segue `origin/main`. Le modifiche di sviluppo successive non sono pubblicate automaticamente.

Per la pubblicazione parziale richiesta dall'utente, la modifica a `native/llama.cpp/src/models/llama4.cpp` resta locale, fuori dal commit. Le prove native e le installazioni descritte sopra usavano anche quella patch: il supporto MobileLLM e `DENSE_LOADER_OK` non sono riproducibili dai soli sorgenti pubblicati. Non viene inviato alcun contributo o PR a llama.cpp upstream.

Documentazione ufficiale OpenCode: https://opencode.ai/docs/rules/ e https://opencode.ai/docs/cli/.
