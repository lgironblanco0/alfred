(() => {
  // Solo aviso visual: todavía NO crea reservas ni se conecta con MesaGrid.
  const toast = document.getElementById('reservation-toast');
  let timer;
  document.querySelectorAll('.reserve-trigger').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('show'), 6500);
  }));
  document.getElementById('toast-close').addEventListener('click', () => toast.classList.remove('show'));

  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    toggle.textContent = open ? '×' : '☰';
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '☰';
  }));

  const menuData = {
    degustacion: {kicker:'EL VIAJE COMPLETO', text:'Un recorrido de pequeños platos que celebra el producto, el paisaje y el ritmo de cada estación.', image:'https://images.unsplash.com/photo-1515003197210-e0cd7184f8b5?auto=format&fit=crop&w=1100&q=85', alt:'Plato de degustación contemporáneo'},
    maridaje: {kicker:'ARMONÍA EN CADA COPA', text:'Una selección de vinos y bebidas de pequeños productores, elegidos para acompañar cada matiz del menú.', image:'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1100&q=85', alt:'Copas de vino en una mesa'},
    carta: {kicker:'LIBERTAD PARA DESCUBRIR', text:'Platos de temporada que permiten crear una experiencia propia, guiada por el producto y el apetito.', image:'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1100&q=85', alt:'Ingredientes frescos de temporada'}
  };
  const photo = document.getElementById('menu-photo');
  document.querySelectorAll('.menu-tab').forEach(tab => tab.addEventListener('click', () => {
    const data = menuData[tab.dataset.key];
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.toggle('active', t === tab));
    photo.style.opacity = '.25';
    setTimeout(() => {
      photo.src = data.image; photo.alt = data.alt;
      document.getElementById('menu-kicker').textContent = data.kicker;
      document.getElementById('menu-description-text').textContent = data.text;
      photo.style.opacity = '1';
    }, 150);
  }));

  // Demo de newsletter: valida en navegador pero no envía ni guarda el correo.
  document.getElementById('newsletter-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = document.getElementById('email');
    if (!input.checkValidity()) { input.reportValidity(); return; }
    document.getElementById('newsletter-note').textContent = 'Gracias. La suscripción estará disponible cuando conectemos el servicio.';
    event.target.reset();
  });
})();