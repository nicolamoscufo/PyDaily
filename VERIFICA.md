# Verifica di PyDaily 1.0

La consegna include un APK di sviluppo firmato e il progetto Android completo.

## Verifiche completate

- **Catalogo editoriale:** 70 soluzioni di riferimento verificate contro 234 casi in Python con NumPy.
- **Progressione e stato:** 8 test automatici per XP, assenza di premi sugli errori, avanzamento per percorso, soluzioni guidate, mancato doppio premio, streak, ripasso, backup e schema delle sfide generate.
- **Editor reale:** verificata l’esecuzione in Pyodide, compreso un esercizio NumPy. Verificato il caso `print` senza `return`, che non supera i test.
- **Protezione dell’interfaccia:** un ciclo infinito viene terminato dopo 4 secondi; il motore viene riavviato.
- **Interfaccia:** flussi provati su viewport mobile 393×852 e desktop 1200×900. Controllati ricerca delle lezioni, quiz, suggerimenti, soluzione guidata, salvataggio e riapertura. Corretto un overflow sul formato telefono.
- **Flusso del tutor:** provato con un bridge controllato: una soluzione con test incoerenti viene scartata, la seconda viene verificata e soltanto quella valida entra nella banca esercizi. Verificati anche la generazione del problema successivo, l’uso del livello aggiornato e il rifiuto delle ripetizioni.
- **Inferenza reale:** compilato ed eseguito lo stesso bridge JNI su host con il modello ufficiale Qwen2.5-Coder 3B Q4_K_M. Una sfida Python e una sfida sul calcolo della distanza euclidea hanno superato i rispettivi test dopo gli affinamenti del prompt e del formato.
- **Scaricamento del modello:** verificati URL ufficiale fissato, formato GGUF e SHA-256 del file 3B completo. Il peso verificato è 2.104.932.800 byte.
- **Build nativa:** compilazione della libreria JNI per Android ARM64 con NDK r28b, CPU generica ARMv8 e runtime C++ statico.
- **Pacchetto:** firma APK v2/v3 e allineamento a pagine da 16 KB verificati con gli strumenti Android.

## Limiti della verifica

Non è stata eseguita una prova su un telefono Android fisico. Restano da verificare sul dispositivo installazione e comportamento del WebView, tempi e memoria dell’inferenza, download dall’app e notifiche nel regime di risparmio energetico del telefono.

Le verifiche delle nuove sfide controllano esecuzione, coerenza dei risultati e alcuni casi banali. Non dimostrano correttezza semantica assoluta della consegna, copertura completa dei test o originalità di ogni problema. Il primo test del modello aveva prodotto una closure non coerente con gli output dichiarati: quell’esercizio è stato scartato. Il formato finale impone quattro test e ritorni compatibili con JSON.

La pipeline Gradle/Android Studio è inclusa per lavorare sui sorgenti. L’APK consegnato è stato prodotto con la pipeline diretta documentata in `tools/build_apk.py`, non con una build Gradle verificata in questa sessione.

## Preparazione della repository — 2 ottobre 2026

- Recuperati i sorgenti della versione 1.0 e inizializzata una repository Git con cronologia.
- Rieseguiti gli 8 test di stato/progressione: tutti superati.
- Rieseguite le 70 soluzioni del catalogo contro 234 casi: tutti superati.
- Reso portabile l'avvio del test browser; screenshot in artifacts/ e porta locale libera.
- Verificata la sintassi del test browser. I flussi UI non sono stati rieseguiti: il download di Chromium ha restituito un archivio non valido nell'ambiente di questa sessione.
- Aggiunte istruzioni di sviluppo, AGENTS.md e OPENCODE.md per la ripresa del progetto.
- Configurata la firma debug standard come alternativa quando tools/development.jks manca.
- La chiave del vecchio APK non era nell'archivio recuperato.

Le verifiche della prima sezione si riferiscono alla consegna originale. La nuova build Gradle, l'inferenza reale e le prove su un dispositivo Android non sono state rieseguite durante la preparazione della repository.

