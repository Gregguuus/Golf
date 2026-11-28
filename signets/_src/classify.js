export const CATS = ["Jardin & plantes","Cuisine","Restos & bonnes adresses","Voyage & sorties","Livres, histoire & culture","Développement personnel","Couple & relations","Tech & IA","Sport & rugby","Golf","Montres & mode","Langues","Famille & enfants","Design & photo","Maison & bricolage","Humour","Actualité & société","Autre"];

const LEX = {
"Jardin & plantes":"jardin jardinage jardinier jardiniere potager potagere permaculture semis semer plantation planter rosier rosiers rose roses rosa fleur fleurs plante plantes arrosage arroser compost paillage repiquage floraison bouture bouturage vivace vivaces arbuste arbustes verger gardening garden gardener flowers plants seeds mainverte horticulture massif haie tonte pelouse engrais purin cottage austin davidaustin englishrose",
"Cuisine":"recette recettes ingredients ingredient cuisine cuisiner gateau gateaux patisserie dessert tiramisu brownie cookie cookies pates risotto soupe tarte quiche gratin salade sauce marinade four cuisson mijoter mijote saupoudrer cuillere cuilleres gramme grammes pate farine sucre beurre oeufs oeuf lait creme chocolat poulet boeuf saumon mangez cuisinez recipe recipes baking cooking pancakes pizza burger sandwich foodporn instafood homemade faitmaison cheflife toque",
"Restos & bonnes adresses":"restaurant restaurants resto restos bonneadresse bonnesadresses bonplan bonsplans brasserie bistrot bistro brunch parisfood parisfoodie parisfoodguide pariseats foodguide gastronomique gastronomie etoile michelin table reserver reservation menu carte chef bar cocktail rooftop adresse adresses epicerie boulangerie cafe coffeeshop restoparis restaurantparis bouffe manger terrasse",
"Voyage & sorties":"voyage voyages voyager escapade weekend week-end vacances hotel airbnb destination destinations avion vol visiter visite itineraire randonnee rando plage ile ski montagne travel traveling trip tourisme tourist musee exposition sortie sorties roadtrip camping glamping",
"Livres, histoire & culture":"podcasts cover album concert groupe rock jazz classique livre livres lecture lire roman romans bookstagram litterature auteur autrice editions poche poesie histoire historique patrimoine archive archives moyen-age antiquite egypte napoleon revolution guerre philosophie philosophe philo culture cinema film films serie series musique chanson chansons vinyle podcast documentaire musee peinture art artiste citation citations mots vocabulaire",
"Développement personnel":"motivation mindset developpement personnel confiance ensoi productivite habitudes objectifs objectif reussite succes discipline croissance growth growthmindset psychologie psychologue bienetre meditation stress anxiete emotions routine matinale habitude energie bonheur resilience epanouissement coaching coach entrepreneur entrepreneuriat business argent liberte",
"Couple & relations":"couple amour relation relations sexo sexualite sexologue intimite desir plaisir orgasme seduction rencontre ex rupture mariage celibataire attachement manipulation dispute viedecouple aidecouple sexotherapie flirt",
"Tech & IA":"ia chatgpt claude gemini openai gpt llm prompt prompts intelligence artificielle automatisation automatiser appli application apps iphone apple ios mac macbook android samsung logiciel logiciels opensource tech technologie technologies code coder developpeur programmation python javascript github web cybersecurite securite smartphone gadget gadgets drone fpv robot ordinateur pc windows linux",
"Sport & rugby":"psg marseille foot courir courez coureur coureurs garmin semi-marathon dossard parcours rugby xv xvdefrance top14 sixnations dupont football ligue champions tennis nadal sport sports running course trail trailrunning marathon utmb ironman triathlon athletisme musculation fitness entrainement cyclisme velo natation basket handball jo olympique competition match equipe",
"Golf":"golf golfeur golfeuse swing putt fairway green birdie driver fer handicap golfclub pga ryder",
"Montres & mode":"parka pull veste accessoires montre montres horlogerie horloger rolex omega seiko patek cartier audemars tudor tag heuer breitling casio watch watches costume costumes chemise chaussures sneakers mode style elegance masculine homme vetement vetements parfum parfums tenue outfit",
"Langues":"espagnol spanish anglais english learnspanish allemand italien japonais langue langues vocabulaire grammaire apprendre conjugaison traduction bilingue",
"Famille & enfants":"enfant enfants bebe bebes maman papa parent parents parentalite montessori ecole maternelle grossesse naissance famille ados adolescent",
"Design & photo":"design graphisme graphiste logo typographie typo mockup mockups branding ui ux figma photoshop illustrator canva photographie photography photo photographe retouche lightroom video montage cadrage creatif creation",
"Maison & bricolage":"maison deco decoration diy bricolage astuce astuces menage nettoyage nettoyer entretien rangement renovation travaux peinture meuble meubles amenagement wifi domotique electricite plomberie vinaigre bicarbonate",
"Humour":"humour humoriste drole blague blagues rire sketch parodie meme memes comedy lol mdr stand-up standup",
"Actualité & société":"canicule climatique ecologique newsletter actualite actualites politique politiques gouvernement macron elections election economie societe societal journalisme info infos media medias franceinter franceculture brut konbini debat ecologie climat sante science sciences medecine"
};

