#!/bin/bash

# Function to increment version in a specific file
increment_version() {
    local file=$1
    if [ ! -f "$file" ]; then
        return
    fi

    local current_version=$(grep -oP 'id="app-version">\K[0-9]+\.[0-9]+\.[0-9]+' "$file")
    if [ -z "$current_version" ]; then
        echo "Error: Version not found in $file"
        return
    fi

    IFS='.' read -r major minor patch <<< "$current_version"
    local new_patch=$((patch + 1))
    local new_version="$major.$minor.$new_patch"

    sed -i "s/id=\"app-version\">$current_version/id=\"app-version\">$new_version/" "$file"
    git add "$file"
    echo "Incremented $file: $current_version -> $new_version"
}

# Detect changed files in the staged area
STAGED_FILES=$(git diff --cached --name-only)

DEV_CHANGED=false
STABLE_CHANGED=false

for file in $STAGED_FILES; do
    if [[ "$file" == dev/* ]]; then
        DEV_CHANGED=true
    else
        # Avoid incrementing if only automation scripts changed
        if [[ "$file" != scripts/* && "$file" != .git/hooks/* ]]; then
            STABLE_CHANGED=true
        fi
    fi
done

if [ "$DEV_CHANGED" = true ]; then
    increment_version "dev/index.html"
fi

if [ "$STABLE_CHANGED" = true ]; then
    increment_version "index.html"
fi
