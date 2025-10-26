# 🚨 Guide de dépannage déploiement

## Problème : Les modifications n'apparaissent pas en production

### ✅ Étapes de diagnostic

#### 1. Vérifier que le workflow GitHub Actions s'est exécuté

Sur GitHub :
1. Va sur ton repository
2. Clique sur l'onglet **Actions**
3. Vérifie qu'un workflow "Deploy to GitHub Pages" s'est lancé après ton dernier push
4. Si le workflow n'apparaît pas ou est en erreur, note l'erreur

#### 2. Vérifier la branche de déploiement

1. Va dans **Settings** > **Pages** sur GitHub
2. Vérifie que la source est bien : **Branch: gh-pages** / **/ (root)**
3. Note l'URL de ton site

#### 3. Forcer un nouveau déploiement

##### Option A : Depuis GitHub (recommandé)
1. Va sur l'onglet **Actions**
2. Sélectionne le workflow "Deploy to GitHub Pages"
3. Clique sur **Run workflow** (bouton à droite)
4. Sélectionne la branche `main`
5. Clique sur **Run workflow**

##### Option B : Depuis ton ordinateur
```bash
# Créer un commit vide pour forcer le déploiement
git commit --allow-empty -m "Force redeploy"
git push origin main
```

#### 4. Vider le cache du navigateur

Même si le déploiement réussit, le navigateur peut garder l'ancienne version en cache.

##### Chrome / Edge
1. Ouvre les DevTools (F12)
2. Clique droit sur le bouton Refresh
3. Sélectionne **"Empty Cache and Hard Reload"**

##### Firefox
1. Ctrl + Shift + R (Windows/Linux)
2. Cmd + Shift + R (Mac)

##### Safari
1. Cmd + Option + E (vider le cache)
2. Cmd + R (recharger)

#### 5. Tester en navigation privée

Ouvre ton application dans une fenêtre de navigation privée pour être sûr que ce n'est pas un problème de cache local.

---

## 🔧 Solutions aux problèmes courants

### Workflow ne se déclenche pas
- ✅ Vérifie que tu as bien push sur la branche `main`
- ✅ Vérifie que le fichier `.github/workflows/deploy.yml` existe
- ✅ Vérifie les permissions du workflow dans Settings > Actions > General

### Workflow échoue au build
- ❌ Erreur : "VITE_SUPABASE_URL is not defined"
  - ➡️ Va dans Settings > Secrets and variables > Actions
  - ➡️ Ajoute les secrets : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Modifications visibles en local mais pas en prod
- 🔄 Cache du navigateur : vide le cache (voir section 4)
- 🔄 Cache GitHub Pages : peut prendre jusqu'à 10 minutes
- 🔄 Cache CDN : force un nouveau déploiement (voir section 3)

---

## 📊 Vérifier la version déployée

Ajoute ceci dans ton application pour afficher la version :

```typescript
// Dans n'importe quel composant
console.log('Version:', import.meta.env.PACKAGE_VERSION || '6.9.5');
```

Ou ajoute un petit badge dans le footer :
```tsx
<footer>
  <p>Version 6.9.5</p>
</footer>
```

---

## 🆘 Si rien ne fonctionne

1. **Désactive GitHub Pages et réactive-le**
   - Settings > Pages
   - Source: None (sauvegarder)
   - Attendre 1 minute
   - Source: gh-pages / (root) (sauvegarder)

2. **Supprime la branche gh-pages et redéploie**
   ```bash
   git push origin --delete gh-pages
   git commit --allow-empty -m "Force redeploy"
   git push origin main
   ```

3. **Vérifie les logs du workflow**
   - Actions > Dernier workflow > Clique sur "build-and-deploy"
   - Regarde chaque étape pour identifier l'erreur
