"use strict";
//written by vs
//benötigt html5, jQuery, optional: Bootstrap, jQueryUI
//V1.4

//fügt in eine HTML-Tabelle einen Pager und/oder ein Suchfeld ein
//Der Pager kann wahlweise in der Kopf- oder Fusszeile angezeigt werden.
//Das Suchfeld wird immer als erste Zeile angezeigt. Wenn eine Ausgabe der Trefferanzahl (nur gefundene Zeilen) gewünscht ist, dann wird diese immer in der Fußzeile angezeigt.
//Sämtliche Elemente innerhalb des Pagingelements werden per CSS-Selektoren gestylt.
//folgende Events sind aktiv:
//Tabellenzeile des Bodys: Mausklick: markiert eine Zeile
//                         CTRL+Mausklick: markiert mehrere Zeilen
//Pagebuttons:             CTRL+Mausklick: zeigt alle Zeilen der Tabelle an

//Dieses Script-Datei und die CSS-Datei im Header der Seite einbinden.
//Standardmäßig muss nichts übergeben werden, einfach wie folgt aufrufen:
//$("#myTable").PageAndSearch()
//ist "exlude" gesetzt, dann wird "include" ignoriert (Ausschluss hat immer Vorang)
//pas = Präfix für PageAndSearch

let table

let DEFAULTS =
    [
        { tableStyle: true },           //soll die Tabelle zusätzlich gestylt werden | Standard: true
        { sorting: true },              //Tabelle sortieren | Standard: true
        { withBootstrap: false },       //soll Bootstrap benutzt werden (nur aktiv, wenn 'tableStyle: true') | Standard: false
        { showPager: true },            //soll das Paging-Element angezeigt werden | Standard: true
        { showSearcher: true },         //soll die Tabellensuche angezeigt werden | Standard: true
        { showInFooter: false },        //das Paginelement in Kopf- oder Fußzeile | Standard: false
        { outputRows: 10 },             //die Anzahl der darzustellenden Zeilen | Standard: 10
        { showNavButtons: true },       //wenn true, dann werden Vor- und Zurück-Schaltflächen anstatt der einzelnen Seiten angezeigt | Standard: true
        { buttonSize: null },           //die Größe der Schaltflächen, gemäß Bootstrap (xs, sm, lg, kein Wert=default) | Standard: null
        { startWithPage: 1 },           //mit welcher Seite soll gestartet werden ('last' = letzte Seite, 'middle' = mittendrin, ansonsten die Seitenzahl) | Standard: 1
        { effect: null },               //weicher Übergang beim Seitenwechsel (für andere Effekte wird ggf. jQueryUI benöigt) - kein Effekt: null | Standard: null
        { showPageInput: true },        //Eingabefeld für Seitenzahl anzeigen (wird nur ausgewertet, wenn 'showNavButtons = true') | Standard: true
        { pageInputClass: null },       //die CSS-Klassen für das Eingabefeld der Seitenzahl (nur aktiv, wenn 'withBootstrap = false') | Standard: null
        { searchOuput: true },          //soll eine Ausgabe der gefundenen Zeilen angezeigt werden (wird immer in Fußzeile angezeigt) | Standard: true
        { include: 0 },                 //in welchen Spalten soll gesucht werden (-1 für alle, sonst als String mit Komma getrennt (Bsp: '1,4,6', nicht 0-basierend)) | Standard: -1
        { exclude: 0 },                 //in welchen Spalten soll nicht gesucht werden (-1 für keine Ausnahme, sonst als String mit Komma getrennt (Bsp: '1,4,6', nicht 0-basierend)) | Standard: -1
        { counterPos: 0 },              //Position des Zählerfeldes (0: nicht aktiv, 'first': erste Position, 'last': letzte Position, eine Zahl: beliebige Position) - Muss bei include/exclude mit beachtet werden!! | Standard: 0
        { searchOnEnter: false },       //wenn true, dann wird erst nach Betätigung der "Enter"-Taste gesucht (schneller bei großen Tabellen), ansonsten wird bei Eingabe jedes Zeichens gesucht | Standard: false
        {
            searcherClass:              //die CSS-Klassen für das Filterfeld | Standard: "pas-searchfield"
                "pas-searchfield"
        },
        {
            exportName:                 //der Name der Exportdatei
                "ExportTable"
        },
        {
            exportFunction:             //die Funktion oder der Aufruf einer Funktion zum Exportieren (stellt automatisch einen ExportButton zur Verfügung), wenn keine Exportfunktion, dann null oder false
                function (table, ExportName) {
                    alert("Tabelle wird exportiert nach '" + ExportName + "'"); //nur zur Demonstration
                    //Hier eine eigene Standardfunktion oder den Aufruf einer Funktion einfügen oder eine eigene Funktion als Parameter übergeben
                    //Demoaufruf! 
                    //$(table).table2excel(
                    //    {
                    //        exclude: ".noExport, .pas-HideRow, .pas-tr",
                    //        name: ExportName,
                    //        filename: "MyApp_" + ExportName
                    //    })

                }
        }
    ]

