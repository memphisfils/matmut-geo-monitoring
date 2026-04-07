# Types d alertes GEO Arctic

## Alertes deja supportees ou directement alignables

| Code | Type d alerte | Declencheur | Priorite | Canal cible | Action attendue |
| --- | --- | --- | --- | --- | --- |
| ALT-001 | Perte de premiere place | La marque perd le rang `#1` sur le classement principal | Haute | Slack, Email, Telegram | Verifier le prompt touche, analyser le concurrent leader, relancer le run |
| ALT-002 | Baisse de visibilite | Le score global ou le taux de mention baisse vs run precedent | Haute | Slack, Email | Revoir les contenus et les prompts en recul |
| ALT-003 | Resume hebdomadaire | Envoi planifie du digest de performance | Moyenne | Email, Slack | Lire la synthese et prioriser les actions de la semaine |
| ALT-004 | Test manuel de notification | Verification d un canal configure | Faible | Slack, Email, Telegram | Confirmer que la chaine de sortie fonctionne |

## Alertes produit recommandees

| Code | Type d alerte | Declencheur | Priorite | Canal cible | Action attendue |
| --- | --- | --- | --- | --- | --- |
| ALT-005 | Prompt strategique perdu | Une requete coeur passe de `marque citee` a `marque absente` | Haute | Slack, Email | Corriger le contenu associe et relancer l analyse |
| ALT-006 | Chute de position prompt | Le rang moyen d un prompt recule de `2` places ou plus | Haute | Slack | Ouvrir la vue `Requetes` et verifier les deltas par prompt |
| ALT-007 | Concurrence en hausse | Un concurrent gagne en mention ou en share of voice sur plusieurs prompts | Haute | Slack, Email | Identifier le concurrent et l angle de contenu gagnant |
| ALT-008 | Divergence inter modeles | Les modeles actifs ne convergent plus sur une meme requete | Moyenne | Slack | Comparer les reponses LLM et verifier les formulations |
| ALT-009 | Prompt fragile detecte | Le moteur detecte un prompt ambigü, trop large ou peu actionnable | Moyenne | Dashboard, Email | Corriger ou regenerer le prompt avant le prochain run |
| ALT-010 | Couverture benchmark incomplete | Le benchmark n a pas assez de concurrents ou de prompts actifs | Moyenne | Dashboard, Email | Completer le benchmark avant interpretation |
| ALT-011 | Canal de notification en echec | Un webhook, SMTP ou bot Telegram renvoie une erreur | Haute | Dashboard, Email secondaire | Corriger la configuration du canal |
| ALT-012 | Scheduler hors ligne | Le moteur d alertes ne tourne plus | Haute | Dashboard | Redemarrer le worker ou le processus de planification |

## Segmentation recommandee des alertes

| Segment | Objectif | Exemples |
| --- | --- | --- |
| Performance | Suivre les gains et pertes de visibilite | ALT-001, ALT-002, ALT-006, ALT-007 |
| Qualite moteur | Eviter les erreurs de mesure ou les prompts faibles | ALT-008, ALT-009, ALT-010 |
| Livraison | Garantir l envoi effectif des notifications | ALT-004, ALT-011, ALT-012 |
| Pilotage | Donner un rythme de lecture regulier | ALT-003 |

## Format recommande pour un message d alerte

1. Titre court : `Perte de premiere place - openai`
2. Variation : score, rang, mention, prompt touche
3. Contexte : modele, run compare, concurrent leader
4. Action : `ouvrir Requetes`, `ouvrir Benchmark`, `relancer analyse`