## Suggerimenti e tutor — sviluppo successivo, 2 ottobre 2026

### Problemi riprodotti prima delle correzioni

- Due click sui tip mostravano soltanto l'ultimo; l'editor veniva sostituito e la selezione tornava a `0, 0`.
- Una consegna «triplo» con codice e expected del «doppio» superava parsing ed esecuzione reale. I test del modello, da soli, non confrontavano la semantica con il testo.
- Il verificatore importava il generatore e riscriveva il catalogo: su Windows la codifica cp1252 causava un `UnicodeEncodeError` dopo l'apertura in scrittura, lasciando `curriculum.js` vuoto. Il catalogo è stato recuperato rigenerandolo dalla fonte, senza modificare gli esercizi.
- Il test browser usava `URL.pathname` per gli screenshot e falliva su Windows con un percorso `C:\C:\...`.

### Verifiche completate in questa sessione

Ambiente: Windows, Node.js 24.14.1, Python 3.13 con NumPy 2.5.3 in `.venv`, Playwright 1.62.1/Chromium e JDK 17.

- `npm test`: **23/23** test di stato, progressione, backup schema 1 e tutor superati. Compresi backup precedenti con tre casi e senza `params`, metadati opzionali dei tip, rifiuto di contratti alterati/ambigui, ingressi ripetuti, risultati non discriminanti e annullamento.
- `.venv\Scripts\python.exe tools/verify_curriculum.py`: **70 soluzioni e 234 casi** superati con NumPy. Il verificatore non riscrive più il catalogo.
- `.venv\Scripts\python.exe tools/test_curriculum_generation.py`: **2/2** test superati: importazione senza scritture e generazione UTF-8 con ambiente di codifica legacy Windows. Rigenerato `curriculum.js`: contenuti identici al catalogo versionato.
- `node --check tests/browser.test.mjs` e controllo sintattico di `app.js`, `tutor.js`, `python-worker.js`: superati.
- `npm run test:browser`: **superato** su viewport mobile 393×852 e desktop 1200×900. Verificati suggerimenti cumulativi, rilettura, conservazione dello stesso nodo editor/codice/selezione/scroll, nessuna soluzione automatica, ripristino dei tip dopo navigazione e ricaricamento. XP autonomi (50 dopo due problemi), prova guidata (8 XP), livelli distinti, ripasso, esecuzione NumPy e timeout di 4 secondi restano funzionanti.
- Nel worker Python reale: rifiutate firme incoerenti, parametri opzionali e `*args`, funzioni async, closure, ritorni non finiti e import casuali anche da `numpy.random`; accettata ed eseguita una soluzione NumPy valida.
- Con **bridge LLM simulato e Python/NumPy reali**: rifiutata una proposta con test e soluzione concordi ma contrari al testo; seconda proposta verificata tramite revisione cieca e test incrociati. Rifiutata anche una soluzione che memorizza soltanto gli expected iniziali e un insieme di test che accetta il parametro invariato. Conservati 6–8 casi incrociati nella sfida (8 nella prova eseguita), verificati ripetizioni e livello aggiornato.
- Provato annullamento durante la revisione simulata: nessuna sfida salvata, nessun tentativo aggiuntivo e risposta tardiva ignorata. Diagnostica dei rifiuti limitata agli ultimi dieci tentativi/messaggi, solo in memoria locale.

### Limiti e prossimo passo

