# Stale Branch Cleanup Plan

To maintain repository performance and keep the branching tree clean, we execute a monthly stale branch audit on the **first Monday of every month**.

## Audit Criteria

Branches are categorized into three statuses during the audit:

1.  **Fully Merged Branches:** Branches that have been successfully merged into `master`.
2.  **Inactive / Unmerged Branches:** Branches that have not had any commit activity for **over 45 days** and have not been merged into `master`.
3.  **Active Branches:** Branches with commit activity within the last 45 days.

## Cleanup Process

### Step 1: Automated Detection
Run the following script to list candidates for cleanup:
```bash
# Fetch latest remote information and prune deleted remotes
git fetch --all --prune

# List all remote branches merged into origin/master (safe to delete immediately)
git branch -r --merged origin/master

# List all remote branches that have had no commits in the last 45 days
git for-each-ref --sort=-committerdate --format='%(committerdate:relative)%09%(refname:short)' refs/remotes/origin | grep "days ago" | awk -F'\t' '$1 ~ /([4-9][0-9]|1[0-9][0-9]) days/ {print $0}'
```

### Step 2: Communication & Warning
*   For **fully merged branches**, delete them immediately from the remote.
*   For **inactive, unmerged branches**:
    1.  Identify the author of the branch using `git log -1 --format="%an <%ae>" <branch-name>`.
    2.  Send a automated/templated Slack message or comment on the related issue:
        > *"Hi @username, your branch `<branch-name>` has been inactive for over 45 days. It is scheduled for deletion on Friday. If you are still working on this, please push a commit or let us know. Otherwise, we will remove the remote branch."*

### Step 3: Deletion Policy
*   If no response or commit activity occurs within **5 business days** of the warning, delete the branch from the remote:
    `git push origin --delete <branch-name>`

### Step 4: Archival (Safeguard)
*   Before deleting any highly complex unmerged branches, take a git tag snapshot for backup:
    `git tag archive/<branch-name>-backup <branch-name>`
    `git push origin archive/<branch-name>-backup`
*   This ensures that work is never permanently lost and can be recovered if the feature is resurrected.
