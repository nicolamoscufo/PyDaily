# Riprendere PyDaily in OpenCode

## Obiettivo

Creare un'app Android in italiano in cui risolvere problemi Python ogni giorno, ricevere suggerimenti, studiare i concetti mancanti ed esplorare percorsi fino a machine learning, deep learning e reinforcement learning. La difficoltà cresce con i risultati. Un piccolo LLM locale specializzato nel codice genera ulteriori sfide.

La scelta dell'utente del 2 ottobre 2026 è proseguire il progetto in OpenCode. Questi sono i sorgenti recuperati dalla versione PyDaily 1.0; non è un nuovo progetto.

## Stato concreto

Il progetto comprende 70 esercizi, 22 lezioni, 234 test del catalogo, editor Python/NumPy offline, progressi locali, backup, ripasso e notifiche. Il tutor usa Qwen2.5-Coder 3B Instruct Q4_K_M; è presente anche il 1.5B.

Architettura: Activity Android con WebView → interfaccia JavaScript → PythonRunner con Pyodide in worker; per il tutor, JavaScript → bridge Java → JNI → llama.cpp. Gli asset di esecuzione sono inclusi.

Controllo delle sfide generate: JSON vincolato dalla grammatica, firma e campi, test con output diversi, esecuzione della soluzione, rifiuto di una risposta costante, controllo delle ripetizioni e un secondo tentativo in caso di errore. Il confronto fra consegna e semantica della soluzione non è provato da questi controlli.

## Verifica di questa consegna

- Rieseguiti gli 8 test dello stato: tutti superati.
- Rieseguite le 70 soluzioni del catalogo contro 234 casi: tutte superate.
- Conservato VERIFICA.md con le prove effettuate nella sessione originale.
- Il test browser è stato reso portabile: dipendenza Playwright dichiarata, browser standard o percorso configurabile, porta libera e artefatti dentro la repository.
- Controllata la sintassi del test browser; i flussi UI non sono stati rieseguiti perché il download di Chromium nell'ambiente di consegna ha restituito un archivio non valido.
- La configurazione debug usa la chiave standard di Android quando la chiave recuperata manca.
- Nessuna nuova funzionalità didattica è stata implementata durante la preparazione della repository.
- Una nuova build Gradle, l'inferenza del modello reale e i test su Android fisico non sono stati rieseguiti qui. Aggiorna questa sezione solo dopo le prove effettive.

## Prima sessione consigliata

1. Leggi AGENTS.md, README.md e questa guida.
2. Esegui npm test e python3 tools/verify_curriculum.py.
3. Installa Playwright/Chromium e riesegui npm run test:browser.
4. Apri il progetto in Android Studio ed esegui assembleDebug.
5. Verifica installazione, tastiera, suggerimenti, salvataggio, download del GGUF, generazione e notifiche su un dispositivo ARM64.

SDK/NDK/CMake e la versione fissata di llama.cpp sono nei file Gradle/CMake. Non aggiornare queste dipendenze come prima operazione senza un motivo concreto.

## Attenzioni utili

- La chiave che firmava l'APK originale non era nei sorgenti. Non puoi aggiornare quel pacchetto con una chiave diversa: esporta i progressi prima di reinstallare.
- validateState in core.js disattiva il promemoria anche quando carica lo stato all'avvio; verifica se distinguere caricamento locale e importazione di un backup. È un'osservazione del codice, da riprodurre prima della correzione.
- Il pannello tip mostra soltanto l'ultimo suggerimento rivelato. Valuta un pannello cumulativo che permetta di rileggere tutti gli indizi senza perdere il codice o la posizione di scrittura.
- Il tutor piccolo può produrre una soluzione coerente con i propri test ma incoerente con la consegna. Rafforza il contratto e i controlli indipendenti.
- La preview web non esegue il GGUF. Un bridge simulato serve soltanto a verificare i flussi UI.
- pandas, scikit-learn, PyTorch e TensorFlow non sono inclusi. Le sfide ML/DL/RL insegnano i concetti con Python, NumPy e piccoli dati.

## Priorità successive proposte

Questa lista è una proposta di sviluppo, non lavoro già svolto:

1. Rendere affidabile il ciclo generazione → verifica → proposta della sfida e conservare le cause di rifiuto per il debug locale.
2. Migliorare l'aiuto sugli errori: indizio sul problema concreto senza rivelare subito la soluzione.
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

Il remoto GitHub non è configurato in questa consegna. Per crearlo dal tuo terminale, se usi GitHub CLI già autenticato:

```bash
gh repo create pydaily --private --source=. --remote=origin --push
```

In alternativa crea una repository vuota su GitHub, poi aggiungi il suo URL come origin e fai git push -u origin main.

Documentazione ufficiale OpenCode: https://opencode.ai/docs/rules/ e https://opencode.ai/docs/cli/.