let prop = [];
let bs = false;           //mit oder ohne Bootstrap

jQuery.fn.PageAndSearch = function (properties) {
    if (typeof properties !== "undefined") {
        prop = properties;
    };

    //fehlende Properties mit denen aus den DEFAULTS ergänzen
    for (let i = 0; i < DEFAULTS.length; i++) {
        let def = Object.keys(DEFAULTS[i])[0];
        let match = false;
        for (let j = 0; j < prop.length; j++) {
            if (prop[j].hasOwnProperty(def)) {
                match = true;
                break;
            }
        }
        if (!match) {
            prop.push(DEFAULTS[i]);
        }
    };
    bs = fnGetProp(prop, "withBootstrap");
    table = this;
    if (!table.length > 0) { return false };                            //wenn keine Tabelle dann nix machen
    let body = $(table).children("tbody");                              //das Bodyelement der Tabelle
    let head = $(table).children("thead");                              //der Tabellenkopf
    let location;                                                       //wo ist das Pagingelement untergebracht
    let tr = new $("<tr>");                                             //eine neue Zeile fürs Pagingelement
    let td = new $("<td>");                                             //das Tabellenfeld fürs Pagingelement
    let cols = $(table).children("tbody").children("tr:nth-child(1)").children("td").length; //Anzahl der Tabellenspalten
    let showCounter = fnGetProp(prop, "addCounter");                    //Zählfeld anzeigen
    let countPos = fnGetProp(prop, "counterPos");
    let sPlaceholder = "enter text to search in table";

    if (fnGetProp(prop, "searchOnEnter")) {
        sPlaceholder = "type text and press <Enter>";
    };

    $(table).children("thead").children("tr.pas-tr").remove();
    $(table).children("tfoot").children("tr.pas-tr").remove();
    let cdata = $(table).data("withCounter");

    //zuerst das Zählfeld einfügen, wenn erforderlich
    if (countPos && (typeof cdata === "undefined")) {
        cols++;
        if (!isNaN(countPos)) {
            if (countPos < 0) { countPos = 1; };
            if (countPos > $(body).children("tr:first").children("td").length) {
                countPos = "last";
            };
        }
        let count_th = "<th style='width: 25px;'></th>";

        switch (countPos) {
            case "first":
                $(head).children("tr").prepend(count_th);

                $(body).children("tr").each(function (c, e) {
                    $(e).prepend("<td>" + parseInt(c + 1) + "</td>");
                });
                break;

            case "last":
                $(head).children("tr").append(count_th);

                $(body).children("tr").each(function (c, e) {
                    $(e).append("<td>" + parseInt(c + 1) + "</td>");
                });
                break;

            default:
                if (!isNaN(countPos)) {
                    $(head).children("tr").children("th:nth-child(" + countPos + ")").before(count_th);

                    $(body).children("tr").each(function (c, e) {
                        $(e).children("td:nth-child(" + countPos + ")").before("<td>" + parseInt(c + 1) + "</td>");
                    });
                };
                break;
        }
        //Flag setzen, damit bei manuellem Repaging kein weiteres Feld erscheint
        $(table).data("withCounter", "1");
    };

    //wenn die Tabelle gestylt werden soll
    if (fnGetProp(prop, "tableStyle")) {
        if (bs) {
            table.addClass("table table-bordered table-condensed table-striped table-hover");
        } else {
            table.addClass("pas-table");
            $(table).children("tbody").children("tr").mousedown(function (event) {
                if (event.ctrlKey) {
                    $(this).toggleClass("pas-tr-select");
                } else {
                    $(this).toggleClass("pas-tr-select").siblings().removeClass("pas-tr-select");
                }
            })
        }
    };

    //wenn das Pagerelement engezeigt werden soll
    if ((fnGetProp(prop, "showPager")) && (cols > 0)) {
        let pagingElement = new $("<div>");                                 //das div-Element, welches die Buttons und das Label enthält
        let label = new $("<label>");                                       //das Labelelement für die Anzeige 'Seite x von y
        let tblRows = $(body).children("tr").length;                        //Anzahl Zeilen der Tabelle
        let rows = fnGetProp(prop, "outputRows");                           //Anzahl der darzustellenden Zeilen
        let pageCount = Math.ceil(tblRows / rows);                          //Anzahl der Seiten
        let btnSize = "";
        let startPage = fnGetProp(prop, "startWithPage");                   //Startseite

        if (startPage === "last") {
            startPage = parseInt(pageCount - 1);
        } else if (startPage === "middle") {
            startPage = parseInt(pageCount / 2);
        } else {
            if (isNaN(startPage)) {
                startPage = 1;
            };
        };
        startPage = parseInt(startPage - 1);
        if (startPage < 1) { startPage = 0 };
        if (startPage > parseInt(pageCount - 1)) { startPage = parseInt(pageCount - 1); };

        if (tblRows > rows) {
            switch (fnGetProp(prop, "buttonSize")) {
                case "xs":
                    btnSize = "btn-xs";
                    break;
                case "sm":
                    btnSize = "btn-sm";
                    break;
                case "lg":
                    btnSize = "btn-lg";
                    break;
            };

            if (fnGetProp(prop, "showInFooter")) {
                location = $(table).children("tfoot");
                if (location.length === 0) {    //wenn keine Fusszeile, dann eine anlegen
                    location = $("<tfoot>");
                    location.appendTo(table);
                    tr.appendTo(location);
                } else {
                    $(location).children("tr").after(tr);
                }
                location = $(table).children("tfoot");

            } else {
                location = $(table).children("thead");
                if (location.length === 0) {    //wenn keine Kopfzeile, dann eine anlegen
                    location = $("<thead>");
                    location.appendTo(table);
                    tr.appendTo(location);
                } else {
                    $(location).children("tr:first-child").before(tr)
                }
                location = $(table).children("thead");
            };

            if (bs) {
                $(pagingElement).addClass("btn-group");
                $(pagingElement).addClass("pas-pagediv-bs");

            } else {
                $(pagingElement).addClass("pas-pagediv");
            };
            tr.addClass("pas-tr");
            td.attr("colspan", cols);
            td.appendTo(tr);
            pagingElement.appendTo(td);
            $(body).data("pages", pageCount);
            $(body).data("tblRows", tblRows);
            $(body).data("rows", rows);

            $(body).children("tr").hide();
            $(pagingElement).after(label);

            let btn;

            if (fnGetProp(prop, "showNavButtons")) {
                for (let b = 1; b <= 4; b++) {
                    btn = new $("<a>");
                    btn.prop("type", "button");
                    let title = "";
                    let classlist = "";
                    if (bs) {
                        classlist = "btn btn-default " + btnSize;
                    };
                    $(btn).addClass(classlist);
                    switch (b) {
                        case 1:
                            $(btn).html("&Lt;");
                            $(btn).data("position", "first");
                            title = "erste Seite";
                            break;
                        case 2:
                            $(btn).html("&lt;");
                            $(btn).data("position", "prev");
                            title = "eine Seite zurück";
                            break;
                        case 3:
                            $(btn).html("&gt;");
                            $(btn).data("position", "next");
                            title = "eine Seite vor";
                            break;
                        case 4:
                            $(btn).html("&Gt;");
                            $(btn).data("position", "last");
                            title = "letzte Seite";
                            break;
                    };

                    $(btn).attr("title", title);
                    $(btn).mousedown(function (event) {
                        if (event.ctrlKey) {
                            $(this).closest("table").children("tbody").children("tr").show();
                        } else {
                            let pos = $(this).data("position");
                            fnPageTable(pos, this);
                        };
                    });

                    btn.appendTo(pagingElement);
                }

                if (fnGetProp(prop, "showPageInput")) {
                    let lbl = new $("<label>");
                    lbl.html("Seite");
                    let field = $("<input>");
                    field.prop("min", 1);
                    field.prop("max", pageCount);
                    field.prop("title", "Seitenzahl\nzum wechseln Seitennummer eingeben und <Enter> drücken\noder mit Pfeiltasten scrollen");
                    field.addClass("pas-pageinput")

                    if (bs) {
                        field.addClass("form-control");
                    } else {
                        field.addClass(fnGetProp(prop, "pageInputClass"));
                    };

                    $(pagingElement).after(field);
                    $(pagingElement).after(lbl);
                    field.keypress(function (e) {
                        if (e.keyCode === 13) {
                            e.preventDefault();
                        }
                    });

                    field.keyup(function (e) {
                        let pos = $(this).val();
                        if (!$.isNumeric(pos)) {
                            pos = 1;
                        };
                        switch (e.keyCode) {
                            case 38: //Up
                            case 39: //Right
                                pos++;
                                break;
                            case 37: //Left
                            case 40: //Down
                                pos--;
                                break;
                            case 13:
                                break;
                            default:
                                return false;
                        };
                        pos = parseInt(pos);
                        if (pos < 1) {
                            pos = 1;
                            $(this).val(pos);
                        };
                        if (parseInt(pos + 1) > pageCount) {
                            $(this).val(pos);
                            pos = parseInt(pageCount);
                        };
                        field.val(pos);
                        fnPageTable(pos - 1, this);
                    });

                    $(field).change(function () {
                        let pos = $(this).val();
                        if (!$.isNumeric(pos)) {
                            pos = 1;
                        };
                        pos = parseInt(pos);
                        if (pos < 1) {
                            pos = 1;
                            $(this).val(pos);
                        };
                        if (parseInt(pos + 1) > pageCount) {
                            $(this).val(pos);
                            pos = parseInt(pageCount);
                        };
                        fnPageTable(pos - 1, this);
                    });
                    $(label).html("von " + pageCount)
                };
            } else {
                for (let p = 0; p < pageCount; p++) {
                    btn = new $("<a>");
                    btn.prop("type", "button");
                    btn.html(parseInt(p) + 1);
                    let classlist = "";
                    if (fnGetProp(prop, "withBootstrap")) {
                        classlist = "btn btn-default " + btnSize;
                    };

                    $(btn).data("position", p);
                    $(btn).mousedown(function (event) {
                        if (event.ctrlKey) {
                            $(this).closest("table").children("tbody").children("tr").show();

                        } else {
                            let pos = $(this).data("position");
                            fnPageTable(pos, this);
                        }
                    })
                    $(btn).addClass(classlist);
                    btn.appendTo(pagingElement);
                };
            };

            btn = $(pagingElement).children("a[type=button]:first-child");
            fnPageTable(startPage, btn);
        }
        //}
    }

    //wenn die Tabellensuche angezeigt werden soll
    if ((fnGetProp(prop, "showSearcher")) && (cols > 0)) {
        let searcher = new $("<input>");
        //Request bei <Enter> verhindern
        searcher.keypress(function (e) {
            if (e.keyCode === 13) { e.preventDefault(); };
        });
        tr = new $("<tr>");
        td = new $("<td>");
        //auf Kopfzeile prüfen und ggf. neu anlegen
        location = $(table).children("thead");
        if (location.length === 0) {    //wenn keine Kopfzeile, dann eine anlegen
            location = $("<thead>");
            location.appendTo(table);
            tr.appendTo(location);
        } else {
            $(location).children("tr:first-child").before(tr)
        };
        $(table).data("include", fnGetProp(prop, "include"));
        $(table).data("exclude", fnGetProp(prop, "exclude"))
        location = $(table).children("thead");
        td.attr("colspan", cols);
        tr.addClass("pas-tr");
        td.appendTo(tr);
        $(searcher).addClass(fnGetProp(prop, "searcherClass"));
        searcher.prop("placeholder", sPlaceholder);
        let out;

        if (fnGetProp(prop, "searchOuput")) {
            let foot = $(table).children("tfoot");
            let ftr = new $("<tr>");
            ftr.addClass("pas-tr");
            let ftd = new $("<td>");
            //auf Fußzeile prüfen und ggf. neu anlegen
            if (foot.length === 0) {    //wenn keine Fusszeile, dann eine anlegen
                foot = $("<tfoot>");
                foot.appendTo(table);
            } else {
                $(foot).children("tr").after(ftr);
            };
            ftr.appendTo(foot);
            ftd.attr("colspan", cols);
            tr.addClass("pas-tr");
            ftd.appendTo(ftr);
            out = $("<span>");
            out.appendTo(ftd);
        }

        if (fnGetProp(prop, "searchOnEnter")) {
            searcher.keypress(function (e) {
                if (e.keyCode === 13) {
                    fnSearchTable(this, out);
                };
            });
        } else {
            searcher.keyup(function (e) {
                fnSearchTable(this, out);
            });
        };

        searcher.appendTo(td);
    }

    //wenn Exportfunktion gewünscht
    var exFn = fnGetProp(prop, "exportFunction");
    if ($.isFunction(exFn)) {
        let exportname = fnGetProp(prop, "exportName");
        let foot = $(table).children("tfoot");
        if (foot.length > 0) {
            let btnExport = $("<a>");
            btnExport.data("table", "#" + $(table).prop("id"));
            btnExport.prop("title", "exportiert die Tabelle\n -um einzelne Zeilen zu exportieren, diese mit STRG+Klick markieren\n -ansonsten wird die Tabelle anhand der Filtereinstellungen exportiert")
            btnExport.attr("href", "#");
            btnExport.attr("type", "button");
            btnExport.css("margin-right", "10px");
            btnExport.addClass("btn btn-default btn-sm");
            btnExport.html("exportieren");
            let field = $(foot).children("tr:last-child()").children("td");
            btnExport.prependTo(field);
            btnExport.on("click", function () {
                let myTable = $(this).data("table");
                let exportTable = new $("<table>");
                exportTable.html($(myTable).html());
                exportTable.children("tfoot").empty();
                let rows = $(exportTable).children("tbody").children("tr.pas-tr-select");
                if (rows.length > 0) {
                    exportTable.children("tbody").empty();
                    rows.appendTo(exportTable.children("tbody"));
                };
                exFn(exportTable, exportname);
            });
        };
    };

    //wenn sortiert werden soll
    if (fnGetProp(prop, "sorting")) {
        $(table).children("thead").children('tr').children("th").addClass("pas-tr-sort");
        $(table).children("thead").children("tr").children('th').click(function () {
            let table = $(this).parents('table').eq(0)
            let rows = $(table).find('tbody tr').toArray().sort(comparer($(this).index()))
            this.asc = !this.asc
            if (!this.asc) { rows = rows.reverse() }
            for (let i = 0; i < rows.length; i++) { table.append(rows[i]) }
        })

    }
}

