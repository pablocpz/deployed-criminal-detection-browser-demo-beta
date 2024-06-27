#!/bin/bash

cd "$(dirname "$0")"

#wil need to first start venv
python3 -m venv venv

source venv/bin/activate

#WILL WORK AT THE SAME CHILD DIRECTORY OF VENV (inside VIM)
#get current directory


# start backend
cd deployed-criminal-detection-browser-demo-beta/backend/

pip3 install -r requirements.txt
cd sam_server

uvicorn app:app --uds /tmp/uvicorn.sock --workers 1 --host 0.0.0.0 --port 8000