- Il primo tentativo di `gradlew.bat assembleDebug` falliva con `SDK location not found`; il blocco è stato risolto durante l'installazione successiva documentata sotto.
- **Nessuna inferenza GGUF reale effettuata.** Prima dell'installazione successiva non era stata eseguita alcuna prova fisica. I test con bridge simulato non misurano qualità, RAM, tempi o comportamento della cancellazione JNI dei modelli 3B/1.5B. Java, JNI, llama.cpp, modelli e grammatica non sono stati modificati.
- La revisione usa lo stesso modello locale in una nuova richiesta senza soluzione/output originali: può rilevare ambiguità e produrre casi discriminanti, ma può anche ripetere gli errori del generatore. Non dimostra correttezza semantica assoluta, copertura completa o originalità; il filtro non riconosce tutte le parafrasi o le riscritture del codice. I controlli sui tips bloccano la funzione completa esplicita, non qualsiasi rivelazione in linguaggio naturale.
- Ogni proposta valida richiede una seconda inferenza; un ciclo con rigenerazione può arrivare a quattro richieste locali. Il prossimo passo è misurare qualità didattica, latenza e RAM sul modello reale e provare editor/tastiera/download/notifiche sul telefono. L'osservazione sul promemoria in `validateState` rimane fuori dalle correzioni di questa sessione.

## Build e installazione USB — 2 ottobre 2026

- Configurato il PC con SDK 35, Build Tools 35.0.0, NDK 28.1.13356709, CMake 3.22.1 e JDK 17. Le versioni Gradle/CMake del progetto non sono state cambiate.
- `gradlew.bat assembleDebug --console=plain`: **BUILD SUCCESSFUL**, 35 task eseguiti, inclusa la compilazione JNI ARM64. APK debug: `app/build/outputs/apk/debug/app-debug.apk`, 21.419.638 byte, escluso da Git insieme alle cache `.cxx`.
- `apksigner verify --verbose`: firma **v2 verificata**. `zipalign -c -P 16 4`: **superato**.
- Telefono collegato: modello **2506BPN68G**, ABI **arm64-v8a**, API **37**. Nessuna installazione precedente di `it.pydaily.app` rilevata; non eseguite disinstallazioni o cancellazioni di dati.
- `adb install -r`: **Success**. Pacchetto installato con versione 1.0.0, versionCode 1, targetSdk 35.
- `adb shell am start -W -n it.pydaily.app/.MainActivity`: **Status: ok**; processo attivo. Gerarchia UI del WebView osservata nella schermata Profilo, con pannello tutor locale e rilevamento RAM dal bridge nativo. Il campione di log del solo processo mostra `Loaded numpy` dagli asset `https://pydaily.local/...`; nessun errore fatale o `UnsatisfiedLinkError` rilevato nel campione.
- Questa è una **prova di installazione e avvio**, non un collaudo completo: non eseguiti esercizi o inferenza reale sul telefono; tastiera, progressione, suggerimenti, download GGUF, consumo RAM, tempi e notifiche rimangono da verificare sul dispositivo. Nessun peso GGUF scaricato o incluso nell'APK dall'agente.

## Editor, temi e attesa del tutor — 2 ottobre 2026

### Difetti riprodotti

- Su viewport da 320 e 393 px, «4 spazi», «return» e «Ripristina» erano compressi a 40 px e il testo usciva dai pulsanti.
- Avviando la generazione dal Profilo, il pannello di avanzamento e Annulla non comparivano. Passando a Oggi era possibile annullare la stessa richiesta.
- Nell'APK Gradle debug, JNI/llama.cpp/GGML erano compilati senza `-O` (verificato in `build.ninja`). Il timeout dell'interfaccia azzerava busy prima della conferma nativa e poteva avviare automaticamente un'altra richiesta mentre la precedente terminava.
- Dopo un errore di avvio Python, le nuove verifiche potevano rimanere pendenti senza un worker pronto o un altro timeout di avvio.

### Correzioni e verifiche automatiche