function fnPageTable(pos, sender) {
    let body = $(sender).closest("table").children("tbody");
    let actPage = $(body).data("page");
    let rows = $(body).data("rows");
    let tblRows = $(body).data("tblRows");
    let pages = $(body).data("pages");
    let field = $(sender).closest("td").children("input:text");
    let effect = fnGetProp(prop, "effect");

    if (isNaN(pos)) {
        switch (pos) { //wenn die Anforderung von einer der Navigationsschaltflächen kommt
            case "first":
                actPage = 0;
                break;

            case "last":
                actPage = pages - 1;
                break;

            case "prev":
                if (actPage > 0) {
                    actPage += -1;
                }
                break;

            case "next":
                if (actPage < pages - 1) {
                    actPage++
                }
                break;
        };
    } else {
        actPage = pos;
    };

    //hier jetzt die Anzeige des Labels 'Seite x von y' einstellen
    if (field.length > 0) {                 // wenn es ein Textfeld gibt
        field.val(parseInt(actPage + 1));   //dann den Wert der aktuellen Seite dort eintragen (+1, da Null-basiernd)
    } else {                                //ansonsten das Labelelement aktualisieren
        let label = $(sender).closest("td").children("div").next("label");
        $(label).html("Seite " + parseInt(actPage + 1) + " von " + pages);
    };

    let start, end;
    $(body).data("page", actPage);
    start = actPage * rows;
    end = start + rows;

    if (effect !== null) {
        $(body).hide(effect);
        $(body).promise().done(function () {
            $(body).children("tr").hide()
            $(body).children("tr").slice(start, end).show();
            $(body).show(effect);
        });
    } else {
        $(body).children("tr").hide()
        $(body).children("tr").slice(start, end).show();
    }

}

