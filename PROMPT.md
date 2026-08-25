# Prompt for rebuilding this project in Node.js

You are receiving a complete handoff for an existing web app and must recreate it as faithfully as possible in Node.js.

## Goal
Rebuild the project as a Node.js application that preserves the same features, routes, data model, appearance, copy, and user experience as the original implementation.

Do not simplify it into a generic blog or demo. This is a 1:1 functional and visual recreation of the original app.

## Project identity
This is a Romanian-language archive website for PBInfo C++ solutions.

Core purpose:
- display archived PBInfo problems
- show solution code files
- render parsed exercise statements from editable text files
- support homework/week pages
- provide search and filtering
- offer a premium, Discord-inspired UI with dark/light theme

The app is fully in Romanian.

## Recommended stack
Use:
- Node.js
- Express
- EJS for server-rendered views
- vanilla CSS and vanilla JavaScript for styling and interactivity
- JSON files and filesystem-based data storage (no database needed)

Prefer a simple, maintainable structure rather than a framework-heavy setup.

## Expected app behavior
The app should provide these pages and routes:

- Home page: /
- Archive/search page: /p
- Problem detail page: /:id (numeric problem ID)
- Homework index: /h
- Homework by week: /h/s1, /h/2, /h/clasa-9/s1, etc.
- Legal pages: /privacy, /terms, /cookies
- Error page for 404/500

## Core features to implement exactly

1. Home page
- Hero section with branded title and CTA
- Stats showing total problems and solutions
- Grade cards for classes 9-12
- Recent problems grid

2. Archive page
- Search input by problem ID or title
- Filter by grade
- Filter by tag
- Responsive cards for each problem
- Results count
- Empty state when no results match

3. Problem detail page
- Show problem ID, title, grade, difficulty, tags, notes
- Render the exercise statement if a matching file exists in data/exercises
- Show the solution code from data/solutions if available
- Copy button for code
- Previous/next navigation between problems
- View counter badge in the bottom-right corner

4. Homework page
- Sidebar list of available weeks
- Grouping by grade where applicable
- Render homework Markdown-like content parsed into headings, paragraphs, bullets, and list blocks
- Exercise references should be clickable if they correspond to known problems
- Status indicators should reflect whether a solution exists for referenced problems

5. Theme system
- Dark/light toggle in the top-right
- Save preference in localStorage
- Initial theme should follow system preference if no saved value exists

6. Navigation
- Left hamburger menu with dropdown navigation
- Social links to Discord and Instagram
- Sticky top nav

7. Legal pages
- Render a consistent legal template for privacy/terms/cookies

8. Error handling
- Graceful 404 and 500 pages
- Server should not crash on missing routes or bad input

## Data model and file layout
Recreate the same file-based structure:

- data/problems.json
- data/solutions/
- data/exercises/
- data/homework/
- data/views.json

### problems.json format
The file contains a top-level object with a meta section and problems array.

Each problem object should include:
- id: number
- titles: { ro, en }
- grade: 9, 10, 11, or 12
- difficulty: 1-4
- tags: array of strings
- notes: object with ro/en text

### solutions files
Solution files should be stored as <id>.cpp in data/solutions/.

### statement files
Readable exercise statements should be stored as <id>.txt or <id>.md in data/exercises/.

The parser should recognize PBInfo-style headings such as:
- Cerința
- Date de intrare
- Date de ieșire
- Restricții și precizări
- Exemplu
- Explicație

Any text before the first heading should be treated as an intro section.

### homework files
Homework files are stored in data/homework/ as s1.md, s2.md, etc.

Support:
- Markdown-like content parsing
- frontmatter with grade/week values
- links and bullet lists
- exercise references like 1234.cpp or 1234

### views.json
Store view counters per problem ID as a JSON object keyed by problem ID.

## Important behavior details

- The app should read data from the filesystem each time it needs it, not from a database.
- Problem pages should increment the view count on each visit.
- The archive should support case-insensitive search across IDs, titles, and tags.
- Grades and labels should be handled via a shared helper.
- The site should be fully Romanian in UI copy.
- The homepage and archive should be responsive.
- Code blocks should be rendered with syntax highlighting styling similar to the original.
- The copy button should copy the code content to the clipboard.
- The theme toggle should update the html[data-theme] attribute and persist selection.
- The left hamburger menu should open/close and close on outside click or Escape.

## UI/UX requirements
The visual design should feel like a premium, Discord-inspired dark/light theme.

Recreate these stylistic traits:
- dark background with layered gradients
- glassy panels and cards
- rounded corners
- strong typography with clear hierarchy
- monospaced code blocks
- subtle hover animations and transitions
- responsive layout
- polished navigation and footer

## Existing copy and translations
Use Romanian strings and preserve the existing terminology wherever possible.

The app uses a translation helper with keys such as:
- brand
- brand_subtitle
- nav_home
- nav_problems
- nav_homework
- archive_title
- archive_search_ph
- problem_solutions
- problem_statement
- difficulty_easy
- difficulty_medium
- difficulty_hard
- difficulty_expert
- legal_privacy
- legal_terms
- legal_cookies

You should implement a simple i18n dictionary with the same strings or a close equivalent.

## Routes and rendering expectations
Build server-rendered pages with EJS and pass the necessary data from the server.

### Routes to implement
- GET / -> home page
- GET /archive -> archive page
- GET /tema -> homework index
- GET /tema/s:week -> homework by week
- GET /tema/:week -> homework by week (numeric)
- GET /tema/clasa-:grade -> homework for a grade
- GET /tema/clasa-:grade/s:week -> homework for grade/week
- GET /privacy, /terms, /cookies -> legal pages
- GET /:id -> problem detail page for numeric IDs
- POST /client-log -> accept client-side error log payloads

## Existing files to mirror
The app already includes these file names and responsibilities:
- server.js -> Express app and route definitions
- lib/i18n.js -> Romanian translation dictionary
- lib/grades.js -> grade constants and labels
- lib/parser.js -> filename parser for solution IDs
- data/store.js -> file-based data access layer for problems, solutions, statements, homework, and views
- views/*.ejs -> templates
- views/partials/*.ejs -> shared layout partials
- public/css/style.css -> styling
- public/js/main.js -> client-side interactivity
- public/js/prism-cpp.js -> syntax highlighting assets

If you are recreating from scratch, follow the same responsibilities for each file.

## Important implementation notes
- Do not over-engineer. Keep it simple and file-based.
- Preserve the current route semantics and URL patterns.
- Preserve the current Romanian content and sample data.
- Maintain the same top-level folder structure where practical.
- Make sure the app can be run with npm install and npm start.
- The original app uses CommonJS. Keep that unless you have a strong reason to switch.

## Acceptance criteria
Your rebuilt app should satisfy all of the following:
- Running npm install and npm start starts a local server on port 3000
- Visiting / shows the homepage with the branded layout
- Visiting /archive shows searchable/filterable problem cards
- Visiting /1234 shows the problem page with solution content and statement sections if present
- Visiting /tema shows homework content and links to weekly pages
- Visiting /privacy, /terms, and /cookies renders the legal pages
- The site supports dark/light theme switching and persistence
- The code copy button works
- The app handles missing routes gracefully with a 404 page

## Final instruction
Build the app so it is as close as possible to the original implementation in both functionality and appearance. Preserve the Romanian language, file-based data approach, and the overall premium UI style.
