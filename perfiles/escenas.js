// Fondos de pixel art de la tarjeta, uno por oficio, dibujados en un canvas de 48×40 con las piezas del propio juego (suelo, pinos, rocas, espigas).
// Cada fondo se dibuja una sola vez y se reparte como imagen; la tarjeta lo pone a ×5 sin suavizar. Sin azar: siempre salen iguales.
window.ESCENAS = (() => {
  const ANCHO = 48;
  const ALTO = 40;
  const SUELO = 26; // y donde empieza el suelo; los pies del personaje caen sobre y = 34
  const PIEZAS = ['bosque_hoja', 'pino_chico', 'pino_grande', 'rocoso_hoja', 'roca_grande_1', 'roca_grande_2', 'campo_hoja', 'icono_comida'];

  const col = (hex) => (hex.startsWith('#') ? hex : `#${hex}`);

  const cargarImagen = (nombre) => new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver([nombre, img]);
    img.onerror = () => rechazar(new Error(`falta escenas/${nombre}.png`));
    img.src = `escenas/${nombre}.png`;
  });

  function degradado(c, arriba, abajo, hasta) {
    const [r1, g1, b1] = arriba.match(/\w\w/g).map((h) => parseInt(h, 16));
    const [r2, g2, b2] = abajo.match(/\w\w/g).map((h) => parseInt(h, 16));
    for (let y = 0; y < hasta; y++) {
      const t = hasta === 1 ? 0 : y / (hasta - 1);
      const banda = Math.round(t * 5) / 5; // 6 bandas: degradado «de pixel art», sin tonos intermedios
      c.fillStyle = `rgb(${Math.round(r1 + (r2 - r1) * banda)},${Math.round(g1 + (g2 - g1) * banda)},${Math.round(b1 + (b2 - b1) * banda)})`;
      c.fillRect(0, y, ANCHO, 1);
    }
  }

  // El suelo isométrico del juego (baldosas de 32×16 en rombo, de media altura de paso), sobre un color base que tapa las rendijas.
  function suelo(c, hoja, base, cuadro = 0) {
    c.fillStyle = col(base);
    c.fillRect(0, SUELO + 2, ANCHO, ALTO - SUELO - 2);
    for (let fila = 0, y = SUELO - 6; y < ALTO; fila++, y += 8) {
      for (let x = (fila % 2 ? -16 : -32); x < ANCHO; x += 32) c.drawImage(hoja, cuadro * 32, 0, 32, 16, x, y, 32, 16);
    }
  }

  const rect = (c, color, x, y, w, h) => { c.fillStyle = col(color); c.fillRect(x, y, w, h); };

  const ESCENAS = {
    // Leñador: un claro de bosque, con pinos del juego por detrás y el cielo verdoso entre las copas.
    'leñador': (c, p) => {
      degradado(c, '1b3a2c', '4d8a4a', SUELO + 2);
      for (const [x, y] of [[-3, -12], [27, -10]]) c.drawImage(p.pino_grande, x, y);
      for (const [x, y] of [[10, -4], [41, -6], [-6, 0]]) c.drawImage(p.pino_chico, x, y);
      suelo(c, p.bosque_hoja, '3f7a3c');
      for (const [x, y] of [[6, 36], [40, 33], [19, 38], [33, 37]]) rect(c, '2d5e2f', x, y, 2, 1); // matas de hierba
      rect(c, '6fb85a', 7, 35, 1, 1); rect(c, '6fb85a', 41, 32, 1, 1);
    },
    // Minero: una cueva oscura, con rocas del juego, vetas de oro y de cristal en la pared, y suelo de piedra.
    minero: (c, p) => {
      degradado(c, '12121a', '35354a', SUELO + 2);
      for (const [x, y, v] of [[-8, 2, 'roca_grande_1'], [26, 0, 'roca_grande_2'], [0, 10, 'roca_grande_2'], [30, 12, 'roca_grande_1']]) c.drawImage(p[v], x, y);
      for (const [x, y] of [[9, 8], [38, 6], [33, 18], [5, 19]]) { rect(c, 'e6b422', x, y, 2, 2); rect(c, 'fff1a0', x, y, 1, 1); } // vetas de oro
      for (const [x, y] of [[20, 5], [43, 15]]) { rect(c, '4fb0e8', x, y, 2, 2); rect(c, 'd6f3ff', x, y, 1, 1); } // cristales
      suelo(c, p.rocoso_hoja, '55556a');
      rect(c, '2a2a3a', 8, 36, 3, 1); rect(c, '2a2a3a', 36, 35, 3, 1);
    },
    // Agricultor: el campo a pleno día, con sol, colinas lejanas, y filas de espigas (el icono de comida del juego) sobre la tierra de cultivo.
    agricultor: (c, p) => {
      degradado(c, '4aa3e8', 'aadcf6', SUELO + 2);
      c.fillStyle = '#ffe27a'; // sol (disco de pixel art de radio 5)
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (dx * dx + dy * dy <= 27) c.fillRect(38 + dx, 7 + dy, 1, 1);
      rect(c, 'ffffff', 6, 6, 6, 2); rect(c, 'ffffff', 8, 4, 4, 2); rect(c, 'ffffff', 22, 11, 7, 2); rect(c, 'ffffff', 24, 9, 4, 2); // nubes
      c.fillStyle = '#7bc460'; // colinas lejanas
      for (let x = 0; x < ANCHO; x++) { const h = Math.round(5 + 3 * Math.sin(x / 7) + 2 * Math.sin(x / 3 + 1)); c.fillRect(x, SUELO - h, 1, h + 2); }
      suelo(c, p.campo_hoja, '8a6a3a');
      for (const y of [29, 35]) for (let x = -2; x < ANCHO; x += 7) c.drawImage(p.icono_comida, x + (y === 35 ? 3 : 0), y - 8);
    },
  };

  const hechas = {};
  let piezas;

  // Devuelve (en una promesa) el fondo del oficio como URL de imagen. Un oficio desconocido usa el del leñador.
  async function fondo(oficio) {
    const clave = ESCENAS[oficio] ? oficio : 'leñador';
    if (hechas[clave]) return hechas[clave];
    piezas ??= Object.fromEntries(await Promise.all(PIEZAS.map(cargarImagen)));
    const canvas = document.createElement('canvas');
    canvas.width = ANCHO;
    canvas.height = ALTO;
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    ESCENAS[clave](c, piezas);
    hechas[clave] = canvas.toDataURL();
    return hechas[clave];
  }

  return { fondo, ANCHO, ALTO };
})();
