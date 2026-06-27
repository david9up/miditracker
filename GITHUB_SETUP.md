# GitHub setup (one time)

Enables **you** and the **Cursor agent** to push to [david9up/miditracker](https://github.com/david9up/miditracker) without password prompts.

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
| Protocol | **SSH** (you already use `git@github.com:…`) or **HTTPS** (simpler for agent + credential helper) |
| Authenticate | **Login with a web browser** |

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

The Cursor agent **cannot** push from a sandboxed shell (DNS/SSH blocked). After this setup, the agent should:

- Use **`./scripts/push-to-github.sh`** or explicit push commands with **full permissions**
- Use **`gh`** for PRs, releases, and repo checks

Do **not** store personal access tokens in the repo. `gh` keeps credentials in the macOS keychain.