- Scorciatoie a capo, testo da 14 px, bersagli da almeno 44 px, etichette accessibili e contrasto alto. I numeri di riga non fanno crescere l'editor quando la bozza è lunga.
- Profilo → Aspetto: Chiaro, Scuro, Come il telefono. Preferenza locale separata da `pydaily-v1`, applicata prima dei CSS e alle barre Android; progressi e schema 1 invariati.
- Build debug ottimizzata con `-O3`, mantenendo simboli/assert, ARMv8-A generico e dipendenza vendorizzata invariata. Nessuna istruzione ARM avanzata obbligatoria introdotta.
- Eventi JNI di caricamento, elaborazione e token, pannello anche in Profilo/Studio, numero del tentativo, errori persistenti. Limite nativo di 180 secondi con callback di aborto anche durante il calcolo/caricamento e salvaguardia JS a 195 secondi. Timeout e annullamento non avviano rigenerazioni; il secondo tentativo resta per gli esercizi scartati dai controlli.
- Prompt compatti, sempre con contenuti didattici in italiano e gli stessi vincoli semantici; revisione cieca invariata. Il JNI termina alla chiusura dell'oggetto JSON vincolato, senza aspettare whitespace o un ulteriore token finale.
- `npm test`: **35/35** superati. Compresi avanzamento per ID, timeout, risposta tardiva, errore del bridge, busy fino alla conferma nativa e recupero dopo errore Python.
- `npm run test:browser`: **superato**, incluse le nuove prove di generazione da Profilo/Studio, errore persistente e nessun retry dopo timeout; temi e contrasto >=4.5 sui componenti misurati, pulsanti non tagliati a 320/393/1200 px, conservazione di editor/cursore/scroll, XP e backup.
- Test C++ `tests/native-json.test.cpp`, compilato con NDK ed eseguito sul telefono: **JSON_COMPLETION_OK**, tutte le divisioni fra chunk, escape, parentesi nei testi, oggetti annidati e risposte incomplete. Il test riconosce la terminazione, non sostituisce grammatica o verifiche Python.

### Misure intermedie sul GGUF reale

- Il modello 1.5B è stato scaricato dall'utente nell'app: file da 1.117.320.768 byte. L'agente non ha scaricato o trasferito pesi sul PC.
- Aggiornamento con `adb install -r`: **Success**, senza disinstallazione. Controllate impronte SHA-256 dei campi di stato prima/dopo: XP (25), bozze, risposte, ripasso, lezioni, preferenze e banca inalterati; GGUF ancora disponibile.
- Prima prova ottimizzata con il prompt lungo precedente: caricamento ~1,7 s, elaborazione iniziale fino a ~50 s, oltre 767 token a ~176 s. Timeout nativo a ~180,2 s, tutor libero, motivo visibile e nessun nuovo tentativo automatico. L'inferenza non era ferma: non completava la risposta nel budget.
- Prima versione dei prompt compatti: tre inferenze concluse in ~64,7 s, ~60,6 s e ~47 s. Prima proposta scartata per parametro assente dalla descrizione; seconda scartata dal revisore per una firma che invece era già valida. Nessuna sfida salvata, XP invariati. Aggiunti esempio del formato e firma esplicita nella richiesta cieca (sempre senza soluzione o expected); affinata la distinzione fra ambiguità del contratto e assenza intenzionale del corpo da implementare.
- Editor/tema nel WebView reale a **394 px**: tutti gli otto pulsanti non tagliati, almeno 44×44 px; selezione Scuro dal Profilo applicata, nodo editor/codice/cursore/scroll conservati cambiando tema. Ripristinata la preferenza precedente. Non provata la tastiera virtuale tramite input fisico.
- Questi risultati intermedi **non attestano ancora una generazione completa**. La prova con prompt affinati è distinta e va riportata soltanto dopo il suo completamento. Il 3B non è presente sul dispositivo e non è stato provato in questa sessione.

## Modelli piccoli, MobileLLM-R1.5 e indizi personali — 2 ottobre 2026

### Implementazione

