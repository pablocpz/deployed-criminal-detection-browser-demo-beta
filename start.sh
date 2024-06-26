#!/bin/bash
#wil need to first start venv
source venv/bin/activate

#WILL WORK AT THE SAME CHILD DIRECTORY OF VENV (inside VIM)
#get current directory
cd "$(dirname "$0")"


# start backend
cd deployed-criminal-detection-browser-demo-beta/backend/sam_server

uvicorn app:app --host=0.0.0.0 --port=8000 --workers=1