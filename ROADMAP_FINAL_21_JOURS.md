# Roadmap Final Produit GEO Arctic

Date de reference: 7 avril 2026  
Horizon: 21 jours maximum  
Objectif: passer du prototype avance actuel a une plateforme GEO exploitable par de vrais utilisateurs, avec produit coherent, backend fiable, alertes credibles, rapports propres et deploiement test puis production.

## Cadre

- Le deploiement de test peut etre termine en 1 a 2 jours(je suis en train de deployer sur render pour vous envoyer le lien), mais il ne clot pas le chantier.
- Le vrai objectif est un produit fini, stable, credible et presentable.
- Le planning ci-dessous suppose un travail continu, sans refaire l’architecture a zero.
- Priorite absolue:
  - neutralite du moteur d’analyse,
  - lisibilite produit,
  - isolation utilisateur/projet,
  - fiabilite backend,
  - experience utilisateur propre de la landing jusqu’au rapport.

## Etat actuel

Deja en place:
- auth formulaire + Google structuree
- session utilisateur et projets lies au compte
- onboarding modal
- benchmark, requetes, alertes, rapports, tendances, sentiment, LLM, dashboard refondus en partie
- Docker + CI/CD de base
- preferences alertes par projet/utilisateur
- chiffrement des reglages alertes en base
- catalogues alertes/rapports integres

Encore insuffisant:
- dashboard trop positif par defaut
- biais potentiel du moteur benchmark / brand-first
- onboarding encore a simplifier visuellement et fonctionnellement
- system prompt et prompts metier a durcir davantage
- rapports PDF a industrialiser
- alertes encore insuffisamment personnalisees cote UI
- securite/deploiement reel a terminer
- manque de tests end-to-end et de validations produit reelles

## Definition du fini

Le produit est considere fini quand:
- un utilisateur peut arriver sur la landing, creer un compte, lancer une analyse, suivre ses projets, recevoir une alerte et exporter un rapport sans rupture de flux
- le moteur ne favorise pas artificiellement la marque analysee
- le dashboard montre d’abord les risques, puis les points forts
- les benchmarks et prompts sont compréhensibles et defensables
- les rapports PDF/HTML/JSON sont utiles pour un client ou une equipe interne
- les alertes sont configurables par projet et par utilisateur
- le deploiement test puis production est stable

---

## Semaine 1

### Jour 1
Objectif: verrouiller le socle produit et le deploiement test.

- finaliser le deploiement de test
- verifier variables d’environnement backend/frontend
- verifier login, session, restauration projet, logout
- verifier export HTML/JSON/PDF fallback
- verifier benchmark, requetes, alertes et onboarding en environnement deploye
- ouvrir une check-list de bugs bloquants constates en test reel

Livrables:
- plateforme test deployee
- liste de bugs de recette
- environnement de test stable

### Jour 2
Objectif: corriger les bugs critiques remontes par le test deploye.

- corriger les bugs d’UI bloquants
- corriger les bugs de session/cookies/CORS si presents
- corriger les erreurs d’onboarding modal, scroll et fermeture
- corriger les erreurs d’API les plus visibles
- verifier compatibilite Chrome/Edge/Firefox

Livrables:
- build test stable
- zero bug bloquant sur le parcours principal

### Jour 3
Objectif: refaire la lecture du dashboard dans le bon ordre.

- afficher les risques prioritaires avant les KPI positifs
- ajouter une zone `Fragilites du benchmark`
- ajouter un signal `biais potentiel`
- remonter les points faibles avant les recommandations et les points forts
- rendre l’evolution visible sans masquer les problemes du snapshot courant

Livrables:
- dashboard oriente decision
- lecture `risques -> actions -> evolution -> forces`

### Jour 4
Objectif: durcir le moteur d’analyse contre les biais.

- revoir le system prompt global
- distinguer prompts neutres, prompts comparatifs et prompts brand-first
- ajouter un score de neutralite du benchmark
- detecter les runs suspects: marque toujours en tete, couverture concurrentielle trop faible, mono-modele trop interprete
- remonter ces diagnostics dans `/api/metrics` et `/api/prompts/compare`

