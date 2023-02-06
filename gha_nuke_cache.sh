#!/usr/bin/env bash

set -e

# Set the required variables
export USER="fullkomnun"
export REPO="nightfall_3"

echo "will nuke gha cache"
while :
do
    line=$(curl -G \
        -H "Accept: application/vnd.github.v3+json" \
        -H "Authorization: token ${GH_PAT}" \
        -d per_page=100 \
        -d sort=size_in_bytes \
        https://api.github.com/repos/"${USER}"/nightfall_3/actions/caches | jq -r '."actions_caches"[].id' | tr "\n" " ")

    read -a ids <<< "$line"
    if [ ${#ids[@]} -eq 0 ]; then
        echo "gha cache has been nuked!"
        exit 0
    fi

    echo "removing gha cache entries..."
    for id in "${ids[@]}"; do
        curl \
            -X DELETE \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Authorization: token ${GH_PAT}" \
            https://api.github.com/repos/"${USER}"/"${REPO}"/actions/caches/"${id}"
    done
    sleep 2
done
