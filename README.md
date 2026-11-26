# cpp-codes
Most code solutions and explanations for pbinfo.ro
# Importing copied pbInfo statements

Paste one or more complete pbInfo problem pages into a text file, then run:

```sh
node tools/import-pbinfo-text.js < copied-pages.txt
```

The importer finds each `#ID Title` heading, keeps the statement from `Cerința` through the examples, and writes `data/problems/<ID range>/<ID>.txt`. It ignores the page navigation, submissions, contact details, and footer. Existing statement files with the same ID are replaced.

## Issue report emails

Set `RESEND_API_KEY` in the deployment environment and verify `ro-mihaiu.xyz` as a sending domain in Resend. The form sends the report to `dev@ro-mihaiu.xyz` and a separate acknowledgment to the reporter when they provide an email address. `ISSUE_EMAIL_FROM` can override the sender address; by default it uses `PBInfo Archive <dev@ro-mihaiu.xyz>`. Discord notifications continue to use `DISCORD_WEBHOOK_URL`.