Livrables:
- moteur plus neutre
- diagnostic de biais exploitable dans le produit

### Jour 5
Objectif: refaire l’etape prompts dans l’onboarding.

- lister tous les prompts generes
- permettre suppression, edition et ajout manuel
- montrer le type de prompt: neutre, comparatif, marque, fragile
- afficher les prompts a risque avant lancement
- supprimer tout habillage inutile restant dans l’onboarding

Livrables:
- onboarding recentre sur la vraie valeur
- prompts pilotables avant run

### Jour 6
Objectif: rendre `Requetes` totalement operable.

- montrer chaque prompt comme une ligne dense, pas une grosse carte
- afficher rang courant, delta, mention, position, pression concurrente
- afficher `stable`, `hausse`, `baisse`, `a verifier`
- rendre visible la derniere synchro reelle
- clarifier le panneau de detail a droite

Livrables:
- mode preuve credible
- lecture prompt par prompt exploitable

### Jour 7
Objectif: consolider la semaine 1.

- revue fonctionnelle complete
- correction des incoherences de wording
- correction des deltas rouge/vert
- verification mobile/tablette minimale
- ecriture de tests complementaires backend/frontend sur les flux corriges

Livrables:
- version `v-test-stable`
- base solide avant semaine 2

---

## Semaine 2

### Jour 8
Objectif: pousser `Benchmarks` au niveau produit final.

- lecture immediate du benchmark courant
- modal propre pour lancer un autre benchmark
- meilleure visualisation des ecarts entre marques
- mise en avant des marques qui montent/baissent
- distinction entre benchmark principal et benchmark temporaire

Livrables:
- benchmark lisible des l’ouverture
- benchmark alternatif via modal

### Jour 9
Objectif: finir `Alertes` cote produit.

- interface d’activation/desactivation des regles
- gestion des canaux par projet
- statut clair des canaux: configure, actif, inactif, erreur
- simulation de notification
- historique des alertes emises

Livrables:
- alertes exploitables par utilisateur/projet
- feed d’alerte plus credibile

### Jour 10
Objectif: industrialiser les rapports.

- finaliser les types de rapport
- brancher le `report_type` cote frontend
- distinguer rapport executive, benchmark, prompt analysis, incident report
- verifier catalogue rapport dans le produit
- preparer PDF final avec pagination et mise en page coherente

Livrables:
- onglet rapports complet
- rapports differencies par usage

### Jour 11
Objectif: finir le pipeline PDF.

- installer et valider `WeasyPrint` sur environnement cible de test
- verifier export PDF reel sans fallback HTML
- corriger les styles PDF
- verifier logos, sections, tableaux et insights
- produire 3 PDF de validation

Livrables:
- export PDF reel fonctionnel
- gabarits PDF presentables

### Jour 12
Objectif: reprendre `Tendances`, `Sentiment`, `Intentions`, `LLM`.

- clarifier les noms et la logique des onglets
- relier tendances aux vrais runs et pas seulement au dernier snapshot
- clarifier la lecture sentiment: ton, risques, recommandations
- clarifier la lecture LLM: accord, divergence, confiance
- clarifier intentions: categories utiles et prompt clusters

Livrables:
- onglets analytiques coherents
- moins d’abstraction decorative

### Jour 13
Objectif: renforcer la fiabilite du backend analytique.

- auditer calcul des KPI
- verifier classement, mention, part de voix, position, top of mind
- verifier historique et restoration des donnees par projet
- detecter les calculs trop favorables ou trop faibles
- ajouter tests de coherence metier

Livrables:
- KPI plus defensables
- backend analytique plus fiable

### Jour 14
Objectif: consolider la semaine 2.

- recette complete sur 3 a 5 marques reelles
- verifier comportement avec differents secteurs
- verifier `Autres` dans les secteurs
- corriger derniers bugs backend/frontend de la semaine
- mettre a jour documentation produit et exploitation

Livrables:
- version `v-beta-produit`

---

## Semaine 3

