# PyDaily 1.0

App Android in italiano per allenarsi ogni giorno con Python e capire cosa ripassare.

## Installazione

1. Scarica **PyDaily-Android.apk** sul telefono o tablet.
2. Apri il file. Se Android lo richiede, consenti l’installazione di app da quella specifica sorgente, poi scegli **Installa**.
3. Apri PyDaily e scegli un obiettivo: 1, 3 o 5 problemi al giorno.
4. Per le sfide generate e gli indizi personali, apri **Profilo → Il tuo tutor locale**, scegli un modello e tocca **Scarica**. Usa preferibilmente Wi-Fi e tieni l’app aperta durante il download.
5. Quando il tutor è pronto, tocca **Genera una sfida**. Gli esercizi inclusi sono già disponibili prima del download.

Requisiti: **Android 8 o successivo, processore ARM a 64 bit** e Android System WebView aggiornato. L’APK non supporta dispositivi Android a 32 bit o emulatori x86. Il 3B originale resta disponibile; per consumare meno spazio puoi provare Qwen3-0.6B. Le nuove opzioni sono sperimentali: velocità, RAM e qualità del tutor italiano vanno confrontate sul telefono.

## Cosa trovi

- 70 esercizi con esecuzione reale di Python 3.12 e NumPy, tutti inclusi offline.
- 7 percorsi: Python, algoritmi, dati e NumPy, machine learning, deep learning, reinforcement learning, automazione.
- 22 mini-lezioni con spiegazioni, esempi e domande di comprensione.
- Suggerimenti progressivi e pulsante **Non ho capito** per aprire una spiegazione collegata al problema.
- **Indizio sul mio codice**: un suggerimento breve del tutor locale, basato sulla bozza e sul risultato Python reale.
- Obiettivo quotidiano, XP, giorni consecutivi e calendario dell’attività.
- Ripasso dei concetti dopo 1, 3, 7 e 14 giorni. Un errore riporta il concetto al ripasso di oggi.
- Notifica quotidiana opzionale, con orario scelto. Android può ritardarla per risparmio energetico.
- Backup JSON esportabile e importabile, con codice e sfide generate. I pesi GGUF non sono inclusi nel backup.

## Progressione

Ogni percorso parte dal livello 1 e sale dopo **due problemi diversi risolti senza vedere la soluzione completa**. Tip e indizi personali non impediscono di avanzare. La soluzione completa rende la prova guidata: assegna meno XP e non aumenta il livello; il giorno successivo puoi riprovarla autonomamente.

Ripetere la stessa soluzione non moltiplica gli XP. Per l’obiettivo giornaliero conta una sola risoluzione di ogni esercizio nella stessa giornata. Puoi comunque ripassare un esercizio nei giorni successivi.

Il tutor riceve percorso, livello, concetti da consolidare ed esercizi recenti. Genera nuovi problemi con consegna, firma della funzione, soluzione di riferimento, casi di test, tip e spiegazione. La banca generata può crescere nel tempo e il livello non ha un tetto numerico. Non è una promessa di difficoltà sempre maggiore o di originalità assoluta: la qualità dipende anche dal modello.

L'ultimo errore verificato nello stesso percorso orienta la nuova consegna: prima un problema diverso per consolidare il concetto; dopo la correzione, al massimo un piccolo passo aggiuntivo entro il livello attuale. È un'indicazione al modello, non un cambio delle regole di progressione né una garanzia di difficoltà adeguata.

Quando il tutor non è attivo, puoi usare la banca editoriale e, dopo averla completata in un percorso, laboratori con nuovi dati riproducibili.

## Sfide del tutor

Apri **Tutor → Sfide del tutor** nella navigazione principale. Qui trovi tutte le sfide generate e salvate, separate per percorso e numerate nell'ordine di creazione. Anche quelle dei backup precedenti compaiono nella sequenza; non vengono cancellate al cambio o alla rimozione del modello.

- **Da iniziare**: nessuna bozza modificata o attività salvata.
- **In corso**: hai scritto una bozza, provato il problema o usato un suggerimento.
- **Guidata**: hai superato i test dopo aver visto la soluzione completa; non conta per il livello.
- **Risolta da te**: risultato autonomo registrato. Tip e indizi sono consentiti.

**Continua** apre la prima sfida ancora da svolgere, non l'ultima generata, recuperando bozza e suggerimenti. Puoi riaprire qualsiasi voce. Il livello mostrato è quello del percorso, condiviso con gli esercizi inclusi; due problemi diversi risolti autonomamente lo aumentano. Se tutte le sfide sono completate, dal giorno successivo puoi riprovare da te quelle guidate.

