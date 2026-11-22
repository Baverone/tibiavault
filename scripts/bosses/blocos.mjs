// Os blocos da rota dos bosses e quem vai em cada um (22/11/2026).
//
// Sai das duas pesquisas de 22/11 (data/bosses-fontes/solo.json e team.json):
// a rota diária do RP, o bloco «endgame a testar», o varrimento do Bosstiary por
// dia da semana e as 13 sessões de team. Um boss que não esteja aqui faz o
// gerador falhar com o nome — de propósito: um boss novo tem de ter um sítio.
//
// `minutos` é a estimativa do bloco inteiro (a pesquisa não tem fonte para os
// tempos); o gerador divide-a pelos bosses do bloco.

export const BLOCOS_SOLO = [
  // A rota de todos os dias (RP 1192; o Monk vê os mesmos, filtrados pelo nível).
  { id: 'd1', nome: 'Edron · Isle of Ada e Bounac', tipo: 'diario', minutos: 22, bosses: ['Court Warlock', 'Drume'] },
  { id: 'd2', nome: 'Cemitérios de Edron e Cormaya', tipo: 'diario', minutos: 17, bosses: ['Count Vlarkorth', 'Earl Osam'] },
  { id: 'd3', nome: 'Ingol', tipo: 'diario', minutos: 12, bosses: ['The Monster'] },
  {
    id: 'd4', nome: 'Farmine · Falcon Bastion', tipo: 'diario', minutos: 12,
    bosses: ['Grand Canon Dominus', 'Grand Chaplain Gaunder', 'Grand Commander Soeren', 'Preceptor Lazare', 'Grand Master Oberon'],
  },
  {
    id: 'd5', nome: 'Ankrahmun · Cobra Bastion', tipo: 'diario', minutos: 12,
    bosses: ['Custodian', 'Gaffir', 'Guard Captain Quaid', 'Scarlett Etzel'],
  },
  { id: 'd6', nome: 'Port Hope · Iksupan', tipo: 'diario', minutos: 17, bosses: ['Mitmah Vanguard', 'Ahau', 'Atab'] },
  { id: 'd7', nome: 'Marapur', tipo: 'diario', minutos: 18, bosses: ['The Moonsnow Magnolia', 'Timira the Many-Headed'] },
  {
    id: 'd8', nome: 'Kazordoon · Warzones 4–6', tipo: 'diario', minutos: 25,
    bosses: ['The Baron from Below', 'The Count of the Core', 'The Duke of the Depths', 'Ancient Spawn of Morgathla'],
  },
  // Testar uma vez (a 0 taints) antes de contar com eles.
  {
    id: 'endgame', nome: 'Endgame a testar', tipo: 'endgame', minutos: null,
    bosses: [
      "Goshnar's Spite", "Goshnar's Malice", "Goshnar's Hatred", "Goshnar's Cruelty", "Goshnar's Greed",
      'Murcion', 'Ichgahal', 'Chagorz', 'Vemiath',
      'The Brainstealer', 'Magma Bubble', 'Arbaziloth', 'The Rootkraken',
      'Adventurer Group', 'Eldritch Dragon Lord', 'Ice Horror', 'The Gravedigger', 'Bone Overlord',
    ],
    minutosPorBoss: { "Goshnar's": 30, Murcion: 45, Ichgahal: 45, Chagorz: 45, Vemiath: 45 },
  },
  // Cada 2 dias (44 h): aparece todos os dias e o cooldown decide.
  {
    id: 'f44', nome: 'Ferumbras · selos (cada 2 dias)', tipo: 'semana', minutos: 60,
    bosses: ['Plagirath', 'Ragiaz', 'Razzagorn', 'Shulgrax', 'Tarbaz', 'Zamulosh', 'Mazoran'],
  },
  // O varrimento do Bosstiary, um bloco por dia (dia de Tibia, 0 = domingo).
  {
    id: 'seg', nome: 'Segunda · Darashia e Thais', tipo: 'semana', diaSemana: 1, minutos: 60,
    bosses: [
      'Katex Blood Tongue', 'Srezz Yellow Eyes', 'Utua Stone Sting', 'Yirkas Blue Scales', 'Sir Baeloc', 'Sir Nictros',
      'The Sandking', 'Duke Krule', 'Lord Retro', 'The False God', 'The Souldespoiler', 'Bibby Bloodbath',
      'Ushuriel', 'Zugurosh', 'Madareth', 'Latrivan', 'Golgordan', 'Annihilon', 'Hellgorak',
    ],
  },
  {
    id: 'ter', nome: 'Terça · Carlin, Ab’Dendriel, Zao e Forgotten Knowledge', tipo: 'semana', diaSemana: 2, minutos: 60,
    bosses: [
      'Lord Azaram', 'Essence of Malice', 'Ravenous Hunger', 'Lloyd', 'Lady Tenebris', 'The Enraged Thorn Knight',
      'The Time Guardian', 'Melting Frozen Horror', 'Soul of Dragonking Zyrtarch', 'Dragon Pack', 'Raging Mage',
    ],
  },
  {
    id: 'qua', nome: 'Quarta · Venore, Liberty Bay e Yalahar', tipo: 'semana', diaSemana: 3, minutos: 60,
    bosses: [
      'Irgix the Flimsy', 'Unaz the Mean', 'Vok the Freakish', 'Brain Head', 'Blight Mariner', 'Ekatrix',
      'Tropical Desolator', 'Wrathful Archivist', 'Vladrukh', 'Brokul',
    ],
  },
  {
    id: 'qui', nome: 'Quinta · Issavi', tipo: 'semana', diaSemana: 4, minutos: 60,
    bosses: [
      'Amenef the Burning', 'Sister Hetai', 'Neferi the Spy', 'Urmahlullu the Weakened', 'Bragrumol', 'Xogixath',
      'Mozradek', 'Enusat the Onyx Wing', "Tentugly's Head", 'Ratmiral Blackwhiskers', 'The Unwelcome',
      'The Dread Maiden', 'The Fear Feaster', 'Thaian',
    ],
  },
  {
    id: 'sex', nome: 'Sexta · Kazordoon e Otherworld', tipo: 'semana', diaSemana: 5, minutos: 60,
    bosses: ['Deathstrike', 'Gnomevil', 'Abyssador', 'The Mega Magmaoid', 'Anomaly', 'Outburst', 'Eradicator', 'Realityquake', 'Rupture'],
  },
  {
    id: 'sab', nome: 'Sábado · Feyrist, Roshamuul, Port Hope e Ankrahmun', tipo: 'semana', diaSemana: 6, minutos: 60,
    bosses: [
      'Alptramun', 'Malofur Mangrinder', 'Maxxenius', 'Plagueroot', 'Izcandar the Banished', 'Faceless Bane',
      'The Source of Corruption', 'Kroazur', 'The Flaming Orchid', 'The Moonlight Aster', 'The Winter Bloom',
      'The Blazing Rose', 'The Diamond Blossom', 'The Lily of Night', 'Kusuma',
      'Ashmunrah', 'Dipthrah', 'Mahrdis', 'Morguthis', 'Omruc', 'Rahemos', 'Thalas', 'Vashresamun', 'Rakesh Moonfang',
    ],
  },
  {
    id: 'dom', nome: 'Domingo · Edron e Oramond', tipo: 'semana', diaSemana: 0, minutos: 60,
    bosses: [
      'Inkwing', 'Sir Leonard', 'Gralvalon', 'Malvaroth', 'Twisterror', 'Megasylvan Yselda', 'The Unarmored Voidborn',
      'Adlerauge', 'Clavius', 'Michael the Stalwart', 'Overseer Osverger',
      'Bloodback', 'Darkfang', 'Sharpclaw', 'Black Vixen', 'Shadowpelt', 'Lord of the Elements',
      'Glooth Fairy', 'Bullwark', 'Lisa', 'Deep Terror', 'Professor Maxxen',
    ],
  },
];

