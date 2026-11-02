/* Vibe-to-Premium site config. The only file you need to edit to wire up services.
   Every value is safe to commit to a public GitHub Pages repo (see README.md). */
window.V2P_CONFIG = {
  // Google PageSpeed Insights browser key. Restrict it to the PageSpeed Insights API
  // and the https://sdrprime.github.io/* referrer. Leave '' to use the shared keyless quota.
  PSI_API_KEY: 'AIzaSyBpa7ezzfyyKqqDfyEIwTBHGzTYziIOd5E',

  // Tally form IDs: the part after tally.so/r/ in the share link (e.g. 'wMxYzA').
  // Leave '' to fall back to a prefilled email to CONTACT_EMAIL (below).
  TALLY_RETAINER_FORM_ID: '', // Design Partner application
  TALLY_WAITLIST_FORM_ID: '', // Weekly teardown email list

  // Where applications and waitlist sign-ups go while the Tally IDs are blank: the forms
  // open the visitor's email app (mailto:) with everything prefilled. REPLACE before launch.
  CONTACT_EMAIL: 'hello@REPLACE-ME.com'
};