function fnSearchTable(sender, output) {
    let myTable = $(sender).closest("table");
    let filter = $(sender).val().toUpperCase();
    let rows = $(myTable).children("tbody").children("tr");
    let intCounter = 0;
    let inFieldlist = "";
    let exFieldlist = "";
    let match = false;
    let body = $(myTable).children("tbody");
    $(body).children("td.hl").removeClass("hl");
    rows.removeHighlight();
    rows.css("display", "");

    if (parseInt($(myTable).data("include")) > 0) {
        inFieldlist = $(myTable).data("include").toString().split(",");
    };

    if (parseInt($(myTable).data("exclude")) > 0) {
        exFieldlist = $(myTable).data("exclude").toString().split(",");
    };

    for (let i = 0; i < rows.length; i++) {
        let cols = [];
        let colCount;
        //Ausschluss hat Vorrang
        if (exFieldlist.length > 0) {
            let exFields = $(rows[i]).children("td");
            for (let a = 0; a < exFields.length; a++) {
                for (let e = 0; e < exFieldlist.length; e++) {
                    if (parseInt(exFieldlist[e]) === parseInt(a + 1)) {
                        match = true;
                        break;
                    };
                };
                if (!match) {
                    let exField = $(rows[i]).children("td:nth-child(" + parseInt(a + 1) + ")");
                    exField.addClass("hl");
                    cols.push(exField);
                };
                match = false;
            }

        } else {
            if (inFieldlist.length === 0) {
                cols = $(rows[i]).children("td");
                cols.addClass("hl");
                colCount = $(rows[0]).children("td").length;
            } else {

                for (let j = 0; j < inFieldlist.length; j++) {
                    let inField = $(rows[i]).children("td:nth-child(" + inFieldlist[j] + ")");
                    inField.addClass("hl");
                    cols.push(inField);
                };
                colCount = inFieldlist.length;
            };

        }

        for (let f = 0; f < cols.length; f++) {
            let td = $(cols[f]);
            let html = $(td).html().toUpperCase();

            if (html.indexOf(filter) > -1) {
                match = true;
                intCounter++;
            };
        };

        if (output) {
            $(output).html("Treffer in: " + intCounter + " von " + $(rows).children("td").length + " Feldern");
        };

        if (match) {
            $(rows[i]).removeClass("pas-HideRow");
        } else {
            $(rows[i]).addClass("pas-HideRow");
        };

        if (filter.length === 0) {
            $(output).empty();
        };
        match = false;
    };

    if (filter) {
        $(rows).not("pas-HideRow").children("td.hl").highlight(filter);
    };
    $(".pas-HideRow").removeClass("pas-tr-select");
}