### Jour 15
Objectif: securite et multi-utilisateur reel.

- revoir cookies, CORS, secrets, politique session
- verifier isolation stricte user/project/export/alertes
- verrouiller endpoints sensibles
- verifier stockage des secrets d’alertes
- verifier posture de prod avec vrai trafic

Livrables:
- backend pret pour utilisateurs reels

### Jour 16
Objectif: performance et stabilite.

- verifier taille bundle frontend
- optimiser les chargements les plus lourds
- ajouter cache utile et invalidation propre
- verifier requetes trop frequentes
- verifier polling et synchro visuelle

Livrables:
- interface plus fluide
- moins de charge inutile

### Jour 17
Objectif: QA produit end-to-end.

- tests de parcours complets
- tests login -> projet -> analyse -> dashboard -> alertes -> export
- tests Google login si credentials disponibles
- tests de non-regression majeurs
- checklist complete de livraison

Livrables:
- suite de verification produit
- reduction du risque de regression

### Jour 18
Objectif: polish final frontend.

- derniers ajustements landing page
- dernier ajustement onboarding modal
- cohérence navbar/sidebar
- nettoyage des etats vides, toasts, focus, hover, menus
- relecture responsive fine

Livrables:
- produit visuellement fini

### Jour 19
Objectif: pre-production.

- configurer environnement de preprod/prod
- verifier base cible
- verifier generation PDF
- verifier livraison alertes reelles
- preparer rollback minimal

Livrables:
- environnement pret a ouvrir a de vrais utilisateurs pilotes

### Jour 20
Objectif: lancement pilote.

- ouvrir le produit a un petit nombre d’utilisateurs
- suivre bugs critiques, feedback, comprehension, friction onboarding
- verifier rapports et alertes en situation reelle
- corriger rapidement les regressions bloquantes

Livrables:
- pilote reel en cours
- feedback utilisateur exploitable

### Jour 21
Objectif: cloture du chantier principal et plan post-lancement.

- corriger les derniers points critiques pilotes
- finaliser documentation produit, exploitation et support
- preparer backlog `v2`
- figer une version stable

Livrables:
- version production stable
- backlog post-lancement priorise

---

## Priorites transverses a respecter tous les jours

### Produit
- toujours montrer d’abord le risque, puis l’action, puis la performance
- ne pas masquer les limites de lecture
- ne pas sur-vendre un resultat si le benchmark est fragile

### Backend
- aucune fuite de donnees entre utilisateurs/projets
- aucune logique `global snapshot` implicite pour les flux prives
- toujours exposer assez de metadata pour que le frontend explique ce qu’il montre

### Prompt engine
- prompts neutres avant prompts orientes marque
- signaler les prompts fragiles
- separer clairement generation, reparation, execution, interpretation

### UI/UX
- moins de cartes inutiles
- plus de densite utile
- scroll, focus, modal, dropdown, sticky etats toujours propres
- deltas verts/rouges coherents et justifies

### QA
- chaque gros chantier se clot par:
  - build frontend
  - lint frontend cible
  - tests backend
  - recette manuelle du flux touche

---

## Ordre recommande si on doit compresser en 14 jours

Si le delai doit etre ramene a 14 jours:

1. Jours 1-2: deploiement test + correctifs bloquants  
2. Jours 3-5: dashboard risques + neutralite moteur + onboarding prompts  
3. Jours 6-8: requetes + benchmark + alertes  
4. Jours 9-10: rapports + PDF reel  
5. Jours 11-12: tendances/sentiment/LLM/intentions  
6. Jours 13-14: securite, QA, preprod

---

## Livrables finaux attendus

- produit frontend coherent de la landing au logout
- backend stable, securise et multi-utilisateur
- moteur de prompts et benchmark defensables
- alertes par projet/utilisateur
- rapports differencies et export PDF reel
- deploiement test puis prod
- documentation de fonctionnement

## Regle de pilotage

On ne passe pas au chantier suivant tant que le chantier courant n’est pas:
- visuellement propre
- logiquement coherent
- teste au minimum
- defensable en demonstration produit
