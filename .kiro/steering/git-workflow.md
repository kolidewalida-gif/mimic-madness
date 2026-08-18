# Workflow git de ce projet

## Pousser sur main

Sur ce dépôt, le travail va **directement sur `main`**. C'est la consigne du
propriétaire du dépôt : pas de branche de feature, pas de pull request.

À la fin d'une tâche qui modifie des fichiers :

1. Indexer les fichiers concernés nommément (jamais `git add -A` ni `git add .`).
2. Commiter avec un message en français, à l'impératif ou au participe passé,
   comme le reste de l'historique.
3. `git push origin main`.

Ne pas demander confirmation pour ce push : il est déjà autorisé ici.

## Environnement

- `git` n'est pas dans le `PATH` des nouveaux shells. Le préfixer par :
  ```powershell
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  ```
- Le dépôt n'a pas de `user.name` / `user.email` configurés et il ne faut pas
  toucher à la config git. Signer les commits via les variables
  d'environnement, avec l'identité déjà présente dans l'historique :
  ```powershell
  $env:GIT_AUTHOR_NAME = "Kiro Agent"
  $env:GIT_AUTHOR_EMAIL = "244629292+kiro-agent@users.noreply.github.com"
  $env:GIT_COMMITTER_NAME = $env:GIT_AUTHOR_NAME
  $env:GIT_COMMITTER_EMAIL = $env:GIT_AUTHOR_EMAIL
  ```

## Ne jamais commiter

- `.env` est déjà suivi par le dépôt (hérité) mais ne doit **jamais** être
  modifié ni re-commité, il contient les clés Supabase.
- `supabase/functions/mcp/index.ts` est un bundle généré. Le plugin
  `@lovable.dev/mcp-js` le **corrompt à chaque `npm run dev` / `npm run build`
  sous Windows** : il remplace les 220 lignes bundlées par un stub contenant un
  import en chemin absolu Windows. Toujours le restaurer avant de commiter :
  ```powershell
  git checkout -- supabase/functions/mcp/index.ts
  ```
- `dist/` : supprimer le dossier après une vérification de build.

## Vérifier avant de pousser

```powershell
npx tsc --noEmit -p tsconfig.app.json   # doit sortir 0
npm run test                            # 268 tests
npm run build                           # doit sortir 0
```

`npm run lint` échoue avec ~212 erreurs préexistantes (surtout
`no-explicit-any`). Ce n'est pas une régression : ne pas le traiter comme un
bloqueur, mais ne pas en ajouter non plus.
