#!/bin/bash
#wil need to first start venv
# source venv/bin/activate

#get current directory
cd "$(dirname "$0")"


# start backend
cd deployed-criminal-detection-browser-demo-beta/backend/sam_server


uvicorn app:app --host=0.0.0.0 --workers=4