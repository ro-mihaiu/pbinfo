# cpp-codes
Most code solutions and explanations for pbinfo.ro
# Importing copied pbInfo statements

Paste one or more complete pbInfo problem pages into a text file, then run:

```sh
node tools/import-pbinfo-text.js < copied-pages.txt
```

The importer finds each `#ID Title` heading, keeps the statement from `Cerința` through the examples, and writes `data/problems/<ID range>/<ID>.txt`. It ignores the page navigation, submissions, contact details, and footer. Existing statement files with the same ID are replaced.
