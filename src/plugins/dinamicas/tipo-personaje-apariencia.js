// ==========================================
// 👤 DINÁMICA: ADIVINA EL PERSONAJE POR SU ASPECTO
// ==========================================
// Versión: 1.0 | Fecha: 2026-09-10
// Animes incluidos: Naruto · Jujutsu Kaisen · Hunter × Hunter

export const datos = {
  id: 'personaje_apariencia',
  nombre: '¿Quién es? 👤',
  descripcionCorta: 'Te describo su apariencia y decís quién es',
  tipo: 'Conocimiento · Reconocimiento',
  rondas: 10,
  tiempoPorRonda: 50,

  preguntas: [
    // === NARUTO ===
    {
      id: 'ap_naruto_1',
      descripcion: 'Pelo rubio puntiagudo, ojos azules, marca en la mejilla y suele usar una chaqueta naranja y negra',
      respuesta: 'Naruto Uzumaki',
      anime: 'Naruto'
    },
    {
      id: 'ap_naruto_2',
      descripcion: 'Pelo negro, ojos oscuros con un poder especial, ropa azul y blanca, espada en la espalda',
      respuesta: 'Sasuke Uchiha',
      anime: 'Naruto'
    },
    {
      id: 'ap_naruto_3',
      descripcion: 'Pelo blanco y gris, un ojo tapado, cabello largo y siempre lleva una máscara',
      respuesta: 'Kakashi Hatake',
      anime: 'Naruto'
    },
    {
      id: 'ap_naruto_4',
      descripcion: 'Pelo rosa, ojos verdes, frente alto y suele llevar el uniforme de la aldea',
      respuesta: 'Sakura Haruno',
      anime: 'Naruto'
    },
    {
      id: 'ap_naruto_5',
      descripcion: 'Pelo castaño recogido, ojos blancos sin pupilas, vestimenta suave y elegante',
      respuesta: 'Hinata Hyuga',
      anime: 'Naruto'
    },
    {
      id: 'ap_naruto_6',
      descripcion: 'Pelo rojo corto, piel pálida, tatuajes morados alrededor de los ojos y una capa oscura',
      respuesta: 'Gaara',
      anime: 'Naruto'
    },
    {
      id: 'ap_naruto_7',
      descripcion: 'Pelo negro despeinado, ojos oscuros, siempre lleva una venda en la frente y ropa verde',
      respuesta: 'Rock Lee',
      anime: 'Naruto'
    },

    // === JUJUTSU KAISEN ===
    {
      id: 'ap_jjk_1',
      descripcion: 'Pelo blanco desordenado, ojos azules brillantes, suele llevar una venda negra cubriendo ambos ojos y ropa oscura',
      respuesta: 'Satoru Gojo',
      anime: 'Jujutsu Kaisen'
    },
    {
      id: 'ap_jjk_2',
      descripcion: 'Pelo negro corto y desaliñado, ojos marrones, físico atlético y suele llevar el uniforme escolar',
      respuesta: 'Yuji Itadori',
      anime: 'Jujutsu Kaisen'
    },
    {
      id: 'ap_jjk_3',
      descripcion: 'Pelo negro largo y suelto, ojos oscuros, suele llevar una chaqueta con cuello alto y ropa oscura',
      respuesta: 'Megumi Fushiguro',
      anime: 'Jujutsu Kaisen'
    },
    {
      id: 'ap_jjk_4',
      descripcion: 'Pelo castaño corto, ojos marrones vivos, lleva guantes y suele vestir con ropa de mezclilla',
      respuesta: 'Nobara Kugisaki',
      anime: 'Jujutsu Kaisen'
    },
    {
      id: 'ap_jjk_5',
      descripcion: 'Pelo rubio peinado hacia atrás, gafas, traje formal y siempre lleva un reloj en la muñeca',
      respuesta: 'Kento Nanami',
      anime: 'Jujutsu Kaisen'
    },
    {
      id: 'ap_jjk_6',
      descripcion: 'Pelo blanco con mechones rojos, ojos afilados, marcas negras en la cara y cuerpo imponente',
      respuesta: 'Ryomen Sukuna',
      anime: 'Jujutsu Kaisen'
    },

    // === HUNTER × HUNTER ===
    {
      id: 'ap_hxh_1',
      descripcion: 'Pelo negro revuelto, ojos grandes y expresivos, lleva ropa verde y tiene un colmillo visible al sonreír',
      respuesta: 'Gon Freecss',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'ap_hxh_2',
      descripcion: 'Pelo blanco corto, ojos azules rasgados, ropa oscura y suele llevar pantalones cortos con calcetines altos',
      respuesta: 'Killua Zoldyck',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'ap_hxh_3',
      descripcion: 'Pelo rubio largo recogido, ojos azules, vestimenta blanca y azul, siempre lleva cadenas en las manos',
      respuesta: 'Kurapika',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'ap_hxh_4',
      descripcion: 'Pelo castaño corto, gafas, traje marrón y siempre lleva una maletín médica',
      respuesta: 'Leorio',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'ap_hxh_5',
      descripcion: 'Pelo rojo brillante, cabello largo y rizado, siempre sonríe y lleva ropa de colores oscuros con símbolos',
      respuesta: 'Hisoka',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'ap_hxh_6',
      descripcion: 'Pelo rubio recogido en coleta, cuerpo pequeño pero musculoso, lleva ropa deportiva y gafas de sol',
      respuesta: 'Biscuit Krueger',
      anime: 'Hunter × Hunter'
    },
    {
      id: 'ap_hxh_7',
      descripcion: 'Cabello negro largo y lacio, ojos serios, vestimenta elegante y oscura, siempre parece tranquilo',
      respuesta: 'Illumi Zoldyck',
      anime: 'Hunter × Hunter'
    }
  ],

  formatoPregunta: function(pregunta) {
    return `👤 ¿QUIÉN ES?

${pregunta.descripcion}

¿Sabés quién es? Escribí su nombre 👇`;
  },

  validarRespuesta: function(mensaje, pregunta) {
    const texto = mensaje.toLowerCase();
    const respuestaCorrecta = pregunta.respuesta.toLowerCase();
    return texto.includes(respuestaCorrecta);
  }
};
