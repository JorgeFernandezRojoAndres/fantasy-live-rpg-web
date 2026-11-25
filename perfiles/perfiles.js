// Página de perfiles: carga perfiles.json (lo escribe el juego cada hora con datos públicos de quienes lo pidieron) y filtra por nombre.
// Todo el texto entra con textContent (los nombres vienen del chat: nunca se interpretan como HTML).
(() => {
  const RAZAS = ['elfo', 'enano', 'orco'];
  const ACCION = { 'leñador': 'talar', minero: 'picar', agricultor: 'cosechar' }; // la animación de trabajo del juego de cada oficio
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

  // Razas con modelo 3D (los cuadros del giro de VoxPix): por ahora solo el elfo. Las demás no llevan visor.
  const VOXEL = { elfo: { cuadros: 24, ancho: 34, paso: 35 } }; // paso = ancho del cuadro + 1 px de separación
  const PX_POR_CUADRO = 10; // cuánto hay que arrastrar para pasar de un cuadro al siguiente (una vuelta entera = 240 px)

  const visor = document.getElementById('visor');
  const escenaVisor = document.getElementById('visor-escena');
  const voxVisor = escenaVisor.querySelector('.visor-vox');
  let cuadro = 0;
  let giroAuto = null;

  function ponerCuadro(n) {
    cuadro = ((n % VOXEL.elfo.cuadros) + VOXEL.elfo.cuadros) % VOXEL.elfo.cuadros;
    voxVisor.style.backgroundPositionX = `calc(${-cuadro * VOXEL.elfo.paso} * var(--e) * 1px)`;
  }
  const pararGiroAuto = () => { clearInterval(giroAuto); giroAuto = null; };

  async function abrirVisor(p) {
    document.getElementById('visor-titulo').textContent = p.nombre;
    escenaVisor.style.backgroundImage = `url("${await window.ESCENAS.fondo('leñador')}")`;
    ponerCuadro(0);
    visor.showModal();
    escenaVisor.focus({ preventScroll: true });
    pararGiroAuto();
    // Gira solito despacio hasta que se toca (salvo que el sistema pida menos movimiento).
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) giroAuto = setInterval(() => ponerCuadro(cuadro + 1), 140);
  }

  // Arrastrar con el dedo o el ratón (pointer events: valen para los dos); la izquierda y la derecha giran en sentidos opuestos.
  let arrastre = null;
  escenaVisor.addEventListener('pointerdown', (e) => {
    pararGiroAuto();
    arrastre = { x: e.clientX, cuadro };
    escenaVisor.setPointerCapture(e.pointerId);
  });
  escenaVisor.addEventListener('pointermove', (e) => {
    if (arrastre) ponerCuadro(arrastre.cuadro - Math.round((e.clientX - arrastre.x) / PX_POR_CUADRO));
  });
  const soltar = () => { arrastre = null; };
  escenaVisor.addEventListener('pointerup', soltar);
  escenaVisor.addEventListener('pointercancel', soltar);
  escenaVisor.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { pararGiroAuto(); ponerCuadro(cuadro + 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { pararGiroAuto(); ponerCuadro(cuadro - 1); e.preventDefault(); }
  });
  document.getElementById('visor-cerrar').addEventListener('click', () => visor.close());
  visor.addEventListener('click', (e) => { if (e.target === visor) visor.close(); }); // clic fuera de la caja
  visor.addEventListener('close', pararGiroAuto);

  // Un número estable por nombre (para que cada personaje empiece su animación en un cuadro distinto y no marchen todos a la vez).
  const hash = (t) => [...t].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

  function tarjeta(p, fondos) {
    const art = el('article', 'pergamino tarjeta');
    const retrato = el('div', 'retrato');
    const oficio = ACCION[p.oficio] ? p.oficio : 'leñador';
    retrato.style.backgroundImage = `url("${fondos[oficio]}")`;
    const raza = RAZAS.includes(p.raza) ? p.raza : 'elfo';
    const sprite = el('div', `sprite ${raza}-${ACCION[oficio]}`);
    sprite.style.setProperty('--desfase', `${-(hash(p.nombre) % 4) * (1 / 6)}s`);
    sprite.setAttribute('role', 'img');
    sprite.setAttribute('aria-label', `${p.raza_texto ?? p.raza}, ${p.oficio_texto ?? p.oficio}`);
    if (VOXEL[raza]) {
      sprite.classList.add('girable');
      sprite.setAttribute('role', 'button');
      sprite.setAttribute('tabindex', '0');
      sprite.setAttribute('aria-label', `${p.raza_texto ?? p.raza}, ${p.oficio_texto ?? p.oficio}. Pulsa para verlo en 3D`);
      sprite.addEventListener('click', () => abrirVisor(p));
      sprite.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirVisor(p); } });
      retrato.append(sprite, el('span', 'marca3d', '3D'));
    } else {
      retrato.append(sprite);
    }

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
    const inventario = window.INVENTARIO?.panel(p); // solo si el perfil trae «objetos»
    if (inventario) datos.append(inventario);
    art.append(retrato, datos);
    return art;
  }

  let turno = 0; // si se escribe rápido en el buscador, solo vale el último pintado
  async function pintar() {
    const mio = ++turno;
    const q = normalizar(buscar.value.trim());
    const lista = q ? perfiles.filter((p) => normalizar(p.nombre).includes(q)) : perfiles;
    const fondos = {};
    for (const oficio of new Set(lista.map((p) => (ACCION[p.oficio] ? p.oficio : 'leñador')))) fondos[oficio] = await window.ESCENAS.fondo(oficio);
    if (mio !== turno) return;
    contenedor.replaceChildren(...lista.map((p) => tarjeta(p, fondos)));
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
      // Solo en local (localhost): ?datos=ruta.json carga un JSON de prueba. En GitHub Pages se ignora y siempre es perfiles.json.
      const local = ['localhost', '127.0.0.1'].includes(location.hostname);
      const r = await fetch((local && new URLSearchParams(location.search).get('datos')) || 'perfiles.json', { cache: 'no-cache' });
      // Todavía no existe (nadie lo pidió aún o no se ha publicado): es lo mismo que «sin perfiles», no un error.
      const datos = r.status === 404 ? { perfiles: [] } : await r.json();
      if (!r.ok && r.status !== 404) throw new Error(r.status);
      perfiles = Array.isArray(datos.perfiles) ? datos.perfiles : [];
      const cuando = new Date(datos.generado);
      if (datos.generado && !Number.isNaN(cuando.getTime())) {
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
