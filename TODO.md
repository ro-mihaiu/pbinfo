# TODO

## Fix syntax-highlighting corruption in prism-cpp.js
- [x] Analyze prism-cpp.js highlight() to identify sequential-replace corruption bug
- [x] Rewrite highlight() as a single-pass tokenizer (one combined regex)
- [x] Verify no re-processing of inserted markup

## Move problem routes to /problema/:id
- [x] Update server.js: GET /problema/:id + old /:id 301 redirect
- [x] Update makeLinkResolver to return /problema/:id
- [x] Update views/archive.ejs links
- [x] Update views/home.ejs links
- [x] Update views/problem.ejs prev/next links
- [x] Verify server starts and routes work