const EXTRA = {"Golf":"putter putters wedge wedges caddie caddy taylormade callaway titleist odyssey scotty backswing downswing chipping bunker greenfee golfers golflife golfaddict golfdrills golftips golfswing putting","Sport & rugby":"telefoot kop bleus nba basketball nfl f1 formule1 moto motogp cycliste cyclistes peloton tourdefrance roadbike bike vtt gravel diag diagonale  ultratrail arbitre joueur joueurs joueuse entraineur herrero rugbyman pilier melee ballon stade ligue1 liguedeschampions mbappe zidane padel boxe mma judo escalade crossfit yoga pilates gainage abdos pompes squat squats haltere halteres surf","Livres, histoire & culture":"bandeannonce bande-annonce trailer acteur actrice realisateur theatre opera orchestre violon piano chanteur chanteuse clip epoque medieval renaissance royaume biographie existentialisme existentialiste theologie religion spiritualite bible galerie sculpture architecture architecte monument chateau cathedrale eglise siecle siecles ecrivain ecrire ecriture poeme conte mythologie archeologie belmondo pagnol lindon","Développement personnel":"positif   cerveau reveil inspiration inspirant  stoicisme stoicien stoic hustle millionnaire millionaire richesse investir investissement finance bourse epargne entreprise freelance linkedin carriere recrutement salaire negociation leadership manager management charisme  perfectionnisme procrastination concentration  burnout therapie therapeute reussir","Couple & relations":"sperme fantasme fantasmes sexe sexy sexuel sexuelle sexuels sexuelles masturbation libido preliminaires jouissance erotique erotisme tantrique kamasutra caresses baiser baisers embrasser tendresse jalousie infidelite tromper tromperie ghosting situationship celibat copine copain divorce separation seduire dragueur draguer rencard fiancailles","Tech & IA":"keyboard clavier raccourci raccourcis excel powerpoint chrome safari outil outils notion obsidian vpn hacker hack tesla","Voyage & sorties":"disneyland disneylandparis disney parc parcs italie rome toscane siena sienne venise florence japon tokyo kyoto newyork nyc londres lisbonne portugal espagne barcelone madrid grece santorin croisiere bretagne normandie provence alpes corse maurice bali thailande maroc marrakech sejour sejours escale aeroport valise bagage bagages","Restos & bonnes adresses":"chifan sushi sushis dimsum kebab bubbletea glacier tartine tartines","Cuisine":"spaghetti spaghettis plat plats repas gouter smoothie matcha epices epice assaisonnement grille grillade barbecue bbq friture airfryer marmiton cuisinier miam delicieux delicieuse gourmand gourmande gourmandise savoureux bonappetit foodie food cheesecake crepes crepe gaufres gaufre ragout wok nouilles ramen vin vins sommelier caviste cepage cepages vignoble degustation whisky biere","Jardin & plantes":"rhododendron rhododendrons azalee azalees camelia magnolia hortensia hortensias lavande pivoine pivoines dahlia dahlias tulipe tulipes narcisse jonquille geranium orchidee orchidees succulente succulentes cactus monstera bonsai botanique botanical botany botaniste arbre arbres feuillage jungle serre bulbes bulbe graines graine greffe elagage cueillette recolte recoltes abeille abeilles pollinisateurs apiculture biodiversite","Maison & bricolage":"projecteur projector storage chambre salon rangements ikea leroymerlin castorama bricoleur isolation chauffage poele cheminee","Humour":"hilarant hilarante rigolo rigolade ptdr mdrr delire parodies caricature imitation imitations","Actualité & société":"sudradio emission invite invites invitee interview interviews reportage reportages journaliste journalistes lci bfm bfmtv cnews france2  telematin mediapart liberation lemonde figaro afp ukraine gaza israel trump justice tribunal proces polemique scandale greve retraites retraite impots inflation chomage depute senat assemblee ministre","Montres & mode":"bijoux bijou bague bracelet lunettes cravate costard blazer veston manteau jeans polo tshirt casquette maroquinerie portefeuille ceinture lacoste zara uniqlo dressing garderobe tendance tendances hautecouture chanel dior gucci vuitton hermes tailleur barbier barbe coiffure coiffeur","Design & photo":"cinematic cinematique cinematographie  filmer filmmaker tournage  blender interieur illustration illustrations illustrateur dessin dessins dessiner dessinateur aquarelle croquis sketchbook artwork couleurs   affiche affiches","Famille & enfants":"enfance jouet jouets lego bambin creche college lycee devoirs scolaire anniversaire","Langues":"polonais polish arabe chinois coreen portugais russe latin dialecte prononciation anglicismes orthographe faute fautes duolingo bilingual   fluent fluently"};
for (const c in EXTRA) LEX[c] += " " + EXTRA[c];
const DROP = ['watch', 'mode', 'style', 'green', 'driver', 'video', 'creation', 'montage'];
for (const c in LEX) LEX[c] = LEX[c].split(' ').filter(w => !DROP.includes(w)).join(' ');
const HINTS = {"Golf":["golf","putt"],"Sport & rugby":["rugby","foot","fitness","running","trail","tennis","basket","montel"],"Jardin & plantes":["jardin","botan","garden","plant","rosier","potager","flora","fleur","horti"],"Cuisine":["recette","cuisine","chef","food","miam","gourmand","patisserie","boulang"],"Restos & bonnes adresses":["resto","restaurant","bonneadresse","parisfood","foodguide","bistro"],"Voyage & sorties":["travel","voyage","wander"],"Livres, histoire & culture":["livre","book","histoire","cinema","culture","musee","philo","poesie"],"Développement personnel":["mindset","motivation","garyvee","growth","psycho"],"Couple & relations":["sexo","sexpli","couple","amour"],"Tech & IA":["chatgpt","openai","iphone","automat"],"Montres & mode":["watch","montre","horlog","fashion","outfit"],"Langues":["langue","english","espanol","spanish"],"Famille & enfants":["maman","parent","bebe","enfant","montessori"],"Design & photo":["design","photo","graphi"],"Maison & bricolage":["diy","bricol","maison","deco"],"Humour":["humo","comedy","drole","berrou","blague"],"Actualité & société":["actu","news","media"]};
export const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const WORDS = {};
for (const c in LEX) WORDS[c] = new Set(norm(LEX[c]).split(/\s+/).filter(Boolean));

