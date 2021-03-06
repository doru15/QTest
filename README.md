# QTest
QTest reprezinta o solutie de automatizare a procesului de evaluare a studentilor. Aplicatia foloseste:
  - [DokuWiki][doku], pentru a stoca si gestiona intrebarile
  - [LaTeX][latex], pentru a genera fisa de test
  - [Google Sheets][sheets], pentru a genera un sheet de rezultate

Aplicatia extrage fie din DokuWiki, fie dintr-un fisier text intrebarile specificate si genereaza o fisa de test. Aplicatia mai poate genera si un sheet pentru reprezentarea rezultatelor finale.

### Instalare
Dupa descarcarea aplicatiei rulati urmatoarea comanda pentru descarcarea dependintelor:
```sh
npm install
```
Dupa urmatii pasii de [configurare][conf] ai contului de Google.

### Mod de folosire
```sh
node generatorTest.js URL
node generatorTest.js URL fixed
node generatorTest.js PATH
node generatorTest.js PATH fixed
node generatorTest.js clean
node generatorRezultate.js
```
Generatorul fisei de test extrage intrebarile fie de la un link catre DokuWiki, fie dintr-un fisier text in care se gasesc intrebari formatate dupa sintaxa DokuWiki. In plus se poate specifica optiunea fixed pentru a nu alege aleator intrebarile testului.
Generatorul fisei de test mai ofera si optiunea de clean pentru a sterge fisierele intrebari.json, test.tex si test.pdf.
Generatorul sheetului pentru rezultatele finale cere utilizatorului o serie de inputuri, dupa care, pe baza lor, genereaza sheetul dorit.

[doku]: <https://www.dokuwiki.org/>
[latex]: <https://www.latex-project.org/>
[sheets]: <https://www.google.com/sheets/about/>
[conf]: <https://developers.google.com/sheets/api/quickstart/nodejs>
