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
        echo "------------------------------------------"
        echo "Processing directory: $dir"
        
        cd "$dir" || continue

        # Gitが初期化されていない場合は初期化する
        if [ ! -d ".git" ]; then
            echo "Initializing Git repository..."
            git init
            git branch -M main
        fi

        # 変更があるか確認してコミット
        if [ -n "$(git status --porcelain)" ]; then
            echo "Changes detected. Staging and committing..."
            git add .
            git commit -m "Auto-push: $(date '+%Y-%m-%d %H:%M:%S')"
        else
            echo "No changes to commit."
        fi

        # リモート(origin)が設定されているか確認
        if git remote | grep -q 'origin'; then
            current_branch=$(git branch --show-current)
            echo "Pushing branch '$current_branch' to origin..."
            git push origin "$current_branch"
        else
            echo "Warning: No 'origin' remote found. Files are committed locally but NOT pushed to GitHub."
            echo "To fix this, run: git remote add origin <your-repository-url>"
        fi
    else
        echo "Directory not found: $dir"
    fi
done

echo "------------------------------------------"
echo "Done!"

