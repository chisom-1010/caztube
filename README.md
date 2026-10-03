# caZTube

Plateforme perso d'hébergement et lecture de vidéos (ex-Streamz).

- **`client/`** — frontend Next.js (conservé de l'ancien projet Streamz, juste renommé)
- **`backend/`** — nouveau backend Python/FastAPI, à construire, pensé pour tourner
  sur Cloudflare Python Workers (D1 + R2)

## Démarrage rapide

**Frontend**
```bash
cd client
bun install   # ou npm install
bun dev
```

**Backend**
```bash
cd backend
uv sync
uv run uvicorn src.main:app --reload
```

Voir `backend/README.md` pour le détail de ce qui reste à faire avant le déploiement.