Una nuova sfida valida si apre automaticamente se resti nella schermata da cui hai avviato la generazione. Se nel frattempo apri una lezione, cambi schermata o passi a un'altra app, compare **Apri la sfida**: la pagina corrente e l'editor non vengono sostituiti. La sfida resta comunque nell'archivio, anche dopo la chiusura dell'app.

Una risposta completata dal modello non basta: serve il superamento della revisione e dei controlli Python. Se una proposta viene scartata, l'app mostra il motivo e **Riprova**; nessuna sfida viene aggiunta alla sequenza e nessun progresso viene assegnato.

Durante la generazione vedrai **Il tutor prepara una proposta**, poi revisione e test. **Risposta ricevuta, da verificare** riguarda solo il modello: non indica ancora una sfida utilizzabile. In caso di timeout o errori ripetuti puoi premere **Cambia modello**; gli esercizi inclusi e tutte le sfide già salvate restano accessibili.

## Aspetto ed editor

In **Profilo → Aspetto → Tema dell’app** puoi scegliere **Chiaro**, **Scuro** o **Come il telefono**. La scelta viene ricordata sul dispositivo, separatamente dal backup dei progressi. Il tema automatico segue le impostazioni del telefono.

Le scorciatoie sotto l’editor si dispongono su più righe senza tagliare il testo: **4 spazi**, **return** e **Ripristina codice**. Ripristinare richiede conferma e non modifica XP o progressi.

## Modello locale

| Modello Q4_K_M | File scaricato | Ruolo |
| --- | --- | --- |
| Qwen3-0.6B | 0.40 GB circa | Opzione piccola sperimentale, reasoning disattivato |
| Qwen3-1.7B | 1.11 GB circa | Candidato per maggiore capacità, sperimentale, reasoning disattivato |
| MobileLLM-R1.5-950M | 0.62 GB circa | Sperimentale, specializzato anche in Python/C++, italiano da valutare |
| Qwen2.5-Coder 3B Instruct | 2.10 GB circa | Riferimento originale, Qwen Research License |
| Qwen2.5-Coder 1.5B Instruct | 1.12 GB circa | Alternativa originale, Apache-2.0 |

Queste sono dimensioni dei file in GB decimali, **non la RAM totale richiesta**: si aggiungono contesto, buffer, WebView e Python/NumPy. L'app mostra RAM totale e disponibile del telefono, non una promessa di compatibilità basata soltanto sui parametri.

Le conversioni Qwen2.5 sono ufficiali Qwen; i Q4 di Qwen3 vengono da Unsloth e quello di MobileLLM da SantoshV007: sono conversioni comunitarie su Hugging Face, non quantizzazioni ufficiali Qwen/Meta. Il catalogo usa revisioni fissate, dimensioni esatte e SHA-256.

MobileLLM usa la **FAIR Noncommercial Research License**, con restrizioni anche sugli output e Acceptable Use Policy. Prima di scaricarlo devi leggere il testo incluso, selezionare il consenso e scegliere **Accetta e scarica**. Non è consentito l'uso commerciale. Il consenso resta sul dispositivo, separato dai progressi; è richiesto anche per l'inferenza di un GGUF importato che dichiara questa licenza.

La correzione del loader MobileLLM resta solo nella copia di sviluppo locale, esclusa da commit e push: una build dai soli sorgenti pubblicati non include il supporto corretto al suo caricamento. Il modello rimane nel catalogo; questo limite non riguarda Qwen.

Puoi interrompere e riprendere un download. Dopo il completamento, gli altri modelli restano salvati: **Usa** li seleziona dopo una nuova verifica SHA-256, senza riscaricarli se integri. **Rimuovi** libera soltanto quel modello e il suo download parziale, lasciando gli altri e i progressi. Non puoi cambiarlo durante una richiesta. Usa **Importa GGUF** per un modello compatibile già presente nei tuoi file: viene copiato nell’area privata dell’app e controllato come formato, non convertito né confrontato con gli hash del catalogo.

Il modello si carica quando serve, usa la CPU con un massimo di 4 thread e viene liberato al termine della generazione. Prompt, progressi e codice non vengono inviati a un servizio di inferenza. La connessione serve soltanto per scaricare i pesi.

