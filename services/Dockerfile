# Backend container: runs the FastAPI service from services/api on port 8001.

# Official Python image, "slim" version (a smaller Debian Linux).
# Python 3.12 because services/api/pyproject.toml requires 3.12 or newer.
FROM python:3.12-slim

# Install uv, the Python package installer this project already uses.
RUN pip install --no-cache-dir uv

# Tell uv to install packages straight into the container's Python.
# (No virtual environment is needed, since the container is already isolated.)
ENV UV_SYSTEM_PYTHON=1

# Recreate the repo's folder layout inside the container, so the
# "../../packages/..." lines in requirements.txt point to real folders.
WORKDIR /repo/services/api

# Copy in the two local packages the API depends on. They live outside services/,
# so docker-compose.yml will hand them to Docker as an extra folder named "packages".
COPY --from=packages incident_analysis /repo/packages/incident_analysis
COPY --from=packages shared /repo/packages/shared

# Install dependencies first (only requirements.txt is copied at this point),
# so Docker can reuse this slow step when only the code changes.
COPY api/requirements.txt ./
RUN uv pip install -r requirements.txt

# Copy the rest of the backend code.
COPY . /repo/services/

# Document which port the API listens on.
EXPOSE 8001

# Start the API with hot reloading, accepting visitors from outside the container.
CMD ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8001"]