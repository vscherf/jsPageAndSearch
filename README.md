# jsPageAndSearch
written by vs
benötigt html5, jQuery, optional: Bootstrap, jQueryUI

fügt in eine HTML-Tabelle einen Pager und/oder ein Suchfeld ein
Der Pager kann wahlweise in der Kopf- oder Fusszeile angezeigt werden.
Das Suchfeld wird immer als erste Zeile angezeigt. Wenn eine Ausgabe der Trefferanzahl (nur gefundene Zeilen) gewünscht ist, dann wird diese immer in der Fußzeile angezeigt.
Sämtliche Elemente innerhalb des Pagingelements werden per CSS-Selektoren gestylt.
folgende Events sind aktiv:
Tabellenzeile des Bodys: Mausklick: markiert eine Zeile
                         CTRL+Mausklick: markiert mehrere Zeilen
Pagebuttons:             CTRL+Mausklick: zeigt alle Zeilen der Tabelle an

Dieses Script-Datei und die CSS-Datei im Header der Seite einbinden.
Standardmäßig muss nur der Tabellenname übergeben werden: 
fnPageAndSearch([
    { tableName: "#myTable" }
]

