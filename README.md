# jsPageAndSearch
written by vs - 
- fügt in eine HTML-Tabelle einen Pager und/oder ein Suchfeld ein
- markiert gefunden Text
- benötigt html5, jQuery, optional: Bootstrap, jQueryUI

V1.4
- Übergabe einer Exportfunktion möglich
- fehlerhafte Markierung des gefundenen textes gefixt
- CSS-Klassennamen vereinfacht

V1.3
- Umstellung auf jQuery-Plugin ( Aufruf mit $("#myTable").PageAndSearch() )
- Ändern der Hervorhebung des gefundenen Textes, es wird nun der gefundene Text direkt markiert und nicht mehr die ganze Zeile
- Button für Export kann in Fußzeile eingefügt werden (benötigt separate/eigene Funktion)
- Änderung/Wegfall einiger Parameter

V1.2
- includeCols/exludeCols für Angabe der Felder in denen gesucht, bzw. die ausgeschlossen werden sollen (Ausschluss hat Vorrang!)
- zusätzliches Feld für Zähler der Zeilen kann eingefügt werden, mit Angabe der Position

V1.1
- verwendbar für mehrere Tabellen auf einer Seite
- Bugfix: bereits vorhandene Pager- und Searcher-Objekte werden bei Neuaufruf entfernt
