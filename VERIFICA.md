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