- Catalogo condiviso `models.json`: Qwen3-0.6B/1.7B e **MobileLLM-R1.5-950M** Q4_K_M sperimentali; conservati Qwen2.5-Coder 3B/1.5B. R1 sostituito dalla scelta R1.5 prima del collaudo. Fonti comunitarie esplicite, revisioni fissate, dimensioni e SHA-256; modelli precedenti non eliminati al cambio e cache verificata di nuovo prima del riuso. Rimozione selettiva dei file completi/parziali.
- Licenza/AUP FAIR non commerciale incluse offline, consenso esplicito prima del download, controllo JNI della licenza dichiarata anche per import. Qwen3 usa il prefisso assistant non-thinking prima della tokenizzazione, non una traccia prodotta e poi nascosta.
- Indizi dalla bozza e dall'esecuzione Python reale, senza soluzione di riferimento nel prompt. Bridge/grammatica dedicati, massimo 280 token/60 secondi nativi e timeout JS a 75 secondi. Nessuna assegnazione XP o `revealedDay`; tre indizi per esercizio, diagnosi compatte e ripasso conservati nello schema 1.
- Ultimo errore nello stesso percorso e correzione verificata orientano la generazione successiva; regole dei livelli invariate. Metriche limitate a 40 operazioni, separate dai progressi ed esportabili senza prompt/codice/output Python.

### Difetti nativi riprodotti e patch locale approvata

- Il loader Llama4 rifiutava zero esperti nonostante i rami FFN densi già presenti. Il passo RoPE nel caso full-attention escludeva l'ultimo layer; la taglia confrontava valori errati di embedding.
- La prima decodifica della fixture densa, dopo questi interventi, riproduceva l'assert `f_attn_temp_scale != 0.0f`: il grafo costruiva una scala non utilizzata, con parametri nulli. Corretta la costruzione nel solo percorso senza SWA; il percorso SWA/MoE mantiene la scala.
- Modificato soltanto `native/llama.cpp/src/models/llama4.cpp` nella dipendenza, senza aggiornamento completo, commit, push o invio upstream. Q/K normalization mantenuta.

### Verifiche completate

- `npm test`: **45/45** test superati. Compresi catalogo e R1.5, diagnosi dal risultato Python, indizi senza soluzione/XP, backup precedenti e nuovi campi opzionali, filtro delle risposte, adattamento distinto per percorso, timeout breve, APK precedente privo del nuovo bridge, whitelist/limite delle metriche e distinzione timeout del codice/errore del motore.
- `npm run test:browser`: **superato** con LLM simulato e Python/NumPy reali. Verificati indizio sul `print` senza ritorno, risultati/output reali nel prompt, bozza troncata segnalata, stesso nodo editor/codice/selezione/direzione/scroll, conservazione dei tip e degli indizi dopo navigazione/reload. Risposta con funzione completa scartata; risposte su bozze cambiate/tardive ignorate; annullamento durante Python e inferenza simulata; timeout nativo simulato e timeout Python **reale** analizzato dal tutor. Nessuna soluzione automatica o XP dall'indizio; la verifica successiva assegna regolarmente 25 XP.
- Nel browser: nuova generazione contiene errore corretto dello stesso percorso e mantiene livello 1; UI dei cinque modelli senza overflow a 320/393/1200 px; download MobileLLM non avviato prima del consenso, selezione della cache/rimozione del parziale instradate correttamente, export misure privo di codice/prompt. Tutti i flussi precedenti di progressione, revisione cieca, annullamento, tema, NumPy e timeout restano superati.
- `.venv\Scripts\python.exe tools/verify_curriculum.py`: **70 soluzioni/234 casi** superati, catalogo invariato. Sintassi di sette file JS/test controllata con `node --check`.
- API Hugging Face alle revisioni fissate: **dimensioni/hash/metadati di tutti e cinque i file corrispondenti al catalogo**. Controllati gli header remoti del GGUF R1.5 (architettura densa Llama4, 22 layer, embedding 1536, zero esperti e sliding window zero). Non scaricati i pesi completi. Licenza/AUP incluse confrontate con la fonte Meta: identiche salvo whitespace.
- `tools/test_native.ps1` con NDK r28b e ADB: **superato su Android ARM64 fisico**. `JSON_COMPLETION_OK`, compreso suffisso Qwen3 e assenza di modifiche per Qwen2/Llama4. `DENSE_LOADER_OK`: fixture dense da 7.808 byte e MoE da 18.112 byte, decodifica di tre token con logits finiti, RoPE e Q/K norm mantenuti, grammatica indizi inizializzata, MoE senza esperti rifiutato. Lo script compila contro le librerie del progetto; non installa l'app e rimuove soltanto i propri file temporanei dal telefono. Rimossi anche i file delle prove native manuali.
- Build finale `gradlew.bat assembleDebug --console=plain`: **BUILD SUCCESSFUL**, Java e JNI ARM64. APK `app/build/outputs/apk/debug/app-debug.apk`, **21.420.063 byte**. Firma v2 verificata e controllo `zipalign -c -P 16 4` superato.

