# define the port and host from the compose-spec or default to 8000 and 0.0.0.0
ARG APP_PORT=8000
ARG APP_HOST=0.0.0.0

# base image
FROM python:3.11-slim

# this is the location we will work from INSIDE the container
# so python ./sam_server/app.py (relative) will be the same as
# python /app/sam_server/app.py (absolute) inside this container
WORKDIR /app

# Copy project
COPY . .

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install pipenv
RUN pipenv install

# Command to run the application
EXPOSE $APP_PORT
CMD ["python", "-m", "uvicorn", "sam_server.app:app", "--host", "$APP_HOST", "--port", "$APP_PORT"]
