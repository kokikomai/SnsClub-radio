#!/bin/bash

# List of directories to check for Git repositories
DIRECTORIES=(
    "/Users/kokikomai/Downloads/SnsClub radio"
    "/Users/kokikomai/Downloads/GRIT DIET"
    "/Users/kokikomai/Downloads/SnsClubカリキュラム"
    "/Users/kokikomai/Downloads/Secretary_audition"
    "/Users/kokikomai/Downloads/Mrs.Protein"
    "/Users/kokikomai/Downloads/internal-preview"
    "/Users/kokikomai/Downloads/drive-download-20251116T063804Z-1-001"
    "/Users/kokikomai/Downloads/令和の虎ファンクラブ"
    "/Users/kokikomai/Downloads/株式会社Levera"
    "/Users/kokikomai/Downloads/tools"
)

echo "Starting auto-push for all repositories..."

for dir in "${DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
        # Find all .git directories (in case of nested repos)
        find "$dir" -name ".git" -type d -prune | while read -r gitdir; do
            repo_dir=$(dirname "$gitdir")
            echo "------------------------------------------"
            echo "Checking repository: $repo_dir"
            
            cd "$repo_dir" || continue

            # Check if there are changes
            if [ -n "$(git status --porcelain)" ]; then
                echo "Changes detected. Staging and committing..."
                git add .
                git commit -m "Auto-push: $(date '+%Y-%m-%d %H:%M:%S')"
            else
                echo "No changes to commit."
            fi

            # Check if remote exists
            if git remote | grep -q 'origin'; then
                current_branch=$(git branch --show-current)
                echo "Pushing branch '$current_branch' to origin..."
                git push origin "$current_branch"
            else
                echo "No 'origin' remote found. Skipping push."
            fi
        done
    else
        echo "Directory not found: $dir"
    fi
done

echo "------------------------------------------"
echo "Done!"

