# caZTube — Backend (Python / FastAPI)

Nouveau backend, écrit depuis zéro pour remplacer l'ancien backend Express/TypeScript.
Le frontend Next.js du projet d'origine est conservé tel quel dans `../client`.

## Stack

- **FastAPI** — framework API
- **Cloudflare D1** — base de données (SQLite à l'edge)
- **Cloudflare R2** — stockage vidéo
- **Cloudflare Python Workers** — hébergement du backend
- **Vercel** — hébergement du frontend (`../client`)

## Lancer en local

```bash
cd backend
uv sync
uv run uvicorn src.main:app --reload
```

Puis ouvre `http://localhost:8000/docs` pour tester les endpoints.

## État actuel

Tout le code est fonctionnel en local avec des bases de données **en mémoire** (les
stubs `_fake_users_db` / `_fake_videos_db` dans `routes/`) — ça permet de développer
et tester sans dépendre de Cloudflare tout de suite.

## Ce qu'il reste à faire avant un vrai déploiement

- [ ] `wrangler d1 create caztube-db`, puis coller le `database_id` dans `wrangler.toml`
- [ ] `wrangler d1 execute caztube-db --file=./schema.sql`
- [ ] Remplacer les stubs en mémoire dans `routes/auth.py`, `routes/users.py`,
      `routes/videos.py`, `routes/stream.py` par de vraies requêtes D1
- [ ] Hasher les mots de passe avec `passlib`/`bcrypt` (actuellement stockés en clair
      dans le stub — à ne jamais faire en prod)
- [ ] Émettre de vrais JWT avec `python-jose` dans `routes/auth.py`
- [ ] Créer le bucket R2 (`caztube-videos`) et générer de vraies URLs présignées
      dans `routes/videos.py` (`get_presigned_upload_url`) avec `boto3`
- [ ] Mettre à jour `allow_origins` dans `src/main.py` avec l'URL Vercel du frontend
- [ ] `wrangler deploy`

## Dossiers

```
backend/
├── src/main.py          # point d'entrée FastAPI
├── routes/               # auth, users, videos, stream
├── models/schemas.py     # modèles Pydantic
├── schema.sql             # schéma D1
├── wrangler.toml           # config de déploiement Cloudflare
└── pyproject.toml           # dépendances (gérées avec uv)
```
