/** PT-BR: Aprimorar o shell Carbon sem substituir links e conteúdo estáticos.
 * EN: Enhance the Carbon shell without replacing static links and content.
 */

const initializeDocumentationShell =
  /** PT-BR: Inicializar navegação móvel, busca local e atalhos acessíveis.
   * EN: Initialize mobile navigation, local search and accessible shortcuts.
   */
  () => {
  'use strict';
  document.documentElement.classList.remove('no-js');

  const menu = document.querySelector('#menu');
  const navigation = document.querySelector('#navigation');
  const backdrop = document.querySelector('#nav-backdrop');
  const content = document.querySelector('#content');
  const brand = document.querySelector('.brand');
  const localeSwitch = document.querySelector('.locale-switch');
  const skip = document.querySelector('.skip');
  const searchForm = document.querySelector('.search-shell');
  const input = document.querySelector('#search');
  const clear = document.querySelector('#search-clear');
  const results = document.querySelector('#search-results');
  const status = document.querySelector('#search-status');
  let searchIndex;
  let searchTimer;
  let requestNumber = 0;

  /** PT-BR: Mostrar uma dica móvel somente quando ainda há colunas fora da tela.
   * EN: Show a mobile hint only while additional columns remain off-screen.
   */
  function updateTableScrollHints() {
    const mobile = window.matchMedia('(max-width: 48rem)').matches;
    for (const container of document.querySelectorAll('.table-scroll')) {
      const hint = container.nextElementSibling;
      if (!(hint instanceof HTMLElement) || !hint.classList.contains('table-scroll-hint')) continue;
      const overflowing = container.scrollWidth > container.clientWidth + 1;
      const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
      hint.hidden = !(mobile && overflowing && !atEnd);
    }
  }

  /** PT-BR: Informar se o drawer móvel está aberto.
   * EN: Report whether the mobile drawer is open.
   */
  function menuIsOpen() {
    return document.body.classList.contains('menu-open');
  }

  /** PT-BR: Sincronizar estados acessíveis e elementos inertes do drawer.
   * EN: Synchronize accessible states and inert page elements for the drawer.
   */
  function synchronizeNavigation() {
    const mobile = window.matchMedia('(max-width: 48rem)').matches;
    const open = mobile && menuIsOpen();
    if (navigation) navigation.inert = mobile && !open;
    if (content) content.inert = open;
    if (brand) brand.inert = open;
    if (localeSwitch) localeSwitch.inert = open;
    if (skip) skip.inert = open;
    if (menu) menu.setAttribute('aria-expanded', String(open));
    if (backdrop) backdrop.hidden = !open;
    document.body.classList.toggle('menu-open', open);
  }

  /** PT-BR: Fechar o drawer e opcionalmente devolver foco ao botão de menu.
   * EN: Close the drawer and optionally return focus to its menu button.
   */
  function closeMenu(returnFocus = false) {
    document.body.classList.remove('menu-open');
    synchronizeNavigation();
    if (returnFocus) menu?.focus();
  }

  /** PT-BR: Abrir o drawer e posicionar o foco na busca.
   * EN: Open the drawer and move focus to search.
   */
  function openMenu() {
    document.body.classList.add('menu-open');
    synchronizeNavigation();
    input?.focus();
  }

  /** PT-BR: Abrir o drawer no mobile antes de focar a busca.
   * EN: Open the mobile drawer before focusing search.
   */
  function focusSearch() {
    if (window.matchMedia('(max-width: 48rem)').matches && !menuIsOpen()) {
      openMenu();
    } else {
      input?.focus();
    }
  }

  /** PT-BR: Reunir os controles visíveis do drawer e do seu botão de fechamento.
   * EN: Collect visible drawer controls and its close button.
   */
  function navigationFocusables() {
    const focusables = menu ? [menu] : [];
    if (!navigation) return focusables;
    for (const element of navigation.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), summary')) {
      const collapsedGroup = element.closest('details:not([open])');
      if (element.getClientRects().length && !element.closest('[hidden]') && (!collapsedGroup || element.matches('summary'))) focusables.push(element);
    }
    return focusables;
  }

  /** PT-BR: Alternar o drawer a partir do botão do cabeçalho.
   * EN: Toggle the drawer from its header button.
   */
  function handleMenuClick() {
    menuIsOpen() ? closeMenu() : openMenu();
  }

  /** PT-BR: Fechar o drawer quando a pessoa aciona a camada de fundo.
   * EN: Close the drawer when the backdrop is activated.
   */
  function handleBackdropClick() {
    closeMenu(true);
  }

  /** PT-BR: Fechar o drawer depois que um item de navegação for escolhido.
   * EN: Close the drawer after a navigation item is chosen.
   */
  function handleNavigationClick(event) {
    if (event.target.closest('a.nav-link')) closeMenu();
  }

  /** PT-BR: Fechar o drawer quando a região principal recebe um clique.
   * EN: Close the drawer when the main region receives a click.
   */
  function handleContentClick() {
    closeMenu();
  }

  menu?.addEventListener('click', handleMenuClick);
  backdrop?.addEventListener('click', handleBackdropClick);
  navigation?.addEventListener('click', handleNavigationClick);
  content?.addEventListener('click', handleContentClick);
  window.addEventListener('resize', synchronizeNavigation);
  synchronizeNavigation();

  /** PT-BR: Normalizar acentos e caixa para busca tolerante em português e inglês.
   * EN: Normalize accents and case for forgiving Portuguese and English search.
   */
  function normalize(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  }

  /** PT-BR: Validar a resposta HTTP e ler o índice local como JSON.
   * EN: Validate the HTTP response and read the local index as JSON.
   */
  function parseIndex(response) {
    if (!response.ok) throw new Error('search index');
    return response.json();
  }

  /** PT-BR: Carregar o índice local uma única vez.
   * EN: Load the local search index only once.
   */
  function loadIndex() {
    searchIndex ??= fetch('../search-index.json').then(parseIndex);
    return searchIndex;
  }

  /** PT-BR: Verificar se um documento corresponde a todas as palavras consultadas.
   * EN: Check whether a document matches every queried word.
   */
  function matchesSearch(item, locale, words) {
    if (item.locale !== locale) return false;
    const text = normalize(`${item.title} ${item.text}`);
    for (const word of words) {
      if (!text.includes(word)) return false;
    }
    return true;
  }

  /** PT-BR: Pesquisar o idioma ativo sem permitir que consultas antigas substituam as novas.
   * EN: Search the active locale without letting older queries replace newer ones.
   */
  async function search() {
    const sequence = ++requestNumber;
    const query = normalize(input.value.trim());
    results.replaceChildren();
    results.hidden = true;
    status.textContent = '';
    clear.hidden = input.value.length === 0;
    if (query.length < 2) return;

    try {
      const entries = await loadIndex();
      if (sequence !== requestNumber) return;
      const locale = document.documentElement.lang;
      const words = query.split(/\s+/);
      const matches = [];
      for (const item of entries) {
        if (matchesSearch(item, locale, words)) matches.push(item);
      }
      status.textContent = matches.length ? `${matches.length} ${input.dataset.count}` : input.dataset.none;
      results.hidden = matches.length === 0;
      for (const item of matches.slice(0, 12)) {
        const row = document.createElement('li');
        const link = document.createElement('a');
        const excerpt = document.createElement('p');
        link.href = `${item.id}.html`;
        link.textContent = item.title;
        excerpt.textContent = item.text.replace(/^#+ /gm, '').slice(0, 140);
        row.append(link, excerpt);
        results.append(row);
      }
    } catch {
      if (sequence !== requestNumber) return;
      searchIndex = undefined;
      status.textContent = input.dataset.error;
    }
  }

  /** PT-BR: Limpar a consulta e resultados e manter foco na caixa de busca.
   * EN: Clear the query and results while keeping focus in the search field.
   */
  function clearSearch() {
    input.value = '';
    results.replaceChildren();
    results.hidden = true;
    status.textContent = '';
    clear.hidden = true;
    input.focus();
  }

  /** PT-BR: Reiniciar a busca com atraso curto após cada tecla digitada.
   * EN: Restart search after a short delay for each typed character.
   */
  function handleSearchInput() {
    window.clearTimeout(searchTimer);
    requestNumber += 1;
    clear.hidden = input.value.length === 0;
    searchTimer = window.setTimeout(search, 90);
  }

  /** PT-BR: Abrir o primeiro resultado da pesquisa ao confirmar pelo teclado.
   * EN: Open the first search result when submitted from the keyboard.
   */
  async function handleSearchSubmit(event) {
    event.preventDefault();
    window.clearTimeout(searchTimer);
    await search();
    const firstResult = results?.querySelector('a[href]');
    if (firstResult) window.location.assign(firstResult.href);
  }

  /** PT-BR: Restringir a navegação por Tab ao drawer enquanto ele está aberto.
   * EN: Keep Tab navigation inside the drawer while it is open.
   */
  function trapNavigationTab(event) {
    const focusables = navigationFocusables();
    if (!focusables.length) return;
    const activeIndex = focusables.indexOf(document.activeElement);
    if (event.shiftKey && activeIndex <= 0) {
      event.preventDefault();
      focusables[focusables.length - 1].focus();
    } else if (!event.shiftKey && (activeIndex < 0 || activeIndex === focusables.length - 1)) {
      event.preventDefault();
      focusables[0].focus();
    }
  }

  /** PT-BR: Abrir busca pelos atalhos e tratar Escape e foco do drawer.
   * EN: Open search with keyboard shortcuts and handle Escape and drawer focus.
   */
  function handleDocumentKeydown(event) {
    const target = event.target;
    const typing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      focusSearch();
      return;
    }
    if (event.key === '/' && !typing && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      focusSearch();
      return;
    }
    if (event.key === 'Tab' && menuIsOpen()) {
      trapNavigationTab(event);
      return;
    }
    if (event.key === 'Escape') {
      if (input?.value) {
        clearSearch();
      } else if (menuIsOpen()) {
        closeMenu(true);
      }
    }
  }

  input?.addEventListener('input', handleSearchInput);
  searchForm?.addEventListener('submit', handleSearchSubmit);
  clear?.addEventListener('click', clearSearch);
  document.addEventListener('keydown', handleDocumentKeydown);
  for (const container of document.querySelectorAll('.table-scroll')) {
    container.addEventListener('scroll', updateTableScrollHints, { passive: true });
  }
  window.addEventListener('resize', updateTableScrollHints);
  updateTableScrollHints();
  };
initializeDocumentationShell();
