#!/usr/bin/env bash
if [[ $(basename $(pwd)) == "scripts" ]]; then
  echo -e "\nRun this script from the ./scripts directory\n"
  exit 1
fi
NODE_ENV=production serverless deploy --stage prod
