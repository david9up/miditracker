# GitHub setup (one time)

Enables **you** and the **Cursor agent** to push to [david9up/miditracker](https://github.com/david9up/miditracker) without password prompts.

## Troubleshooting

### `permission denied` on `~/.config/gh/config.yml`

If `gh auth login` fails with permission denied on `.config`, the folder may be owned by root (sometimes after a sandboxed or sudo install). Fix ownership:

```bash
sudo chown -R "$(whoami)" ~/.config
chmod -R u+rwX ~/.config
mkdir -p ~/.config/gh
gh auth login
gh auth setup-git
```

Also fixes git warnings about `~/.config/git/ignore`.

### Homebrew `gh` install fails

```bash
sudo chown -R "$(whoami)" /opt/homebrew
brew install gh
```

## 1. GitHub CLI

```bash
brew install gh
gh --version
```

## 2. Log in (interactive — run in Terminal)

```bash
gh auth login
```

Recommended choices:

| Prompt | Choice |
|--------|--------|
| Account | **GitHub.com** |
| Protocol | **HTTPS** (best for Cursor agent — uses credential helper) |
| Authenticate | **Login with a web browser** |

### Agent push + deploy scopes (required once)

The agent pushes over HTTPS and triggers **Deploy GitHub Pages**. Grant `workflow` scope:

```bash
gh auth refresh -h github.com -s repo,workflow
```

Complete the browser/device step when prompted. Verify:

```bash
./scripts/gh-auth-check.sh
gh workflow list
```

## 3. Wire Git to GitHub CLI

```bash
gh auth setup-git
gh auth status
```

You should see: `Logged in to github.com as david9up`

## 4. SSH key (if you chose SSH)

Your key is already on GitHub. Ensure agent loads it:

```bash
ssh-add --apple-use-keychain ~/.ssh/id_rsa
ssh -T git@github.com
```

Optional `~/.ssh/config`:

```ssh-config
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa
  AddKeysToAgent yes
  UseKeychain yes
```

## 5. Verify push

```bash
cd /Users/davidmalcher/Projects/miditracker
git push origin main
```

## Agent notes

The Cursor agent **cannot** use SSH from a sandboxed shell (DNS blocked). After setup above:

- **Push:** `./scripts/push-to-github.sh` or `npm run push:github` (HTTPS via gh)
- **Deploy Pages:** `npm run deploy:pages` (only when you ask — not on every push)
- **Check auth:** `./scripts/gh-auth-check.sh`

Do **not** store personal access tokens in the repo. `gh` keeps credentials in the macOS keychain.
