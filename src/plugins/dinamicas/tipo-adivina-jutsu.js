// ==========================================
// 📌 DINÁMICA: ADIVINA EL PERSONAJE POR JUTSU
// ==========================================

export const datos = {
  id: 'adivina_jutsu',
  nombre: 'Adivina el Jutsu 🥷',
  descripcionCorta: 'Te digo una técnica y decís quién la usa',
  tipo: 'Conocimiento',
  rondas: 10,
  tiempoPorRonda: 50,
  mensajeInicio: `📌 𝐀𝐃𝐈𝐕𝐈𝐍𝐀 𝐄𝐋 𝐏𝐄𝐑𝐒𝐎𝐍𝐀𝐉𝐄 𝐏𝐎𝐑 𝐒𝐔 𝐉𝐔𝐓𝐒𝐔 / 𝐇𝐀𝐁𝐈𝐋𝐈𝐃𝐀𝐃 🥷

Les diré una técnica o habilidad especial y ustedes me dirán
de qué personaje es y de qué anime pertenece.
El primero en acertar gana la ronda 🥇⚡

✦ Ejemplo:
▪️ Digo: "Rasengan"
▪️ Responden: Naruto Uzumaki – Naruto

⏳ Cada ronda: 50 segundos para responder
🔢 Total: 10 rondas normales + 5 rondas BONUS
📚 Base de preguntas: 70 disponibles · ¡Siempre habrá algo nuevo! 🔄

¡Comenzamos! 🔥`,
  preguntas: [
    { id: 'jutsu_rasengan', pista: 'Rasengan', respuesta: 'Naruto Uzumaki – Naruto', personaje: 'Naruto Uzumaki', anime: 'Naruto' },
    { id: 'jutsu_chidori', pista: 'Chidori', respuesta: 'Sasuke Uchiha – Naruto', personaje: 'Sasuke Uchiha', anime: 'Naruto' },
    { id: 'jutsu_kakashi', pista: 'Copia de sellos y técnicas con el ojo izquierdo', respuesta: 'Kakashi Hatake – Naruto', personaje: 'Kakashi Hatake', anime: 'Naruto' },
    { id: 'jutsu_susanoo', pista: 'Susanoo, espada de luz y armadura espiritual', respuesta: 'Itachi Uchiha / Sasuke Uchiha – Naruto', personaje: 'Itachi Uchiha', anime: 'Naruto' },
    { id: 'jutsu_sapos', pista: 'Invocación de sapos gigantes', respuesta: 'Jiraiya / Naruto – Naruto', personaje: 'Jiraiya', anime: 'Naruto' },
    { id: 'jutsu_madera', pista: 'Estilo Madera: creación de bosques y árboles', respuesta: 'Hashirama Senju – Naruto', personaje: 'Hashirama Senju', anime: 'Naruto' },
    { id: 'jutsu_byakugan', pista: 'Byakugan: visión de 360 grados y puntos de chakra', respuesta: 'Neji Hyuga / Hinata Hyuga – Naruto', personaje: 'Neji Hyuga', anime: 'Naruto' },
    { id: 'jutsu_marionetas', pista: 'Marionetas: control de cuerpos con hilos', respuesta: 'Chiyo / Sasori – Naruto', personaje: 'Sasori', anime: 'Naruto' },
    { id: 'jutsu_acero', pista: 'Cuerpo convertido en acero inquebrantable', respuesta: 'Rock Lee (puertas) / Choji – Naruto', personaje: 'Rock Lee', anime: 'Naruto' },
    { id: 'jutsu_viento', pista: 'Viento: Cuchilla de viento y Rasengan mejorado', respuesta: 'Naruto Uzumaki / Asuma – Naruto', personaje: 'Naruto Uzumaki', anime: 'Naruto' },
    { id: 'jutsu_fuego', pista: 'Fuego: Gran Bola de Fuego y llamas destructoras', respuesta: 'Clan Uchiha – Naruto', personaje: 'Itachi Uchiha', anime: 'Naruto' },
    { id: 'jutsu_agua', pista: 'Agua: Dragón de agua y muros defensivos', respuesta: 'Zabuza / Kisame – Naruto', personaje: 'Kisame Hoshigaki', anime: 'Naruto' },
    { id: 'jutsu_tierra', pista: 'Tierra: Muros de roca y excavación subterránea', respuesta: 'Shikamaru / varios – Naruto', personaje: 'Shikamaru Nara', anime: 'Naruto' },
    { id: 'jutsu_sombra', pista: 'Sombra: Extender sombras para inmovilizar o controlar', respuesta: 'Shikamaru Nara – Naruto', personaje: 'Shikamaru Nara', anime: 'Naruto' },
    { id: 'jutsu_curacion', pista: 'Curación acelerada y sellos médicos', respuesta: 'Sakura Haruno / Tsunade – Naruto', personaje: 'Sakura Haruno', anime: 'Naruto' },
    { id: 'jutsu_sabio', pista: 'Modo Sabio: energía de la naturaleza', respuesta: 'Naruto / Jiraiya – Naruto', personaje: 'Naruto Uzumaki', anime: 'Naruto' },
    { id: 'jutsu_verdad', pista: 'Ojo de la Verdad: predecir movimientos y copiar', respuesta: 'Sharingan – Clan Uchiha', personaje: 'Sasuke Uchiha', anime: 'Naruto' },
    { id: 'jutsu_reemplazo', pista: 'Reemplazo de cuerpo: cambiar lugar con un tronco', respuesta: 'Técnica básica de todos – Naruto', personaje: 'Cualquier Shinobi', anime: 'Naruto' },
    { id: 'jutsu_clones', pista: 'Clones de sombra: copias reales con chakra propio', respuesta: 'Naruto Uzumaki – Naruto', personaje: 'Naruto Uzumaki', anime: 'Naruto' },
    { id: 'jutsu_cadenas', pista: 'Cadenas de chakra: aprisionar y proteger desde el interior', respuesta: 'Kushina / Naruto – Naruto', personaje: 'Kushina Uzumaki', anime: 'Naruto' },
    { id: 'jutsu_seis_caminos', pista: 'Sello de seis caminos: energía divina y poder ancestral', respuesta: 'Naruto Uzumaki / Hagoromo – Naruto', personaje: 'Naruto Uzumaki', anime: 'Naruto' },
    { id: 'jutsu_trampa', pista: 'Técnica de trumpa: copiar movimientos con precisión', respuesta: 'Kakashi Hatake – Naruto', personaje: 'Kakashi Hatake', anime: 'Naruto' },
    { id: 'jutsu_hilo', pista: 'Hilo de chakra para atacar desde lejos', respuesta: 'Kurenai / Ino – Naruto', personaje: 'Ino Yamanaka', anime: 'Naruto' },
    { id: 'jutsu_sangre', pista: 'Robo de sangre y control de cuerpo', respuesta: 'Sasori / Orochimaru – Naruto', personaje: 'Orochimaru', anime: 'Naruto' },
    { id: 'jutsu_asesino', pista: 'Asesino de cabellos de la llovizna', respuesta: 'Might Guy – Naruto', personaje: 'Might Guy', anime: 'Naruto' },
    { id: 'jutsu_santuario', pista: 'Dominio: Santuario Malévolo — control total del espacio', respuesta: 'Ryomen Sukuna – Jujutsu Kaisen', personaje: 'Ryomen Sukuna', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_vacio', pista: 'Dominio: Vacío Infinito — información infinita', respuesta: 'Satoru Gojo – Jujutsu Kaisen', personaje: 'Satoru Gojo', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_sombras', pista: 'Sombras: invocar hasta 10 animales de sombra y cambiar lugares', respuesta: 'Megumi Fushiguro – Jujutsu Kaisen', personaje: 'Megumi Fushiguro', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_espada', pista: 'Espada maldita: matar maldiciones sin dañar el cuerpo', respuesta: 'Yuta Okkotsu / Maki Zenin – Jujutsu Kaisen', personaje: 'Yuta Okkotsu', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_fuego_negro', pista: 'Fuego negro: quemar incluso otras maldiciones', respuesta: 'Jogo / Ryomen Sukuna – Jujutsu Kaisen', personaje: 'Ryomen Sukuna', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_inversion', pista: 'Técnica de inversión: curar heridas en segundos', respuesta: 'Satoru Gojo / Shoko – Jujutsu Kaisen', personaje: 'Satoru Gojo', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_carne', pista: 'Manipulación de carne: crear armas y reconstruir cuerpo', respuesta: 'Kento Nanami / Mahito – Jujutsu Kaisen', personaje: 'Mahito', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_cadena_cuerdas', pista: 'Cadena de cuerdas: atar y anular técnicas malditas', respuesta: 'Choso / Toge – Jujutsu Kaisen', personaje: 'Toge Inumaki', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_habla', pista: 'Habla Maldita: órdenes que la realidad obedece', respuesta: 'Toge Inumaki – Jujutsu Kaisen', personaje: 'Toge Inumaki', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_percusion', pista: 'Percusión: golpear en puntos débiles para daño máximo', respuesta: 'Kento Nanami – Jujutsu Kaisen', personaje: 'Kento Nanami', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_resistencia', pista: 'Resistencia sobrehumana: pelear con el cuerpo destrozado', respuesta: 'Yuji Itadori – Jujutsu Kaisen', personaje: 'Yuji Itadori', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_floracion', pista: 'Floración de la espada: velocidad y cortes instantáneos', respuesta: 'Maki Zenin – Jujutsu Kaisen', personaje: 'Maki Zenin', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_marca', pista: 'Marca de muerte: ver el punto donde algo se rompe', respuesta: 'Toji Fushiguro / Maki – Jujutsu Kaisen', personaje: 'Toji Fushiguro', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_piedra', pista: 'Piedra: cuerpo impenetrable y lanza que perfora todo', respuesta: 'Aoi Todo / Hanami – Jujutsu Kaisen', personaje: 'Aoi Todo', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_sangre_jj', pista: 'Manipulación de sangre: proyectiles y armas de sangre', respuesta: 'Choso – Jujutsu Kaisen', personaje: 'Choso', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_deuda', pista: 'Maldición de la deuda: ver el error antes de atacar', respuesta: 'Yuji / Choso – Jujutsu Kaisen', personaje: 'Yuji Itadori', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_exorcista', pista: 'Poder de la exorcista: limpiar maldiciones desde un punto', respuesta: 'Shoko Ieiri – Jujutsu Kaisen', personaje: 'Shoko Ieiri', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_cielo', pista: 'Bendición de los cielos: fuerza imposible de soportar', respuesta: 'Aoi Todo / Yuta – Jujutsu Kaisen', personaje: 'Yuta Okkotsu', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_cancion', pista: 'Canción prohibida: paraliza con una sola palabra', respuesta: 'Toge Inumaki – Jujutsu Kaisen', personaje: 'Toge Inumaki', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_arena', pista: 'Técnica de arena: construir barricadas y defensa', respuesta: 'Naoya Zenin – Jujutsu Kaisen', personaje: 'Naoya Zenin', anime: 'Jujutsu Kaisen' },
    { id: 'jutsu_refuerzo', pista: 'Refuerzo: potenciar puños y cuerpo al máximo', respuesta: 'Gon Freecss / Uvogin – Hunter × Hunter', personaje: 'Gon Freecss', anime: 'Hunter × Hunter' },
    { id: 'jutsu_emision', pista: 'Emisión: separar aura del cuerpo como energía pura', respuesta: 'Killua Zoldyck / Hisoka – Hunter × Hunter', personaje: 'Killua Zoldyck', anime: 'Hunter × Hunter' },
    { id: 'jutsu_transformacion', pista: 'Transformación: aura convertida en electricidad', respuesta: 'Killua Zoldyck – Hunter × Hunter', personaje: 'Killua Zoldyck', anime: 'Hunter × Hunter' },
    { id: 'jutsu_materializacion', pista: 'Materialización: crear objetos reales desde la nada', respuesta: 'Kurapika / Shizuku – Hunter × Hunter', personaje: 'Kurapika', anime: 'Hunter × Hunter' },
    { id: 'jutsu_cadenas_hx', pista: 'Cadenas: 5 cadenas con poderes distintos cada una', respuesta: 'Kurapika – Hunter × Hunter', personaje: 'Kurapika', anime: 'Hunter × Hunter' },
    { id: 'jutsu_manipulacion_hx', pista: 'Manipulación: controlar acciones y pensamientos de otros', respuesta: 'Illumi Zoldyck – Hunter × Hunter', personaje: 'Illumi Zoldyck', anime: 'Hunter × Hunter' },
    { id: 'jutsu_especializacion', pista: 'Especialización: predecir el futuro con 100% de certeza', respuesta: 'Neon Nostrade / Pakunoda – Hunter × Hunter', personaje: 'Neon Nostrade', anime: 'Hunter × Hunter' },
    { id: 'jutsu_juego_nen', pista: 'Juego con Nen: poner condiciones para multiplicar poder', respuesta: 'Hisoka / Kurapika – Hunter × Hunter', personaje: 'Hisoka', anime: 'Hunter × Hunter' },
    { id: 'jutsu_ojo_nen', pista: 'Ojo: ver el flujo de Nen y debilidades del oponente', respuesta: 'Biscuit / Knov – Hunter × Hunter', personaje: 'Biscuit Krueger', anime: 'Hunter × Hunter' },
    { id: 'jutsu_dados', pista: 'Adivinar puntos: lanzar dados y apostar con aura', respuesta: 'Genthru – Hunter × Hunter', personaje: 'Genthru', anime: 'Hunter × Hunter' },
    { id: 'jutsu_bestia', pista: 'Bestia compañera: Nen con forma de mascota que pelea sola', respuesta: 'Bisky / Palm – Hunter × Hunter', personaje: 'Palm Siberia', anime: 'Hunter × Hunter' },
    { id: 'jutsu_velocidad_hx', pista: 'Velocidad: moverse más rápido que el ojo puede seguir', respuesta: 'Killua Zoldyck (Modo Dios) – Hunter × Hunter', personaje: 'Killua Zoldyck', anime: 'Hunter × Hunter' },
    { id: 'jutsu_fuerza_hx', pista: 'Fuerza bruta: destruir montañas con un golpe', respuesta: 'Gon Freecss (Transformación) – Hunter × Hunter', personaje: 'Gon Freecss', anime: 'Hunter × Hunter' },
    { id: 'jutsu_curacion_hx', pista: 'Curación: acelerar regeneración con Nen', respuesta: 'Shalnark / Biscuit – Hunter × Hunter', personaje: 'Biscuit Krueger', anime: 'Hunter × Hunter' },
    { id: 'jutsu_robo', pista: 'Robo de habilidades: guardar y usar técnicas de otros', respuesta: 'Chrollo Lucilfer – Hunter × Hunter', personaje: 'Chrollo Lucilfer', anime: 'Hunter × Hunter' },
    { id: 'jutsu_percepcion_hx', pista: 'Percepción: sentir enemigos sin verlos', respuesta: 'Gon / Kite – Hunter × Hunter', personaje: 'Kite', anime: 'Hunter × Hunter' },
    { id: 'jutsu_carta', pista: 'Carta: convertir personas en objetos', respuesta: 'Greed Island – Hunter × Hunter', personaje: 'Razor', anime: 'Hunter × Hunter' },
    { id: 'jutsu_marca_hx', pista: 'Marca: quien te lastima recibe el daño multiplicado', respuesta: 'Kurapika (Cadena Juicio) – Hunter × Hunter', personaje: 'Kurapika', anime: 'Hunter × Hunter' },
    { id: 'jutsu_tiempo_hx', pista: 'Tiempo: acumular segundos para moverse a velocidad extrema', respuesta: 'Knuckle / Shoot – Hunter × Hunter', personaje: 'Knuckle Bine', anime: 'Hunter × Hunter' },
    { id: 'jutsu_musica', pista: 'Música: controlar emociones con sonido', respuesta: 'Melody – Hunter × Hunter', personaje: 'Melody', anime: 'Hunter × Hunter' },
    { id: 'jutsu_serpiente', pista: 'Aura de poder: tomar forma de serpiente y atacar desde lejos', respuesta: 'Hisoka – Hunter × Hunter', personaje: 'Hisoka', anime: 'Hunter × Hunter' },
    { id: 'jutsu_barrera', pista: 'Barrera de sombra: formar un túnel espiritual', respuesta: 'Shizuku / Morow – Hunter × Hunter', personaje: 'Morow', anime: 'Hunter × Hunter' },
    { id: 'jutsu_movilidad', pista: 'Movilidad absoluta: cambiar de posición en un instante', respuesta: 'Gon / Killua – Hunter × Hunter', personaje: 'Killua Zoldyck', anime: 'Hunter × Hunter' },
    { id: 'jutsu_presion', pista: 'Técnica de presión: aplastamiento total con Nen puro', respuesta: 'Phinks – Hunter × Hunter', personaje: 'Phinks', anime: 'Hunter × Hunter' },
    { id: 'jutsu_defensa_hx', pista: 'Poder de defensa: bloquear el ataque del enemigo con aura dura', respuesta: 'Biscuit Krueger – Hunter × Hunter', personaje: 'Biscuit Krueger', anime: 'Hunter × Hunter' }
  ],
  formatoPregunta: (p) => `¿Quién usa: "${p.pista}"?\nEscribí tu respuesta 👇`,
  validarRespuesta: (msg, p) => msg.includes(p.respuesta.split(' – ')[0])
};