function fnGetProp(arr, prop) {
    for (let i = 0; i < arr.length; i++) {
        let p = Object.keys(arr[i])[0];
        if (p === prop) {
            return arr[i][prop];
        }
    }
}

function comparer(index) {
    return function (a, b) {
        let valA = getCellValue(a, index), valB = getCellValue(b, index)
        return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.toString().localeCompare(valB)
    }
}

function getCellValue(row, index) {
    return $(row).children('td').eq(index).text()
}


//************
//Highlight mit besten Dank von http://jsfiddle.net/rGrvf/439/
jQuery.fn.highlight = function (pat) {
    function innerHighlight(node, pat) {
        let skip = 0;
        if (node.nodeType === 3) {
            let pos = node.data.toUpperCase().indexOf(pat);
            if (pos >= 0) {
                let spannode = document.createElement('span');
                spannode.className = 'pas-highlight';
                let middlebit = node.splitText(pos);
                let endbit = middlebit.splitText(pat.length);
                let middleclone = middlebit.cloneNode(true);
                spannode.appendChild(middleclone);
                middlebit.parentNode.replaceChild(spannode, middlebit);
                skip = 1;
            }
        }
        else if (node.nodeType === 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
            for (let i = 0; i < node.childNodes.length; ++i) {
                i += innerHighlight(node.childNodes[i], pat);
            }
        }
        return skip;
    }
    return this.each(function () {
        innerHighlight(this, pat.toUpperCase());
    });
};

jQuery.fn.removeHighlight = function () {
    function newNormalize(node) {
        for (let i = 0, children = node.childNodes, nodeCount = children.length; i < nodeCount; i++) {
            let child = children[i];
            if (child.nodeType === 1) {
                newNormalize(child);
                continue;
            }
            if (child.nodeType !== 3) { continue; }
            let next = child.nextSibling;
            if (next === null || next.nodeType !== 3) { continue; }
            let combined_text = child.nodeValue + next.nodeValue;
            let new_node = node.ownerDocument.createTextNode(combined_text);
            node.insertBefore(new_node, child);
            node.removeChild(child);
            node.removeChild(next);
            i--;
            nodeCount--;
        }
    }

    return this.find("span.pas-highlight").each(function () {
        let thisParent = this.parentNode;
        thisParent.replaceChild(this.firstChild, this);
        newNormalize(thisParent);
    }).end();
};