I tempi reali dipendono dal dispositivo. Mantieni l’app aperta durante una generazione. Il pannello mostra tentativo, fase, secondi e token prodotti, ed è disponibile anche in Profilo e Studio insieme al pulsante **Annulla**. Ogni richiesta di inferenza ha un limite nativo di tre minuti; un controllo aggiuntivo dell’interfaccia interviene dopo 3 minuti e 15 secondi. Una sfida richiede normalmente due richieste (generazione e revisione), fino a quattro se il primo esercizio viene scartato. Un timeout interrompe l’operazione senza una rigenerazione automatica. Il motivo di un fallimento resta visibile fino alla chiusura o a un nuovo tentativo.

## Indizi personali

Nell'esercizio, tocca **Indizio sul mio codice**. L'app esegue prima la bozza in Python e manda al modello locale consegna, firma, codice e una sintesi dell'errore/output/primo caso fallito, **non la soluzione di riferimento**. Bozze lunghe e dati grandi vengono riassunti o troncati; il tutor può quindi non vedere tutto il codice.

Ricevi un solo indizio breve, non un giudizio che sostituisce Python. Se i test passano, il prompt richiede una riflessione sui limiti senza inventare un errore. L'analisi non assegna XP né risolve l'esercizio: usa **Verifica la soluzione** per registrare il risultato. Un errore osservato viene conservato e il concetto torna nel ripasso.

Il budget del modello per l'indizio è 60 secondi, con salvaguardia dell'interfaccia a 75 secondi. **Annulla indizio** interrompe l'operazione; cambiare schermata la annulla. Risposte riferite a una bozza cambiata vengono ignorate. I tre indizi più recenti restano salvati per esercizio anche nel backup schema 1; quelli su una vecchia bozza sono segnalati. I tip già sbloccati non vengono sostituiti e l'editor non viene ricreato durante l'indizio.

I filtri scartano codice esplicito, frammenti riconoscibili della soluzione e risposte troppo lunghe, ma **non garantiscono che ogni spiegazione in linguaggio naturale sia corretta o priva di anticipazioni**. Il modello può sbagliare; confronta l'indizio con i test e la mini-lezione.

## Misure del tutor

In **Profilo → Misure locali del tutor** trovi le ultime 40 operazioni e **Esporta misure**. Il JSON separato contiene modello, esito, durata e, quando disponibili, token, tempi nativi e memoria del processo: niente prompt, codice, output Python o testo degli indizi. Non viene inviato automaticamente e non fa parte del backup dei progressi.

Una risposta di inferenza completata non è necessariamente una sfida valida: il **ciclo** include generazione, revisione e verifiche Python, con esito accettato/scartato. Il picco RSS è il massimo del processo Android da quando è stato avviato, non il picco del solo modello né la memoria dell'intera app con i processi WebView. Il PSS esportato è rilevato al termine, dopo il rilascio del modello. Queste misure non provano la qualità didattica.

## Come vengono controllate le nuove sfide

1. La generazione è vincolata a un JSON valido tramite grammatica.
2. L’app controlla firma, campi, tipi JSON e quattro test con ingressi distinti e risultati differenti.
3. Esegue la soluzione del modello contro tutti i test nel motore Python locale.
4. Lo stesso modello ricava da zero una seconda soluzione e nuovi test dalla sola consegna, senza vedere soluzione o risultati originali. Python esegue entrambe le soluzioni sui casi incrociati e verifica che risposte costanti o parametri invariati non bastino.
5. Rifiuta ripetizioni del titolo, della descrizione o del codice normalizzati rispetto al catalogo e alle sfide generate.
6. Scarta una sfida non valida e prova una seconda generazione; nessun esercizio scartato influenza XP o livello.

Dopo una sfida del tutor, **Prossimo problema** apre la prossima sfida salvata da svolgere nello stesso percorso; se non ce ne sono, ne genera una usando il livello aggiornato. Senza modello attivo, le sfide salvate restano utilizzabili e puoi riattivare il tutor dalle impostazioni.

Queste verifiche controllano **coerenza eseguibile**, non dimostrano che la consegna sia semanticamente perfetta o che i test siano esaustivi. Generatore e revisore usano lo stesso modello e possono condividere un errore. Non viene garantita originalità assoluta. Puoi leggere i test e richiedere una nuova sfida se il problema è poco chiaro.

## Codice Python e dati

Ogni verifica gira in un worker separato dalla UI. Un’esecuzione che dura più di quattro secondi viene fermata e il motore viene riavviato. Sono disponibili la libreria standard selezionata e NumPy. Non sono inclusi pandas, scikit-learn, PyTorch o TensorFlow: i percorsi ML, DL e RL implementano i concetti con funzioni Python e piccoli dataset.

