// Página de perfiles: carga perfiles.json (lo escribe el juego cada hora con datos públicos de quienes lo pidieron) y filtra por nombre.
// Todo el texto entra con textContent (los nombres vienen del chat: nunca se interpretan como HTML).
(() => {
  const SPRITES = ['elfo', 'enano', 'orco'];
  const contenedor = document.getElementById('tarjetas');
  const buscar = document.getElementById('buscar');
  const cuenta = document.getElementById('cuenta');
  const vacio = document.getElementById('vacio');
  const actualizado = document.getElementById('actualizado');
  let perfiles = [];

  const normalizar = (t) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const numero = (n) => Number(n).toLocaleString('es-AR');
  const el = (tag, clase, texto) => {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  };

  // La llamita de la racha: 4×5 «píxeles» dibujados con rectángulos (sin imagen ni emoji), como en el juego.
  function llama() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'llama');
    svg.setAttribute('viewBox', '0 0 4 5');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('aria-hidden', 'true');
    const filas = ['..#.', '.##.', '####', '####', '.##.'];
    filas.forEach((fila, y) => [...fila].forEach((c, x) => {
      if (c !== '#') return;
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', 1); r.setAttribute('height', 1);
      r.setAttribute('fill', y >= 3 ? '#ffd54a' : '#e8590c');
      svg.append(r);
    }));
    return svg;
  }

  function fila(dl, etiqueta, valor) {
    dl.append(el('dt', '', etiqueta));
    const dd = el('dd');
    if (valor instanceof Node) dd.append(valor); else dd.textContent = valor;
    dl.append(dd);
  }

  function tarjeta(p) {
    const art = el('article', 'pergamino tarjeta');
    const retrato = el('div', 'retrato');
    const sprite = el('div', `sprite ${SPRITES.includes(p.raza) ? p.raza : 'elfo'}`);
    sprite.setAttribute('role', 'img');
    sprite.setAttribute('aria-label', `${p.raza_texto ?? p.raza}`);
    retrato.append(sprite);

    const datos = el('div', 'datos');
    datos.append(el('h2', 'nombre', p.nombre));
    datos.append(el('p', 'rol', `${p.raza_texto ?? p.raza} · ${p.oficio_texto ?? p.oficio}`));
    const dl = el('dl', 'cifras');
    fila(dl, 'Hoy', numero(p.aporte_dia));
    fila(dl, 'Total', numero(p.aporte_total));
    if (p.racha >= 3) {
      const racha = el('span');
      racha.append(llama(), document.createTextNode(`${p.racha} días`));
      fila(dl, 'Racha', racha);
    }
    datos.append(dl);
    if (p.titulos?.length) {
      const ul = el('ul', 'titulos');
      p.titulos.forEach((t) => ul.append(el('li', '', t)));
      datos.append(ul);
    }
    art.append(retrato, datos);
    return art;
  }

  function pintar() {
    const q = normalizar(buscar.value.trim());
    const lista = q ? perfiles.filter((p) => normalizar(p.nombre).includes(q)) : perfiles;
    contenedor.replaceChildren(...lista.map(tarjeta));
    cuenta.textContent = perfiles.length ? `${lista.length} de ${perfiles.length} aventureros` : '';
    vacio.hidden = lista.length > 0;
    if (!lista.length) {
      vacio.textContent = perfiles.length
        ? `Nadie se llama «${buscar.value.trim()}» por aquí. Solo salen quienes escribieron !perfil web.`
        : 'Todavía no hay perfiles. Escribe !perfil web en el chat del directo y aparecerá el tuyo.';
    }
  }

  async function cargar() {
    try {
      const r = await fetch('perfiles.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      const datos = await r.json();
      perfiles = Array.isArray(datos.perfiles) ? datos.perfiles : [];
      const cuando = new Date(datos.generado);
      if (!Number.isNaN(cuando.getTime())) {
        actualizado.textContent = `Actualizado: ${cuando.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'medium', timeStyle: 'short' })} (hora de Buenos Aires). Se renueva cada hora.`;
      }
    } catch {
      perfiles = [];
      actualizado.textContent = 'No se pudo cargar la lista. Prueba más tarde.';
    }
    pintar();
  }

  buscar.addEventListener('input', pintar);
  cargar();
})();
