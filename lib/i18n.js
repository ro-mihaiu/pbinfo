'use strict';

// Romanian translation dictionary
const translations = {
  // Brand
  brand: 'Arhiva PBInfo',
  brand_subtitle: 'Soluții și enunțuri C++ pentru pbinfo.ro',

  // Navigation
  nav_home: 'Acasă',
  nav_problems: 'Arhivă',
  nav_homework: 'Teme',

  // Home
  hero_title: 'Toate soluțiile PBInfo, într-un singur loc',
  hero_subtitle: 'Arhivă completă de probleme, soluții C++ și enunțuri pentru clasele 9-12.',
  hero_cta_archive: 'Explorează arhiva',
  hero_cta_homework: 'Vezi temele',
  stats_problems: 'Probleme',
  stats_solutions: 'Soluții',
  stats_viewers: 'Vizualizări',
  grades_title: 'Explorează pe clase',
  grades_subtitle: 'Alege clasa pentru a vedea problemele corespunzătoare.',
  recent_title: 'Probleme recente',
  recent_subtitle: 'Ultimele probleme adăugate în arhivă.',
  view_all: 'Vezi toate',

  // Archive
  archive_title: 'Arhiva de probleme',
  archive_subtitle: 'Caută și filtrează după ID, titlu, clasă sau dificultate.',
  archive_search_ph: 'Caută după ID sau titlu...',
  archive_filter_grade: 'Clasă',
  archive_filter_difficulty: 'Dificultate',
  archive_all_grades: 'Toate clasele',
  archive_difficulty_all: 'Toate dificultatile',
  archive_difficulty_easy: 'usor',
  archive_difficulty_medium: 'medium',
  archive_difficulty_hard: 'dificil',
  archive_difficulty_competition: 'concurs',
  archive_grade_all_short: 'Toate Clasele',
  archive_grade_9_short: '9',
  archive_grade_10_short: '10',
  archive_grade_11_short: '11',
  archive_grade_12_short: '12',
  archive_results: 'rezultate',
  archive_result: 'rezultat',
  archive_empty_title: 'Niciun rezultat găsit',
  archive_empty_text: 'Încearcă să modifici căutarea sau filtrele.',
  archive_reset: 'Resetează filtrele',

  // Problem detail
  problem_solutions: 'Soluții',
  problem_statement: 'Enunț',
  problem_notes: 'Note',
  problem_grade: 'Clasă',
  problem_difficulty: 'Dificultate',
  problem_tags: 'Taguri',
  problem_copy: 'Copiază',
  problem_copied: 'Copiat!',
  problem_prev: 'Anterior',
  problem_next: 'Următorul',
  problem_no_solution: 'Nu există o soluție pentru această problemă.',
  problem_no_statement: 'Nu există un enunț pentru această problemă.',
  problem_views: 'vizualizări',

  // Difficulty
  difficulty_easy: 'Ușor',
  difficulty_medium: 'Mediu',
  difficulty_hard: 'Dificil',
  difficulty_expert: 'Expert',

  // Homework
  homework_title: 'Teme',
  homework_subtitle: 'Teme pe săptămâni și clase.',
  homework_weeks: 'Săptămâni',
  homework_grades: 'Clase',
  homework_no_content: 'Nu există conținut pentru această temă.',
  homework_back: 'Înapoi la teme',

  // Legal
  legal_privacy: 'Politica de confidențialitate',
  legal_terms: 'Termeni și condiții',
  legal_cookies: 'Politica de cookie-uri',
  legal_last_updated: 'Ultima actualizare',

  // Footer
  footer_tagline: 'Arhivă de soluții C++ pentru pbinfo.ro, construită cu pasiune.',
  footer_quick_links: 'Linkuri rapide',
  footer_social: 'Social media',
  footer_rights: 'Toate drepturile rezervate.',

  // Errors
  error_404_title: 'Pagina nu a fost găsită',
  error_404_text: 'Se pare că pagina pe care o cauți nu există.',
  error_404_home: 'Înapoi la Acasă',
  error_500_title: 'Eroare internă',
  error_500_text: 'A apărut o eroare neașteptată. Încearcă din nou mai târziu.',
  error_500_home: 'Înapoi la Acasă',

  // Misc
  menu: 'Meniu',
  close: 'Închide',
  theme: 'Temă',
  language: 'Limbă'
};

function t(key) {
  return translations[key] || key;
}

module.exports = {
  translations,
  t
};
