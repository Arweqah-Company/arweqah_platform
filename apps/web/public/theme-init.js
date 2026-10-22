// Runs before the page paints, so the chosen theme shows with no flash. Kept as a file (not inline) for the strict CSP.
(function () {
  try {
    var saved = window.localStorage.getItem('theme');
    var dark = saved === 'dark' || ((saved === null || saved === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
