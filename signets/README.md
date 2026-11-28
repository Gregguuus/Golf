# Signets

Mes signets Instagram (5 400+), hébergés gratuitement sur GitHub Pages.

- **Données chiffrées** (AES-256-GCM, dossier `data/`) : le dépôt est public mais seul le lien personnel (`#k=…`) permet de les lire. Le déchiffrement se fait dans le navigateur (`sg.js`).
- **Miniatures** : paquets WebP chiffrés par catégorie (`t-*.bin`), chargés à la demande. Les posts sans image ont une couverture dessinée.
- **Ajout d'un lien** : l'appli l'enregistre aussitôt sur l'appareil, puis crée une demande GitHub (« issue ») ; le workflow `add-signet` lit la page Instagram, classe le post, récupère la miniature et l'ajoute chiffré avec une clé publique RSA (`data/pub.pem`). Seul ton lien personnel déchiffre la clé privée (`data/rsa.bin`).
- Outils (carte des restos, menus, bilan…) : `outils.html`.
