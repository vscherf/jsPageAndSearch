"use strict";
//written by vs
//benötigt html5, jQuery, optional: Bootstrap, jQueryUI

//fügt in eine HTML-Tabelle einen Pager und/oder ein Suchfeld ein
//Der Pager kann wahlweise in der Kopf- oder Fusszeile angezeigt werden.
//Das Suchfeld wird immer als erste Zeile angezeigt. Wenn eine Ausgabe der Trefferanzahl (nur gefundene Zeilen) gewünscht ist, dann wird diese immer in der Fußzeile angezeigt.
//Sämtliche Elemente innerhalb des Pagingelements werden per CSS-Selektoren gestylt.
//folgende Events sind aktiv:
//Tabellenzeile des Bodys: Mausklick: markiert eine Zeile
//                         CTRL+Mausklick: markiert mehrere Zeilen
//Pagebuttons:             CTRL+Mausklick: zeigt alle Zeilen der Tabelle an

//Dieses Script-Datei und die CSS-Datei im Header der Seite einbinden.
//Standardmäßig muss nur der Tabellenname übergeben werden: 
//fnPageAndSearch([
//    { tableName: "#myTable" }
//])


var table

var DEFAULTS =
    [
        { tableName: '' },              //der Name der Tabelle (im jQuery-Format: '#tableName')
        { tableStyle: true },           //soll die Tabelle zusätzlich gestylt werden | Standard: true
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
        { searchOuput: true },          //soll eine Ausgabe der gefundenen Zeilen angezeigt werden (wird immer in Fußzeile angezeigt) | Standard: trie
        { searchInCols: -1 },           //in welchen Spalten soll gesucht werden (-1 für alle, sonst als String mit Komma getrennt (Bsp: '1,4,6', nicht 0-basierend)) | Standard: -1
        {
            searcherClass:              //die CSS-Klassen für das Filterfeld | Standard: "tblPageAndSearch-searchfield"
                "tblPageAndSearch-searchfield"
        },
        {
            matchClass:                 //die Klasse für die Markierung der gefundenen Felder | Standard: "tblPageAndSearch-match"
                "tblPageAndSearch-match"
        },
        {
            searchPlaceholder:          //der Placeholder-Text für das Suchfeld | Standard:  "type text to search in table"
                "type text to search in table"
        }
    ]

var prop = [];
var bs = false;           //mit oder ohne Bootstrap

