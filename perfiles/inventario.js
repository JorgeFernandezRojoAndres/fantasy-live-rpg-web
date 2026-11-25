// Inventario en la página de perfiles (#166): elegir el equipo y vender, copiando UN comando para pegar en el chat del directo.
// La página no decide nada ni habla con el servidor: el servidor valida el comando al recibirlo (un objeto por tipo; vender uno equipado lo desequipa solo).
// Las funciones puras cuelgan de window.INVENTARIO (con un test que las ejecuta sin navegador); el panel de cada tarjeta lo arma panel(perfil).
// Todo el texto entra con textContent (nombres de objetos y de personas vienen de la base: nunca se interpretan como HTML).
(() => {
  const TIPOS = [
    { tipo: 'espada', plural: 'Espadas' },
    { tipo: 'casco', plural: 'Cascos' },
    { tipo: 'anillo', plural: 'Anillos' },
  ];
  const PRECIO_POR_PUNTO = 10; // igual que servidor/botin.js
  // Aviso del retraso de la publicación. Para quitarlo basta con dejarlo en '' (no se pinta).
  const AVISO_RETRASO = 'El inventario puede tener hasta 1 h de retraso.';
  const NOTA_EQUIPADO = 'equipado: se desequipa solo al vender';
  const STATS = [['ataque', 'Ataque'], ['defensa', 'Defensa'], ['vida', 'Vida']];

  const puntos = (o) => STATS.reduce((s, [k]) => s + (Number(o[k]) || 0), 0);
  const oroPor = (objetos) => objetos.reduce((s, o) => s + puntos(o), 0) * PRECIO_POR_PUNTO;
  const comandoEquipo = (ids) => `!equipo ${ids.join(' ')}`;
  const comandoVender = (ids) => `!vender ${ids.join(' ')}`;
  const textoStats = (o) => STATS.filter(([k]) => o[k] > 0).map(([k, nombre]) => `${nombre} ${o[k]}`).join(' · ') || 'Sin bonus';

  // La selección es una lista de ids con UN objeto por tipo. Pulsar uno ya elegido lo quita; pulsar otro del mismo tipo lo reemplaza.
  function alternarEquipo(seleccion, objeto, objetos) {
    if (seleccion.includes(objeto.id)) return seleccion.filter((id) => id !== objeto.id);
    const mismoTipo = new Set(objetos.filter((o) => o.tipo === objeto.tipo).map((o) => o.id));
    return [...seleccion.filter((id) => !mismoTipo.has(id)), objeto.id];
  }
  // Los ids en el orden espada, casco, anillo (el servidor los acepta en cualquier orden; así se lee mejor).
  const ordenarEquipo = (seleccion, objetos) => TIPOS.map(({ tipo }) => objetos.find((o) => o.tipo === tipo && seleccion.includes(o.id))).filter(Boolean).map((o) => o.id);
  // Válido = no vacío (el servidor ignora «!equipo» sin números), todos existen y no hay dos del mismo tipo.
  function equipoValido(seleccion, objetos) {
    const elegidos = seleccion.map((id) => objetos.find((o) => o.id === id));
    return elegidos.length > 0 && elegidos.every(Boolean) && new Set(elegidos.map((o) => o.tipo)).size === elegidos.length;
  }
  // Todo se puede vender, también lo equipado: el servidor lo desequipa solo (#166, decisión de Jorge).
  // Los marcados en el orden de la lista (ids que ya no existen se ignoran).
  const aVender = (marcados, objetos) => objetos.filter((o) => marcados.includes(o.id));
  // Marcar para vender un objeto elegido en pantalla lo saca de la selección: así «Guardar» nunca manda un objeto que se va a vender.
  const sinVendidos = (seleccion, marcados) => seleccion.filter((id) => !marcados.includes(id));

  const el = (tag, clase, texto) => {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  };
  const numero = (n) => Number(n).toLocaleString('es-AR');

  // Copia el texto. Devuelve true si lo logró; si no (sin permiso o sin HTTPS) el llamador deja el comando a la vista y seleccionado.
  async function copiar(texto, campo) {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(texto); return true; }
    } catch { /* cae al método viejo */ }
    try {
      campo.focus(); campo.select(); campo.setSelectionRange(0, texto.length);
      return document.execCommand('copy');
    } catch { return false; }
  }

  function avisos() {
    const nota = el('div', 'inv-avisos pequeno');
    nota.append(
      el('p', '', `Los cambios se aplican al pegar el comando en el chat.${AVISO_RETRASO ? ` ${AVISO_RETRASO}` : ''}`),
      el('p', '', 'El equipo se lee una sola vez, al formarse el grupo de la mazmorra (cuando termina la elección de roles). Sin equipo entras con la fuerza mínima (1).'),
    );
    return nota;
  }

  // El panel de una tarjeta. Sin objetos (lista vacía o perfiles.json viejo sin «objetos») no hay panel: la tarjeta queda como siempre.
  function panel(perfil) {
    if (!Array.isArray(perfil.objetos) || !perfil.objetos.length) return null;
    const objetos = perfil.objetos;
    const equipoGuardado = Array.isArray(perfil.equipo) ? perfil.equipo : [];
    let seleccion = objetos.filter((o) => equipoGuardado.includes(o.id)).map((o) => o.id);
    const marcados = new Set();

    const caja = el('details', 'inventario');
    caja.append(el('summary', '', `Inventario (${objetos.length})`));
    const dentro = el('div', 'inv-dentro');
    caja.append(dentro);

    const lista = el('div', 'inv-lista');
    const estado = el('p', 'inv-estado', '');
    estado.setAttribute('role', 'status');
    const comandoCampo = el('input', 'inv-comando');
    comandoCampo.readOnly = true;
    comandoCampo.setAttribute('aria-label', 'Comando para pegar en el chat');
    comandoCampo.hidden = true;
    comandoCampo.addEventListener('focus', () => comandoCampo.select());
    const guardar = el('button', 'boton', 'Guardar equipo');
    guardar.type = 'button';
    const vender = el('button', 'boton boton-vender', 'Vender');
    vender.type = 'button';
    const resumen = el('p', 'inv-resumen', '');

    const filas = new Map(); // id → { fila, botonEquipo, casilla, nota }
    for (const { tipo, plural } of TIPOS) {
      const delTipo = objetos.filter((o) => o.tipo === tipo);
      if (!delTipo.length) continue;
      const grupo = el('section', 'inv-grupo');
      grupo.append(el('h3', '', plural));
      for (const o of delTipo) {
        const fila = el('div', 'inv-fila');
        const info = el('div', 'inv-info');
        info.append(el('span', 'inv-nombre', o.nombre), el('span', 'inv-stats', `${textoStats(o)} · ${puntos(o)} pt`));
        const botonEquipo = el('button', 'inv-equipar', 'Equipar');
        botonEquipo.type = 'button';
        botonEquipo.addEventListener('click', () => { seleccion = alternarEquipo(seleccion, o, objetos); marcados.delete(o.id); pintar(); });
        const etiqueta = el('label', 'inv-vender');
        const casilla = el('input');
        casilla.type = 'checkbox';
        casilla.addEventListener('change', () => {
          if (casilla.checked) { marcados.add(o.id); seleccion = sinVendidos(seleccion, [o.id]); } else marcados.delete(o.id);
          pintar();
        });
        etiqueta.append(casilla, el('span', '', 'Vender'));
        const nota = el('span', 'inv-nota', '');
        fila.append(info, botonEquipo, etiqueta, nota);
        grupo.append(fila);
        filas.set(o.id, { fila, botonEquipo, casilla, nota });
      }
      lista.append(grupo);
    }

    function pintar() {
      for (const o of objetos) {
        const f = filas.get(o.id);
        const puesto = seleccion.includes(o.id);
        f.botonEquipo.textContent = puesto ? 'Quitar' : 'Equipar';
        f.botonEquipo.setAttribute('aria-pressed', String(puesto));
        f.fila.classList.toggle('puesto', puesto);
        f.casilla.checked = marcados.has(o.id);
        f.nota.textContent = equipoGuardado.includes(o.id) ? NOTA_EQUIPADO : '';
      }
      const venta = aVender([...marcados], objetos);
      guardar.disabled = !equipoValido(seleccion, objetos);
      vender.disabled = venta.length === 0;
      vender.textContent = venta.length ? `Vender (${venta.length})` : 'Vender';
      const equipadosEnVenta = venta.filter((o) => equipoGuardado.includes(o.id)).length;
      const avisoEquipados = equipadosEnVenta ? ` · ${equipadosEnVenta === 1 ? '1 equipado se desequipa' : `${equipadosEnVenta} equipados se desequipan`}` : '';
      resumen.textContent = venta.length ? `Vender ${venta.length} objeto${venta.length === 1 ? '' : 's'}: ${numero(oroPor(venta))} de oro (${PRECIO_POR_PUNTO} por punto)${avisoEquipados}` : '';
    }

    async function entregar(comando, aviso) {
      comandoCampo.value = comando;
      comandoCampo.hidden = false;
      const listo = await copiar(comando, comandoCampo);
      comandoCampo.select();
      estado.textContent = listo ? `Copiado: pégalo en el chat del directo. ${aviso}` : `No se pudo copiar solo: copia el texto de arriba y pégalo en el chat del directo. ${aviso}`;
    }
    guardar.addEventListener('click', () => entregar(comandoEquipo(ordenarEquipo(seleccion, objetos)), 'Se aplica al pegarlo.'));
    vender.addEventListener('click', () => {
      const venta = aVender([...marcados], objetos);
      if (venta.length) entregar(comandoVender(venta.map((o) => o.id)), `Te dará ${numero(oroPor(venta))} de oro al pegarlo.`);
    });

    const acciones = el('div', 'inv-acciones');
    acciones.append(guardar, vender);
    dentro.append(lista, acciones, resumen, comandoCampo, estado, avisos());
    pintar();
    return caja;
  }

  window.INVENTARIO = { TIPOS, PRECIO_POR_PUNTO, puntos, oroPor, comandoEquipo, comandoVender, alternarEquipo, ordenarEquipo, equipoValido, aVender, sinVendidos, AVISO_RETRASO, panel };
})();