export const BLOCOS_TEAM = [
  { id: 't1', nome: 'Drefia · Rotten Blood', bosses: ['Murcion', 'Vemiath', 'Chagorz', 'Ichgahal', 'Bakragore'] },
  { id: 't2', nome: 'Thalassara · Make Believe', bosses: ['Mimar Haffar', 'Maior Domus', 'Phosphorus'] },
  {
    id: 't3', nome: 'Zarganash · Soul War e Feaster of Souls',
    bosses: [
      "Goshnar's Hatred", "Goshnar's Spite", "Goshnar's Malice", "Goshnar's Cruelty", "Goshnar's Greed", "Goshnar's Megalomania",
      'The Unwelcome', 'The Dread Maiden', 'The Fear Feaster', 'Brain Head', 'Thaian', 'The Pale Worm',
    ],
  },
  {
    id: 't4', nome: 'Dia dos gnomos · Kazordoon',
    bosses: [
      'Deathstrike', 'Gnomevil', 'Abyssador', 'The Baron from Below', 'The Count of the Core', 'The Duke of the Depths',
      'Ancient Spawn of Morgathla', 'The Brainstealer', 'The Mega Magmaoid', 'Magma Bubble', 'The Primal Menace', 'Dragon Pack',
    ],
  },
  { id: 't5', nome: 'Edron · Azzilon, Podzilla e Isle of Ada', bosses: ['Arbaziloth', 'The Rootkraken', 'Vladrukh', 'Court Warlock', 'Rotrender', 'Morshabaal'] },
  { id: 't6', nome: 'Grave Danger', bosses: ['Count Vlarkorth', 'Earl Osam', 'Lord Azaram', 'Sir Baeloc', 'Sir Nictros', 'Duke Krule', 'King Zelos'] },
  {
    id: 't7', nome: "Darashia · Ferumbras' Ascension",
    bosses: ['Plagirath', 'Ragiaz', 'Razzagorn', 'Shulgrax', 'Tarbaz', 'Zamulosh', 'Mazoran', 'The Lord of the Lice', 'The Shatterer', 'Ferumbras Mortal Shell'],
  },
  { id: 't8', nome: 'Otherworld · Heart of Destruction', bosses: ['Anomaly', 'Realityquake', 'Rupture', 'Outburst', 'Eradicator', 'World Devourer'] },
  {
    id: 't9', nome: 'Halls of Hope · Forgotten Knowledge',
    bosses: ['Lady Tenebris', 'The Time Guardian', 'Melting Frozen Horror', 'Soul of Dragonking Zyrtarch', 'The Enraged Thorn Knight', 'Lloyd', 'The Last Lore Keeper'],
  },
  { id: 't10', nome: 'Secret Library', bosses: ['Lokathmor', 'Mazzinor', 'Ghulosh', 'Gorzindel', 'The Scourge of Oblivion', 'Grand Master Oberon', 'Brokul'] },
  {
    id: 't11', nome: 'Dream Courts',
    bosses: ['Alptramun', 'Izcandar the Banished', 'Malofur Mangrinder', 'Maxxenius', 'Plagueroot', 'The Nightmare Beast', 'Faceless Bane'],
  },
  {
    id: 't12', nome: 'Cults of Tibia',
    bosses: ['Essence of Malice', 'The False God', 'The Souldespoiler', 'The Unarmored Voidborn', 'The Sandking', 'Ravenous Hunger', 'Leiden', 'The Source of Corruption'],
  },
  {
    id: 't13', nome: 'Especiais semanais e outros',
    bosses: [
      'Lizard Gate Guardian', 'Lord of the Elements', 'Urmahlullu the Weakened', 'Drume', 'Timira the Many-Headed', 'Ratmiral Blackwhiskers',
      'Adventurer Group', 'Eldritch Dragon Lord', 'Ice Horror', 'The Gravedigger', 'Bone Overlord', 'The Monster',
      "Gaz'haragoth", 'Ferumbras', 'Omrafir',
    ],
  },
];

/** Nomes da pesquisa de team que são o mesmo boss da solo (ou dois bosses). */
export const ALIASES_TEAM = {
  'Phosphorus (Final)': ['Phosphorus'],
  'Dragon Pack (Dragon Hoard)': ['Dragon Pack'],
  'Sir Baeloc & Sir Nictros': ['Sir Baeloc', 'Sir Nictros'],
};
