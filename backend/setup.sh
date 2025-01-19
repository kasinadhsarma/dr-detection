#!/usr/bin/env bash
# shellcheck disable=SC1091

set -euo pipefail

echo "Setting up DR Detection project environment..."

# Check for Python installation
if ! command -v python3 &> /dev/null; then
    echo "Python3 not found. Please install Python 3.8 or higher"
    exit 1
fi

# Define project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PATH="${PROJECT_ROOT}/venv"

# Create virtual environment if it doesn't exist
if [ ! -d "${VENV_PATH}" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "${VENV_PATH}"
fi

# Activate virtual environment
# shellcheck source=/dev/null
source "${VENV_PATH}/bin/activate"

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
echo "Creating project directories..."
mkdir -p data/raw
mkdir -p data/processed
mkdir -p models
mkdir -p logs

# Setup Kaggle credentials
echo "Setting up Kaggle credentials..."
mkdir -p ~/.kaggle

cat << EOF
==============================================
Kaggle API Setup Instructions
==============================================
1. Go to kaggle.com and sign in
2. Click on your profile picture -> 'Account'
3. Scroll to 'API' section
4. Click 'Create New API Token'
5. Move the downloaded 'kaggle.json' to this directory
==============================================
EOF

read -p "Have you downloaded the Kaggle API token? (y/n): " response

if [[ "$response" =~ ^[Yy]$ ]]; then
    if [ -f "kaggle.json" ]; then
        # Move and set permissions for kaggle.json
        cp kaggle.json ~/.kaggle/
        chmod 600 ~/.kaggle/kaggle.json
        echo "Kaggle API configured successfully!"
        
        # Test Kaggle API
        echo "Testing Kaggle API connection..."
        if kaggle competitions list &> /dev/null; then
            echo "Kaggle API test successful!"
        else
            echo "Error: Kaggle API test failed. Please check your credentials."
            exit 1
        fi
    else
        echo "Error: kaggle.json not found in current directory!"
        exit 1
    fi
else
    echo "Please download the Kaggle API token and run this script again."
    exit 1
fi

# Create log file
touch logs/setup.log
echo "Setup completed on $(date)" >> logs/setup.log

echo "
==============================================
Setup completed successfully!
==============================================
Next steps:
1. Run 'source ../venv/bin/activate' to activate the virtual environment
2. Run 'bash train.sh' to start the training pipeline

Project structure created:
- data/
  |- raw/         (for downloaded datasets)
  |- processed/   (for processed datasets)
- models/         (for storing trained models)
- logs/           (for logging)
"
