#!/usr/bin/env bash
# shellcheck disable=SC1091

set -euo pipefail

# Define project root and paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PATH="${PROJECT_ROOT}/venv"
DATA_DIR="${PROJECT_ROOT}/backend/data"

# Activate virtual environment
# shellcheck source=/dev/null
source "${VENV_PATH}/bin/activate"

# Create data directories
mkdir -p "${DATA_DIR}"/{raw,processed}

# Download Kaggle dataset
echo "Downloading dataset..."
kaggle competitions download -c diabetic-retinopathy-detection -p "${DATA_DIR}/raw"
echo "Extracting dataset..."
unzip -q "${DATA_DIR}/raw/diabetic-retinopathy-detection.zip" -d "${DATA_DIR}/raw"

# Run preprocessing and training
echo "Preprocessing dataset..."
PYTHONPATH="${PROJECT_ROOT}" python3 model/preprocess.py \
    --input-dir "${DATA_DIR}/raw/train" \
    --output-dir "${DATA_DIR}/processed"

echo "Training model..."
PYTHONPATH="${PROJECT_ROOT}" python3 model/train.py \
    --data-dir "${DATA_DIR}/raw" \
    --processed-dir "${DATA_DIR}/processed" \
    --epochs 50 \
    --batch-size 32

# Move model to correct location if training successful
if [ -f "best_model.h5" ]; then
    mv best_model.h5 dr_classification_model.h5
    echo "Training completed successfully!"
else
    echo "Error: Training failed to produce model file"
    exit 1
fi