I moduli non inclusi, input interattivo e accesso ai file non sono disponibili negli esercizi. Questo isolamento è pensato per il codice scritto dall’utente di un’app personale, non come sandbox di sicurezza per codice ostile multiutente.

I progressi sono salvati nel WebView sul dispositivo. Disinstallare l’app elimina questi dati e i modelli. **Esporta un backup** prima di reinstallarla o cambiare dispositivo. Non è presente sincronizzazione cloud o login.

## Sorgenti e build

Apri questa cartella in Android Studio con JDK 17. Installa SDK 35, NDK 28.1.13356709 e CMake 3.22.1 quando richiesto, poi esegui:

```bash
./gradlew assembleDebug
```

Il progetto include la versione fissata **llama.cpp v0.5.0**, il bridge JNI, il catalogo didattico e i file Pyodide. La patch mirata per i modelli densi MobileLLM resta soltanto nella copia di lavoro locale e non è pubblicata. Non è stato aggiornato l'intero runtime. Dettagli e test in `docs/TUTOR_MODELS.md`. Per aggiornare i contenuti, modifica `tools/make_curriculum.py` e rigenera `app/src/main/assets/web/curriculum.js`:

```bash
python3 tools/make_curriculum.py
node --test tests/core.test.mjs
python3 tools/verify_curriculum.py
```

Il test Python richiede NumPy nell’ambiente di sviluppo. Per una preview web del contenuto:

```bash
python3 -m http.server 8765 --directory app/src/main/assets/web
```

Apri `http://localhost:8765` in un browser moderno. L’inferenza GGUF è disponibile soltanto nell’app Android. Il test `tests/browser.test.mjs` usa Playwright: esegui `npm install`, `npx playwright install chromium` e `npm run test:browser`. Per un browser già installato, configura `PYDAILY_BROWSER_EXECUTABLE`.

Nella repository preparata per OpenCode, la build debug usa la chiave standard di Android se `tools/development.jks` manca. La chiave del vecchio APK non era nell'archivio recuperato: esporta i progressi prima di reinstallare un APK firmato con una chiave diversa.

L’APK consegnato è una build di sviluppo firmata, non un’app pubblicata su Google Play. `tools/build_apk.py` documenta anche la pipeline diretta usata per la build consegnata: AAPT2, ECJ, D8, JNI, zipalign a 16 KB e apksigner. La chiave di sviluppo non è una chiave di pubblicazione del Play Store.

## Verifiche

Il file `VERIFICA.md` distingue le verifiche automatiche, le prove sul telefono e quelle non ancora eseguite. I test browser con bridge simulato non misurano prestazioni o qualità del GGUF reale.

## Idee per le prossime versioni

- Sessione diagnostica iniziale per adattare il punto di partenza nei singoli percorsi.
- Collaudo degli indizi personali con i nuovi GGUF reali, in italiano e su tutti i percorsi.
- Mini-progetti conclusivi: analizzatore CSV, kNN, piccola rete neurale, agente Q-learning.
- Metriche di qualità per i problemi generati e misure degli errori condivisi fra generatore e revisore.
- Modelli più efficienti e accelerazione GPU quando supportata dal dispositivo.

## Componenti e fonti

- [Qwen2.5-Coder 3B GGUF ufficiale](https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF)
- [Qwen2.5-Coder 1.5B GGUF ufficiale](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF)
- [Qwen3-0.6B Q4 comunitario](https://huggingface.co/unsloth/Qwen3-0.6B-GGUF) e [Qwen3-1.7B](https://huggingface.co/unsloth/Qwen3-1.7B-GGUF).
- [MobileLLM-R1.5-950M originale Meta](https://huggingface.co/facebook/MobileLLM-R1.5-950M) e [Q4 comunitario](https://huggingface.co/SantoshV007/MobileLLM-R1.5-950M-Q4_K_M-GGUF).
- [llama.cpp](https://github.com/ggml-org/llama.cpp), licenza MIT, inclusa nei sorgenti.
- [Pyodide 0.27.7](https://pyodide.org/en/0.27.7/), licenza MPL-2.0; Python e NumPy mantengono le proprie licenze.
- [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope), SIL Open Font License.

Consulta `THIRD_PARTY_NOTICES.md` e la cartella `app/src/main/assets/web/vendor/licenses`.