### Limiti

- **Questa nuova versione non è stata installata nell'app sul telefono.** Non modificati i pesi o i progressi esistenti. Esecuzione nativa fisica limitata ai test con fixture sintetiche, non ai tre nuovi tutor completi.
- Non ancora provati download/ripresa/SHA-256/cambio dei nuovi GGUF nell'app, inferenza reale Qwen3/MobileLLM-R1.5, prefisso non-thinking con pesi reali, qualità dell'italiano o disciplina degli indizi. Il test del loader non verifica tutti i tensori/quantizzazioni del GGUF completo né confronta la numerica con Transformers.
- Un filtro del testo non dimostra che il modello non anticipi una soluzione in linguaggio naturale o non inventi un errore; l'adattamento della difficoltà è un'indicazione di prompt. Coerenza eseguibile e revisione cieca non sono prove semantiche o di originalità assoluta.
- Le metriche non sono benchmark comparativi già raccolti: picco RSS del processo dalla partenza, PSS dopo il rilascio del modello, dettagli JNI normalmente disponibili sulle risposte complete. Restano da misurare tempi/RAM/cicli e qualità didattica reali dei modelli sul dispositivo e nei sette percorsi.

## Archivio delle sfide e crash di generazione — 2 ottobre 2026

### Difetti riprodotti

- Nel browser, con revisione differita, apertura di una lezione durante la generazione: la sfida valida veniva aperta dietro il dialogo, che restava visibile, senza un pulsante per raggiungerla. Il percorso mescolava inoltre le sfide generate in ordine inverso agli esercizi inclusi; Continua sceglieva l'ultima sfida generata invece della prima da completare.
- Sul telefono dell'utente, MobileLLM-R1.5 scaricato: tre crash nel buffer Android, alle 15:18:29, 15:19:03 e 15:52:10. `SIGABRT` nel thread `local-inference`, assert `found` in `llama_sampler_dist_apply`, `llama-sampler.cpp:1211`. Non un'eccezione Java né una proposta semplicemente scartata da Python.
- Nel test nativo sintetico è verificato il meccanismo: top-k dichiara la shortlist ordinata, la grammatica maschera i primi token con `-inf` ma non azzera `sorted`; una catena che si fida dell'ordine può scartare i token validi o usare un massimo non finito. Nessun nuovo crash dell'app provocato per confermare l'assert già registrato.

### Correzioni e test

