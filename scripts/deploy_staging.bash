#!/usr/bin/env bash
if [[ $(basename $(pwd)) == "scripts" ]]; then
  echo -e "\nRun this script from the parent directory\n"
  exit 1
fi
echo -e "\nNote: If you stop the script before completion run the mv command below to restore your serverless.yml"
echo -e "    mv serverless.yml.tmp serverless.yml\n"
export $(cat .env.staging | sed 's/ /-/g' | sed 's/#.*//g' | xargs)
cp serverless.yml serverless.yml.tmp
sed -i '' "s/SECURITY_GROUP_1/$SECURITY_GROUP_1/g" serverless.yml
sed -i '' "s/SECURITY_GROUP_2/$SECURITY_GROUP_2/g" serverless.yml
sed -i '' "s/SUBNET_1/$SUBNET_1/g" serverless.yml
sed -i '' "s/SUBNET_2/$SUBNET_2/g" serverless.yml
NODE_ENV=staging SLS_DEBUG=* serverless deploy --stage staging
mv serverless.yml.tmp serverless.yml
