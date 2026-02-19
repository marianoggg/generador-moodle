#!/bin/bash

INDEX_FILE="dev/index.html"
CURRENT_VERSION=$(grep -oP 'id="app-version">\K[0-9]+\.[0-9]+\.[0-9]+' "$INDEX_FILE")

if [ -z "$CURRENT_VERSION" ]; then
    echo "Error: Version not found in $INDEX_FILE"
    exit 1
fi

IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
NEW_PATCH=$((patch + 1))
NEW_VERSION="$major.$minor.$NEW_PATCH"

sed -i "s/id=\"app-version\">$CURRENT_VERSION/id=\"app-version\">$NEW_VERSION/" "$INDEX_FILE"
git add "$INDEX_FILE"