var fnPageAndSearch = (function PageAndSearch(properties)
{
    if (typeof properties !== "undefined")
    {
        prop = properties;
    };

    //fehlende Properties mit denen aus den DEFAULTS ergänzen
    for (var i = 0; i < DEFAULTS.length; i++)
    {
        var def = Object.keys(DEFAULTS[i])[0];
        var match = false;
        for (var j = 0; j < prop.length; j++)
        {
            if (prop[j].hasOwnProperty(def))
            {
                match = true;
                break;
            }
        }
        if (!match)
        {
            prop.push(DEFAULTS[i]);
        }
    }
    bs = fnGetProp(prop, "withBootstrap");
    table = $(fnGetProp(prop, "tableName"));
    if (!table.length > 0) { return false };                            //wenn keine Tabelle dann nix machen
    var body = $(table).children("tbody");                              //das Bodyelement der Tabelle
    var location;                                                       //wo ist das Pagingelement untergebracht
    var tr = new $("<tr>");                                             //eine neue Zeile fürs Pagingelement
    var td = new $("<td>");                                             //das Tabellenfeld fürs Pagingelement
    var cols = $(table).children("tbody").children("tr:nth-child(1)").children("td").length; //Anzahl der Tabellenspalten

    //wenn die Tabelle gestylt werden soll
    if (fnGetProp(prop, "tableStyle"))
    {
        if (bs)
        {
            table.addClass("table table-bordered table-condensed table-striped table-hover");
        } else
        {
            table.addClass("tblPageAndSearch-table");
            $(table).children("tbody").children("tr").mousedown(function (event)
            {
                if (event.ctrlKey)
                {
                    $(this).toggleClass("tblPageAndSearch-tr-select");
                } else
                {
                    $(this).toggleClass("tblPageAndSearch-tr-select").siblings().removeClass("tblPageAndSearch-tr-select");
                }
            })
        }
    };

    //wenn das Pagerelement engezeigt werden soll
    if (fnGetProp(prop, "showPager"))
    {
        var pagingElement = new $("<div>");                                 //das div-Element, welches die Buttons und das Label enthält
        var label = new $("<label>");                                       //das Labelelement für die Anzeige 'Seite x von y
        var tblRows = $(body).children("tr").length;                        //Anzahl Zeilen der Tabelle
        var rows = fnGetProp(prop, "outputRows");                           //Anzahl der darzustellenden Zeilen
        var pageCount = Math.ceil(tblRows / rows);                          //Anzahl der Seiten
        var btnSize = "";
        var startPage = fnGetProp(prop, "startWithPage");                   //Startseite

        if (startPage === "last")
        {
            startPage = parseInt(pageCount - 1);
        } else if (startPage === "middle")
        {
            startPage = parseInt(pageCount / 2);
        } else
        {
            if (isNaN(startPage))
            {
                startPage = 1;
            };
        };
        startPage = parseInt(startPage - 1);
        if (startPage < 1) { startPage = 0 };
        if (startPage > parseInt(pageCount - 1)) { startPage = parseInt(pageCount - 1); };

        if (tblRows > rows)
        {
            switch (fnGetProp(prop, "buttonSize"))
            {
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

            if (fnGetProp(prop, "showInFooter"))
            {
                location = $(table).children("tfoot");
                if (location.length === 0)
                {    //wenn keine Fusszeile, dann eine anlegen
                    location = $("<tfoot>");
                    location.appendTo(table);
                    tr.appendTo(location);
                } else
                {
                    $(location).children("tr").after(tr);
                }
                location = $(table).children("tfoot");

            } else
            {
                location = $(table).children("thead");
                if (location.length === 0)
                {    //wenn keine Kopfzeile, dann eine anlegen
                    location = $("<thead>");
                    location.appendTo(table);
                    tr.appendTo(location);
                } else
                {
                    $(location).children("tr:first-child").before(tr)
                }
                location = $(table).children("thead");
            };

            if (bs)
            {
                $(pagingElement).addClass("btn-group");
                $(pagingElement).addClass("tblPageAndSearch-pagediv-bs");

            } else
            {
                $(pagingElement).addClass("tblPageAndSearch-pagediv");
            };
            tr.addClass("tblPageAndSearch-tr");
            td.attr("colspan", cols);
            td.appendTo(tr);
            pagingElement.appendTo(td);
            $(body).data("pages", pageCount);
            $(body).data("tblRows", tblRows);
            $(body).data("rows", rows);

            $(body).children("tr").hide();
            $(pagingElement).after(label);

            var btn;

            if (fnGetProp(prop, "showNavButtons"))
            {
                for (var b = 1; b <= 4; b++)
                {
                    btn = new $("<input>");
                    btn.prop("type", "button");
                    var title = "";
                    if (bs)
                    {
                        classlist = "btn btn-default " + btnSize;
                    };
                    $(btn).addClass(classlist);
                    switch (b)
                    {
                        case 1:
                            $(btn).val("«");
                            $(btn).data("position", "first");
                            title = "erste Seite";
                            break;
                        case 2:
                            $(btn).val("‹");
                            $(btn).data("position", "prev");
                            title = "eine Seite zurück";
                            break;
                        case 3:
                            $(btn).val("›");
                            $(btn).data("position", "next");
                            title = "eine Seite vor";
                            break;
                        case 4:
                            $(btn).val("»");
                            $(btn).data("position", "last");
                            title = "letzte Seite";
                            break;
                    };

                    $(btn).attr("title", title);
                    $(btn).mousedown(function (event)
                    {
                        if (event.ctrlKey)
                        {
                            $(this).closest("table").children("tbody").children("tr").show();
                        } else
                        {
                            var pos = $(this).data("position");
                            fnPageTable(pos, this);
                        };
                    });

                    btn.appendTo(pagingElement);
                }

                if (fnGetProp(prop, "showPageInput"))
                {
                    var lbl = new $("<label>");
                    lbl.html("Seite");
                    var field = $("<input>");
                    field.prop("min", 1);
                    field.prop("max", pageCount);
                    field.prop("title", "Seitenzahl");
                    field.addClass("tblPageAndSearch-pageinput")

                    if (bs)
                    {
                        field.addClass("form-control");
                    } else
                    {
                        field.addClass(fnGetProp(prop, "pageInputClass"));
                    };

                    $(pagingElement).after(field);
                    $(pagingElement).after(lbl);

                    $(field).change(function ()
                    {
                        var pos = $(this).val();
                        console.log(pos);
                        if (!$.isNumeric(pos))
                        {
                            pos = 1;
                        };

                        pos = parseInt(pos);

                        if (pos < 1)
                        {
                            pos = 1;
                            $(this).val(pos);
                        };

                        if (parseInt(pos + 1) > pageCount)
                        {
                            $(this).val(pos);
                            pos = parseInt(pageCount);
                        };
                        fnPageTable(pos - 1, this);
                    });

                    $(label).html("von " + pageCount)

                };
            } else
            {
                for (var p = 0; p < pageCount; p++)
                {
                    btn = new $("<input>");
                    btn.prop("type", "button");
                    btn.val(parseInt(p) + 1);
                    var classlist = "";
                    if (fnGetProp(prop, "withBootstrap"))
                    {
                        classlist = "btn btn-default " + btnSize;
                    };

                    $(btn).data("position", p);
                    $(btn).mousedown(function (event)
                    {
                        if (event.ctrlKey)
                        {
                            $(this).closest("table").children("tbody").children("tr").show();

                        } else
                        {
                            var pos = $(this).data("position");
                            fnPageTable(pos, this);
                        }
                    })
                    $(btn).addClass(classlist);
                    btn.appendTo(pagingElement);
                };
            };

            btn = $(pagingElement).children("input[type=button]:first-child");
            fnPageTable(startPage, btn);
        }
    }

    //wenn die Tabellensuche angezeigt werden soll
    if (fnGetProp(prop, "showSearcher"))
    {
        var searcher = new $("<input>");
        tr = new $("<tr>");
        td = new $("<td>");
        //auf Kopfzeile prüfen und ggf. neu anlegen
        location = $(table).children("thead");
        if (location.length === 0)
        {    //wenn keine Kopfzeile, dann eine anlegen
            location = $("<thead>");
            location.appendTo(table);
            tr.appendTo(location);
        } else
        {
            $(location).children("tr:first-child").before(tr)
        };
        location = $(table).children("thead");
        td.attr("colspan", cols);
        tr.addClass("tblPageAndSearch-tr");
        td.appendTo(tr);
        $(searcher).addClass(fnGetProp(prop, "searcherClass"));
        searcher.prop("placeholder", fnGetProp(prop, "searchPlaceholder"));
        var out;

        if (fnGetProp(prop, "searchOuput"))
        {
            var foot = $(table).children("tfoot");
            var ftr = new $("<tr>");
            var ftd = new $("<td>");
            //auf Fußzeile prüfen und ggf. neu anlegen
            if (foot.length === 0)
            {    //wenn keine Fusszeile, dann eine anlegen
                foot = $("<tfoot>");
                foot.appendTo(table);
            } else
            {
                $(foot).children("tr").after(ftr);
            };
            ftr.appendTo(foot);
            ftd.attr("colspan", cols);
            tr.addClass("tblPageAndSearch-tr");
            ftd.appendTo(ftr);
            out = $("<span>");
            out.appendTo(ftd);
        }

        searcher.keyup(function ()
        {
            fnSearchTable(this, out);
        })
        searcher.appendTo(td);
    }

})

function fnPageTable(pos, sender)
{

    var body = $(sender).closest("table").children("tbody");
    var actPage = $(body).data("page");
    var rows = $(body).data("rows");
    var tblRows = $(body).data("tblRows");
    var pages = $(body).data("pages");
    var field = $(sender).closest("td").children("input:text");
    var effect = fnGetProp(prop, "effect");

    if (isNaN(pos))
    {
        switch (pos)
        { //wenn die Anforderung von einer der Navigationsschaltflächen kommt
            case "first":
                actPage = 0;
                break;

            case "last":
                actPage = pages - 1;
                break;

            case "prev":
                if (actPage > 0)
                {
                    actPage += -1;
                }
                break;

            case "next":
                if (actPage < pages - 1)
                {
                    actPage++
                }
                break;
        };
    } else
    {
        actPage = pos;
    };

    //hier jetzt die Anzeige des Labels 'Seite x von y' einstellen
    if (field.length > 0)
    {                 // wenn es ein Textfeld gibt
        field.val(parseInt(actPage + 1));   //dann den Wert der aktuellen Seite dort eintragen (+1, da Null-basiernd)
    } else
    {                                //ansonsten das Labelelement aktualisieren
        var label = $(sender).closest("td").children("div").next("label");
        $(label).html("Seite " + parseInt(actPage + 1) + " von " + pages);
    };

    var start, end;
    $(body).data("page", actPage);
    start = actPage * rows;
    end = start + rows;

    if (effect !== null)
    {
        $(body).hide(effect);
        $(body).promise().done(function ()
        {
            $(body).children("tr").hide()
            $(body).children("tr").slice(start, end).show();
            $(body).show(effect);
        });
    } else
    {
        $(body).children("tr").hide()
        $(body).children("tr").slice(start, end).show();
    }

}

function fnSearchTable(sender, output)
{
    var myTable = $(sender).closest("table")
    var columns = $(myTable).data("search-cols")
    var cl = fnGetProp(prop, "matchClass");
    var filter = $(sender).val().toUpperCase();
    var rows = $(myTable).children("tbody").children("tr");
    var intCounter = 0;
    var fieldlist = "";
    var match = false;

    if (parseInt(columns) !== -1)
    {
        fieldlist = columns.split(",");
    };

    for (var i = 0; i < rows.length; i++)
    {
        var cols = [];
        var colCount;
        if (fieldlist.length === 0)
        {
            cols = $(rows[i]).children("td")
            colCount = $(rows[0]).children("td").length
        } else
        {
            for (var j = 0; j < fieldlist.length; j++)
            {
                var field = $(rows[i]).children("td:nth-child(" + fieldlist[j] + ")");
                cols.push(field);
            };
            colCount = fieldlist.length;
        };

        for (var f = 0; f < cols.length; f++)
        {
            var td = $(cols[f]);
            var html = $(td).html().toUpperCase();

            if (html.indexOf(filter) > -1)
            {
                match = true;
                $(td).addClass(cl)
                intCounter++;
            } else
            {
                $(td).removeClass(cl)
            };
        };

        if (output)
        {
            $(output).html("Treffer in " + intCounter + " von " + rows.length + " Zeilen");
        };

        if (match)
        {
            rows[i].style.display = "";
        } else
        {
            rows[i].style.display = "none";
        };

        if (filter - length === 0)
        {
            $(rows).children("td").removeClass(cl);
            $(output).empty();
        };
        match = false;
    }
}

function fnGetProp(arr, prop)
{
    for (var i = 0; i < arr.length; i++)
    {
        var p = Object.keys(arr[i])[0];
        if (p === prop)
        {
            return arr[i][prop];
        }
    }
}