- Archivio **Tutor → Sfide del tutor**, sequenze numerate per ciascuno dei sette percorsi, stati e contatori derivati dalle bozze/prove/risultati esistenti. Continua e Prossimo problema riusano prima le sfide da svolgere. Le guidate restano distinguibili e riprovabili autonomamente dal giorno successivo. Nessun cambio di schema o azzeramento della banca.
- Apertura automatica solo se la schermata originaria è ancora visibile e senza dialoghi; altrimenti pannello Apri la sfida, senza ricreare editor/cursore. Gli errori spiegano che nessuna nuova sfida è stata salvata e consentono di riprovare sul medesimo percorso.
- Nel solo bridge PyDaily: `native/tutor_sampling.h` invalida l'ordine dopo il filtro grammaticale, conserva il fallback al vocabolario completo e rifiuta candidati assenti/logits non validi prima di chiamare la distribuzione. L'assert upstream resta attivo; nessun token arbitrario per aggirare la grammatica, nessun aggiornamento o ulteriore patch di llama.cpp. Errori numerici/vocabolario non avviano un secondo tentativo.
- `npm test`: **51/51** superati. Compresi ordine/numerazione dei vecchi backup, stati, prima incompleta, guidate, progressione separata nei sette percorsi, XP non duplicati ed errori nativi non rigenerabili.
- `.venv\Scripts\python.exe tools/verify_curriculum.py`: **70 soluzioni/234 casi** superati, catalogo non modificato. Controllo di sintassi JavaScript e `git diff --check` superati.
- `npm run test:browser`: **superato**, Python/NumPy reali e LLM simulato. Archivio mobile/desktop, aperture immediate/differite, dialogo di lezione ed editor preservati, ripresa della prima bozza e tip, Prossimo senza inferenza inutile, risultato guidato e promozione autonoma, nessuna voce da rifiuti/annullamenti, filtri per percorso, offline/reload/export/import schema 1. Layout senza overflow e contrasto >=4,5 sui componenti misurati a 320/393/1200 px; tutti i flussi precedenti ancora superati.
- `tools/test_native.ps1 -DeviceSerial KFJV9XHIAM4LWS8H`: **superato su ARM64 fisico**. `GRAMMAR_SAMPLING_OK`: ordinamento invalidato, token raro recuperato, vocabolario incompatibile e NaN/infiniti gestiti; anche `JSON_COMPLETION_OK` e `DENSE_LOADER_OK`. Le fixture e gli eseguibili temporanei sul telefono sono stati rimossi dallo script.
- `gradlew.bat assembleDebug --console=plain`: **BUILD SUCCESSFUL**. Firma v2 verificata, certificato compatibile con l'installazione esistente e allineamento 16 KB superato. Asset JS/CSS nell'APK confrontati byte per byte con i sorgenti aggiornati.

### Aggiornamento sul dispositivo

- Su autorizzazione dell'utente: copia locale del LevelDB dei progressi/preferenze e dell'APK installato; snapshot JSON appena prima dell'aggiornamento. Nessuna disinstallazione o pulizia dei dati/modelli.
- `adb install -r`: **Success**; avvio riuscito e nuova schermata Sfide del tutor raggiunta nel WebView reale via CDP. Progressi prima/dopo **identici byte per byte**: SHA-256 `a747e4a6979a633f2f6fa4f9f3820b79d8cc2f19cc72b56171c82bc6a2c63c96`, 25 XP, 1 risultato, 5 bozze, 0 sfide generate. Il confronto precede la nuova prova di generazione.
- MobileLLM già scaricato dall'utente conservato: 618.907.200 byte; SHA-256 sul telefono `caebf2968f488ba944c6e2f6e1bb935d9277da6faa5fe4d6b59d83749a8de072`, corrispondente al catalogo. Consenso FAIR mantenuto. Nessun trasferimento dei pesi sul PC.
- L'iniezione ADB di input fisico non è autorizzata dalla configurazione del telefono; l'utente ha riacceso/sbloccato il dispositivo per la prova. La navigazione CDP non dimostra il comportamento della tastiera fisica/virtuale.

### Proposta incompleta e istanze duplicate — stessa giornata

