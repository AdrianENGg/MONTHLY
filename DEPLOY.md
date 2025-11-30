# Deploy to GitHub Pages

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `monthly-finance-tracker` (or any name you want)
3. Make it **Public**
4. Don't initialize with README (we already have files)
5. Click "Create repository"

## Step 2: Push Your Code

Run these commands in your terminal:

```bash
cd ~/kiro-projects/finance-tracker

# Add your GitHub repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/monthly-finance-tracker.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Click "Pages" in the left sidebar
4. Under "Source", select "main" branch
5. Click "Save"
6. Wait 1-2 minutes

## Step 4: Access Your App

Your app will be live at:
```
https://YOUR_USERNAME.github.io/monthly-finance-tracker/
```

## Step 5: Install on Phone

1. Open the URL on your phone
2. **Android**: Menu (⋮) → "Add to Home screen"
3. **iPhone**: Share button → "Add to Home Screen"

## Done! 🎉

Your app is now:
- ✅ Hosted for free on GitHub
- ✅ Accessible from anywhere
- ✅ Installable on any phone
- ✅ Works offline
- ✅ All data stored locally on your device

## Update Your App Later

When you make changes:
```bash
cd ~/kiro-projects/finance-tracker
git add .
git commit -m "Updated app"
git push
```

Changes will be live in 1-2 minutes!
