// ==========================================
// ✨ DINÁMICA: EQUIPO DE SUEÑO
// ==========================================

export const datos = {
  id: 'equipo_sueno',
  nombre: 'Equipo de Sueño ⚔️',
  descripcionCorta: 'Arma tu equipo ideal con personajes de anime',
  tipo: 'Creatividad',
  rondas: 5,
  tiempoPorRonda: 50,
  mensajeInicio: `✨ 𝐁𝐎𝐍𝐔𝐒: 𝐄𝐋 𝐄𝐐𝐔𝐈𝐏𝐎 𝐃𝐄 𝐒𝐔𝐄Ñ𝐎 ⚔️

Les diré un rol (líder, atacante, defensa, sanador)
y ustedes me dirán qué personaje de anime elegirían
para ese puesto y por qué. ¡Armen su equipo definitivo! 💪

✦ Ejemplo:
▪️ Digo: "Sanador"
▪️ Responden: Choji – porque tiene gran resistencia y siempre cuida a su equipo

⏳ Cada ronda: 50 segundos para responder
🔢 Fase Bonus: 5 rondas
📚 Base de preguntas: 15 disponibles · ¡Siempre habrá algo nuevo! 🔄

¡Bonus activado! ⚡🔥`,
  preguntas: [
    { id: 'rol_lider', rol: 'Líder', descripcion: 'El que dirige, toma decisiones y mantiene unido al equipo', ejemplo: 'Naruto Uzumaki – porque nunca se rinde, inspira a todos y siempre busca proteger a sus amigos' },
    { id: 'rol_sanador', rol: 'Sanador', descripcion: 'Recupera heridas, da apoyo y mantiene al equipo en pie', ejemplo: 'Sakura Haruno – domina la curación, tiene fuerza y siempre cuida a los suyos' },
    { id: 'rol_atacante', rol: 'Atacante principal', descripcion: 'Mayor poder ofensivo, golpea fuerte y rompe defensas', ejemplo: 'Satoru Gojo – tiene poder infinito, velocidad y puede destruir todo con un solo ataque' },
    { id: 'rol_defensa', rol: 'Defensa y escudo', descripcion: 'Protege, recibe golpes y bloquea ataques al resto', ejemplo: 'Kurapika – sus cadenas crean barreras y pueden anular cualquier ataque enemigo' },
    { id: 'rol_explorador', rol: 'Explorador / Espía', descripcion: 'Rápido, silencioso, descubre trampas y vigila el terreno', ejemplo: 'Killua Zoldyck – se mueve sin ser visto, tiene agudos sentidos y reacciona antes que nadie' },
    { id: 'rol_estratega', rol: 'Estratega / Cerebro', descripcion: 'Planear, predecir movimientos y encontrar debilidades', ejemplo: 'Shikamaru Nara – ve todo antes de que pase, calcula riesgos y gana con inteligencia' },
    { id: 'rol_apoyo', rol: 'Apoyo / Soporte', descripcion: 'Mejora a los compañeros, da energía y mantiene el ánimo', ejemplo: 'Choji Akimichi – comparte todo, nunca deja a nadie atrás y da fuerza moral' },
    { id: 'rol_asesino', rol: 'Asesino / Ataque rápido', descripcion: 'Golpea y desaparece, ataques letales en un instante', ejemplo: 'Sasuke Uchiha – velocidad extrema, ataques precisos y no da tiempo a reaccionar' },
    { id: 'rol_tanque', rol: 'Tanque / Resistencia', descripcion: 'Aguanta golpes que no soportaría nadie más y sigue de pie', ejemplo: 'Yuji Itadori – pelea con el cuerpo destrozado y nunca se rinde' },
    { id: 'rol_alcance', rol: 'Alcance / Distancia', descripcion: 'Ataca desde lejos, controla el campo sin acercarse', ejemplo: 'Megumi Fushiguro – sus sombras atacan desde cualquier lugar y exploran todo el terreno' },
    { id: 'rol_supremo', rol: 'Poder supremo / Último recurso', descripcion: 'El más fuerte de todos, se usa solo en momentos críticos', ejemplo: 'Ryomen Sukuna / Gon – desata un poder que cambia todo el campo de batalla' },
    { id: 'rol_lealtad', rol: 'Lealtad absoluta', descripcion: 'Nunca traiciona, muere antes que fallar al equipo', ejemplo: 'Hinata Hyuga – da la vida por quienes ama sin dudar' },
    { id: 'rol_guia', rol: 'Guía / Maestro', descripcion: 'Enseña, corrige y hace crecer a los miembros', ejemplo: 'Jiraiya – forma a los mejores héroes con paciencia y sabiduría' },
    { id: 'rol_motivacion', rol: 'Impulso / Motivación', descripcion: 'Levanta el ánimo cuando todo parece perdido', ejemplo: 'Gon Freecss – su energía contagia a todos y nunca se rinde' },
    { id: 'rol_protector', rol: 'Protector silencioso', descripcion: 'Vigila desde las sombras y salva sin que sepan quién fue', ejemplo: 'Kakashi Hatake – aparece justo cuando hace falta y protege sin buscar reconocimiento' }
  ],
  formatoPregunta: (p) => `Puesto: ${p.rol}\n${p.descripcion}\n¿A quién elegís y por qué? 💪`,
  validarRespuesta: () => true
};
