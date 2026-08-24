import type * as THREE from 'three';
import type { BoneLaterality, BoneLink, BoneRegion, BoneType, RenderedBone } from '../types/bone';
import { meshUserData } from '../three/mesh-user-data';

const BONE_NAMES: Record<string, string> = {
  'atlas (c1)': 'Atlas (C1)',
  'axis (c2)': 'Axis (C2)',
  'body of sternum': 'Cuerpo del esternón',
  'manubrium of sternum': 'Manubrio del esternón',
  coccyx: 'Cóccix',
  sacrum: 'Sacro',
  mandible: 'Mandíbula',
  frontal: 'Frontal',
  parietal: 'Parietal',
  occipital: 'Occipital',
  temporal: 'Temporal',
  sphenoid: 'Esfenoides',
  ethmoid: 'Etmoides',
  vomer: 'Vómer',
  maxilla: 'Maxilar',
  zygomatic: 'Cigomático',
  'inferior nasal concha': 'Cornete nasal inferior',
  nasal: 'Nasal',
  lacrimal: 'Lagrimal',
  palatine: 'Palatino',
  clavicle: 'Clavícula',
  scapula: 'Escápula',
  'hip bone': 'Coxal',
  humerus: 'Húmero',
  radius: 'Radio',
  ulna: 'Cúbito',
  femur: 'Fémur',
  patella: 'Rótula',
  tibia: 'Tibia',
  fibula: 'Peroné',
  calcaneus: 'Calcáneo',
  talus: 'Astrágalo',
  navicular: 'Navicular',
  cuboid: 'Cuboides',
  'medial cuneiform': 'Cuneiforme medial',
  'intermediate cuneiform': 'Cuneiforme intermedio',
  'lateral cuneiform': 'Cuneiforme lateral',
  scaphoid: 'Escafoides',
  lunate: 'Semilunar',
  triquetrum: 'Piramidal',
  pisiform: 'Pisiforme',
  trapezium: 'Trapecio',
  trapezoid: 'Trapezoide',
  capitate: 'Grande',
  hamate: 'Ganchoso',
  'sesamoid bones of foot': 'Sesamoideos del pie',
  'sesamoid bones of hand': 'Sesamoideos de la mano',
};

const ORDINALS: Record<string, string> = {
  first: 'primer',
  second: 'segundo',
  third: 'tercer',
  fourth: 'cuarto',
  fifth: 'quinto',
};

const METACARPAL_ORDINALS: Record<string, string> = {
  first: 'Primer',
  second: 'Segundo',
  third: 'Tercer',
  fourth: 'Cuarto',
  fifth: 'Quinto',
};

const PHALANX_LEVELS: Record<string, string> = {
  distal: 'distal',
  middle: 'media',
  proximal: 'proximal',
};

const VERTEBRA_LEVELS: Record<string, string> = {
  cervical: 'cervical',
  thoracic: 'torácica',
  lumbar: 'lumbar',
};

function sideOf(name: string) {
  if (/(?:[._]r[._]?|(?:[._]|\s+)right)$/i.test(name)) return 'derecho';
  if (/(?:[._]l[._]?|(?:[._]|\s+)left)$/i.test(name)) return 'izquierdo';
  return '';
}

