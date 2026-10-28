# Plan — Refonte multi-plateforme de blocklist-extension

> Doc interne de cadrage. Code + README restent en anglais ; ce plan est en français.
> Version du plan : 1.0 — statut : en attente de validation avant implémentation.

---

## 1. Contexte & objectif

`blocklist-extension` est un fork de `AntoninJuquel/instagram-blocklist-extension`
(extension Chrome Manifest V3 qui importe des listes d'utilisateurs Instagram et les
bloque en masse via l'API GraphQL interne d'Instagram).

On refond le projet en **extension de blocage multi-plateforme**, c'est-à-dire :

- bloquer des comptes sur **Instagram, X/Twitter, TikTok, Facebook, YouTube** ;
- sur YouTube, inclure **tous les blocages possibles** (chaînes **et** vidéos) ;
- un **catalogue de listes prêtes à l'emploi**, hébergé sur un site statique détenu
  par nous, avec un écran pour **choisir les listes** (popup **et** page Options) ;
- pouvoir **activer/désactiver** une liste importée sans la supprimer.

On garde le lien de fork (historique git + provenance) mais c'est un projet neuf :
nouvelle identité, nouvelle version, nouvelle architecture.

---

## 2. Décisions actées

| # | Sujet | Décision |
|---|-------|----------|
| 1 | Nom | `blocklist-extension` (package.json, manifest, README) |
| 2 | Version | repart en `0.1.0` (on ne continue pas le 0.0.5 du fork) |
| 3 | Fork | on garde le remote/historique pour la provenance, projet traité comme neuf |
| 4 | Licence | MIT conservée, attribution d'origine maintenue |
| 5 | Catalogue | JSON hébergé sur un site statique, domaine provisoire **`blocklist.lol`** |
| 6 | Périmètre catalogue | ne référence **que notre hôte** (JSON + .txt) pour l'instant |
| 7 | Import manuel URL | raw.githubusercontent.com / gist conservés (partage via GitHub) |
| 8 | `blockout.lol` | c'est **le site de Raj** (pas celui d'Antonin) ; les ajouts de listes pointeront ensuite vers **notre repo** |
| 9 | Fallback backend | géré **en silence** par l'extension (auto-détection + bascule), réglages experts dans Options |
| 10 | YouTube | scope **A** : block chaîne (commentaires + « don't recommend ») **et** « don't recommend » vidéo |
| 11 | Ordre plateformes | Instagram → X → Facebook → YouTube → TikTok (TikTok en dernier : le plus fragile) |

---

## 3. État actuel (ce qu'on refond)

Architecture : React 18 + Vite 5 + CRXJS (beta), TypeScript, Zustand, Tailwind +
shadcn/Radix, zod + react-hook-form. Trois contextes : Popup, Options, Background
(service worker).

Fragilités identifiées à traiter :

1. **`doc_id` GraphQL codés en dur** (`src/services/instagram.ts:4-14`) — identifiants
   internes Meta non documentés, qui tournent. C'est la fragilité n°1.
2. **Aucune vérification de la réponse** (`src/services/instagram.ts:84-89`) — le fetch
   ignore status/body : un blocage peut échouer (rate-limit, challenge) et l'utilisateur
   est quand même marqué `blocked=true`.
3. **Bug parser** : regex `name=[A-Za-z0-9]+` (`src/lib/blockList.ts:38`) ne capture ni
   `_` ni `.` → tronque les usernames (`john___squire` → `john`).
4. **Blocage un par un** alors que la mutation est `usePolarisBlockManyMutation`
   (`target_user_ids` est un tableau) → listes longues très lentes.
5. **Tout est câblé Instagram en dur** : `services/instagram.ts`, `manifest.config.ts:21`
   (`host_permissions: *://*.instagram.com/*`), `blockListBuilder.ts` (getUserId/getUserName
   hardcodés), `blockList.ts` (label mono-plateforme), `types.ts` (aucun concept de plateforme).
6. **Pas de catalogue** : seule référence = lien externe vers `blockout.lol`, import URL manuel.
7. **Import = blocage immédiat** : on ne peut pas « posséder » une liste sans bloquer.
8. **Service worker MV3** : un run long de blocage vit dans le handler de message
   (`background.ts`) et peut être tué par Chrome en cours de route.
9. **README trompeur** : dit « synced across browsers » alors que le code utilise
   `chrome.storage.local` (pas `sync`). `local` est le bon choix (quota), le texte est à corriger.
10. **Zéro test** : pas d'infra de test dans le projet.

---

## 4. Architecture cible

### 4.1 Abstraction plateforme (pattern stratégie)

La logique actuellement éparpillée (Instagram) est centralisée derrière deux interfaces.

```
PlatformId = "instagram" | "x" | "facebook" | "youtube" | "tiktok"
BackendId  = "api" | "dom"

BlockingResult { entryId: string; ok: boolean; error?: string }

BlockingBackend {
  id: BackendId
  checkConnection(): Promise<boolean>
  block(entries: BlockListEntry[], action: "block"|"unblock"): Promise<BlockingResult[]>
}

PlatformAdapter {
  id: PlatformId
  label: string
  hosts: string[]                 // host_permissions à accorder
  cookieDomain: string            // domaine de lecture des cookies de session
  parseUserLine(line): BlockListEntry | undefined
  exportUserLine(entry): string
  resolveTarget(url): Promise<{ id; name; kind } | null>   // pour le Builder
  backends: Partial<Record<BackendId, BlockingBackend>>
  defaultBackend: BackendId
}
```

Un registre `getPlatformAdapter(id)` + `listPlatformAdapters()`.

- **backend `api`** : appelle l'API interne du réseau (GraphQL/REST), **en batch**.
  C'est le backend de mass-block.
- **backend `dom`** : content script qui pilote le vrai bouton « Block » de l'UI du
  site (navigation + clic + confirmation). 1 cible à la fois. C'est le fallback de
  résilience et le « bloquer l'utilisateur courant ».

> Rappel important : les deux backends ne sont pas équivalents en scale. `api` = batch
> (mass-block viable), `dom` = un par un (heures sur une liste de 200). Le fallback
> silencieux couvre la résilience, pas la performance.

### 4.2 Moteur de blocage

- Le `Queue` (concurrency 1) reste dans le service worker.
- Résolution de l'adaptateur via `list.platform`.
- Choix du backend : forcé par l'option expert, sinon `defaultBackend` ; en cas d'échec
  répété de `api`, **bascule silencieuse** sur `dom` (si dispo), log de la bascule.
- `api` batche les entrées par chunks (`batchSize` optionnel).
- Résultat **par entrée** stocké (`entry.blocked` + `entry.error`), remonté à l'UI via
  `BLOCKLITS_UPDATED`. Plus de silences sur les erreurs.
- **Keepalive MV3** : découper les longs runs + heartbeat `chrome.alarms` (ou offscreen
  document) pour éviter la terminaison du service worker en cours de blocage.
- Délai entre requêtes **par plateforme** (chaque réseau a ses rate-limits).

### 4.3 Connexion par plateforme

`App.tsx` fait aujourd'hui un seul `checkUserConnection()` Instagram. On le remplace par
un statut **par plateforme** : indicateurs « connecté / non connecté », et avertissement
au moment de bloquer si la plateforme cible n'est pas connectée.

---

## 5. Modèle de données (final) + migration

### 5.1 Types

```
BlockListEntry {
  platform: PlatformId
  kind: "account" | "channel" | "video"   // account = IG/X/TikTok/FB
  id: string
  name: string
  blocked: boolean
  error?: string
}

BlockList {
  id: string                              // uuid
  platform: PlatformId
  kind: "account" | "channel" | "video"   // homogène au sein d'une liste
  entries: BlockListEntry[]               // (anciennement `users`)
  infos: {
    url?: string
    title?: string
    description?: string
    numEntries: number
    category?: string
    tags?: string[]
  }
  enabled: boolean                        // active/désactivée sans suppression
  source: {
    type: "catalog" | "url" | "file"
    catalogId?: string
    importedAt: string
    updatedAt?: string
  }
}
```

- `users` → `entries` (pour couvrir chaînes/vidéos YouTube).
- `kind` discrimine la nature de la cible. `account` pour les 4 réseaux sociaux,
  `channel` / `video` pour YouTube.
- `enabled` découple « posséder une liste » de « l'appliquer ».
- `source` trace la provenance (catalogue vs URL vs fichier).

### 5.2 Migration (rétro-compatible)

À `onInstalled` (ou au premier chargement), si le storage contient l'ancien format
`blockLists` (users[] sans platform), migrer :

- `users[]` → `entries[]`, chaque entrée : `platform="instagram"`, `kind="account"`,
  `error` absent.
- `BlockList` : `platform="instagram"`, `kind="account"`, `enabled=true`,
  `source={type:"url"|"file", importedAt: now}` (déduit de la présence de `infos.url`).

La migration ne doit jamais écraser une structure déjà migrée (versionner le storage :
clé `schemaVersion`).

---

## 6. Format de fichier (v2, rétro-compatible)

On garde le format existant et on généralise.

```
platform:instagram          # en-tête optionnel ; défaut = instagram (rétro-compat)
title:Titre de la liste
description:Description
instagramblocklist:id=12345678;name=username
```

Labels par plateforme (une liste = une plateforme, homogène) :

| Plateforme | Ligne d'entrée |
|------------|----------------|
| Instagram  | `instagramblocklist:id=…;name=…` (legacy, conservé) |
| X/Twitter  | `xblocklist:id=…;name=…` |
| Facebook   | `facebookblocklist:id=…;name=…` |
| TikTok     | `tiktokblocklist:id=…;name=…` |
| YouTube    | `youtubeblocklist:kind=channel;id=…;name=…` et `youtubeblocklist:kind=video;id=…;name=…` |

Corrections parser :
- Regex nom élargie à `[\w.-]+` (fix du bug underscore/point).
- Le parseur est désormais fourni par l'adaptateur (`parseUserLine` / `exportUserLine`),
  plus une regex générique unique.
- Export : `platform:…` en en-tête + lignes d'entrée du bon label.

---

## 7. Catalogue (schéma + hosting + sécurité)

### 7.1 Schéma v1 (validé côté extension avec zod)

```
{
  "version": 1,
  "updatedAt": "2024-05-20T00:00:00Z",
  "lists": [
    {
      "id": "blockout2024",
      "platform": "instagram",
      "kind": "account",                  // défaut "account" ; "channel"/"video" pour YouTube
      "title": "Blockout 2024",
      "description": "…",
      "category": "politics",             // optionnel
      "tags": ["gaza", "celebrity"],      // optionnel
      "url": "https://blocklist.lol/lists/blockout2024.txt",
      "numEntries": 205,
      "updatedAt": "2024-05-18T00:00:00Z"
    }
  ]
}
```

### 7.2 Comportement

- Fetch + parse + validation zod. Une entrée malformée est rejetée sans casser le catalogue.
- `version` du schéma pour évoluer sans casser les versions installées.
- Filtrage : on n'affiche que les listes dont la plateforme a un adaptateur installé.
- Cache : catalogue + timestamp en storage ; re-fetch si staleness (>1h) ou bouton
  « refresh ». En cas d'échec du fetch, on sert le dernier catalogue valide (offline).
- Les URLs `.txt` référencées doivent être sur l'**allowlist d'hôtes** (notre domaine ;
  raw.githubusercontent/gist réservés à l'import manuel). Pas de fetch arbitraire.

### 7.3 Hosting

- Domaine provisoire : `blocklist.lol` (catalogue JSON + `.txt`).
- `host_permissions` inclut `blocklist.lol` → fetch sans souci de CORS.
- `blockout.lol` = site de Raj, migré/pointé ensuite vers notre repo pour les ajouts.

---

## 8. UI — l'écran « choisir ses listes »

### 8.1 Popup (3 onglets)

- **Block Lists** : l'existant + toggle `enabled` par liste (activer/désactiver sans supprimer).
- **Discover** (nouveau) : catalogue compact — filtre par plateforme (chips), recherche,
  checkboxes, bouton « Import selected ». Reprend le chemin d'import URL existant.
- **Builder** : l'existant, généralisé multi-plateforme (extraction de la cible de l'onglet
  courant via `resolveTarget`).

### 8.2 Options (sections)

- **Options** : existant + nouveaux réglages (voir §10).
- **Catalog** (nouveau) : catalogue riche — filtres (plateforme, catégorie, tags), recherche,
  aperçu des entrées, détails, sélection en masse, toggle activer/désactiver.
- **Changelog / About** : existant (URLs mises à jour vers notre repo).

### 8.3 Code partagé

Popup et Options sont deux entrées React distinctes. Logique catalogue (store zustand,
fetch/parse/cache) + composants de carte/filtre partagés dans `src/`, consommés par les deux.
Le `enabled` est central : l'écran affiche l'état « importée+active / importée+désactivée /
non importée ».

---

## 9. Manifest & permissions

- **Identité** : `name`/`title`/`description`/`action.default_title` → blocklist-extension ;
  `homepage` → `blocklist.lol` (provisoire) ; `repository`/`bugs` → repo RajPorus19 (à confirmer).
- **version** : `0.1.0`.
- **permissions** : `cookies`, `storage`, `unlimitedStorage`, `tabs`, `activeTab`,
  + `scripting` (injection content-script à la demande) + `alarms` (keepalive MV3).
- **host_permissions** (union) : `blocklist.lol`, `*.instagram.com`, `x.com`+`*.x.com`,
  `twitter.com`+`*.twitter.com`, `*.tiktok.com`, `*.facebook.com`, `*.youtube.com`,
  + `raw.githubusercontent.com`/`gist.githubusercontent.com` (import manuel).
- **content_scripts** : injectés à la demande via `chrome.scripting` (backend `dom`),
  plutôt que statiques — moins invasif à l'install.

---

## 10. Options (extension des réglages)

- **Par plateforme** : `delayBetweenRequests`, `batchSize` (backend api),
  `backend` (`auto` | `api` | `dom`, défaut `auto`).
- **Global** : `catalogUrl` (défaut `blocklist.lol/catalog.json`), `catalogRefreshInterval`,
  `darkMode`, `autoUpdate`.
- Le mode `auto` gère le fallback en silence (comportement par défaut) ; les autres modes
  sont les réglages experts.

---

## 11. Plateformes — détail & ordre de chantier

| # | Plateforme | Backend api | Backend dom | Cible (kind) | Complexité |
|---|-----------|-------------|-------------|--------------|------------|
| 1 | Instagram | GraphQL `BlockMany` (existant, batch) | profil → ⋯ → Block → confirm | account | Faible (refactor) |
| 2 | X/Twitter | GraphQL `BlockMutation` (queryId + auth_token/ct0) | profil → ⋯ → Block → confirm | account | Moyenne |
| 3 | Facebook | GraphQL Meta (namespace ids distinct) | profil → ⋯ → Block | account | Moyenne |
| 4 | YouTube | Innertube (feedback tokens par item, fragile) | chaîne/vidéo → ⋯ → menu | channel + video | Élevée (scope A) |
| 5 | TikTok | API signée (X-Bogus/msToken) — quasi inutilisable | profil → ⋯ → Block (DOM obfusqué) | account | Très élevée |

Notes honnêtes :

- **YouTube** : « bloquer » = suppression de recommandation (masquer commentaires / « don't
  recommend channel » / « don't recommend video »), pas de rendu inaccessible/404. Le
  « don't recommend video » exige un `feedback_token` gratté par item → fragile, non
  mass-batchable. Scope A acté, mais coût de maintenance à prévoir.
- **TikTok** : l'API interne est signée (X-Bogus/msToken), maintenance constante. Le chemin
  réaliste est `dom`, avec un DOM obfusqué et anti-automation. Dernier dans l'ordre.
- **Builder** : chaque adaptateur fournit `resolveTarget` (Instagram `target_id`, X `rest_id`,
  etc.). Pas de graphe d'identité cross-plateforme en v1 (une liste = une plateforme).

---

## 12. Phases (découpage → PR)

### Phase 0 — Fondations / dé-risquer (sans changement de feature)
- Scaffold **Vitest** + premiers tests unitaires des parsers.
- Fix regex nom (`[\w.-]+`).
- Vérification des réponses `fetch` (status/body) + gestion d'erreurs.
- Correction README (« storage.local », pas de sync).

### Phase 1 — Abstraction plateforme + modèle
- `types.ts` : `PlatformId`, `kind`, `BlockListEntry`, `BlockList` enrichi.
- Dossier `services/platforms/` + registre ; adaptateur `instagram` (déplace la logique
  de `services/instagram.ts`).
- Refactor moteur (`blockList.ts`) : adaptateur, batch, résultats par entrée, fallback.
- Refactor `background.ts` + keepalive MV3 (`alarms`).
- Migration storage rétro-compatible (`schemaVersion`).
- Manifest : identité + host_permissions + permissions (`scripting`, `alarms`).
- Statut de connexion par plateforme (App.tsx).

### Phase 2 — Catalogue + écran de sélection
- Schéma catalogue (zod) + fetch/parse/cache dans le service worker.
- Store + composants partagés (`src/`).
- Onglet **Discover** (popup) + section **Catalog** (Options).
- Flag `enabled` câblé (UI + moteur ignore les listes désactivées).
- Allowlist d'hôtes + intégration `blocklist.lol`.

### Phase 3 — Adapter X/Twitter (api + dom) + `resolveTarget`.
### Phase 4 — Adapter Facebook.
### Phase 5 — Adapter YouTube (scope A : channel block + don't-recommend channel + video).
### Phase 6 — Adapter TikTok (dom-first).
### Phase 7 — Finitions : listing store, outillage de création du catalogue (côté Raj),
           éventuelle internationalisation (hors scope initial).

> Chaque phase = un ensemble de tâches testables, livrable en PRs successives, sans casser
> l'existant (migrations backward-compatible à chaque étape).

---

## 13. Tests & CI

- **Vitest** : tests unitaires des parsers (formats, bug nom), du parseur catalogue (zod),
  du moteur (fetch mocké), de la migration.
- Tests backends : `api` avec `fetch` mocké (vérifie doc_id/batch/erreurs), `dom` via
  fixtures de DOM.
- CI existante (`lint` + `build`) conservée, on ajoute `test`.

---

## 14. Points ouverts / hypothèses

1. **URL du repo** : `repository`/`bugs` → repo RajPorus19 à confirmer (nom exact du repo).
2. **`blockout.lol` → repo** : migration du site vers notre repo pour les ajouts de listes
   (timing à définir).
3. **Order TikTok/Facebook** : ordre IG → X → FB → YouTube → TikTok proposé (TikTok dernier).
   Ajustable.
4. **YouTube « don't recommend video »** : à valider en spike pendant la Phase 5 (fragilité
   des feedback tokens) ; si trop fragile, on livre channel d'abord et video ensuite.
5. **i18n** : hors scope initial, à discuter.
