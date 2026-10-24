// ==========================================
// 💬 DINÁMICA: FRASES FAMOSAS DEL ANIME
// ==========================================
// Versión: 1.0 | Fecha: 2026-09-10
// Animes incluidos: Naruto · Jujutsu Kaisen · Hunter × Hunter

export const datos = {
  id: 'frases_famosas',
  nombre: 'Frases Famosas 💬',
  descripcionCorta: 'Te digo una frase icónica y decís quién la dijo',
  tipo: 'Conocimiento · Cultura Anime',
  rondas: 10,
  tiempoPorRonda: 50,

  preguntas: [
    // === NARUTO ===
    {
      id: 'frase_naruto_1',
      frase: 'Nunca me rindo, esa es mi forma de ser!',
      respuesta: 'Naruto Uzumaki',
      anime: 'Naruto'
    },
    {
      id: 'frase_naruto_2',
      frase: 'El que no conoce su verdadero ser, está perdido',
      respuesta: 'Itachi Uchiha',
      anime: 'Naruto'
    },
    {
      id: 'frase_naruto_3',
      frase: 'No importa cuán oscuro sea el mundo, siempre hay luz',
      respuesta: 'Hinata Hyuga',
      anime: 'Naruto'
    },
    {
      id: 'frase_naruto_4',
      frase: 'La fuerza no determina quién gana, lo que importa es por qué luchas',
      respuesta: 'Jiraiya',
      anime: 'Naruto'
    },
    {
      id: 'frase_naruto_5',
      frase: 'El verdadero poder nace cuando uno protege a quienes ama',
      respuesta: 'Sakura Haruno',
      anime: 'Naruto'
    },
    {
      id: 'frase_naruto_6',
      frase: 'No juzgues a nadie por su apariencia, sino por su corazón',
      respuesta: 'Gaara',
      anime: 'Naruto'
    },
    {
      id: 'frase_naruto_7',
      frase: 'Caminar solo no es debilidad, pero caminar acompañado es mejor',
      respuesta: 'Kakashi Hatake',
      anime: 'Naruto'
    },

    // === JUJUTSU KAISEN ===
    {
      id: 'frase_jjk_1',
      frase: 'Vivir y morir solo no tiene sentido. Es cuando conectas con otros que todo vale la pena',
      respuesta: 'Yuji Itadori',
      anime: 'Jujutsu Kaisen'
    },
    {
      id: 'frase_jjk_2',
      frase: 'La fuerza no es para dominar a los demás, sino para protegerlos',
      respuesta: 'Satoru Gojo',
      anime: 'Jujutsu Kaisen'
    },
    {
      id: 'frase_jjk_3',
      frase: 'El arrepentimiento es el peor veneno. Elegí y no mires atrás',
      respuesta: 'Megumi Fushiguro',
      anime: 'Jujutsu Kaisen'
    },
    {
      id: 'frase_jjk_4',
      frase: 'Todos van a morir, pero lo que dejamos vive en quienes nos siguen',
      respuesta: 'Nanami Kento',
      anime: 'Jujutsu Kaisen'
    },
    {
      id: 'frase_jjk_5',
      frase: 'No necesito que nadie me comprenda para seguir adelante',
      respuesta: 'Maki Zenin',
      anime: 'Jujutsu Kaisen'
    },
    {
      id: 'frase_jjk_6',
      frase: 'La valentía no es no tener miedo, es actuar a pesar de él',
      respuesta: 'Nobara Kugisaki',
      anime: 'Jujutsu Kaisen'
    },

    // === HUNTER × HUNTER ===
    {
      id: 'frase_hxh_1',
      frase: 'Si quieres algo, tienes que esforzarte. Así de simple',
      respuesta: 'Gon Freecss',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'frase_hxh_2',
      frase: 'La verdadera fuerza es saber cuándo detenerte',
      respuesta: 'Killua Zoldyck',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'frase_hxh_3',
      frase: 'No busco venganza, busco justicia. Y esa es una diferencia enorme',
      respuesta: 'Kurapika',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'frase_hxh_4',
      frase: 'El destino no se escribe solo, se construye con cada elección',
      respuesta: 'Biscuit Krueger',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'frase_hxh_5',
      frase: 'La sonrisa es la mejor arma, nadie sabe qué piensa quien sonríe',
      respuesta: 'Hisoka',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'frase_hxh_6',
      frase: 'Confiar no es debilidad, es la mayor fuerza que existe',
      respuesta: 'Leorio',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'frase_hxh_7',
      frase: 'El mundo no es justo, pero eso no significa que debas ser cruel',
      respuesta: 'Kite',
      anime: 'Hunter × Hunter'
    }
  ],

  formatoPregunta: function(pregunta) {
    return `💬 𝐅𝐑𝐀𝐒𝐄 𝐈𝐂𝐎́𝐍𝐈𝐂𝐀

"${pregunta.frase}"

¿Quién dijo estas palabras? 🤔
Escribí el nombre del personaje 👇`;
  },

  validarRespuesta: function(mensaje, pregunta) {
    const texto = mensaje.toLowerCase();
    const respuestaCorrecta = pregunta.respuesta.toLowerCase();
    return texto.includes(respuestaCorrecta);
  }
};