function normalizeBoneName(raw: string, hasExplicitSide: boolean) {
  const withoutSide = hasExplicitSide
    ? raw.replace(/(?:[._]?[rl][._]?|(?:[._]|\s+)(?:left|right))$/i, '')
    : raw.replace(/(?:[._][rl][._]?|(?:[._]|\s+)(?:left|right))$/i, '');
  return withoutSide.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function ordinal(raw: string) {
  const number = raw.match(/(\d+)/)?.[1];
  return number
    ? { 1: 'primer', 2: 'segundo', 3: 'tercer', 4: 'cuarto', 5: 'quinto' }[+number] || number
    : raw;
}

function translateRib(name: string) {
  const match = name.match(/Rib \((\d+)(?:st|nd|rd|th)\)/i);
  return match ? `Costilla ${match[1]}` : undefined;
}

function translateVertebra(name: string) {
  const match = name.match(/(Cervical|Thoracic|Lumbar) vertebrae? \(([CTL]\d+)\)/i);
  if (!match) return undefined;
  return `Vértebra ${VERTEBRA_LEVELS[match[1]!.toLowerCase()]} ${match[2]!.toUpperCase()}`;
}

function translatePhalanx(name: string) {
  const match = name.match(
    /(Distal|Middle|Proximal) phalanx of (\d+|first|second|third|fourth|fifth)(?:st|d|rd|th)? finger( of foot)?/i
  );
  if (!match) return undefined;
  const digit = ORDINALS[match[2]!.toLowerCase()] || ordinal(match[2]!);
  return `Falange ${PHALANX_LEVELS[match[1]!.toLowerCase()]} del ${digit} dedo${match[3] ? ' del pie' : ' de la mano'}`;
}

function translateMetacarpalOrMetatarsal(name: string) {
  const match = name.match(
    /(\d+|first|second|third|fourth|fifth)(?:st|nd|rd|th)? met(acarpal|atarsal) bone/i
  );
  if (!match) return undefined;
  const position = METACARPAL_ORDINALS[match[1]!.toLowerCase()] || ordinal(match[1]!);
  return `${position} ${match[2]!.toLowerCase() === 'acarpal' ? 'metacarpiano' : 'metatarsiano'}`;
}

function translateDirectName(name: string) {
  const normalized = name.toLowerCase();
  return Object.entries(BONE_NAMES).find(([source]) => normalized.includes(source))?.[1];
}

function lateralizedName(name: string, side: string) {
  if (!side) return name;
  const feminine = /^(clavícula|escápula|tibia|rótula|costilla|falange|vértebra)\b/i.test(name);
  const agreedSide = feminine ? (side === 'izquierdo' ? 'izquierda' : 'derecha') : side;
  return `${name} ${agreedSide}`;
}

function spanishName(raw: string, explicitSide = '') {
  const side = explicitSide || sideOf(raw);
  const normalized = normalizeBoneName(raw, Boolean(explicitSide));
  const translated =
    translateRib(normalized) ??
    translateVertebra(normalized) ??
    translatePhalanx(normalized) ??
    translateMetacarpalOrMetatarsal(normalized) ??
    translateDirectName(normalized) ??
    normalized;

  return lateralizedName(translated, side);
}

function regionFor(name: string): BoneRegion {
  const n = name.toLowerCase().replace(/_/g, ' ');
  if (
    /frontal|parietal|occipital|temporal|sphenoid|ethmoid|vomer|maxilla|zygomatic|nasal|lacrimal|palatine|mandible|concha/.test(
      n
    )
  )
    return 'Cráneo';
  if (/vertebra|atlas|axis|coccyx|sacrum/.test(n)) return 'Columna vertebral';
  if (/sternum|rib/.test(n)) return 'Tórax';
  if (/hip bone/.test(n)) return 'Pelvis';
  if (
    /clavicle|scapula|humerus|radius|ulna|metacarpal|finger|scaphoid|lunate|capitate|hamate|pisiform|trapezi|hand/.test(
      n
    )
  )
    return 'Miembro superior';
  return 'Miembro inferior';
}
function typeFor(name: string): BoneType {
  const n = name.toLowerCase();
  if (/patella|sesamoid/.test(n)) return 'Hueso sesamoideo';
  if (/vertebra|atlas|axis|sacrum|coccyx|hip/.test(n)) return 'Hueso irregular';
  if (/frontal|parietal|occipital|rib|sternum|scapula/.test(n)) return 'Hueso plano';
  if (
    /carpal|scaphoid|lunate|capitate|hamate|pisiform|trapezi|tarsal|calcaneus|talus|navicular|cuboid|cuneiform/.test(
      n
    )
  )
    return 'Hueso corto';
  return 'Hueso largo';
}
function latinName(raw: string) {
  const n = raw.replace(/[._]?[rl][._]?$/i, '').replace(/_/g, ' ');
  const vertebra = n.match(/(Cervical|Thoracic|Lumbar) vertebrae? \(([CTL]\d+)\)/i);
  if (vertebra)
    return `Vertebra ${vertebra[1]!.toLowerCase() === 'cervical' ? 'cervicalis' : vertebra[1]!.toLowerCase() === 'thoracic' ? 'thoracica' : 'lumbalis'} ${vertebra[2]!.toUpperCase()}`;
  const rib = n.match(/Rib \((\d+)/i);
  if (rib) return `Costa ${rib[1]}`;
  const met = n.match(
    /(\d+|first|second|third|fourth|fifth)(?:st|nd|rd|th)? met(acarpal|atarsal)/i
  );
  if (met) {
    const nums: { [k: string]: string } = {
      first: 'I',
      second: 'II',
      third: 'III',
      fourth: 'IV',
      fifth: 'V',
      '1': 'I',
      '2': 'II',
      '3': 'III',
      '4': 'IV',
      '5': 'V',
    };
    return `Os ${met[2]!.toLowerCase() === 'acarpal' ? 'metacarpale' : 'metatarsale'} ${nums[met[1]!.toLowerCase()]}`;
  }
  const map: [RegExp, string][] = [
    [/Hip bone/i, 'Os coxae'],
    [/Humerus/i, 'Humerus'],
    [/Femur/i, 'Femur'],
    [/Radius/i, 'Radius'],
    [/Ulna/i, 'Ulna'],
    [/Tibia/i, 'Tibia'],
    [/Fibula/i, 'Fibula'],
    [/Patella/i, 'Patella'],
    [/Clavicle/i, 'Clavicula'],
    [/Scapula/i, 'Scapula'],
    [/Mandible/i, 'Mandibula'],
    [/Sacrum/i, 'Os sacrum'],
    [/Coccyx/i, 'Os coccygis'],
    [/Sternum/i, 'Sternum'],
    [/Frontal/i, 'Os frontale'],
    [/Parietal/i, 'Os parietale'],
    [/Occipital/i, 'Os occipitale'],
    [/Temporal/i, 'Os temporale'],
    [/Sphenoid/i, 'Os sphenoidale'],
    [/Ethmoid/i, 'Os ethmoidale'],
    [/Maxilla/i, 'Maxilla'],
    [/Zygomatic/i, 'Os zygomaticum'],
    [/Calcaneus/i, 'Calcaneus'],
    [/Talus/i, 'Talus'],
  ];
  return map.find(([r]) => r.test(n))?.[1] || n;
}
function anatomyProfile(name: string, raw: string, side: string, region: string) {
  const n = raw.replace(/_/g, ' ').toLowerCase(),
    S = (bone: string) => lateralizedName(bone, side),
    A = (label: string, detail: string, target = label): BoneLink => ({ label, detail, target });
  const baseFormation =
    region === 'Cráneo'
      ? 'Se desarrolla principalmente por osificación intramembranosa a partir del tejido mesenquimático embrionario.'
      : 'Se forma a partir de uno o más centros de osificación que maduran y se fusionan durante el crecimiento.';
  if (/hip bone/.test(n))
    return {
      location: 'Forma la mitad lateral de la cintura pélvica',
      formation:
        'Durante la infancia está formado por ilion, isquion y pubis; estas tres piezas se fusionan en el acetábulo durante la adolescencia y adultez temprana.',
      fact: 'El coxal resulta de la fusión del ilion —superior y ancho—, el isquion —posteroinferior— y el pubis —anterior—. En su cara externa presenta el acetábulo, la cavidad donde encaja la cabeza del fémur para formar la articulación de la cadera.',
      curiosity:
        'La pelvis femenina suele ser más ancha y presentar un ángulo subpúbico mayor, adaptaciones relacionadas con el parto.',
      articulations: [
        A('Sacro', 'Articulación sacroilíaca'),
        A(S('Fémur'), 'Articulación coxofemoral'),
        A(`Coxal ${side === 'izquierdo' ? 'derecho' : 'izquierdo'}`, 'Sínfisis del pubis'),
      ],
    };
  if (/humerus/.test(n))
    return {
      location: `Brazo ${side}; entre hombro y codo`,
      formation:
        'Su diáfisis comienza a osificarse durante la vida fetal; los centros epifisarios se fusionan al final de la adolescencia.',
      fact: 'Es el único hueso del brazo. Su cabeza redondeada participa en el hombro y su extremo distal forma el codo; sirve además de inserción a músculos que mueven hombro, brazo y antebrazo.',
      curiosity:
        'El nervio radial recorre un surco en su cara posterior, por lo que ciertas fracturas pueden lesionarlo.',
      articulations: [
        A(S('Escápula'), 'Articulación glenohumeral'),
        A(S('Radio'), 'Codo'),
        A(S('Cúbito'), 'Codo'),
      ],
    };
  if (/femur/.test(n))
    return {
      location: `Muslo ${side}; entre cadera y rodilla`,
      formation:
        'Posee un centro primario en la diáfisis y centros secundarios en cabeza, trocánteres y cóndilos, que se fusionan durante la maduración.',
      fact: 'Es el hueso más largo y resistente del cuerpo. Transmite el peso desde la pelvis hacia la tibia y ofrece grandes superficies de inserción para los músculos de la cadera y el muslo.',
      curiosity:
        'Su orientación oblicua acerca las rodillas a la línea media y mejora la eficiencia de la marcha bípeda.',
      articulations: [
        A(S('Coxal'), 'Cadera'),
        A(S('Tibia'), 'Rodilla'),
        A(S('Rótula'), 'Articulación femoropatelar'),
      ],
    };
  if (/radius/.test(n))
    return {
      location: `Lado lateral del antebrazo ${side}, del lado del pulgar`,
      formation: baseFormation,
      fact: 'El radio gira alrededor del cúbito durante la pronación y supinación. Su extremo distal recibe la mayor parte de la carga transmitida desde la mano.',
      curiosity:
        'La fractura de Colles afecta con frecuencia su extremo distal tras una caída con la mano extendida.',
      articulations: [
        A(S('Húmero'), 'Codo'),
        A(S('Cúbito'), 'Articulaciones radiocubitales'),
        A(S('Escafoides'), 'Muñeca'),
        A(S('Semilunar'), 'Muñeca'),
      ],
    };
  if (/ulna/.test(n))
    return {
      location: `Lado medial del antebrazo ${side}, del lado del meñique`,
      formation: baseFormation,
      fact: 'El cúbito estabiliza el antebrazo. Su olécranon forma la prominencia del codo y abraza la tróclea humeral mediante la incisura troclear.',
      curiosity:
        'Aunque domina la articulación del codo, no contacta directamente con los huesos del carpo.',
      articulations: [A(S('Húmero'), 'Codo'), A(S('Radio'), 'Articulaciones radiocubitales')],
    };
  if (/tibia/.test(n))
    return {
      location: `Porción medial de la pierna ${side}`,
      formation: baseFormation,
      fact: 'Es el principal hueso portante de la pierna. Recibe el peso del fémur en la rodilla y lo transmite al astrágalo en el tobillo.',
      curiosity: 'Su borde anterior es subcutáneo y forma la cresta palpable de la espinilla.',
      articulations: [
        A(S('Fémur'), 'Rodilla'),
        A(S('Peroné'), 'Articulaciones tibiofibulares'),
        A(S('Astrágalo'), 'Tobillo'),
      ],
    };
  if (/fibula/.test(n))
    return {
      location: `Porción lateral de la pierna ${side}`,
      formation: baseFormation,
      fact: 'El peroné es delgado y soporta poca carga, pero estabiliza el tobillo y proporciona una extensa superficie de inserción muscular.',
      curiosity:
        'Su extremo distal forma el maléolo lateral, más bajo que el maléolo medial de la tibia.',
      articulations: [A(S('Tibia'), 'Articulaciones tibiofibulares'), A(S('Astrágalo'), 'Tobillo')],
    };
  if (/patella/.test(n))
    return {
      location: `Cara anterior de la rodilla ${side}`,
      formation:
        'Se osifica dentro del tendón del cuádriceps durante la infancia y suele completar su osificación en la adolescencia.',
      fact: 'La rótula protege la cara anterior de la rodilla y aumenta el brazo de palanca del cuádriceps durante la extensión.',
      curiosity: 'Es el hueso sesamoideo más grande del cuerpo humano.',
      articulations: [A(S('Fémur'), 'Articulación femoropatelar')],
    };
  if (/clavicle/.test(n))
    return {
      location: `Entre esternón y hombro ${side}`,
      formation:
        'Es uno de los primeros huesos en comenzar a osificarse y combina osificación intramembranosa y endocondral.',
      fact: 'Funciona como un puntal que mantiene el hombro separado del tórax y transmite fuerzas del miembro superior al esqueleto axial.',
      curiosity: 'Es uno de los huesos que se fractura con mayor frecuencia.',
      articulations: [
        A('Manubrio del esternón', 'Articulación esternoclavicular'),
        A(S('Escápula'), 'Articulación acromioclavicular'),
      ],
    };
  if (/scapula/.test(n))
    return {
      location: `Región posterolateral del tórax ${side}`,
      formation: baseFormation,
      fact: 'La escápula es una lámina triangular móvil. Su cavidad glenoidea recibe la cabeza humeral y sus procesos sirven de inserción a numerosos músculos.',
      curiosity:
        'No se articula directamente con las costillas: se desliza sobre ellas mediante músculos.',
      articulations: [
        A(S('Clavícula'), 'Articulación acromioclavicular'),
        A(S('Húmero'), 'Articulación glenohumeral'),
      ],
    };
  if (/rib/.test(n)) {
    const num = n.match(/\((\d+)/)?.[1] || '';
    return {
      location: `Pared torácica; costilla ${num} ${side}`,
      formation: baseFormation,
      fact: `La costilla ${num} forma parte de la caja torácica, protege los órganos del pecho y acompaña los movimientos respiratorios. Su extremo posterior se une a las vértebras torácicas.`,
      curiosity:
        +num <= 7
          ? 'Pertenece al grupo de costillas verdaderas porque alcanza el esternón mediante su propio cartílago costal.'
          : +num <= 10
            ? 'Es una costilla falsa: llega al esternón de forma indirecta mediante el arco costal.'
            : 'Es una costilla flotante: su extremo anterior queda libre.',
      articulations: [A(`Vértebra torácica T${num}`, 'Articulación costovertebral')],
    };
  }
  if (/cervical|thoracic|lumbar/.test(n) && /vertebra/.test(n)) {
    const code = n.match(/\(([ctl]\d+)\)/)?.[1]?.toUpperCase() || '',
      level = code[0] === 'C' ? 'cervical' : code[0] === 'T' ? 'torácica' : 'lumbar';
    return {
      location: `Columna ${level}; nivel ${code}`,
      formation:
        'El cuerpo y el arco vertebral se forman a partir de centros de osificación que se fusionan durante el crecimiento.',
      fact: `La vértebra ${code} sostiene y guía el movimiento de la columna ${level}, delimita el conducto vertebral y protege la médula espinal.`,
      curiosity:
        code === 'C7'
          ? 'Su apófisis espinosa suele ser palpable en la base del cuello y se denomina vértebra prominente.'
          : code === 'T12'
            ? 'Es una vértebra de transición entre las regiones torácica y lumbar.'
            : code === 'L5'
              ? 'Soporta grandes cargas en la unión lumbosacra.'
              : 'Sus apófisis sirven de palanca e inserción a músculos y ligamentos.',
      articulations: [],
    };
  }
  if (/atlas/.test(n))
    return {
      location: 'Primera vértebra cervical, bajo el cráneo',
      formation: baseFormation,
      fact: 'El atlas carece de cuerpo vertebral típico y sostiene el cráneo mediante sus masas laterales. Permite principalmente el movimiento de asentir.',
      curiosity: 'Recibe su nombre del titán Atlas, que sostenía el mundo.',
      articulations: [
        A('Occipital', 'Articulación atlantooccipital'),
        A('Axis (C2)', 'Articulación atlantoaxoidea'),
      ],
    };
  if (/axis/.test(n))
    return {
      location: 'Segunda vértebra cervical',
      formation: baseFormation,
      fact: 'El axis posee la apófisis odontoides, que actúa como pivote para que el atlas y la cabeza roten.',
      curiosity: 'La mayor parte del gesto de negar con la cabeza ocurre entre atlas y axis.',
      articulations: [
        A('Atlas (C1)', 'Articulación atlantoaxoidea'),
        A('Vértebra cervical C3', 'Articulación intervertebral'),
      ],
    };
  if (/sacrum/.test(n))
    return {
      location: 'Base de la columna, entre ambos coxales',
      formation:
        'Cinco vértebras sacras se fusionan progresivamente desde la adolescencia hasta la adultez.',
      fact: 'El sacro forma la pared posterior de la pelvis y transmite el peso de la columna hacia los coxales y miembros inferiores.',
      curiosity: 'Sus forámenes permiten el paso de ramos nerviosos sacros.',
      articulations: [
        A('Vértebra lumbar L5', 'Unión lumbosacra'),
        A('Cóccix', 'Articulación sacrococcígea'),
        A('Coxal izquierdo', 'Articulación sacroilíaca'),
        A('Coxal derecho', 'Articulación sacroilíaca'),
      ],
    };
  if (/coccyx/.test(n))
    return {
      location: 'Extremo inferior de la columna vertebral',
      formation: 'Resulta de la fusión variable de tres a cinco vértebras coccígeas rudimentarias.',
      fact: 'El cóccix sirve de anclaje a ligamentos y músculos del suelo pélvico y contribuye al apoyo al sentarse.',
      curiosity: 'Es un remanente evolutivo de la cola de nuestros antepasados.',
      articulations: [A('Sacro', 'Articulación sacrococcígea')],
    };
  if (/sternum/.test(n)) {
    const part = /manubrium/.test(n) ? 'manubrio' : 'cuerpo';
    return {
      location: `Línea media anterior del tórax; ${part} del esternón`,
      formation:
        'Se origina a partir de barras esternales pares que se fusionan en la línea media durante el desarrollo.',
      fact: `El ${part} del esternón protege estructuras mediastínicas y ofrece anclaje a cartílagos costales${part === 'manubrio' ? ' y clavículas' : ''}.`,
      curiosity:
        part === 'manubrio'
          ? 'La unión con el cuerpo forma el ángulo esternal, referencia para localizar la segunda costilla.'
          : 'Su médula puede utilizarse para obtener muestras diagnósticas.',
      articulations:
        part === 'manubrio'
          ? [
              A('Cuerpo del esternón', 'Ángulo esternal'),
              A('Clavícula izquierda', 'Articulación esternoclavicular'),
              A('Clavícula derecha', 'Articulación esternoclavicular'),
            ]
          : [A('Manubrio del esternón', 'Ángulo esternal')],
    };
  }
  if (/calcaneus/.test(n))
    return {
      location: `Talón del pie ${side}`,
      formation: baseFormation,
      fact: 'El calcáneo es el mayor hueso del tarso. Recibe el impacto del talón, sostiene peso y da inserción al tendón calcáneo.',
      curiosity: 'El tendón de Aquiles se inserta en su tuberosidad posterior.',
      articulations: [
        A(S('Astrágalo'), 'Articulación subtalar'),
        A(S('Cuboides'), 'Articulación calcaneocuboidea'),
      ],
    };
  if (/talus/.test(n))
    return {
      location: `Retropié ${side}, entre pierna y calcáneo`,
      formation: baseFormation,
      fact: 'El astrágalo transmite el peso de tibia y peroné al pie y forma la pieza central de las articulaciones del tobillo y subtalar.',
      curiosity:
        'Ningún músculo se inserta directamente en él; gran parte de su superficie está cubierta de cartílago.',
      articulations: [
        A(S('Tibia'), 'Tobillo'),
        A(S('Peroné'), 'Tobillo'),
        A(S('Calcáneo'), 'Subtalar'),
        A(S('Navicular'), 'Talonavicular'),
      ],
    };
  if (/navicular/.test(n))
    return {
      location: `Zona medial del mediopié ${side}`,
      formation: baseFormation,
      fact: 'El navicular conecta el astrágalo con los tres cuneiformes y contribuye de forma decisiva al arco longitudinal medial.',
      curiosity: 'Su tuberosidad es una referencia palpable y recibe al tendón tibial posterior.',
      articulations: [
        A(S('Astrágalo'), 'Talonavicular'),
        A(S('Cuneiforme medial'), 'Mediopié'),
        A(S('Cuneiforme intermedio'), 'Mediopié'),
        A(S('Cuneiforme lateral'), 'Mediopié'),
      ],
    };
  if (/cuboid/.test(n))
    return {
      location: `Zona lateral del mediopié ${side}`,
      formation: baseFormation,
      fact: 'El cuboides estabiliza la columna lateral del pie y presenta un surco para el tendón del peroneo largo.',
      curiosity: 'Actúa como una polea que ayuda al peroneo largo a sostener el arco transversal.',
      articulations: [A(S('Calcáneo'), 'Calcaneocuboidea')],
    };
  if (/cuneiform/.test(n)) {
    const which = /medial/.test(n) ? 'medial' : /intermediate/.test(n) ? 'intermedio' : 'lateral';
    return {
      location: `Mediopié ${side}; cuneiforme ${which}`,
      formation: baseFormation,
      fact: `El cuneiforme ${which} enlaza el navicular con los metatarsianos y contribuye a los arcos longitudinal y transversal del pie.`,
      curiosity:
        which === 'medial'
          ? 'Es el mayor de los tres cuneiformes.'
          : which === 'intermedio'
            ? 'Es el menor de los tres y queda encajado entre sus vecinos.'
            : 'Se articula también con el cuboides.',
      articulations: [A(S('Navicular'), 'Articulación cuneonavicular')],
    };
  }
  if (/metatarsal/.test(n))
    return {
      location: `Antepié ${side}`,
      formation: baseFormation,
      fact: `El ${name.toLowerCase()} distribuye cargas, sostiene los arcos del pie y funciona como palanca durante el despegue de la marcha.`,
      curiosity: /first|1st/.test(n)
        ? 'El primer metatarsiano es el más corto y ancho.'
        : /second|2nd/.test(n)
          ? 'El segundo suele ser el más largo y queda encajado en la articulación de Lisfranc.'
          : 'Su base y cabeza conectan el mediopié con los dedos.',
      articulations: [],
    };
  if (/metacarpal/.test(n))
    return {
      location: `Palma de la mano ${side}`,
      formation: baseFormation,
      fact: `El ${name.toLowerCase()} forma el armazón de la palma, transmite fuerzas desde el carpo y actúa como palanca para los movimientos del dedo correspondiente.`,
      curiosity: /1st/.test(n)
        ? 'El primer metacarpiano es corto, robusto y muy móvil, clave para la oposición del pulgar.'
        : 'Las cabezas metacarpianas forman los nudillos visibles al cerrar el puño.',
      articulations: [],
    };
  if (/phalanx|finger/.test(n)) {
    const foot = /foot/.test(n);
    return {
      location: `${foot ? 'Dedo del pie' : 'Dedo de la mano'} ${side}`,
      formation: baseFormation,
      fact: `Esta falange forma parte del esqueleto digital y transmite fuerzas a través de las articulaciones interfalángicas${foot ? ', contribuyendo al equilibrio y al impulso durante la marcha' : ', permitiendo precisión, pinza y agarre'}.`,
      curiosity: /distal/.test(n)
        ? 'La falange distal sostiene el lecho ungueal y presenta una expansión terminal en forma de penacho.'
        : 'Cada falange posee base, cuerpo y cabeza.',
      articulations: [],
    };
  }
  if (/scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate/.test(n)) {
    const facts = /scaphoid/.test(n)
      ? 'El escafoides conecta las dos filas del carpo y transmite carga desde el pulgar al radio.'
      : /lunate/.test(n)
        ? 'El semilunar ocupa el centro de la fila proximal y participa directamente en la articulación radiocarpiana.'
        : /pisiform/.test(n)
          ? 'El pisiforme es un sesamoideo incluido en el tendón del flexor cubital del carpo.'
          : /capitate/.test(n)
            ? 'El grande es el mayor hueso del carpo y actúa como eje de la mano.'
            : /hamate/.test(n)
              ? 'El ganchoso presenta un gancho palpable que forma parte del borde del túnel carpiano.'
              : 'Este hueso corto integra el mosaico del carpo y combina estabilidad con movilidad fina.';
    return {
      location: `Carpo de la mano ${side}`,
      formation:
        'Los huesos del carpo se osifican después del nacimiento siguiendo una secuencia característica durante la infancia.',
      fact: facts,
      curiosity: 'Los ocho carpianos se organizan en dos filas de cuatro huesos.',
      articulations: [],
    };
  }
  if (/frontal/.test(n))
    return {
      location: 'Frente y techo de las órbitas',
      formation: baseFormation,
      fact: 'El frontal forma la frente, el techo orbitario y gran parte de la fosa craneal anterior; protege los lóbulos frontales.',
      curiosity: 'Al nacer está dividido en dos mitades que normalmente se fusionan.',
      articulations: [
        A('Parietal izquierdo', 'Sutura coronal'),
        A('Parietal derecho', 'Sutura coronal'),
        A('Esfenoides', 'Base del cráneo'),
      ],
    };
  if (/parietal/.test(n))
    return {
      location: `Techo y pared lateral del cráneo ${side}`,
      formation: baseFormation,
      fact: 'El parietal forma gran parte de la bóveda craneal y protege las regiones superior y lateral del encéfalo.',
      curiosity: 'En su superficie interna quedan impresiones de vasos meníngeos.',
      articulations: [
        A(`Parietal ${side === 'izquierdo' ? 'derecho' : 'izquierdo'}`, 'Sutura sagital'),
        A('Frontal', 'Sutura coronal'),
        A('Occipital', 'Sutura lambdoidea'),
      ],
    };
  if (/temporal/.test(n))
    return {
      location: `Base y pared lateral del cráneo ${side}`,
      formation:
        'Sus porciones escamosa, petrosa, mastoidea y timpánica se desarrollan a partir de varios centros que terminan fusionándose.',
      fact: 'El temporal aloja estructuras del oído, forma parte de la base craneal y aporta la cavidad mandibular de la articulación temporomandibular.',
      curiosity: 'Su porción petrosa es una de las regiones óseas más densas del cuerpo.',
      articulations: [
        A('Mandíbula', 'Articulación temporomandibular'),
        A('Occipital', 'Sutura occipitomastoidea'),
      ],
    };
  if (/mandible/.test(n))
    return {
      location: 'Tercio inferior de la cara',
      formation: baseFormation,
      fact: 'La mandíbula sostiene los dientes inferiores y permite masticación, habla y expresión facial mediante las articulaciones temporomandibulares.',
      curiosity: 'Es el hueso más grande y resistente de la cara y el único móvil del cráneo.',
      articulations: [
        A('Temporal izquierdo', 'ATM izquierda'),
        A('Temporal derecho', 'ATM derecha'),
      ],
    };
  if (/occipital/.test(n))
    return {
      location: 'Región posterior e inferior del cráneo',
      formation: baseFormation,
      fact: 'El occipital rodea el foramen magno, protege la fosa posterior y transmite el peso de la cabeza al atlas.',
      curiosity: 'El foramen magno comunica la cavidad craneal con el conducto vertebral.',
      articulations: [
        A('Atlas (C1)', 'Articulación atlantooccipital'),
        A('Parietal izquierdo', 'Sutura lambdoidea'),
        A('Parietal derecho', 'Sutura lambdoidea'),
      ],
    };
  if (/sphenoid/.test(n))
    return {
      location: 'Centro de la base del cráneo',
      formation: baseFormation,
      fact: 'El esfenoides conecta numerosos huesos craneales, forma parte de las órbitas y aloja la hipófisis en la silla turca.',
      curiosity:
        'Por su posición y múltiples articulaciones se lo conoce como la piedra angular del cráneo.',
      articulations: [],
    };
  if (/ethmoid/.test(n))
    return {
      location: 'Entre las órbitas, techo de la cavidad nasal',
      formation: baseFormation,
      fact: 'El etmoides contribuye a la cavidad nasal, el tabique y la pared medial de las órbitas; su lámina cribosa deja pasar fibras olfatorias.',
      curiosity:
        'Su nombre significa “semejante a un tamiz” por los orificios de la lámina cribosa.',
      articulations: [
        A('Frontal', 'Sutura frontoetmoidal'),
        A('Esfenoides', 'Base anterior del cráneo'),
        A('Vómer', 'Tabique nasal'),
        A('Nasal izquierdo', 'Techo de la cavidad nasal'),
        A('Nasal derecho', 'Techo de la cavidad nasal'),
        A('Maxilar izquierdo', 'Pared medial de la órbita'),
        A('Maxilar derecho', 'Pared medial de la órbita'),
        A('Lagrimal izquierdo', 'Pared medial de la órbita'),
        A('Lagrimal derecho', 'Pared medial de la órbita'),
        A('Palatino izquierdo', 'Cavidad nasal'),
        A('Palatino derecho', 'Cavidad nasal'),
        A('Cornete nasal inferior izquierdo', 'Pared lateral de la cavidad nasal'),
        A('Cornete nasal inferior derecho', 'Pared lateral de la cavidad nasal'),
      ],
    };
  if (/maxilla/.test(n))
    return {
      location: `Centro de la cara ${side}`,
      formation: baseFormation,
      fact: 'El maxilar sostiene los dientes superiores y participa en órbita, cavidad nasal, paladar duro y contorno facial.',
      curiosity: 'Contiene el seno maxilar, el mayor de los senos paranasales.',
      articulations: [],
    };
  if (/zygomatic/.test(n))
    return {
      location: `Prominencia de la mejilla ${side}`,
      formation: baseFormation,
      fact: 'El cigomático forma el pómulo, la pared lateral de la órbita y parte del arco cigomático.',
      curiosity: 'Transmite fuerzas masticatorias hacia el cráneo.',
      articulations: [
        A(S('Temporal'), 'Arco cigomático'),
        A(S('Maxilar'), 'Sutura cigomaticomaxilar'),
      ],
    };
  if (/vomer/.test(n))
    return {
      location: 'Línea media de la cavidad nasal',
      formation: baseFormation,
      fact: 'El vómer forma la porción posteroinferior del tabique nasal óseo y separa ambas fosas nasales.',
      curiosity: 'Es una lámina fina cuyo nombre alude a la reja de un arado.',
      articulations: [A('Esfenoides', 'Borde superior'), A('Etmoides', 'Tabique nasal')],
    };
  if (/nasal bone/.test(n))
    return {
      location: `Puente de la nariz ${side}`,
      formation: baseFormation,
      fact: 'El nasal es una pequeña lámina rectangular que forma la parte ósea del puente nasal y sostiene los cartílagos de la nariz.',
      curiosity:
        'Por su posición prominente es uno de los huesos faciales que se fractura con mayor frecuencia.',
      articulations: [
        A(`Nasal ${side === 'izquierdo' ? 'derecho' : 'izquierdo'}`, 'Sutura internasal'),
        A('Frontal', 'Sutura frontonasal'),
      ],
    };
  if (/lacrimal/.test(n))
    return {
      location: `Pared medial de la órbita ${side}`,
      formation: baseFormation,
      fact: 'El lagrimal es un hueso facial muy delgado que participa en la fosa del saco lagrimal y en el drenaje de las lágrimas hacia la cavidad nasal.',
      curiosity: 'Es el hueso más pequeño de la cara.',
      articulations: [A(S('Maxilar'), 'Conducto nasolagrimal'), A('Etmoides', 'Pared orbitaria')],
    };
  if (/palatine/.test(n))
    return {
      location: `Parte posterior del paladar duro y cavidad nasal ${side}`,
      formation: baseFormation,
      fact: 'El palatino tiene forma de L y contribuye al paladar duro, la cavidad nasal, la órbita y las fosas pterigopalatina y pterigoidea.',
      curiosity: 'Aunque es pequeño, participa en cuatro regiones anatómicas distintas.',
      articulations: [A(S('Maxilar'), 'Sutura palatina'), A('Esfenoides', 'Base del cráneo')],
    };
  if (/inferior nasal concha/.test(n))
    return {
      location: `Pared lateral de la cavidad nasal ${side}`,
      formation: baseFormation,
      fact: 'El cornete nasal inferior aumenta la superficie mucosa y genera turbulencia para calentar, humidificar y filtrar el aire inspirado.',
      curiosity: 'A diferencia de los cornetes superior y medio, es un hueso independiente.',
      articulations: [A(S('Maxilar'), 'Pared nasal'), A(S('Palatino'), 'Pared nasal')],
    };
  if (/sesamoid/.test(n)) {
    const foot = /foot/.test(n);
    return {
      location: `${foot ? 'Planta del pie' : 'Palma de la mano'} ${side}`,
      formation: 'Se desarrolla dentro de tendones sometidos a presión y fricción repetidas.',
      fact: `Los sesamoideos de ${foot ? 'pie' : 'mano'} protegen tendones, modifican su dirección y aumentan la ventaja mecánica cerca de las articulaciones.`,
      curiosity: 'Su número y tamaño pueden variar entre personas.',
      articulations: [],
    };
  }
  return {
    location: region,
    formation: baseFormation,
    fact: `${name} es una pieza individual de ${region.toLowerCase()}. Su forma y superficies están adaptadas a las cargas, inserciones y relaciones anatómicas de esa región.`,
    curiosity: 'La forma de cada hueso refleja las fuerzas mecánicas que recibe durante la vida.',
    articulations: [] as BoneLink[],
  };
}
export function createBoneRecord(mesh: THREE.Mesh, index: number): RenderedBone {
  const side = meshUserData(mesh).anatomicalSide || sideOf(mesh.name),
    name = spanishName(mesh.name, side),
    region = regionFor(mesh.name),
    profile = anatomyProfile(name, mesh.name, side, region);
  return {
    id: `bone-${index}-${mesh.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    latin: latinName(mesh.name),
    region,
    type: typeFor(mesh.name),
    location: profile.location,
    laterality: (side ? side[0]!.toUpperCase() + side.slice(1) : 'Impar') as BoneLaterality,
    formation: profile.formation,
    fact: profile.fact,
    curiosity: profile.curiosity,
    articulations: profile.articulations,
    joins: [],
    meshes: [mesh],
    focus: 0.5,
  };
}