- Prima prova monitorata dopo la correzione del crash: processo app sopravvissuto, ciclo scartato per timeout JS a 195 secondi, nessuna sfida salvata e dati di apprendimento invariati. Non è una prova riuscita di generazione. In seguito individuati **due WebView e due MainActivity** nella stessa task: la prima lettura CDP era dell'istanza non visibile, non della schermata usata dall'utente.
- Nell'istanza visibile, primo tentativo fallito per limite di token e secondo interrotto; un altro ciclo annullato. Due `LocalTutor` avevano busy separati ma cancellazione/mutex JNI globali: richieste da istanze diverse potevano interferire. Aggiunto `android:launchMode="singleTask"`, senza backend o servizi nuovi.
- Aggiornamento intermedio installato via `adb install -r`, comprendente riuso dell'Activity e messaggi distinti proposta/sfida pronta. Verificati una sola Activity e un solo target WebView, avvio ripetuto consegnato all'istanza esistente, progressi byte per byte identici al precedente snapshot e MobileLLM/consenso conservati.
- Riproduzione nativa separata con **MobileLLM completo già sul telefono**, prompt sintetico del percorso Python livello 1 e seed 42, senza modificare banca, bozze o XP: su 300 token, il JSON restava dopo il titolo e conteneva soltanto whitespace successivo. La grammatica permetteva spazi esterni illimitati.
- Spostata la grammatica della sfida in `native/tutor_policy.h`; per sfide e indizi `ws` ammette al massimo quattro caratteri. Nuova prova con gli stessi dati: JSON completo in 170 token, ma contenuti/firma/test non validi. **Il solo vincolo agli spazi non prova una sfida MobileLLM utilizzabile**; i controlli non sono stati rimossi.
- `npm test`: **52/52** superati. `npm run test:browser`: **superato**, inclusa distinzione fra fine inferenza e sfida pronta e cambio modello dopo un errore senza nuove richieste o salvataggi. Test nativi ARM64: **BOUNDED_JSON_OK**, più JSON/completamento, campionamento e dense/MoE. La fixture aggiunge simboli JSON e whitespace per provare le grammatiche reali, non qualità didattica.
- Prove native separate MobileLLM con BOS e con BOS/più prefisso di ragionamento vuoto: rispettivamente output incompleto al limite di 1000 token e JSON completo in 190 token ma ingressi simbolici/ripetuti non utilizzabili. Non salvati come sfide e non adottato il prefisso di ragionamento vuoto per MobileLLM. Ripristinato invece il BOS mancante nel solo fallback Llama3, controllando `add_bos_token` per evitarne la duplicazione; Qwen invariati. Queste prove non completano il collaudo MobileLLM.
- Download autorizzato Qwen3-0.6B dall'app: terminato, verificato e selezionato, MobileLLM conservato e progressi byte per byte invariati. Primo ciclo completo Qwen: due risposte native ricevute in circa 29/28 secondi, entrambe scartate perché la descrizione non nominava tutti i parametri. Nessuna voce aggiunta e nessuna alterazione di XP/risultati/bozze/ripasso.
- Riordinati i campi del JSON nativo per scrivere funzione/parametri **prima** della descrizione, con istruzione esplicita di riusarne i nomi; aggiornati prompt, esempio, revisore e grammatica insieme. Parser e controlli Python invariati, nessun testo corretto automaticamente per aggirare i rifiuti e nessuna migrazione del backup necessaria.
- Verifiche della versione con firma prima della descrizione: **53/53** unit test, suite browser, **BOUNDED_JSON_OK** e test di campionamento/loader/JSON-BOS ARM64 superati; build Gradle riuscita, firma compatibile e allineamento 16 KB verificati. Installazione successiva via `adb install -r`: **Success**, preceduta da snapshot locale dei dati ancora identici alla baseline.

## Pubblicazione parziale su PyDaily — 2 ottobre 2026

- Su richiesta dell'utente, la patch a `native/llama.cpp/src/models/llama4.cpp` è esclusa da commit e push e rimane intatta in locale. Nessun invio o PR a llama.cpp upstream. Le prove native e le build/installazioni precedenti comprendevano quella patch; dai soli sorgenti pubblicati non sono riproducibili il caricamento MobileLLM corretto e `DENSE_LOADER_OK`.
- Prima della pubblicazione rieseguiti **53/53** unit test, suite browser con Python/NumPy reali e LLM simulato, catalogo **70 soluzioni/234 casi** e **2** test di generazione del catalogo: tutti superati. Queste verifiche non richiedono la patch esclusa. Non eseguite nuove prove Android o di inferenza GGUF durante la preparazione del commit.