export function scoreOf({ cap, user, name }) {
  const t = norm(cap).match(/[a-z0-9\-']+/g) || [];
  const tg = [...String(cap || '').matchAll(/#([\p{L}\p{N}_]+)/gu)].map(m => norm(m[1]));
  const ident = norm((user || '') + ' ' + (name || ''));
  const idt = ident.match(/[a-z0-9]+/g) || [];
  const sc = {};
  for (const c of CATS) {
    if (c === 'Autre') continue;
    const ws = WORDS[c];
    let n = 0;
    for (const w of t) {
      if (ws.has(w)) n++;
      else { const w2 = w.replace(/[sx]+$/, ''); if (w2.length > 3 && ws.has(w2)) n++; }
    }
    n = Math.min(n, 6);
    let h = 0;
    for (const x of tg) if (ws.has(x) || ws.has(x.replace(/s+$/, ''))) h++;
    let idn = 0;
    for (const w of ws) if (w.length >= 5 && ident.includes(w)) idn++;
    for (const w of idt) if (ws.has(w)) idn++;
    let hn = 0; for (const x of (HINTS[c] || [])) if (ident.includes(x)) { hn = 1; break; }
    sc[c] = n + 2 * Math.min(h, 4) + 2 * Math.min(idn, 3) + 3 * hn;
  }
  return sc;
}

// Catégorie de chaque post d'un même compte (lissage par compte)
export function decide(list) {
  const n = list.length, C = CATS.filter(c => c !== 'Autre');
  const avg = {};
  for (const c of C) avg[c] = list.reduce((a, s) => a + (s[c] || 0), 0) / n;
  const wgt = n > 1 ? (n >= 4 ? 1.6 : 1.0) : 0;
  const fin = list.map(s => {
    let best = 'Autre', bs = 0, sec = 0;
    for (const c of C) { const v = (s[c] || 0) + wgt * avg[c]; if (v > bs) { sec = bs; best = c; bs = v; } else if (v > sec) sec = v; }
    return (bs >= 1.5 || (bs >= 1 && bs - sec >= 1)) ? best : 'Autre';
  });
  const cnt = {};
  fin.forEach(c => { if (c !== 'Autre') cnt[c] = (cnt[c] || 0) + 1; });
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  return fin.map(c => (c === 'Autre' && top ? top[0] : c));
}

const MULTI = ["pomme de terre","patate douce","citron vert","noix de coco","haricot vert","petit pois","pois chiche","creme fraiche","huile d'olive","sirop d'erable","chou-fleur"];
const SINGLE = "tomate courgette aubergine poivron concombre carotte oignon echalote ail poireau champignon epinard salade roquette avocat citron orange clementine mandarine pomme poire banane fraise framboise myrtille cerise abricot nectarine melon pasteque raisin figue kiwi ananas mangue noix noisette amande pistache cacahuete chataigne potiron courge butternut betterave chou brocoli haricot pois lentille feve asperge radis navet panais celeri topinambour artichaut endive fenouil poulet boeuf veau porc agneau canard dinde jambon lard lardon bacon saucisse chorizo saumon thon cabillaud crevette steak oeuf lait beurre fromage mozzarella parmesan chevre feta comte emmental gruyere ricotta mascarpone yaourt farine sucre levure chocolat cacao vanille miel cannelle gingembre curry paprika cumin curcuma piment moutarde vinaigre pates spaghetti tagliatelle lasagne gnocchi riz semoule quinoa boulgour pain brioche tortilla speculoos basilic persil coriandre menthe thym romarin ciboulette estragon aneth sauge laurier tofu tahini houmous cornichon capre".split(' ');
const PATS = [...MULTI, ...SINGLE].sort((a, b) => b.length - a.length)
  .map(t => [t, new RegExp('(?<![a-z])' + t.replace(/[-']/g, m => '\\' + m) + '(?:s|x)?(?![a-z])')]);

export function ingredientsOf(cap) {
  let c = norm(cap); const out = [];
  for (const [t, p] of PATS) if (p.test(c)) { out.push(t); c = c.replace(p, ' '); }
  return out;
}

const TAB = [["pomme de terre","peah"],["noix de coco","peah"],["asperge","p"],["radis","p"],["petit pois","p"],["fraise","pe"],["rhubarbe","p"],["artichaut","pe"],["epinard","ph"],["feve","p"],["tomate","e"],["courgette","e"],["aubergine","e"],["poivron","e"],["concombre","e"],["melon","e"],["abricot","e"],["basilic","e"],["framboise","e"],["cerise","pe"],["haricot vert","e"],["pasteque","e"],["nectarine","e"],["potiron","ah"],["courge","ah"],["butternut","ah"],["champignon","ah"],["chataigne","a"],["noix","a"],["raisin","ea"],["pomme","ah"],["poire","ah"],["figue","ea"],["betterave","ah"],["brocoli","ah"],["chou","ah"],["poireau","ah"],["endive","h"],["mandarine","h"],["clementine","h"],["orange","h"],["citron","h"],["navet","ah"],["panais","ah"],["celeri","ah"],["topinambour","h"],["kiwi","h"],["carotte","peah"]];
const SN = { p: 'Printemps', e: 'Été', a: 'Automne', h: 'Hiver' };
export function seasonOf(ings) {
  const sc = { p: 0, e: 0, a: 0, h: 0 }; let n = 0;
  for (const i of ings) { const x = norm(i); const t = TAB.find(([k]) => x.includes(k)); if (t) { n++; for (const ch of t[1]) sc[ch]++; } }
  if (!n) return "Toute l'année";
  let ks = Object.keys(sc).filter(k => sc[k] === n);
  if (ks.length === 4) return "Toute l'année";
  if (!ks.length) { const m = Math.max(...Object.values(sc)); ks = Object.keys(sc).filter(k => sc[k] === m); }
  return SN[ks[0]];
}

export function recipeInfo(cap) {
  const g = ingredientsOf(cap);
  const words = /ingredient|recette|cuisson|preparation|etape/.test(norm(cap));
  if (g.length >= 2 || (words && g.length >= 1)) return { is: true, ings: g.slice(0, 14), season: seasonOf(g) };
  return { is: false, ings: [], season: '' };
}

export const snippetOf = cap => String(cap || '').replace(/#\S+|@\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 170);
export const tagsOf = cap => {
  const o = [];
  for (const m of String(cap || '').matchAll(/#([\p{L}\p{N}_]+)/gu)) {
    if (!o.some(x => x.toLowerCase() === m[1].toLowerCase())) o.push(m[1]);
    if (o.length === 3) break;
  }
  return o;
};
export const titleOf = cap => {
  for (const ln of String(cap || '').split('\n')) {
    const l = ln.replace(/#\S+|@\S+/g, '').replace(/[^\p{L}\p{N}\s'’,.:!?()\-&]/gu, '').trim().replace(/^[ .:\-]+|[ .:\-]+$/g, '');
    if (l.length > 3) return l.slice(0, 70);
  }
  return '';
};
