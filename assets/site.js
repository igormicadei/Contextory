/** PT-BR: Aprimorar navegação e busca sem esconder o conteúdo estático.
 * EN: Enhance navigation and search while preserving static content access.
 */
(() => {
  'use strict';
  document.documentElement.classList.remove('no-js');
  const menu = document.querySelector('#menu');
  const navigation = document.querySelector('#navigation');
  /** PT-BR: Fechar o menu mobile e remover seus links da ordem de foco.
   * EN: Close the mobile menu and remove its links from the focus order.
   */
  function closeMenu() {
    document.body.classList.remove('menu-open');
    menu?.setAttribute('aria-expanded', 'false');
    if (navigation && window.innerWidth <= 760) navigation.inert = true;
  }
  /** PT-BR: Sincronizar foco com o tamanho atual da janela e o menu aberto.
   * EN: Synchronize focus with the current viewport and expanded menu.
   */
  function synchronizeNavigation() {
    if (navigation) navigation.inert = window.innerWidth <= 760 && !document.body.classList.contains('menu-open');
  }
  menu?.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    menu.setAttribute('aria-expanded', String(open));
    synchronizeNavigation();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
      closeMenu();
      menu?.focus();
    }
  });
  document.querySelector('main')?.addEventListener('click', closeMenu);
  window.addEventListener('resize', synchronizeNavigation);
  synchronizeNavigation();
  const input = document.querySelector('#search');
  const results = document.querySelector('#search-results');
  const status = document.querySelector('#search-status');
  let corpus;
  /** PT-BR: Pesquisar o índice local no idioma ativo e ignorar consultas antigas.
   * EN: Search the local index in the active locale and discard stale queries.
   */
  async function search() {
    const query = input.value.trim().toLocaleLowerCase();
    results.replaceChildren();
    status.textContent = '';
    if (query.length < 2) return;
    try {
      corpus ??= fetch('../search-index.json').then(response => {
        if (!response.ok) throw new Error('search index');
        return response.json();
      });
      const entries = await corpus;
      if (input.value.trim().toLocaleLowerCase() !== query) return;
      const locale = document.documentElement.lang;
      const words = query.split(/\s+/);
      const matches = entries.filter(item => item.locale === locale && words.every(word => `${item.title} ${item.text}`.toLocaleLowerCase().includes(word)));
      status.textContent = matches.length ? String(matches.length) : input.dataset.none;
      matches.slice(0, 15).forEach(item => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `${item.id}.html`;
        link.textContent = item.title;
        const excerpt = document.createElement('p');
        excerpt.textContent = item.text.replace(/^#+ /gm, '').slice(0, 140);
        li.append(link, excerpt);
        results.append(li);
      });
    } catch {
      corpus = undefined;
      status.textContent = document.documentElement.lang === 'en' ? 'Search unavailable. Browse the navigation or Markdown export.' : 'Busca indisponível. Use a navegação ou a exportação Markdown.';
    }
  }
  input?.addEventListener('input', search);
})();
