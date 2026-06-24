# Ticket Scanner für GitHub Pages

Statische Web-App für iPhone/Safari mit Kamera-Scanner.

## Excel-Aufbau

Die Excel-Datei wird direkt im Browser eingelesen.

| Spalte A | Spalte B | Spalte C |
|---|---|---|
| Noah Albrecht | egal | 12345 |
| Max Mustermann | egal | 12346 |

Die App verwendet:

- Spalte A = Name
- Spalte B = irrelevant
- Spalte C = Ticket-ID

Der Barcode/QR-Code sollte **nur die Ticket-ID** enthalten, zum Beispiel:

```txt
12345
```

Falls trotzdem ein alter Code wie `noah_albrecht_12345` gescannt wird, nimmt die App automatisch den letzten Teil als ID.

## Wichtig

- GitHub Pages wegen HTTPS nutzen.
- Die App ist ein Fake-Backend: Daten werden im Browser per localStorage gespeichert.
- Auf mehreren Handys sind die Scanstände nicht automatisch synchron.
- Am Ende über „Scan-Ergebnisse exportieren“ eine JSON-Datei herunterladen.

## Passwort ändern

In `script.js`:

```js
const PASSWORD = "abi2026";
```
